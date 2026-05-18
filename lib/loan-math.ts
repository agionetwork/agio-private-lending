/**
 * Shared loan-safety math. Mirrors `agio-program/programs/agio/src/utils/safety.rs`
 * so the frontend's slider clamps and the on-chain validation never disagree.
 *
 * The single constraint:
 *
 *   collateral_value_usd ≥ LIQUIDATION_THRESHOLD × principal_usd × (1 + apy_decimal × duration_years)
 *
 * Everything else in this file is a rearrangement of that inequality.
 */

// Loan-safety thresholds (V1 health model — zones tell the truth).
//   GREEN       (1.50 / 150%) — safe, low liquidation risk
//   CREATION    (1.25 / 125%) — minimum to open a loan; yellow zone starts here
//   WARNING     (1.15 / 115%) — orange, add collateral now
//   FORECLOSURE (1.10 / 110%) — liquidatable (foreclosure trigger, unchanged)
// All ratios are collateral_value_usd / debt_total_usd.
//
// A loan created at the 125% minimum starts in YELLOW (not green) so the
// borrower is nudged to add collateral without being blocked from creating.
export const GREEN_THRESHOLD = 1.5
export const CREATION_THRESHOLD = 1.25
export const WARNING_THRESHOLD = 1.15
export const FORECLOSURE_THRESHOLD = 1.1

// On foreclosure the collateral is swapped to the debt token and split:
// lender gets the debt, protocol takes a 5% fee, borrower keeps the rest.
// The swap reverts if Jupiter slippage exceeds 5%.
export const LIQUIDATION_FEE_BPS = 500
export const MAX_SWAP_SLIPPAGE_BPS = 500

// Back-compat: `LIQUIDATION_THRESHOLD` historically meant the creation floor
// (minCollateralUsd uses it). Keep it pinned to the creation threshold so the
// existing math and tests stay numerically identical.
export const LIQUIDATION_THRESHOLD = CREATION_THRESHOLD
export const SECONDS_PER_YEAR = 31_536_000

// Protocol-wide APY ceiling. Raised to 100% — the collateral formula
// self-regulates (higher APY → higher debt_total → more collateral
// required), so no artificial low cap is needed. The on-chain `apy` field
// is u8 and DEFAULT_MAX_APY is 200 there, so 100 is well within range.
export const MAX_APY_PCT = 100
export const MAX_APY_BPS = MAX_APY_PCT * 100 // 10000 bps

// Boundaries used by RiskZoneBar to color the meter.
// Ratio = collateral_value / max_debt_at_maturity.
//   red    < 1.15
//   orange 1.15–1.25
//   yellow 1.25–1.50
//   green  ≥ 1.50
export const RATIO_GREEN = GREEN_THRESHOLD // ≥ 1.50 → green
export const RATIO_CREATION = CREATION_THRESHOLD // 1.25–1.50 → yellow
export const RATIO_WARNING = WARNING_THRESHOLD // 1.15–1.25 → orange
export const RATIO_LIQUIDATION = WARNING_THRESHOLD // < 1.15 → red
// Deprecated alias kept so older importers/tests keep compiling.
export const RATIO_STRESSED = GREEN_THRESHOLD

export function maxDebtUsd(
  principalUsd: number,
  apyBps: number,
  durationSeconds: number,
): number {
  const apyDecimal = apyBps / 10_000
  const durationYears = durationSeconds / SECONDS_PER_YEAR
  return principalUsd * (1 + apyDecimal * durationYears)
}

export function minCollateralUsd(
  principalUsd: number,
  apyBps: number,
  durationSeconds: number,
): number {
  return LIQUIDATION_THRESHOLD * maxDebtUsd(principalUsd, apyBps, durationSeconds)
}

export function isLoanSafe(
  collateralValueUsd: number,
  principalUsd: number,
  apyBps: number,
  durationSeconds: number,
): boolean {
  if (principalUsd <= 0 || durationSeconds <= 0 || apyBps < 0) return false
  return collateralValueUsd >= minCollateralUsd(principalUsd, apyBps, durationSeconds)
}

/**
 * Largest APY (in bps) that keeps the loan safe given the chosen collateral
 * and duration. Returns 0 if even APY=0 would already be unsafe (i.e. the
 * collateral is below 1.2× the principal).
 */
export function maxApyBps(
  collateralValueUsd: number,
  principalUsd: number,
  durationSeconds: number,
): number {
  if (principalUsd <= 0 || durationSeconds <= 0) return 0
  const ratio = collateralValueUsd / (LIQUIDATION_THRESHOLD * principalUsd) - 1
  if (ratio <= 0) return 0
  const bps = Math.floor((ratio * 10_000 * SECONDS_PER_YEAR) / durationSeconds)
  return Math.min(bps, MAX_APY_BPS)
}

/**
 * Smallest collateral value (USD) that keeps the loan safe. Same as
 * `minCollateralUsd` but named for the slider's "snap up" path.
 */
export function minSafeCollateralUsd(
  principalUsd: number,
  apyBps: number,
  durationSeconds: number,
): number {
  return minCollateralUsd(principalUsd, apyBps, durationSeconds)
}

/**
 * The % drop in collateral price that would push the loan over the
 * liquidation line. 0 means the loan is already at/under the line.
 */
export function worstCasePriceDropPct(
  collateralValueUsd: number,
  principalUsd: number,
  apyBps: number,
  durationSeconds: number,
): number {
  if (collateralValueUsd <= 0) return 0
  const minNeeded = minCollateralUsd(principalUsd, apyBps, durationSeconds)
  return Math.max(0, (1 - minNeeded / collateralValueUsd) * 100)
}

/**
 * collateral / max_debt — the raw collateralization ratio at maturity.
 * RiskZoneBar uses this against RATIO_LIQUIDATION / RATIO_STRESSED.
 */
export function safetyRatio(
  collateralValueUsd: number,
  principalUsd: number,
  apyBps: number,
  durationSeconds: number,
): number {
  const debt = maxDebtUsd(principalUsd, apyBps, durationSeconds)
  if (debt <= 0) return 0
  return collateralValueUsd / debt
}

export type SafetyZone = "safe" | "stressed" | "liquidation"

/**
 * @deprecated Three-state zone tied to the old single-threshold model.
 * Use {@link healthZone} for the 125/115/110 model. Kept for back-compat.
 */
export function safetyZone(ratio: number): SafetyZone {
  if (ratio < RATIO_STRESSED && ratio >= CREATION_THRESHOLD) return "stressed"
  if (ratio < CREATION_THRESHOLD) return "liquidation"
  return "safe"
}

export type HealthZone = "green" | "yellow" | "orange" | "red"

/**
 * Health factor = collateral_value_usd / debt_total_usd.
 * `debtTotalUsd` is principal + interest accrued for the period.
 */
export function healthFactor(collateralValueUsd: number, debtTotalUsd: number): number {
  if (debtTotalUsd <= 0) return 0
  return collateralValueUsd / debtTotalUsd
}

/**
 * V1 health zones (colors that tell the truth):
 *   green  ≥ 1.50 — safe, low liquidation risk
 *   yellow ≥ 1.25 — moderate (a loan opened at the 125% minimum lands here)
 *   orange ≥ 1.15 — danger, add collateral now
 *   red    < 1.15 — critical, foreclosure soon (trigger is < 1.10)
 */
export function healthZone(hf: number): HealthZone {
  if (hf >= GREEN_THRESHOLD) return "green"
  if (hf >= CREATION_THRESHOLD) return "yellow"
  if (hf >= WARNING_THRESHOLD) return "orange"
  return "red"
}

/** Hex color for a health zone (matches the UI gradient + spec). */
export function healthZoneColor(zone: HealthZone): string {
  switch (zone) {
    case "green":
      return "#22c55e"
    case "yellow":
      return "#eab308"
    case "orange":
      return "#f97316"
    default:
      return "#ef4444"
  }
}

// Approx. daily price volatility (σ, decimal) per collateral token. Stable
// tokens are ~flat; SOL-likes are treated as ~4.5%/day (30-day historical).
const DAILY_VOLATILITY: Record<string, number> = {
  USDC: 0.0005,
  EURC: 0.001,
  SOL: 0.045,
  bSOL: 0.045,
  mSOL: 0.045,
  JitoSOL: 0.045,
}

export function dailyVolatility(symbol: string): number {
  return DAILY_VOLATILITY[symbol] ?? 0.045 // unknown → treat as SOL-like (conservative)
}

/** Standard normal CDF via Abramowitz & Stegun 7.1.26 erf approximation. */
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const d = 0.3989422804014327 * Math.exp(-(z * z) / 2)
  const p =
    d *
    t *
    (0.319381530 +
      t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))))
  return z >= 0 ? 1 - p : p
}

export type RiskLevel = "VERY_LOW" | "LOW" | "MODERATE" | "HIGH" | "CRITICAL"

export function riskLevel(probPct: number): RiskLevel {
  if (probPct < 5) return "VERY_LOW"
  if (probPct < 15) return "LOW"
  if (probPct < 30) return "MODERATE"
  if (probPct < 50) return "HIGH"
  return "CRITICAL"
}

// A token is "stable" if its daily σ is under 0.5%/day.
const STABLE_VOL_THRESHOLD = 0.005
const SOL_LIKE = new Set(["SOL", "bSOL", "mSOL", "JitoSOL", "jitoSOL"])

export type RiskDirection =
  | "collateral_drops"
  | "debt_appreciates"
  | "spread_widens"
  | "none"

function isSameAssetClass(a: string, b: string): boolean {
  return SOL_LIKE.has(a) && SOL_LIKE.has(b)
}

/**
 * The risk comes from whichever token can move relative to the other:
 *  - volatile collateral, stable debt  → collateral_drops (σ = collateral)
 *  - stable collateral, volatile debt  → debt_appreciates (σ = debt)
 *  - both stable                       → spread_widens (σ = max, ~0)
 *  - both volatile, same class         → spread_widens (σ = max/10, correlated)
 *  - both volatile, different class    → spread_widens (σ = max)
 *  - same token                        → none
 */
export function getRelevantVolatility(
  collateralSymbol: string,
  debtSymbol: string,
): { sigmaDaily: number; direction: RiskDirection; sourceToken: string } {
  if (collateralSymbol === debtSymbol) {
    return { sigmaDaily: 0, direction: "none", sourceToken: collateralSymbol }
  }
  const sc = dailyVolatility(collateralSymbol)
  const sd = dailyVolatility(debtSymbol)
  const cStable = sc < STABLE_VOL_THRESHOLD
  const dStable = sd < STABLE_VOL_THRESHOLD

  if (!cStable && dStable) {
    return { sigmaDaily: sc, direction: "collateral_drops", sourceToken: collateralSymbol }
  }
  if (cStable && !dStable) {
    return { sigmaDaily: sd, direction: "debt_appreciates", sourceToken: debtSymbol }
  }
  if (cStable && dStable) {
    const sigmaDaily = Math.max(sc, sd)
    return {
      sigmaDaily,
      direction: "spread_widens",
      sourceToken: sd >= sc ? debtSymbol : collateralSymbol,
    }
  }
  // both volatile
  const maxSym = sd >= sc ? debtSymbol : collateralSymbol
  const maxSigma = Math.max(sc, sd)
  const sigmaDaily = isSameAssetClass(collateralSymbol, debtSymbol)
    ? maxSigma / 10
    : maxSigma
  return { sigmaDaily, direction: "spread_widens", sourceToken: maxSym }
}

/**
 * Core risk geometry. `buffer` is the fractional move (of the relevant token)
 * that would push the loan to the 1.10 foreclosure line:
 *  - collateral_drops / spread_widens: (collateral − debt×1.10) / collateral
 *  - debt_appreciates:                  collateral / (debt×1.10) − 1
 */
function riskCore(
  collateralValueUsd: number,
  debtTotalUsd: number,
  durationDays: number,
  collateralSymbol: string,
  debtSymbol?: string,
): {
  sigmaDaily: number
  sigmaPeriod: number
  buffer: number
  direction: RiskDirection
  sourceToken: string
} {
  // Back-compat: no debt symbol → legacy collateral-drops model.
  const sel = debtSymbol
    ? getRelevantVolatility(collateralSymbol, debtSymbol)
    : {
        sigmaDaily: dailyVolatility(collateralSymbol),
        direction: "collateral_drops" as RiskDirection,
        sourceToken: collateralSymbol,
      }
  const days = Math.max(durationDays, 1 / 24)
  const sigmaPeriod = sel.sigmaDaily * Math.sqrt(days)

  let buffer: number
  if (sel.direction === "debt_appreciates") {
    buffer = collateralValueUsd / (debtTotalUsd * FORECLOSURE_THRESHOLD) - 1
  } else {
    buffer =
      (collateralValueUsd - debtTotalUsd * FORECLOSURE_THRESHOLD) / collateralValueUsd
  }
  return { ...sel, sigmaPeriod, buffer }
}

/**
 * Probability (%) the loan is liquidated before the deadline. Driftless
 * lognormal random walk of the *relevant* token (the one that actually
 * drives risk for this pair):
 *
 *   collateral_drops / spread_widens:  z = ln(1 − buffer) / σ_period
 *   debt_appreciates:                  z = −ln(1 + buffer) / σ_period
 *   prob = Φ(z) × 1.2   (1.2 = safety multiplier for model error)
 *
 * Clamped to [0, 99]. `debtSymbol` is optional for back-compat (omitted ⇒
 * legacy collateral-drops behaviour).
 */
export function liquidationProbabilityPct(
  collateralValueUsd: number,
  debtTotalUsd: number,
  durationDays: number,
  collateralSymbol: string,
  debtSymbol?: string,
): number {
  if (collateralValueUsd <= 0 || debtTotalUsd <= 0) return 0
  const { sigmaPeriod, buffer, direction } = riskCore(
    collateralValueUsd,
    debtTotalUsd,
    durationDays,
    collateralSymbol,
    debtSymbol,
  )
  if (direction === "none" || sigmaPeriod <= 1e-9) return 0
  if (buffer <= 0) return 99

  let z: number
  if (direction === "debt_appreciates") {
    z = -Math.log(1 + buffer) / sigmaPeriod
  } else {
    if (buffer >= 1) return 0
    z = Math.log(1 - buffer) / sigmaPeriod
  }
  const prob = normalCdf(z) * 1.2 * 100
  return Math.min(99, Math.max(0, prob))
}

/**
 * Days of typical (1σ) volatility the position can absorb before hitting the
 * foreclosure line, capped at the loan duration. Direction-aware.
 */
export function safetyDays(
  collateralValueUsd: number,
  debtTotalUsd: number,
  durationDays: number,
  collateralSymbol: string,
  debtSymbol?: string,
): number {
  if (collateralValueUsd <= 0 || debtTotalUsd <= 0) return 0
  const { sigmaDaily, buffer, direction } = riskCore(
    collateralValueUsd,
    debtTotalUsd,
    durationDays,
    collateralSymbol,
    debtSymbol,
  )
  if (direction === "none" || sigmaDaily <= 1e-9) return durationDays
  const d = Math.pow(Math.max(0, buffer) / sigmaDaily, 2)
  return Math.min(durationDays, d)
}

/**
 * Full liquidation-risk assessment for a collateral/debt pair, including the
 * risk direction and which token's volatility was used.
 */
export function assessLiquidationRisk(
  collateralValueUsd: number,
  debtTotalUsd: number,
  durationDays: number,
  collateralSymbol: string,
  debtSymbol: string,
): {
  percent: number
  level: RiskLevel
  direction: RiskDirection
  sigmaDailyPct: number
  sourceToken: string
  safetyDays: number
} {
  const { sigmaDaily, direction, sourceToken } = riskCore(
    collateralValueUsd,
    debtTotalUsd,
    durationDays,
    collateralSymbol,
    debtSymbol,
  )
  const percent = liquidationProbabilityPct(
    collateralValueUsd,
    debtTotalUsd,
    durationDays,
    collateralSymbol,
    debtSymbol,
  )
  return {
    percent: Math.round(percent * 10) / 10,
    level: riskLevel(percent),
    direction,
    sigmaDailyPct: Math.round(sigmaDaily * 1000) / 10,
    sourceToken,
    safetyDays:
      Math.round(
        safetyDays(collateralValueUsd, debtTotalUsd, durationDays, collateralSymbol, debtSymbol) *
          10,
      ) / 10,
  }
}

/**
 * Smallest extra collateral (USD, then token amount) to add so the liquidation
 * probability drops below `targetProbPct` (default 15%). Returns null if it's
 * already below target. Binary search on added USD.
 */
export function recommendedAdditionalCollateral(
  collateralValueUsd: number,
  debtTotalUsd: number,
  durationDays: number,
  collateralSymbol: string,
  collateralPriceUsd: number,
  targetProbPct = 15,
  debtSymbol?: string,
): {
  amount: number
  token: string
  resultingHF: number
  resultingZone: HealthZone
  resultingProbability: number
} | null {
  const current = liquidationProbabilityPct(
    collateralValueUsd,
    debtTotalUsd,
    durationDays,
    collateralSymbol,
    debtSymbol,
  )
  if (current <= targetProbPct) return null

  let lo = 0
  let hi = debtTotalUsd * 5 // generous upper bound
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    const p = liquidationProbabilityPct(
      collateralValueUsd + mid,
      debtTotalUsd,
      durationDays,
      collateralSymbol,
      debtSymbol,
    )
    if (p > targetProbPct) lo = mid
    else hi = mid
  }
  const addUsd = hi
  const newCollateralUsd = collateralValueUsd + addUsd
  const resultingHF = healthFactor(newCollateralUsd, debtTotalUsd)
  return {
    amount: collateralPriceUsd > 0 ? Number((addUsd / collateralPriceUsd).toFixed(4)) : 0,
    token: collateralSymbol,
    resultingHF: Math.round(resultingHF * 100) / 100,
    resultingZone: healthZone(resultingHF),
    resultingProbability:
      Math.round(
        liquidationProbabilityPct(
          newCollateralUsd,
          debtTotalUsd,
          durationDays,
          collateralSymbol,
          debtSymbol,
        ) * 10,
      ) / 10,
  }
}

/**
 * % drop in collateral price that brings the loan down to `thresholdRatio`
 * of its total debt. 0 means it's already at/under that line.
 */
export function calculateDropToThreshold(
  collateralValueUsd: number,
  debtTotalUsd: number,
  thresholdRatio: number,
): number {
  if (collateralValueUsd <= 0) return 0
  const thresholdValue = debtTotalUsd * thresholdRatio
  if (collateralValueUsd <= thresholdValue) return 0
  return ((collateralValueUsd - thresholdValue) / collateralValueUsd) * 100
}

/** % collateral-price drop until the loan enters the WARNING zone (115%). */
export function priceDropToWarning(
  collateralValueUsd: number,
  principalUsd: number,
  apyBps: number,
  durationSeconds: number,
): number {
  return calculateDropToThreshold(
    collateralValueUsd,
    maxDebtUsd(principalUsd, apyBps, durationSeconds),
    WARNING_THRESHOLD,
  )
}

/** % collateral-price drop until the loan becomes FORECLOSABLE (110%). */
export function priceDropToForeclosure(
  collateralValueUsd: number,
  principalUsd: number,
  apyBps: number,
  durationSeconds: number,
): number {
  return calculateDropToThreshold(
    collateralValueUsd,
    maxDebtUsd(principalUsd, apyBps, durationSeconds),
    FORECLOSURE_THRESHOLD,
  )
}

/**
 * Estimated foreclosure distribution given the USD value recovered from
 * swapping the collateral. lender ≤ debt_total (never profits); protocol
 * takes up to 5% of debt from the excess; borrower keeps the remainder.
 */
export function foreclosureDistribution(
  swapProceedsUsd: number,
  debtTotalUsd: number,
): { lender: number; protocol: number; borrower: number } {
  const lender = Math.min(swapProceedsUsd, debtTotalUsd)
  const feeCap = (debtTotalUsd * LIQUIDATION_FEE_BPS) / 10_000
  const protocol = Math.min(feeCap, Math.max(0, swapProceedsUsd - lender))
  const borrower = Math.max(0, swapProceedsUsd - lender - protocol)
  return { lender, protocol, borrower }
}

/**
 * Default + minimum collateral percentages per token category. Used to seed
 * the form when the user picks a collateral token. The dynamic safety check
 * still governs — these are just sensible starting points, not guarantees
 * (a 105% USDC default is unsafe at high APY/duration combos).
 *
 * `agioSOL` from the spec is just a display alias for `bSOL`, so the entry
 * lives under the on-chain symbol. `xStock` doesn't exist in the protocol
 * yet and was dropped.
 */
export const COLLATERAL_PRESETS: Record<
  string,
  { defaultCollateralPct: number; minCollateralPct: number }
> = {
  USDC: { defaultCollateralPct: 110, minCollateralPct: 105 },
  EURC: { defaultCollateralPct: 115, minCollateralPct: 105 },
  bSOL: { defaultCollateralPct: 125, minCollateralPct: 120 },
  SOL: { defaultCollateralPct: 150, minCollateralPct: 130 },
}

export function getCollateralPreset(
  symbol: string,
): { defaultCollateralPct: number; minCollateralPct: number } {
  return COLLATERAL_PRESETS[symbol] ?? { defaultCollateralPct: 200, minCollateralPct: 180 }
}
