import { NextRequest, NextResponse } from "next/server"
import { PublicKey } from "@solana/web3.js"
import { createConnection, createReadonlyProgram } from "@/lib/program"
import { parseLoanAccount, LoanStatus } from "@/lib/loan-utils"
import { verifyWalletSignature } from "@/lib/agent/auth"
import { getStealthOwner, signAndSendWithStealth } from "@/lib/agent/stealth"
import { buildRepayLoanTx } from "@/lib/agent/transaction-builder"

/**
 * Borrower-side stealth repays an active private loan.
 *
 * Pre-condition: the stealth wallet already holds enough debt token + a SOL
 * fee buffer. Call sites typically run a Cloak shield→unshield top-up before
 * this endpoint via `usePrivateLoanActions`.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      wallet,
      signature,
      message,
      stealthPublicKey,
      loanPublicKey,
      repayAmount,
    } = body

    if (
      !wallet ||
      !signature ||
      !message ||
      !stealthPublicKey ||
      !loanPublicKey ||
      typeof repayAmount !== "number" ||
      repayAmount <= 0
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

    const connection = createConnection()
    const program = createReadonlyProgram(connection)
    const loanPda = new PublicKey(loanPublicKey)

    const accountRaw = await (program.account as any).loan.fetch(loanPda)
    const loan = parseLoanAccount(loanPda, accountRaw)

    if (loan.status !== LoanStatus.Accepted) {
      return NextResponse.json(
        { error: "Loan is not active — cannot repay" },
        { status: 400 },
      )
    }
    if (!loan.borrower || loan.borrower !== stealthPublicKey) {
      return NextResponse.json(
        { error: "Stealth wallet is not the borrower on this loan" },
        { status: 403 },
      )
    }
    if (!loan.lender) {
      return NextResponse.json({ error: "Loan has no lender" }, { status: 400 })
    }

    const stealthPk = new PublicKey(stealthPublicKey)
    const serializedTx = await buildRepayLoanTx(
      connection,
      program,
      stealthPk,
      loan,
      repayAmount,
    )
    const txHash = await signAndSendWithStealth(stealthPublicKey, serializedTx)

    return NextResponse.json({ success: true, txHash })
  } catch (err: any) {
    console.error("[private-loan/repay]", err)
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 })
  }
}
