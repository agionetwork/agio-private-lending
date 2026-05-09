"use client"

import {
  RATIO_LIQUIDATION,
  RATIO_STRESSED,
  safetyRatio,
  safetyZone,
} from "@/lib/loan-math"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface Props {
  collateralValueUsd: number
  principalUsd: number
  apyBps: number
  durationSeconds: number
  className?: string
}

/**
 * Two-segment collateralization meter:
 *   start  (0%)   = 1.25× — liquidation boundary (LTV 80%)
 *   middle (50%)  = 1.5×  — stressed/safe boundary
 *   end    (100%) = 1.75×+ — comfortably safe
 *
 * Each half maps to the same 0.25× span, so the marker hits the middle
 * exactly when the loan crosses into the "safe" zone. Below 1.25× the
 * marker pins at the start and the zone label flips to "Liquidation risk".
 */
const RATIO_BAR_END = 1.75
function ratioToBarPct(r: number): number {
  if (r <= RATIO_LIQUIDATION) return 0
  if (r >= RATIO_BAR_END) return 100
  if (r <= RATIO_STRESSED) {
    return ((r - RATIO_LIQUIDATION) / (RATIO_STRESSED - RATIO_LIQUIDATION)) * 50
  }
  return 50 + ((r - RATIO_STRESSED) / (RATIO_BAR_END - RATIO_STRESSED)) * 50
}

export function RiskZoneBar({
  collateralValueUsd,
  principalUsd,
  apyBps,
  durationSeconds,
  className,
}: Props) {
  const ratio = safetyRatio(collateralValueUsd, principalUsd, apyBps, durationSeconds)
  const zone = safetyZone(ratio)
  const markerPct = ratioToBarPct(ratio)

  const zoneLabel =
    zone === "liquidation"
      ? "Liquidation risk"
      : zone === "stressed"
        ? "Stressed"
        : "Safe"

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-baseline justify-between text-xs">
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium text-foreground">LOAN HEALTH</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold cursor-help select-none leading-none transition-colors bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-600 dark:text-blue-200">?</span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs bg-transparent dark:bg-blue-950">
                <p>
                  How much room your collateral has before this loan auto-liquidates. Calculated from your collateral ratio against the 125% liquidation threshold, with worst-case interest accrued through maturity included. Higher is safer.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <span className="font-medium tabular-nums text-red-600 dark:text-red-500">
          {zoneLabel} · {(ratio * 100).toFixed(0)}%
        </span>
      </div>
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-emerald-500">
        {/* 130% acceptance-floor tick (10% of bar) */}
        <div
          className="absolute top-0 bottom-0 w-px bg-black/40 dark:bg-white/40"
          style={{ left: "10%" }}
          aria-hidden
          title="Acceptance floor (130%)"
        />
        {/* 150% creation-min / safe boundary tick at the midpoint */}
        <div
          className="absolute top-0 bottom-0 w-px bg-black/40 dark:bg-white/40"
          style={{ left: "50%" }}
          aria-hidden
        />
        {/* Live marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3.5 w-1.5 rounded-sm bg-foreground shadow-md transition-[left] duration-200 ease-out"
          style={{ left: `${markerPct}%` }}
          aria-label={`Current ratio ${(ratio * 100).toFixed(0)}%`}
        />
      </div>
      <div className="relative h-3.5 text-[10px] text-muted-foreground tabular-nums">
        <span className="absolute left-0 text-red-500 font-medium">125% Liquidation</span>
        <span className="absolute" style={{ left: "10%", transform: "translateX(-50%)" }}>
          130%
        </span>
        <span className="absolute left-1/2 -translate-x-1/2">150%</span>
        <span className="absolute right-0">175%+</span>
      </div>
    </div>
  )
}
