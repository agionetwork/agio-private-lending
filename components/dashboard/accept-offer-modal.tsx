"use client"

import { useCallback, useRef, useState } from "react"
import { toast } from "sonner"
import { Eye, EyeOff } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useTapestryProfile } from "@/components/tapestry-profile-provider"
import {
  usePrivateLoanActions,
  type PrivateActionProgress,
} from "@/hooks/usePrivateLoanActions"
import type { ParsedLoan } from "@/hooks/useLoans"

interface AcceptOfferModalProps {
  loan: ParsedLoan
  /** Surface label on the trigger button — "Borrow" or "Lend". */
  label: string
  /** Trigger button className — caller controls colour (red for borrow). */
  triggerClassName?: string
  /** Already-running flag from the parent (public accept in flight). */
  parentBusy?: boolean
  /** Hide the public option (e.g. counterparty is stealth — accepting publicly
   *  would deanonymise them). */
  hidePublic?: boolean
  /** Called with the public-accept flow; the parent owns it because each
   *  dashboard has its own borrow/lend hook variant. */
  onAcceptPublic: () => Promise<void> | void
  /** Refresh after a private accept completes. */
  onPrivateSuccess?: () => void
  size?: "sm" | "default"
  disabled?: boolean
  /** Trigger button colour family. Borrow context = destructive (red),
   *  lend context = default (blue). */
  triggerVariant?: "destructive" | "default"
}

/**
 * Single accept button that opens a small modal letting the user pick between
 * a public on-chain accept (their wallet is the counterparty) and a private
 * accept that mints a fresh stealth wallet via Cloak. Replaces the previous
 * dual-button row in the dashboard's "Available Offers" tables.
 */
export function AcceptOfferModal({
  loan,
  label,
  triggerClassName,
  parentBusy,
  hidePublic,
  onAcceptPublic,
  onPrivateSuccess,
  size = "sm",
  disabled,
  triggerVariant = "destructive",
}: AcceptOfferModalProps) {
  const { acceptPrivate } = usePrivateLoanActions()
  const { postActivity } = useTapestryProfile()
  const [open, setOpen] = useState(false)
  const [privateProcessing, setPrivateProcessing] = useState(false)
  const [step, setStep] = useState<PrivateActionProgress | null>(null)
  const busyRef = useRef(false)

  const handlePrivate = useCallback(async () => {
    if (busyRef.current) return
    busyRef.current = true
    setPrivateProcessing(true)
    try {
      const result = await acceptPrivate({ loan }, (s) => setStep(s))
      toast.success("Offer accepted privately!", {
        description: `${result.role === "borrower" ? "Borrowed" : "Lent"} ${loan.debtAmountUi.toFixed(2)} ${loan.debtTokenSymbol} via stealth wallet`,
      })
      postActivity("accepted", {
        debtToken: loan.debtTokenSymbol,
        collateralToken: loan.collateralTokenSymbol,
        amount: loan.debtAmountUi,
        apy: loan.apy,
      })
      onPrivateSuccess?.()
      setOpen(false)
    } catch (err: any) {
      console.error("Private accept failed:", err)
      toast.error("Failed to accept privately", {
        description: err?.message || "Please try again.",
      })
    } finally {
      setPrivateProcessing(false)
      setStep(null)
      busyRef.current = false
    }
  }, [acceptPrivate, loan, postActivity, onPrivateSuccess])

  const handlePublic = useCallback(async () => {
    setOpen(false)
    await onAcceptPublic()
  }, [onAcceptPublic])

  const privateLabel = (() => {
    if (!privateProcessing) return "Accept privately"
    switch (step) {
      case "auth": return "Signing…"
      case "init": return "Creating stealth…"
      case "topup-sol": return "Topping up SOL…"
      case "topup-token": return "Funding via Cloak…"
      case "submit": return "Accepting on-chain…"
      default: return "Confirming…"
    }
  })()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size={size}
          variant={triggerVariant}
          className={triggerClassName}
          disabled={disabled || parentBusy}
        >
          {parentBusy ? "Confirming..." : label}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>How would you like to {label.toLowerCase()}?</DialogTitle>
          <DialogDescription>
            Pick public for a normal on-chain accept. Pick private to route through
            a fresh stealth wallet funded via Cloak — the on-chain counterparty
            becomes the stealth pubkey instead of your main wallet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          {!hidePublic && (
            <button
              type="button"
              onClick={handlePublic}
              disabled={privateProcessing || parentBusy}
              className="w-full text-left p-4 rounded-lg border border-foreground/10 hover:border-foreground/25 hover:bg-foreground/[0.03] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-start gap-3">
                <Eye className="h-5 w-5 mt-0.5 text-foreground/70" />
                <div className="flex-1">
                  <div className="font-semibold text-sm">Accept publicly</div>
                  <div className="text-xs text-foreground/65 mt-0.5">
                    Your wallet is the on-chain counterparty. Single transaction,
                    no extra delay.
                  </div>
                </div>
              </div>
            </button>
          )}

          <button
            type="button"
            onClick={handlePrivate}
            disabled={privateProcessing || parentBusy}
            className="w-full text-left p-4 rounded-lg border border-blue-500/30 hover:border-blue-400 hover:bg-blue-500/[0.06] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-start gap-3">
              <EyeOff className="h-5 w-5 mt-0.5 text-blue-500" />
              <div className="flex-1">
                <div className="font-semibold text-sm flex items-center gap-2">
                  {privateLabel}
                  <span className="px-1.5 py-0 text-[10px] rounded bg-blue-500/15 text-blue-300 border border-blue-300/30">
                    private
                  </span>
                </div>
                <div className="text-xs text-foreground/65 mt-0.5">
                  Mints a one-shot stealth wallet, funds it via Cloak, accepts the
                  offer as that stealth. Adds ~30s for the shield round-trip.
                </div>
              </div>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
