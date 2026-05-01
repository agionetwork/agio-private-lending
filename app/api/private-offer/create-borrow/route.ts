import { NextRequest, NextResponse } from "next/server"
import { PublicKey } from "@solana/web3.js"
import { AnchorProvider, Program, Idl } from "@coral-xyz/anchor"
import { createConnection } from "@/lib/program"
import { verifyWalletSignature } from "@/lib/agent/auth"
import { getStealthOwner, signAndSendWithStealth } from "@/lib/agent/stealth"
import { buildCreateBorrowRequestTx } from "@/lib/agent/transaction-builder"
import { postPricesForTokens, validateLoanTerms } from "@/lib/mcp/tools/lending"
import IDL from "@/lib/idl/agio.json"

/**
 * Create a private borrow request signed by the user's stealth wallet.
 *
 * Same shape as create-lend but for the borrow side: the stealth deposits
 * collateral, waits for a lender to accept. Caller must have pre-funded the
 * stealth with collateral + a small SOL buffer for fees + ATA rent.
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
      {
        publicKey: stealthPk,
        signTransaction: async (tx: any) => tx,
        signAllTransactions: async (txs: any[]) => txs,
      } as any,
      { commitment: "confirmed" },
    )
    const program = new Program(IDL as unknown as Idl, provider)

    const { collateralPriceUpdate, debtPriceUpdate, cleanup } = await postPricesForTokens(
      connection,
      collateralTokenSymbol,
      debtTokenSymbol,
    )

    let txHash: string
    try {
      const serializedTx = await buildCreateBorrowRequestTx(
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
      txHash = await signAndSendWithStealth(stealthPublicKey, serializedTx)
    } finally {
      cleanup().catch(() => {})
    }

    return NextResponse.json({ success: true, txHash, stealthPublicKey })
  } catch (err: any) {
    console.error("[private-offer/create-borrow]", err)
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 })
  }
}
