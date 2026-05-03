import { NextRequest, NextResponse } from "next/server"
import { PublicKey } from "@solana/web3.js"
import { AnchorProvider, Program, Idl } from "@coral-xyz/anchor"
import { createConnection } from "@/lib/program"
import { verifyWalletSignature } from "@/lib/agent/auth"
import { getStealthOwner, signAndSendWithStealth } from "@/lib/agent/stealth"
import {
  buildAcceptLendOfferTx,
  buildAcceptBorrowRequestTx,
} from "@/lib/agent/transaction-builder"
import { postPricesForTokens, validateLoanTerms } from "@/lib/mcp/tools/lending"
import { parseLoanAccount, LoanStatus } from "@/lib/loan-utils"
import IDL from "@/lib/idl/agio.json"

/**
 * Accept an existing pending offer (public or exclusive) using a stealth wallet.
 *
 * Resolves the role from the on-chain loan state:
 *   - loan.lender set, loan.borrower null → stealth becomes BORROWER → acceptLendOffer
 *   - loan.borrower set, loan.lender null → stealth becomes LENDER   → acceptBorrowOffer
 *
 * Pre-conditions: stealth funded with the right token (collateral when becoming
 * borrower, debt when becoming lender) + a SOL fee buffer. Caller orchestrates
 * the Cloak shield→unshield via `usePrivateLoanActions.acceptPrivate`.
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
    const stealthPk = new PublicKey(stealthPublicKey)
    const loanPda = new PublicKey(loanPublicKey)

    // Read-only provider — actual signing is done via Privy stealth flow.
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

    const accountRaw = await (program.account as any).loan.fetch(loanPda)
    const loan = parseLoanAccount(loanPda, accountRaw)

    if (loan.status !== LoanStatus.Pending) {
      return NextResponse.json(
        { error: "Loan is not pending — cannot accept" },
        { status: 400 },
      )
    }

    const stealthBecomesBorrower = !!loan.lender && !loan.borrower
    const stealthBecomesLender = !!loan.borrower && !loan.lender
    if (!stealthBecomesBorrower && !stealthBecomesLender) {
      return NextResponse.json(
        { error: "Loan is already matched — both sides set" },
        { status: 400 },
      )
    }

    // Re-validate ratio against the lower 130% accept threshold. The on-chain
    // program will also check, but failing early saves the Pyth post + the
    // Cloak fund cost when the price has moved enough to push us out of range.
    const validation = await validateLoanTerms({
      debtToken: loan.debtTokenSymbol,
      collateralToken: loan.collateralTokenSymbol,
      debtAmount: loan.debtAmountUi,
      collateralAmount: loan.collateralAmountUi,
      apy: loan.apy,
      mode: "accept",
    })
    if (validation) {
      return NextResponse.json({ error: validation }, { status: 400 })
    }

    // 2-attempt loop with fresh Pyth posts — same pattern as create-lend.
    // PriceFeedStale (0x178e) means the post → stealth-sign window blew past
    // MAX_PYTH_PRICE_AGE_SECS; re-post and retry once.
    let txHash: string | undefined
    let lastErr: any
    for (let attempt = 1; attempt <= 2; attempt++) {
      const { collateralPriceUpdate, debtPriceUpdate, cleanup } = await postPricesForTokens(
        connection,
        loan.debtTokenSymbol,
        loan.collateralTokenSymbol,
      )
      try {
        const serializedTx = stealthBecomesBorrower
          ? await buildAcceptLendOfferTx(connection, program, stealthPk, loan, {
              collateralPriceUpdate,
              debtPriceUpdate,
            })
          : await buildAcceptBorrowRequestTx(connection, program, stealthPk, loan, {
              collateralPriceUpdate,
              debtPriceUpdate,
            })

        txHash = await signAndSendWithStealth(stealthPublicKey, serializedTx)
        break
      } catch (err: any) {
        lastErr = err
        const msg = String(err?.message ?? err ?? "")
        const isStale =
          /PriceFeedStale/i.test(msg) || /0x178e/i.test(msg) || /price feed is too stale/i.test(msg)
        if (!isStale || attempt === 2) throw err
        console.warn(`[private-loan/accept] attempt ${attempt} stale price, retrying`)
      } finally {
        cleanup().catch(() => {})
      }
    }
    if (!txHash) throw lastErr ?? new Error("accept failed without surfacing an error")

    return NextResponse.json({
      success: true,
      txHash,
      stealthPublicKey,
      role: stealthBecomesBorrower ? "borrower" : "lender",
    })
  } catch (err: any) {
    console.error("[private-loan/accept]", err)
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 })
  }
}
