/**
 * Shared types for the Cloak integration. Kept independent of the SDK so the
 * rest of the codebase can compile without `@cloak.dev/sdk` installed.
 */

import type { PublicKey } from "@solana/web3.js"

/** Private offer metadata persisted alongside (or in place of) the public on-chain loan. */
export interface PrivateOfferRef {
  /** Stealth meta-address that owns the offer's shielded UTXO. */
  stealthMeta: string
  /** Encrypted blob describing terms (debt, collateral, apy, duration). */
  termsCiphertext: string
  /** Hash of the cleartext terms — used for matching without revealing. */
  termsHash: string
  /** Cloak UTXO id for the lender's shielded principal (lend mode). */
  principalUtxo?: string
  /** Cloak UTXO id for the borrower's shielded collateral (post-acceptance). */
  collateralUtxo?: string
  createdAt: string
}

export interface PrivateLoanCostEstimate {
  privacyPremiumBps: number     // origination fee delta in basis points
  zkProofSol: number            // per-tx ZK proof cost
  relayerSol: number            // per-tx relayer fee
  proofCount: number            // shield + transfer + unshield = 3 in the basic flow
  totalUsd: number              // sum estimate at current SOL price
}

export interface ShieldOptions {
  mint: PublicKey
  amount: bigint                // raw token amount (smallest units)
  /** Optional stealth meta-address override; defaults to the user's primary meta-address. */
  recipient?: string
}

export interface PrivateTransferOptions {
  fromUtxo: string
  toStealth: string
  mint: PublicKey
  amount: bigint
  memo?: string                 // encrypted memo (terms hash, loan id, etc.)
}

export interface UnshieldOptions {
  fromUtxo: string
  toAddress: PublicKey
  mint: PublicKey
  amount: bigint
}

export interface ViewingKey {
  /** Base58-encoded scoped key. Decrypts memos + UTXO amounts in scope. */
  key: string
  /** Optional Unix timestamp after which the key stops working. */
  expiresAt?: number
  /** Free-form scope (e.g. wallet pubkey, loan id, "platform-audit"). */
  scope: string
}
