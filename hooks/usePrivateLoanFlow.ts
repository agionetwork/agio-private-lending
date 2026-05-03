"use client"

import { useCallback } from "react"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js"
import { fundStealthWallet } from "@/lib/cloak/fund-stealth"
import { loadCloakSdk } from "@/lib/cloak/client"
import { getTokenMint, getTokenDecimals } from "@/lib/token-mints"

/**
 * Orchestrates the full private-loan creation flow on the client side.
 *
 * Steps:
 *   1. Sign auth message with the user's main wallet (single popup, reused
 *      across the API calls below).
 *   2. POST /api/private-offer/init — server mints a Privy stealth wallet.
 *   3. Shield→unshield SOL into the stealth (covers tx fees + ATA rent for
 *      the on-chain create-offer).
 *   4. Shield→unshield the loan token (debt for lend, collateral for borrow)
 *      into the stealth.
 *   5. POST /api/private-offer/create-lend or /create-borrow — server posts
 *      Pyth prices, builds the Anchor tx with stealth as signer, and returns
 *      the loan tx hash.
 *
 * Tradeoff documented elsewhere: privacy strength scales with Cloak pool
 * depth and timing jitter; on devnet for the demo, the round-trip is
 * observable. Mainnet pool obscures it.
 */

const SOL_BUFFER_LAMPORTS = BigInt(0.05 * LAMPORTS_PER_SOL)

export type PrivateLoanMode = "lend" | "borrow"

export interface CreatePrivateLoanParams {
  mode: PrivateLoanMode
  debtTokenSymbol: string
  collateralTokenSymbol: string
  /** Loan amount in human units (e.g. 100 for $100 USDC). */
  debtAmount: number
  /** Collateral amount in human units. */
  collateralAmount: number
  /** Loan duration in seconds. */
  duration: number
  /** APY 0-200. */
  apy: number
}

export interface CreatePrivateLoanResult {
  txHash: string
  stealthPublicKey: string
}

export type PrivateLoanProgress =
  | "init"
  | "shield-sol"
  | "shield-token"
  | "create-offer"

export function usePrivateLoanFlow() {
  const { publicKey, signMessage } = useWallet() as any
  const wallet = useWallet()
  const { connection } = useConnection()

  const createPrivateLoan = useCallback(
    async (
      params: CreatePrivateLoanParams,
      onProgress?: (step: PrivateLoanProgress) => void,
    ): Promise<CreatePrivateLoanResult> => {
      if (!publicKey || !signMessage) {
        throw new Error("Wallet not connected or does not support signMessage")
      }

      // Single auth signature reused across all API calls in this flow.
      const message = `Create private loan via Agio at ${new Date().toISOString()}`
      const signatureBytes = await signMessage(new TextEncoder().encode(message))
      const signature = Buffer.from(signatureBytes).toString("base64")
      const wallet58 = publicKey.toBase58()
      const auth = { wallet: wallet58, signature, message }

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
      const stealthRecipient = new PublicKey(stealthPublicKey)

      // NATIVE_SOL_MINT is the wSOL mint constant — same value across networks.
      // We pull it from the devnet SDK so the bundle picks up exactly one Cloak
      // package; the wrapper at lib/cloak/client.ts switches between
      // `@cloak.dev/sdk` (mainnet) and `@cloak.dev/sdk-devnet` based on the RPC.
      // Routed through loadCloakSdk so the Buffer polyfill runs BEFORE the SDK's
      // module-init captures globalThis.Buffer (otherwise it grabs the broken
      // copy and the relay later fails with "t.Buffer.from(...).readBigInt64LE
      // is not a function" in production).
      const sdk = await loadCloakSdk()
      const { NATIVE_SOL_MINT } = sdk

      // Compute the loan-token mint + amount once.
      const loanTokenSymbol =
        params.mode === "lend" ? params.debtTokenSymbol : params.collateralTokenSymbol
      const loanTokenAmount =
        params.mode === "lend" ? params.debtAmount : params.collateralAmount
      const loanTokenMint = getTokenMint(loanTokenSymbol)
      const loanTokenDecimals = getTokenDecimals(loanTokenSymbol)
      const loanTokenAmountRaw = BigInt(
        Math.round(loanTokenAmount * 10 ** loanTokenDecimals),
      )

      // When the loan token is SOL we can fund both fee buffer + loan amount
      // in a SINGLE Cloak round-trip (one shield + one unshield). Two separate
      // round-trips of the same mint were tripping over SDK module-level
      // state and surfacing as 'Local note commitment does not match relay
      // tree at index N'. One call avoids that path entirely and is also
      // ~2x cheaper in fees + proof gen time.
      const loanTokenIsSol = loanTokenMint.equals(NATIVE_SOL_MINT)

      if (loanTokenIsSol) {
        onProgress?.("shield-sol")
        try {
          await fundStealthWallet({
            connection,
            funderPublicKey: publicKey,
            funderWallet: wallet,
            mint: NATIVE_SOL_MINT,
            amount: SOL_BUFFER_LAMPORTS + loanTokenAmountRaw,
            stealthRecipient,
            onProgress: (status) => console.log("[cloak/fund-sol]", status),
            onProofProgress: (pct) =>
              console.log(`[cloak/fund-sol] proof ${pct.toFixed(1)}%`),
          })
        } catch (err: any) {
          throw new Error(`fund-sol failed: ${err?.message ?? err}`)
        }
      } else {
        // Step 2 — fund stealth with SOL fee buffer (separate mint).
        onProgress?.("shield-sol")
        try {
          await fundStealthWallet({
            connection,
            funderPublicKey: publicKey,
            funderWallet: wallet,
            mint: NATIVE_SOL_MINT,
            amount: SOL_BUFFER_LAMPORTS,
            stealthRecipient,
            onProgress: (status) => console.log("[cloak/shield-sol]", status),
            onProofProgress: (pct) =>
              console.log(`[cloak/shield-sol] proof ${pct.toFixed(1)}%`),
          })
        } catch (err: any) {
          throw new Error(`shield-sol failed: ${err?.message ?? err}`)
        }

        // Step 3 — fund stealth with the loan token.
        onProgress?.("shield-token")
        try {
          await fundStealthWallet({
            connection,
            funderPublicKey: publicKey,
            funderWallet: wallet,
            mint: loanTokenMint,
            amount: loanTokenAmountRaw,
            stealthRecipient,
            onProgress: (status) => console.log(`[cloak/shield-${loanTokenSymbol}]`, status),
            onProofProgress: (pct) =>
              console.log(`[cloak/shield-${loanTokenSymbol}] proof ${pct.toFixed(1)}%`),
          })
        } catch (err: any) {
          throw new Error(`shield-${loanTokenSymbol} failed: ${err?.message ?? err}`)
        }
      }

      // Step 4 — server posts Pyth + builds + signs the Anchor tx with stealth.
      onProgress?.("create-offer")
      const endpoint =
        params.mode === "lend"
          ? "/api/private-offer/create-lend"
          : "/api/private-offer/create-borrow"
      const createRes = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...auth,
          stealthPublicKey,
          debtTokenSymbol: params.debtTokenSymbol,
          collateralTokenSymbol: params.collateralTokenSymbol,
          debtAmount: params.debtAmount,
          collateralAmount: params.collateralAmount,
          duration: params.duration,
          apy: params.apy,
        }),
      })
      const createBody = await createRes.json()
      if (!createRes.ok || !createBody.txHash) {
        throw new Error(createBody.error || "Failed to create private offer")
      }

      return { txHash: createBody.txHash, stealthPublicKey }
    },
    [publicKey, signMessage, wallet, connection],
  )

  return { createPrivateLoan }
}
