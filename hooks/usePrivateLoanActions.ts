"use client"

import { useCallback } from "react"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js"
import { fundStealthWallet } from "@/lib/cloak/fund-stealth"
import { loadCloakSdk } from "@/lib/cloak/client"
import { getTokenMint, getTokenDecimals } from "@/lib/token-mints"
import type { ParsedLoan } from "@/lib/loan-utils"

/**
 * Client-side actions on existing private loans (repay / cancel / foreclose).
 *
 * Each action:
 *   1. Signs an auth message with the user's main wallet (cached per session
 *      via `usePrivateLoanFlow`-style auth in callers).
 *   2. Tops up the stealth wallet via Cloak when needed (SOL fee buffer; for
 *      repay also the debt token).
 *   3. POSTs to the matching `/api/private-loan/*` endpoint where the server
 *      builds + signs + broadcasts the Anchor tx using the stealth wallet.
 *
 * The server endpoints validate stealth ownership and refuse to act on loans
 * where the stealth isn't the borrower (repay), creator (cancel), or lender
 * (foreclose) — defense in depth on top of the on-chain Anchor checks.
 */

// SOL the stealth needs in its account to cover Anchor tx fees + ATA rent for
// a single action (repay/cancel/foreclose). We top up if balance is below
// this floor — otherwise skip the Cloak round-trip entirely.
const MIN_SOL_FLOOR_LAMPORTS = BigInt(0.01 * LAMPORTS_PER_SOL)
// Fresh top-up amount when we do shield. Generous enough for one action plus
// a fee margin so quick follow-ups don't trigger another round-trip.
const SOL_TOPUP_LAMPORTS = BigInt(0.05 * LAMPORTS_PER_SOL)

export type PrivateActionProgress =
  | "auth"
  | "init"
  | "check-balance"
  | "topup-sol"
  | "topup-token"
  | "submit"

export function usePrivateLoanActions() {
  const { publicKey, signMessage } = useWallet() as any
  const wallet = useWallet()
  const { connection } = useConnection()

  const buildAuth = useCallback(async (action: string) => {
    if (!publicKey || !signMessage) {
      throw new Error("Wallet not connected or does not support signMessage")
    }
    const message = `${action} via Agio at ${new Date().toISOString()}`
    const signatureBytes = await signMessage(new TextEncoder().encode(message))
    const signature = Buffer.from(signatureBytes).toString("base64")
    return {
      wallet: publicKey.toBase58(),
      signature,
      message,
    }
  }, [publicKey, signMessage])

  // Resolve the SDK's NATIVE_SOL_MINT via loadCloakSdk so the Buffer polyfill
  // runs BEFORE the SDK module-init captures globalThis.Buffer (otherwise the
  // relay later fails with "t.Buffer.from(...).readBigInt64LE is not a
  // function" in production).
  const resolveNativeSolMint = useCallback(async () => {
    const sdk = await loadCloakSdk()
    return sdk.NATIVE_SOL_MINT as PublicKey
  }, [])

  const ensureStealthHasSol = useCallback(
    async (
      stealthPublicKey: string,
      onProgress?: (step: PrivateActionProgress) => void,
    ) => {
      onProgress?.("check-balance")
      const stealthPk = new PublicKey(stealthPublicKey)
      const balance = BigInt(await connection.getBalance(stealthPk, "confirmed"))
      if (balance >= MIN_SOL_FLOOR_LAMPORTS) return // enough already
      onProgress?.("topup-sol")
      const NATIVE_SOL_MINT = await resolveNativeSolMint()
      await fundStealthWallet({
        connection,
        funderPublicKey: publicKey!,
        funderWallet: wallet,
        mint: NATIVE_SOL_MINT,
        amount: SOL_TOPUP_LAMPORTS,
        stealthRecipient: stealthPk,
        onProgress: (s) => console.log("[cloak/topup-sol]", s),
        onProofProgress: (p) => console.log(`[cloak/topup-sol] proof ${p.toFixed(1)}%`),
      })
    },
    [connection, publicKey, wallet, resolveNativeSolMint],
  )

  /**
   * Repay a private loan from the borrower stealth wallet.
   *
   * Tops up the stealth with the debt token + SOL fee buffer (combined into
   * one Cloak round-trip when debt == SOL) before submitting the Anchor tx.
   */
  const repayPrivate = useCallback(
    async (
      params: {
        loan: ParsedLoan
        stealthPublicKey: string
        repayAmount: number
      },
      onProgress?: (step: PrivateActionProgress) => void,
    ): Promise<{ txHash: string }> => {
      const { loan, stealthPublicKey, repayAmount } = params
      onProgress?.("auth")
      const auth = await buildAuth("Repay private loan")
      const NATIVE_SOL_MINT = await resolveNativeSolMint()

      const debtMint = getTokenMint(loan.debtTokenSymbol)
      const debtDecimals = getTokenDecimals(loan.debtTokenSymbol)
      const debtTokenIsSol = debtMint.equals(NATIVE_SOL_MINT)
      const debtRaw = BigInt(Math.round(repayAmount * 10 ** debtDecimals))
      const stealthPk = new PublicKey(stealthPublicKey)

      if (debtTokenIsSol) {
        // SOL debt: top up principal + buffer in one Cloak round-trip.
        onProgress?.("topup-token")
        await fundStealthWallet({
          connection,
          funderPublicKey: publicKey!,
          funderWallet: wallet,
          mint: NATIVE_SOL_MINT,
          amount: debtRaw + SOL_TOPUP_LAMPORTS,
          stealthRecipient: stealthPk,
          onProgress: (s) => console.log("[cloak/repay-sol]", s),
          onProofProgress: (p) => console.log(`[cloak/repay-sol] proof ${p.toFixed(1)}%`),
        })
      } else {
        // SPL debt: SOL fee buffer + the SPL repayment amount in two trips.
        await ensureStealthHasSol(stealthPublicKey, onProgress)
        onProgress?.("topup-token")
        await fundStealthWallet({
          connection,
          funderPublicKey: publicKey!,
          funderWallet: wallet,
          mint: debtMint,
          amount: debtRaw,
          stealthRecipient: stealthPk,
          onProgress: (s) => console.log(`[cloak/repay-${loan.debtTokenSymbol}]`, s),
          onProofProgress: (p) =>
            console.log(`[cloak/repay-${loan.debtTokenSymbol}] proof ${p.toFixed(1)}%`),
        })
      }

      onProgress?.("submit")
      const res = await fetch("/api/private-loan/repay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...auth,
          stealthPublicKey,
          loanPublicKey: loan.publicKey,
          repayAmount,
        }),
      })
      const body = await res.json()
      if (!res.ok || !body.txHash) {
        throw new Error(body.error || "Failed to repay private loan")
      }
      return { txHash: body.txHash }
    },
    [buildAuth, connection, publicKey, wallet, resolveNativeSolMint, ensureStealthHasSol],
  )

  const cancelPrivate = useCallback(
    async (
      params: {
        loan: ParsedLoan
        stealthPublicKey: string
      },
      onProgress?: (step: PrivateActionProgress) => void,
    ): Promise<{ txHash: string }> => {
      const { loan, stealthPublicKey } = params
      onProgress?.("auth")
      const auth = await buildAuth("Cancel private offer")
      await ensureStealthHasSol(stealthPublicKey, onProgress)

      onProgress?.("submit")
      const res = await fetch("/api/private-loan/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...auth,
          stealthPublicKey,
          loanPublicKey: loan.publicKey,
        }),
      })
      const body = await res.json()
      if (!res.ok || !body.txHash) {
        throw new Error(body.error || "Failed to cancel private offer")
      }
      return { txHash: body.txHash }
    },
    [buildAuth, ensureStealthHasSol],
  )

  const foreclosePrivate = useCallback(
    async (
      params: {
        loan: ParsedLoan
        stealthPublicKey: string
      },
      onProgress?: (step: PrivateActionProgress) => void,
    ): Promise<{ txHash: string }> => {
      const { loan, stealthPublicKey } = params
      onProgress?.("auth")
      const auth = await buildAuth("Foreclose private loan")
      await ensureStealthHasSol(stealthPublicKey, onProgress)

      onProgress?.("submit")
      const res = await fetch("/api/private-loan/foreclose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...auth,
          stealthPublicKey,
          loanPublicKey: loan.publicKey,
        }),
      })
      const body = await res.json()
      if (!res.ok || !body.txHash) {
        throw new Error(body.error || "Failed to foreclose private loan")
      }
      return { txHash: body.txHash }
    },
    [buildAuth, ensureStealthHasSol],
  )

  /**
   * Accept an existing pending offer using a fresh stealth wallet.
   *
   * Resolves the role from loan state:
   *   - loan.lender set → stealth becomes borrower → fund collateral + SOL
   *   - loan.borrower set → stealth becomes lender → fund debt + SOL
   *
   * Combines token + SOL into one Cloak round-trip when the funded token is
   * SOL itself (avoids the "two same-mint shields in a row" SDK race we hit
   * during create — see `usePrivateLoanFlow` notes).
   */
  const acceptPrivate = useCallback(
    async (
      params: { loan: ParsedLoan },
      onProgress?: (step: PrivateActionProgress) => void,
    ): Promise<{ txHash: string; stealthPublicKey: string; role: "borrower" | "lender" }> => {
      const { loan } = params

      const stealthBecomesBorrower = !!loan.lender && !loan.borrower
      const stealthBecomesLender = !!loan.borrower && !loan.lender
      if (!stealthBecomesBorrower && !stealthBecomesLender) {
        throw new Error("Loan is not in a pending-open state — cannot accept")
      }

      onProgress?.("auth")
      const auth = await buildAuth("Accept private loan")

      onProgress?.("init")
      const initRes = await fetch("/api/private-offer/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(auth),
      })
      const initBody = await initRes.json()
      if (!initRes.ok || !initBody.stealthPublicKey) {
        throw new Error(initBody.error || "Failed to init stealth wallet")
      }
      const stealthPublicKey: string = initBody.stealthPublicKey
      const stealthPk = new PublicKey(stealthPublicKey)
      const NATIVE_SOL_MINT = await resolveNativeSolMint()

      // Borrower needs collateral; lender needs debt.
      const tokenSymbol = stealthBecomesBorrower
        ? loan.collateralTokenSymbol
        : loan.debtTokenSymbol
      const tokenAmount = stealthBecomesBorrower
        ? loan.collateralAmountUi
        : loan.debtAmountUi
      const tokenMint = getTokenMint(tokenSymbol)
      const tokenDecimals = getTokenDecimals(tokenSymbol)
      const tokenIsSol = tokenMint.equals(NATIVE_SOL_MINT)
      const tokenRaw = BigInt(Math.round(tokenAmount * 10 ** tokenDecimals))

      if (tokenIsSol) {
        onProgress?.("topup-token")
        await fundStealthWallet({
          connection,
          funderPublicKey: publicKey!,
          funderWallet: wallet,
          mint: NATIVE_SOL_MINT,
          amount: tokenRaw + SOL_TOPUP_LAMPORTS,
          stealthRecipient: stealthPk,
          onProgress: (s) => console.log("[cloak/accept-sol]", s),
          onProofProgress: (p) => console.log(`[cloak/accept-sol] proof ${p.toFixed(1)}%`),
        })
      } else {
        onProgress?.("topup-sol")
        await fundStealthWallet({
          connection,
          funderPublicKey: publicKey!,
          funderWallet: wallet,
          mint: NATIVE_SOL_MINT,
          amount: SOL_TOPUP_LAMPORTS,
          stealthRecipient: stealthPk,
          onProgress: (s) => console.log("[cloak/accept-sol-buf]", s),
          onProofProgress: (p) => console.log(`[cloak/accept-sol-buf] proof ${p.toFixed(1)}%`),
        })
        onProgress?.("topup-token")
        await fundStealthWallet({
          connection,
          funderPublicKey: publicKey!,
          funderWallet: wallet,
          mint: tokenMint,
          amount: tokenRaw,
          stealthRecipient: stealthPk,
          onProgress: (s) => console.log(`[cloak/accept-${tokenSymbol}]`, s),
          onProofProgress: (p) =>
            console.log(`[cloak/accept-${tokenSymbol}] proof ${p.toFixed(1)}%`),
        })
      }

      onProgress?.("submit")
      const res = await fetch("/api/private-loan/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...auth,
          stealthPublicKey,
          loanPublicKey: loan.publicKey,
        }),
      })
      const respBody = await res.json()
      if (!res.ok || !respBody.txHash) {
        throw new Error(respBody.error || "Failed to accept private offer")
      }
      return {
        txHash: respBody.txHash,
        stealthPublicKey,
        role: stealthBecomesBorrower ? "borrower" : "lender",
      }
    },
    [buildAuth, connection, publicKey, wallet, resolveNativeSolMint],
  )

  return { repayPrivate, cancelPrivate, foreclosePrivate, acceptPrivate }
}
