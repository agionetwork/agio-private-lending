import { NextRequest, NextResponse } from "next/server"
import { isValidSolanaAddress, verifyWalletSignature } from "@/lib/agent/auth"
import { getStealthWalletsForUser } from "@/lib/agent/stealth"
import { isRedisConfigured } from "@/lib/agent/redis"

/**
 * Return the stealth wallets that belong to the calling user.
 *
 * GET (no auth) — used by useLoans on every dashboard mount so private loans
 * automatically show up under "My Loans" without prompting for a signature.
 * Leaking "wallet X has N stealth wallets" is benign: the on-chain anonymity
 * (Cloak shield→unshield) is what protects loan ↔ funder linkage.
 *
 * POST (signed) — preserved for callers that want hardened auth.
 */
export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet")
  if (!wallet || !isValidSolanaAddress(wallet)) {
    return NextResponse.json({ stealthPublicKeys: [] })
  }
  if (!isRedisConfigured()) {
    return NextResponse.json({ stealthPublicKeys: [] })
  }
  try {
    const stealthPublicKeys = await getStealthWalletsForUser(wallet)
    return NextResponse.json({ stealthPublicKeys })
  } catch (err: any) {
    console.error("[private-offer/list:GET]", err)
    return NextResponse.json({ stealthPublicKeys: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { wallet, signature, message } = await req.json()
    if (!wallet || !signature || !message) {
      return NextResponse.json(
        { error: "Missing wallet, signature, or message" },
        { status: 400 },
      )
    }
    if (!verifyWalletSignature(wallet, signature, message)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    const stealthPublicKeys = await getStealthWalletsForUser(wallet)
    return NextResponse.json({ success: true, stealthPublicKeys })
  } catch (err: any) {
    console.error("[private-offer/list:POST]", err)
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 })
  }
}
