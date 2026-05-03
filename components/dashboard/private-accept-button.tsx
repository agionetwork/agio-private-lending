"use client"

import { useCallback, useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useTapestryProfile } from "@/components/tapestry-profile-provider"
import {
  usePrivateLoanActions,
  type PrivateActionProgress,
} from "@/hooks/usePrivateLoanActions"
import type { ParsedLoan } from "@/hooks/useLoans"

interface PrivateAcceptButtonProps {
  loan: ParsedLoan
  /** Surface label inside the button. */
  label: string
  /** Pulled from the parent table so styling stays consistent. */
  className?: string
  size?: "sm" | "default"
  onSuccess?: () => void
  disabled?: boolean
}

/**
 * Drop-in companion to the existing public Accept button. Mints a fresh
 * stealth wallet, funds it via Cloak, then accepts the offer with the stealth
 * as the new counterparty. The on-chain participant is a one-shot pubkey
 * that doesn't link back to the user's main wallet without breaking the
 * Cloak pool's anonymity.
 */
export function PrivateAcceptButton({
  loan,
  label,
  className,
  size = "sm",
  onSuccess,
  disabled,
}: PrivateAcceptButtonProps) {
  const { acceptPrivate } = usePrivateLoanActions()
  const { postActivity } = useTapestryProfile()
  const [isProcessing, setIsProcessing] = useState(false)
  const [step, setStep] = useState<PrivateActionProgress | null>(null)
  const busyRef = useRef(false)

  const handleClick = useCallback(async () => {
    if (busyRef.current) return
    busyRef.current = true
    setIsProcessing(true)
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
      onSuccess?.()
    } catch (err: any) {
      console.error("Private accept failed:", err)
      toast.error("Failed to accept privately", {
        description: err?.message || "Please try again.",
      })
    } finally {
      setIsProcessing(false)
      setStep(null)
      busyRef.current = false
    }
  }, [acceptPrivate, loan, postActivity, onSuccess])

  const buttonText = (() => {
    if (!isProcessing) return label
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
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size={size}
            className={className}
            disabled={disabled || isProcessing}
            onClick={handleClick}
          >
            {buttonText}
            <Badge
              variant="outline"
              className="ml-2 px-1.5 py-0 text-[10px] bg-blue-500/15 text-blue-100 border-blue-300/30"
            >
              private
            </Badge>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          Accept this offer through a fresh stealth wallet funded via Cloak. Adds a
          ~30s shield+unshield round-trip; on-chain counterparty becomes the
          stealth pubkey instead of your wallet.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
