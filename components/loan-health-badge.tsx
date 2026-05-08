"use client"

import { cn } from "@/lib/utils"

export type LoanHealthStatus = "healthy" | "caution" | "at-risk" | "foreclosure" | "pending-ok" | "pending-bad" | "unknown"

interface Props {
  /** Live collateral ratio as a percentage (e.g. 145 means 145%). */
  ratio: number
  /** Whether the loan is still a pending offer (uses acceptance-floor thresholds) or already accepted (uses foreclosure thresholds). */
  isPending?: boolean
  /** Optional className to extend or override styling. */
  className?: string
  /** Compact mode: just the colored pill, no text label. */
  compact?: boolean
}

/**
 * Foreclosure threshold: < 120% (DEFAULT_LIQUIDATION_THRESHOLD = 12000 bps).
 * Acceptance floor: 130% (offers can be created at 150-300%, accepted at >= 130%).
 */
function classify(ratio: number, isPending: boolean): LoanHealthStatus {
  if (!Number.isFinite(ratio) || ratio <= 0) return "unknown"

  if (isPending) {
    return ratio >= 130 ? "pending-ok" : "pending-bad"
  }

  if (ratio >= 150) return "healthy"
  if (ratio >= 130) return "caution"
  if (ratio >= 120) return "at-risk"
  return "foreclosure"
}

const LABELS: Record<LoanHealthStatus, string> = {
  healthy: "Healthy",
  caution: "Caution",
  "at-risk": "At risk",
  foreclosure: "Foreclosure-eligible",
  "pending-ok": "Acceptable",
  "pending-bad": "Below acceptance floor",
  unknown: "Unknown",
}

const STYLES: Record<LoanHealthStatus, string> = {
  healthy: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30",
  caution: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  "at-risk": "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30",
  foreclosure: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/40",
  "pending-ok": "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30",
  "pending-bad": "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/40",
  unknown: "bg-muted text-muted-foreground border-border/40",
}

const TOOLTIPS: Record<LoanHealthStatus, string> = {
  healthy: "At or above 150%. Comfortable buffer over the foreclosure threshold (120%).",
  caution: "Between 130% and 150%. Above the acceptance floor but watch oracle moves.",
  "at-risk": "Between 120% and 130%. Add collateral or repay before the price moves further.",
  foreclosure: "Below 120%. Lender can foreclose at any time. Add collateral immediately.",
  "pending-ok": "At or above the 130% acceptance floor. The offer is acceptable.",
  "pending-bad": "Below the 130% acceptance floor. The offer cannot be accepted as-is.",
  unknown: "Oracle prices unavailable, ratio not computable.",
}

export function LoanHealthBadge({ ratio, isPending = false, className, compact = false }: Props) {
  const status = classify(ratio, isPending)
  const label = LABELS[status]
  const styles = STYLES[status]
  const tooltip = TOOLTIPS[status]
  const ratioStr = Number.isFinite(ratio) && ratio > 0 ? `${ratio.toFixed(0)}%` : "—"

  if (compact) {
    return (
      <span
        title={tooltip}
        className={cn(
          "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
          styles,
          className,
        )}
      >
        {ratioStr}
      </span>
    )
  }

  return (
    <span
      title={tooltip}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        styles,
        className,
      )}
    >
      <span className="font-semibold">{ratioStr}</span>
      <span className="opacity-80">·</span>
      <span>{label}</span>
    </span>
  )
}

/**
 * Bar variant: visual gauge from 100% to 200% with the current ratio marked.
 * Shows clearly how close the loan is to the foreclosure trigger.
 */
export function LoanHealthBar({ ratio, isPending = false, className }: Props) {
  const status = classify(ratio, isPending)
  const styles = STYLES[status]
  const tooltip = TOOLTIPS[status]
  const safe = Number.isFinite(ratio) && ratio > 0 ? ratio : 0

  // Map 100..200% to 0..100% along the bar. Cap at extremes.
  const pct = Math.max(0, Math.min(100, ((safe - 100) / 100) * 100))

  // Tick labels positioned at their REAL location on the 100..200 scale,
  // so 120 sits 20 % across, 150 lands at the midpoint, and 200+ pins to
  // the right edge. Each tick uses translate(-50%) to centre on its
  // line; the 100 / 200+ ends are kept flush left/right so they don't
  // get clipped by the container.
  const TICKS: { value: number; label: string }[] = [
    { value: 100, label: "100%" },
    { value: 120, label: "120%" },
    { value: 150, label: "150%" },
    { value: 200, label: "200%+" },
  ]

  return (
    <div title={tooltip} className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-semibold">{safe > 0 ? `${safe.toFixed(1)}%` : "Ratio unavailable"}</span>
        <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", styles)}>{LABELS[status]}</span>
      </div>
      <div className="relative h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "absolute left-0 top-0 h-full rounded-full transition-all",
            status === "healthy" && "bg-green-500",
            status === "caution" && "bg-yellow-500",
            status === "at-risk" && "bg-orange-500",
            status === "foreclosure" && "bg-red-500",
            status === "pending-ok" && "bg-green-500",
            status === "pending-bad" && "bg-red-500",
            status === "unknown" && "bg-muted-foreground/30",
          )}
          style={{ width: `${pct}%` }}
        />
        {/* Foreclosure marker at 120% (= 20% of bar) */}
        <div
          className="absolute top-0 h-full w-px bg-red-500/60"
          style={{ left: "20%" }}
          title="Foreclosure threshold (120%)"
        />
        {/* Acceptance marker at 130% (= 30% of bar) */}
        <div
          className="absolute top-0 h-full w-px bg-yellow-500/60"
          style={{ left: "30%" }}
          title="Acceptance floor (130%)"
        />
      </div>
      <div className="relative h-4 text-xs font-medium text-muted-foreground">
        {TICKS.map((t) => {
          const left = ((t.value - 100) / 100) * 100
          // Pin the endpoints flush so they don't clip; centre the rest on their tick.
          const transform =
            left <= 0 ? "translateX(0)" : left >= 100 ? "translateX(-100%)" : "translateX(-50%)"
          return (
            <span
              key={t.value}
              className="absolute top-0 tabular-nums"
              style={{ left: `${left}%`, transform }}
            >
              {t.label}
            </span>
          )
        })}
      </div>
    </div>
  )
}
