import { PrivateLoanCostEstimate } from "./types"

/**
 * Default cost coefficients for Cloak ZK proofs on Solana (Apr 2026 estimate).
 * Real numbers come from the SDK at runtime — these are used for the create-offer
 * UI breakdown so the user sees the cost before generating any proof.
 */
const DEFAULTS = {
  privacyPremiumBps: 50,         // +0.5% origination fee
  zkProofSol: 0.005,             // per-proof
  relayerSol: 0.001,             // per-tx
  proofCount: 3,                 // shield + transfer + unshield
}

export function estimatePrivateLoanCost(solUsdPrice: number, overrides: Partial<typeof DEFAULTS> = {}): PrivateLoanCostEstimate {
  const c = { ...DEFAULTS, ...overrides }
  const zkUsd = c.zkProofSol * c.proofCount * solUsdPrice
  const relayerUsd = c.relayerSol * solUsdPrice
  return {
    privacyPremiumBps: c.privacyPremiumBps,
    zkProofSol: c.zkProofSol,
    relayerSol: c.relayerSol,
    proofCount: c.proofCount,
    totalUsd: zkUsd + relayerUsd,
  }
}

/** Format the estimate for the create-offer UI breakdown panel. */
export function formatCostLines(est: PrivateLoanCostEstimate, debtAmountUsd: number): {
  privacyPremium: string
  zkProofs: string
  relayer: string
  totalExtra: string
} {
  const premiumUsd = (est.privacyPremiumBps / 10000) * debtAmountUsd
  return {
    privacyPremium: `+${(est.privacyPremiumBps / 100).toFixed(1)}% ($${premiumUsd.toFixed(2)})`,
    zkProofs: `~${(est.zkProofSol * est.proofCount).toFixed(3)} SOL`,
    relayer: `~${est.relayerSol.toFixed(3)} SOL`,
    totalExtra: `$${(premiumUsd + est.totalUsd).toFixed(2)}`,
  }
}
