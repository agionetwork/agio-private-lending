"use client"

import { useCallback, useRef } from "react"
import { toast } from "sonner"
import {
  MAX_APY_PCT,
  isLoanSafe,
  maxApyBps,
  minSafeCollateralUsd,
  SECONDS_PER_YEAR,
} from "@/lib/loan-math"

interface Args {
  collateralValueUsd: number
  principalUsd: number
  apyPct: number
  durationDays: number
  /**
   * Form's collateral % setter. Called with a NEW collateral percentage
   * (relative to principal), e.g. 175 means "set collateral to 175% of
   * principal value". The form is expected to recompute the underlying
   * token amount from this percentage.
   */
  setCollateralPct: (pct: number) => void
  setApyPct: (pct: number) => void
  setDurationDays: (days: number) => void
  collateralPct: number
}

/**
 * Owns the soft-link clamp logic between the three loan-creation sliders.
 *
 * Rules (mirrors the table in the feature spec):
 *  - APY UP   → if collateral now too low, snap collateral UP + toast
 *  - APY DOWN → no auto-move (user gave up yield, not safety)
 *  - Collateral DOWN → if APY now too high, snap APY DOWN + toast
 *  - Collateral UP   → no auto-move (more safety is always fine)
 *  - Duration ANY    → if invalid, prefer snapping collateral (APY is the
 *    user's economic decision; duration is a constraint)
 *
 * Returns clamped setters that the form should use in place of the raw
 * `setApy`/`setLoanTerm`/`setCollateralPercentage` calls.
 */
export function useRiskClamps(args: Args) {
  const {
    collateralValueUsd,
    principalUsd,
    apyPct,
    durationDays,
    collateralPct,
    setCollateralPct,
    setApyPct,
    setDurationDays,
  } = args

  // Suppress duplicate toasts when the user drags fast across many values.
  // The user only needs to be told ONCE per drag that a clamp happened.
  const lastClampToastAt = useRef(0)
  const fireToast = useCallback((msg: string) => {
    const now = Date.now()
    if (now - lastClampToastAt.current < 800) return
    lastClampToastAt.current = now
    toast(msg, { duration: 2200 })
  }, [])

  const clampedSetApyPct = useCallback(
    (next: number) => {
      const capped = Math.min(MAX_APY_PCT, Math.max(0, next))
      const durationSecs = durationDays * 86_400
      // If APY went UP and collateral now insufficient, snap collateral up.
      if (capped > apyPct && principalUsd > 0) {
        if (!isLoanSafe(collateralValueUsd, principalUsd, capped * 100, durationSecs)) {
          const minColUsd = minSafeCollateralUsd(principalUsd, capped * 100, durationSecs)
          // Convert min-USD back to a percentage of principal.
          const minPct = Math.ceil((minColUsd / principalUsd) * 100)
          setCollateralPct(minPct)
          fireToast("Collateral adjusted to keep loan safe.")
        }
      }
      setApyPct(capped)
    },
    [apyPct, collateralValueUsd, principalUsd, durationDays, setApyPct, setCollateralPct, fireToast],
  )

  const clampedSetCollateralPct = useCallback(
    (next: number) => {
      const safeNext = Math.max(0, next)
      const durationSecs = durationDays * 86_400
      // Collateral going DOWN — if APY no longer fits, snap APY down to ceiling.
      if (safeNext < collateralPct && principalUsd > 0) {
        const newCollateralUsd = (safeNext / 100) * principalUsd
        if (!isLoanSafe(newCollateralUsd, principalUsd, apyPct * 100, durationSecs)) {
          const ceilingBps = maxApyBps(newCollateralUsd, principalUsd, durationSecs)
          const ceilingPct = ceilingBps / 100
          setApyPct(ceilingPct)
          fireToast("APY adjusted to stay within safe collateral range.")
        }
      }
      setCollateralPct(safeNext)
    },
    [collateralPct, apyPct, principalUsd, durationDays, setCollateralPct, setApyPct, fireToast],
  )

  const clampedSetDurationDays = useCallback(
    (next: number) => {
      const safeNext = Math.max(1, Math.min(365, Math.round(next)))
      const durationSecs = safeNext * 86_400
      // Duration changed — prefer snapping collateral (APY is sacred).
      if (principalUsd > 0 && !isLoanSafe(collateralValueUsd, principalUsd, apyPct * 100, durationSecs)) {
        const minColUsd = minSafeCollateralUsd(principalUsd, apyPct * 100, durationSecs)
        const minPct = Math.ceil((minColUsd / principalUsd) * 100)
        setCollateralPct(minPct)
        fireToast("Collateral adjusted to keep loan safe at new duration.")
      }
      setDurationDays(safeNext)
    },
    [collateralValueUsd, principalUsd, apyPct, setDurationDays, setCollateralPct, fireToast],
  )

  // Expose the live ceiling so the APY label can show "max safe APY: X%".
  const apyCeilingPct = (() => {
    if (principalUsd <= 0 || durationDays <= 0) return MAX_APY_PCT
    const bps = maxApyBps(collateralValueUsd, principalUsd, durationDays * 86_400)
    return Math.min(MAX_APY_PCT, bps / 100)
  })()

  return { clampedSetApyPct, clampedSetCollateralPct, clampedSetDurationDays, apyCeilingPct }
}

// Re-export for callers that don't want to import from two files.
export { SECONDS_PER_YEAR }
