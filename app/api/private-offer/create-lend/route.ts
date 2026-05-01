import { NextRequest, NextResponse } from "next/server"
import { PublicKey } from "@solana/web3.js"
import { AnchorProvider, Program, Idl } from "@coral-xyz/anchor"
import { createConnection } from "@/lib/program"
import { verifyWalletSignature } from "@/lib/agent/auth"
import { getStealthOwner, signAndSendWithStealth } from "@/lib/agent/stealth"
import { buildCreateLendOfferTx } from "@/lib/agent/transaction-builder"
import { postPricesForTokens, validateLoanTerms } from "@/lib/mcp/tools/lending"
import IDL from "@/lib/idl/agio.json"

/**
 * Create a private lend offer signed by the user's stealth wallet.
 *
 * Flow:
 *   1. Auth (signature on `wallet`)
 *   2. Verify stealthPubkey belongs to caller
 *   3. Validate loan terms against protocol limits
 *   4. Bot keypair posts Pyth prices on-chain
 *   5. Build createBorrowOffer ix (program calls it that — agent-as-LENDER builder)
 *      with stealthPubkey as the lender + feePayer
 *   6. Stealth signs + we broadcast via Helius
 *   7. Cleanup ephemeral price-update accounts
 *
 * Pre-condition: caller already funded the stealth wallet via Cloak round-trip
 * (debt token + a small SOL buffer for tx fees + ATA rent).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      wallet,
      signature,
      message,
      stealthPublicKey,
      debtTokenSymbol,
      collateralTokenSymbol,
      debtAmount,
      collateralAmount,
      duration,
      apy,
    } = body

    if (
      !wallet ||
      !signature ||
      !message ||
      !stealthPublicKey ||
      !debtTokenSymbol ||
      !collateralTokenSymbol ||
      typeof debtAmount !== "number" ||
      typeof collateralAmount !== "number" ||
      typeof duration !== "number" ||
      typeof apy !== "number"
    ) {
      return NextResponse.json({ error: "Missing or invalid params" }, { status: 400 })
    }

    if (!verifyWalletSignature(wallet, signature, message)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    const owner = await getStealthOwner(stealthPublicKey)
    if (owner !== wallet) {
      return NextResponse.json(
        { error: "Stealth wallet does not belong to caller" },
        { status: 403 },
      )
    }

    const validation = await validateLoanTerms({
      debtToken: debtTokenSymbol,
      collateralToken: collateralTokenSymbol,
      debtAmount,
      collateralAmount,
      apy,
      mode: "create",
    })
    if (validation) {
      return NextResponse.json({ error: validation }, { status: 400 })
    }

    const connection = createConnection()
    const stealthPk = new PublicKey(stealthPublicKey)
    const provider = new AnchorProvider(
      connection,
      // Read-only provider — actual signing is done via Privy stealth flow.
      {
        publicKey: stealthPk,
        signTransaction: async (tx: any) => tx,
        signAllTransactions: async (txs: any[]) => txs,
      } as any,
      { commitment: "confirmed" },
    )
    const program = new Program(IDL as unknown as Idl, provider)

    // Step 1: bot posts Pyth prices.
    const { collateralPriceUpdate, debtPriceUpdate, cleanup } = await postPricesForTokens(
      connection,
      collateralTokenSymbol,
      debtTokenSymbol,
    )

    let txHash: string
    try {
      // Step 2: build the loan tx with stealth as lender + feePayer.
      const serializedTx = await buildCreateLendOfferTx(
        connection,
        program,
        stealthPk,
        {
          debtTokenSymbol,
          collateralTokenSymbol,
          debtAmount,
          collateralAmount,
          duration,
          apy,
        },
        { collateralPriceUpdate, debtPriceUpdate },
      )
      // Step 3: stealth signs + broadcasts.
      txHash = await signAndSendWithStealth(stealthPublicKey, serializedTx)
    } finally {
      cleanup().catch(() => {})
    }

    return NextResponse.json({ success: true, txHash, stealthPublicKey })
  } catch (err: any) {
    console.error("[private-offer/create-lend]", err)
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 })
  }
}
