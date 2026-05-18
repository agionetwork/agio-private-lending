"use client"

import {
  maxDebtUsd,
  safetyRatio,
  healthZone,
  assessLiquidationRisk,
  recommendedAdditionalCollateral,
} from "@/lib/loan-math"
import { cn } from "@/lib/utils"

interface Props {
  collateralValueUsd: number
  principalUsd: number
  apyBps: number
  durationSeconds: number
  collateralSymbol: string
  /** Debt/principal token — needed to detect debt-appreciation risk. */
  debtSymbol?: string
  collateralPriceUsd?: number
  className?: string
}

/**
 * One-line liquidation-risk preview. The prose is neutral (white) so it never
 * visually contradicts the health bar; only the figures (%, days, token
 * amount) are tinted, and that tint follows the SAME zone the bar shows
 * (healthZone of the at-maturity safety ratio) so text and bar always agree.
 */
export function WorstCasePreview({
  collateralValueUsd,
  principalUsd,
  apyBps,
  durationSeconds,
  collateralSymbol,
  debtSymbol,
  collateralPriceUsd,
  className,
}: Props) {
  if (principalUsd <= 0 || collateralValueUsd <= 0) return null

  const debtTotalUsd = maxDebtUsd(principalUsd, apyBps, durationSeconds)
  const durationDays = durationSeconds / 86400

  // Zone = exactly what RiskZoneBar paints.
  const ratio = safetyRatio(collateralValueUsd, principalUsd, apyBps, durationSeconds)
  const zone = healthZone(ratio)

  // Direction-aware probability (debt token may appreciate, not just
  // collateral dropping).
  const risk = assessLiquidationRisk(
    collateralValueUsd,
    debtTotalUsd,
    durationDays,
    collateralSymbol,
    debtSymbol ?? collateralSymbol,
  )
  const price = collateralPriceUsd ?? 0
  const rec = recommendedAdditionalCollateral(
    collateralValueUsd,
    debtTotalUsd,
    durationDays,
    collateralSymbol,
    price,
    15,
    debtSymbol,
  )
  const addAmount = rec?.amount
  const p = Math.round(risk.percent)

  const numClass =
    zone === "green"
      ? "text-emerald-600 dark:text-emerald-500"
      : zone === "yellow"
        ? "text-yellow-600 dark:text-yellow-500"
        : zone === "orange"
          ? "text-orange-600 dark:text-orange-500"
          : "text-red-600 dark:text-red-500"

  const Num = ({ children }: { children: React.ReactNode }) => (
    <span className={cn("font-semibold not-italic", numClass)}>{children}</span>
  )

  // Wording severity follows the bar zone (not the divergent probability),
  // so a green bar never reads as "high risk".
  let body: React.ReactNode
  if (risk.direction === "debt_appreciates") {
    body = (
      <>
        Liquidation risk (<Num>~{p}%</Num>) comes from {debtSymbol} appreciating
        — your {collateralSymbol} collateral is stable but the {debtSymbol} you
        owe may rise in value.
        {addAmount ? (
          <>
            {" "}
            Add <Num>{addAmount} {collateralSymbol}</Num> for a safer position.
          </>
        ) : null}
      </>
    )
  } else if (zone === "green") {
    body = (
      <>
        Low liquidation risk (<Num>~{p}%</Num>). Your collateral has a
        comfortable margin.
      </>
    )
  } else if (zone === "yellow") {
    body = (
      <>
        Moderate risk (<Num>~{p}%</Num>).
        {addAmount ? (
          <>
            {" "}
            Add <Num>{addAmount} {collateralSymbol}</Num> for a safer position.
          </>
        ) : null}
      </>
    )
  } else if (zone === "orange") {
    body = (
      <>
        Elevated risk (<Num>~{p}%</Num>) — {collateralSymbol} volatility may
        trigger liquidation.
        {addAmount ? (
          <>
            {" "}
            Add <Num>{addAmount} {collateralSymbol}</Num> to de-risk.
          </>
        ) : null}
      </>
    )
  } else {
    body = (
      <>
        Critical risk (<Num>~{p}%</Num>). Very likely to be liquidated before
        the deadline.
        {addAmount ? (
          <>
            {" "}
            Add <Num>{addAmount} {collateralSymbol}</Num> or reduce the
            duration.
          </>
        ) : null}
      </>
    )
  }

  return (
    <p className={cn("mt-2 text-xs italic text-foreground", className)}>{body}</p>
  )
}
