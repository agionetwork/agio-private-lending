import { NextRequest, NextResponse } from "next/server"
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js"
import { isValidSolanaAddress } from "@/lib/agent/auth"

export const dynamic = "force-dynamic"

function isDevnet(): boolean {
  return (
    process.env.NEXT_PUBLIC_SOLANA_CLUSTER === "devnet" ||
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.includes("devnet") ||
    false
  )
}

/**
 * Devnet airdrop endpoints we try in order. `requestAirdrop` against the
 * public Solana RPC is brutally rate-limited (often 1 per 24h per IP, and
 * Vercel IPs are shared) so we fall back to Helius devnet when configured.
 */
function airdropRpcs(): string[] {
  const candidates: (string | undefined)[] = [
    process.env.SOLANA_DEVNET_AIRDROP_RPC,
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.includes("devnet")
      ? process.env.NEXT_PUBLIC_SOLANA_RPC_URL
      : undefined,
    "https://api.devnet.solana.com",
  ]
  const seen = new Set<string>()
  return candidates
    .filter((url): url is string => typeof url === "string" && url.length > 0)
    .filter((url) => (seen.has(url) ? false : (seen.add(url), true)))
}

/**
 * Try an airdrop on a single RPC. Returns the signature on success, throws on
 * failure. Confirmation uses a balance-based poll so a slow Devnet doesn't
 * spuriously fail when the tx is actually queued and lands seconds later.
 */
async function airdropOnce(rpcUrl: string, pk: PublicKey, lamports: number): Promise<string> {
  const conn = new Connection(rpcUrl, "confirmed")
  const startBalance = await conn.getBalance(pk).catch(() => 0)
  const sig = await conn.requestAirdrop(pk, lamports)

  // Best-effort confirmation: poll balance for up to 12 seconds. If we observe
  // the lamports landed we're done; otherwise still treat as success because
  // requestAirdrop has already been accepted into the queue.
  const deadline = Date.now() + 12_000
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1500))
    const now = await conn.getBalance(pk).catch(() => -1)
    if (now > startBalance) return sig
  }
  return sig
}

export async function POST(req: NextRequest) {
  if (!isDevnet()) {
    return NextResponse.json(
      { error: "Faucet is only available on devnet." },
      { status: 400 },
    )
  }

  let body: { wallet?: string; type?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const wallet = body.wallet
  const type = body.type

  if (!wallet || !isValidSolanaAddress(wallet)) {
    return NextResponse.json(
      { error: "wallet is required and must be a valid Solana address." },
      { status: 400 },
    )
  }

  if (type !== "sol" && type !== "tokens") {
    return NextResponse.json(
      { error: "type must be 'sol' or 'tokens'." },
      { status: 400 },
    )
  }

  if (type === "sol") {
    const pk = new PublicKey(wallet)
    const lamports = 1 * LAMPORTS_PER_SOL
    const errors: string[] = []

    for (const rpc of airdropRpcs()) {
      try {
        const sig = await airdropOnce(rpc, pk, lamports)
        return NextResponse.json({
          success: true,
          type: "sol",
          amount: 1,
          signature: sig,
          rpc,
        })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`[${rpc}] ${msg}`)
        // continue to next RPC
      }
    }

    // Every RPC failed. Always surface the public faucet so the user has a
    // working escape hatch — the button UI uses externalUrl for the action.
    const combined = errors.join(" | ")
    const rateLimited =
      /429|rate|too many|airdrop limit|exceeded/i.test(combined)
    const headline = rateLimited
      ? "Public devnet airdrop is rate-limited right now."
      : "Devnet airdrop failed."
    return NextResponse.json(
      {
        error: `${headline} Use faucet.solana.com to request SOL directly.`,
        detail: combined,
        externalUrl: "https://faucet.solana.com",
      },
      { status: rateLimited ? 429 : 502 },
    )
  }

  // type === "tokens" — Circle faucet for USDC + EURC
  const circleApiKey = process.env.CIRCLE_API_KEY
  if (!circleApiKey) {
    return NextResponse.json(
      {
        error:
          "USDC/EURC faucet not configured. Use faucet.circle.com directly to request tokens for your wallet.",
        externalUrl: "https://faucet.circle.com",
      },
      { status: 503 },
    )
  }

  try {
    const res = await fetch("https://api.circle.com/v1/faucet/drips", {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${circleApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        address: wallet,
        blockchain: "SOL-DEVNET",
        native: false,
        usdc: true,
        eurc: true,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json(
        {
          error: `Circle faucet rejected the request (HTTP ${res.status}). Use faucet.circle.com instead.`,
          detail: text,
          externalUrl: "https://faucet.circle.com",
        },
        { status: res.status === 429 ? 429 : 502 },
      )
    }

    return NextResponse.json({ success: true, type: "tokens", received: ["USDC", "EURC"] })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      {
        error: `Faucet request failed: ${msg}`,
        externalUrl: "https://faucet.circle.com",
      },
      { status: 502 },
    )
  }
}
