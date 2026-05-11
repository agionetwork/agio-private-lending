"use client"

import { worstCasePriceDropPct } from "@/lib/loan-math"
import { cn } from "@/lib/utils"

interface Props {
  collateralValueUsd: number
  principalUsd: number
  apyBps: number
  durationSeconds: number
  collateralSymbol: string
  className?: string
}

/**
 * One-line italic preview of how much the collateral price can drop before
 * the loan crosses the liquidation line. Uses the same `worstCasePriceDropPct`
 * the validator uses, so the headroom shown matches what the contract enforces.
 */
export function WorstCasePreview({
  collateralValueUsd,
  principalUsd,
  apyBps,
  durationSeconds,
  collateralSymbol,
  className,
}: Props) {
  const dropPct = worstCasePriceDropPct(
    collateralValueUsd,
    principalUsd,
    apyBps,
    durationSeconds,
  )

  if (principalUsd <= 0 || collateralValueUsd <= 0) return null

  if (dropPct <= 0) {
    return (
      <p className={cn("mt-2 text-xs italic text-red-500", className)}>
        At current settings, this loan is already inside the liquidation zone.
      </p>
    )
  }

  return (
    <p className={cn("mt-2 text-xs italic text-muted-foreground dark:text-white", className)}>
      If {collateralSymbol} drops{" "}
      <span className="font-medium not-italic text-red-600 dark:text-red-500">
        {dropPct.toFixed(1)}%
      </span>{" "}
      in price, this loan auto-liquidates.
    </p>
  )
}
