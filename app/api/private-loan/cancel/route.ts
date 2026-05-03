import { NextRequest, NextResponse } from "next/server"
import { PublicKey } from "@solana/web3.js"
import { createConnection, createReadonlyProgram } from "@/lib/program"
import { parseLoanAccount, LoanStatus } from "@/lib/loan-utils"
import { verifyWalletSignature } from "@/lib/agent/auth"
import { getStealthOwner, signAndSendWithStealth } from "@/lib/agent/stealth"
import {
  buildRescindBorrowOfferTx,
  buildRescindLendOfferTx,
} from "@/lib/agent/transaction-builder"

/**
 * Cancel (rescind) a pending private offer created by a stealth wallet.
 *
 * Picks rescindBorrowOffer vs rescindLendOffer based on which side the stealth
 * is on:
 *   - stealth == lender → rescindBorrowOffer (lender created a borrow offer
 *     i.e. lend-money-out request); locked debt returns to stealth.
 *   - stealth == borrower → rescindLendOffer (borrower created a lend offer
 *     i.e. ask-to-borrow); locked collateral returns to stealth.
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

    if (loan.status !== LoanStatus.Pending) {
      return NextResponse.json(
        { error: "Loan is not pending — cannot cancel" },
        { status: 400 },
      )
    }

    const stealthPk = new PublicKey(stealthPublicKey)
    const isLender = loan.lender === stealthPublicKey && !loan.borrower
    const isBorrower = loan.borrower === stealthPublicKey && !loan.lender

    if (!isLender && !isBorrower) {
      return NextResponse.json(
        { error: "Stealth wallet is not the creator of this offer" },
        { status: 403 },
      )
    }

    const serializedTx = isLender
      ? await buildRescindBorrowOfferTx(connection, program, stealthPk, loan)
      : await buildRescindLendOfferTx(connection, program, stealthPk, loan)

    const txHash = await signAndSendWithStealth(stealthPublicKey, serializedTx)

    return NextResponse.json({ success: true, txHash })
  } catch (err: any) {
    console.error("[private-loan/cancel]", err)
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 })
  }
}
