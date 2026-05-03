import { NextRequest, NextResponse } from "next/server"
import { PublicKey } from "@solana/web3.js"
import { createConnection, createReadonlyProgram } from "@/lib/program"
import { parseLoanAccount, LoanStatus } from "@/lib/loan-utils"
import { verifyWalletSignature } from "@/lib/agent/auth"
import { getStealthOwner, signAndSendWithStealth } from "@/lib/agent/stealth"
import { buildForecloseLoanTx } from "@/lib/agent/transaction-builder"

/**
 * Lender-side stealth forecloses an expired loan.
 *
 * Uses the legacy `forecloseLoan` instruction (lender-only, no oracle prices).
 * The permissionless v2 path (foreclose_loan_v2) is reserved for the cron
 * keeper and requires Pyth posts.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { wallet, signature, message, stealthPublicKey, loanPublicKey } = body

    if (!wallet || !signature || !message || !stealthPublicKey || !loanPublicKey) {
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

    const connection = createConnection()
    const program = createReadonlyProgram(connection)
    const loanPda = new PublicKey(loanPublicKey)

    const accountRaw = await (program.account as any).loan.fetch(loanPda)
    const loan = parseLoanAccount(loanPda, accountRaw)

    if (loan.status !== LoanStatus.Accepted) {
      return NextResponse.json(
        { error: "Loan is not active — cannot foreclose" },
        { status: 400 },
      )
    }
    if (!loan.lender || loan.lender !== stealthPublicKey) {
      return NextResponse.json(
        { error: "Stealth wallet is not the lender on this loan" },
        { status: 403 },
      )
    }

    // Verify the loan has expired (start + duration <= now). Without this the
    // Anchor program would error anyway, but rejecting early gives a clearer
    // message + saves the Cloak top-up cost when the user clicks too soon.
    const start = loan.start ?? 0
    const nowSecs = Math.floor(Date.now() / 1000)
    if (start === 0 || start + loan.duration > nowSecs) {
      return NextResponse.json(
        { error: "Loan has not expired yet" },
        { status: 400 },
      )
    }

    const stealthPk = new PublicKey(stealthPublicKey)
    const serializedTx = await buildForecloseLoanTx(connection, program, stealthPk, loan)
    const txHash = await signAndSendWithStealth(stealthPublicKey, serializedTx)

    return NextResponse.json({ success: true, txHash })
  } catch (err: any) {
    console.error("[private-loan/foreclose]", err)
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 })
  }
}
