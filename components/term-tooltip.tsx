"use client"

import { ReactNode } from "react"
import { HelpCircle } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type TermKey =
  | "apy"
  | "collateral-ratio"
  | "origination-fee"
  | "foreclosure"
  | "stealth-wallet"
  | "viewing-key"
  | "private-mode"
  | "exclusive-counterparty"
  | "x402"
  | "mcp"
  | "wsol"
  | "pyth"
  | "fairscale"
  | "tapestry"
  | "auto-loan"
  | "basis-points"
  | "duration"

const TERMS: Record<TermKey, string> = {
  apy: "Annual Percentage Yield. A 30-day loan at 12% APY accrues roughly 1% over the term.",
  "collateral-ratio":
    "(collateral value in USD / debt value in USD) x 100%. Computed live with Pyth prices. Foreclosure-eligible below 120%.",
  "origination-fee":
    "1% of the disbursed debt amount, charged once when a loan is accepted. Goes to the protocol treasury.",
  foreclosure:
    "When a loan's collateral ratio drops below 120%, the lender can seize the collateral. Requires a fresh Pyth price posted on-chain.",
  "stealth-wallet":
    "A fresh, single-purpose Solana wallet used by Private Mode. Funded via Cloak's shielded pool so the on-chain link to your real wallet is broken.",
  "viewing-key":
    "Read-only credential bound to a stealth wallet. Hand it to an auditor to disclose history without granting any spend authority.",
  "private-mode":
    "Opt-in privacy via Cloak: your wallet is replaced on-chain with a stealth address. Adds ~30s latency and ~0.005 SOL of ZK-proof costs per offer.",
  "exclusive-counterparty":
    "Offer mode that names a single wallet as the only acceptor. Hides the offer from public listings.",
  x402:
    "HTTP payment standard used by paid MCP tools. The signed Solana payment proves wallet ownership (payment = auth) and pays the per-call fee in one shot.",
  mcp: "Model Context Protocol. The open standard the Agio MCP server uses to expose 37 tools to AI agents.",
  wsol: "Wrapped SOL. SOL packaged as an SPL token, required for use as collateral. Wrapping/unwrapping is automatic.",
  pyth: "Solana-native oracle network used for collateral pricing. Prices are signed by publishers and posted on-chain via post_update_atomic.",
  fairscale:
    "External on-chain reputation provider. Scores every Agio profile based on loan history, volume, wallet age, and social ties. Powers the leaderboard.",
  tapestry:
    "Open social graph protocol on Solana. Powers Agio profiles, follows, and friendships.",
  "auto-loan":
    "Built-in lending bot that posts and accepts offers automatically based on user-configured rules. Compare with AI Agents (reasoning-based).",
  "basis-points":
    "1/100th of a percent. 130% = 13,000 bps. Used in the on-chain program for thresholds.",
  duration:
    "Loan term in seconds. Interest is accrued for the full term: there is no early-repayment discount.",
}

interface Props {
  term: TermKey
  children?: ReactNode
  /** Show a small help icon after the children. Defaults to true when there are no children. */
  showIcon?: boolean
  className?: string
}

/**
 * Wraps a UI label or value with a hover tooltip that shows a plain-English
 * definition pulled from the in-app glossary. Use sparingly — only for terms
 * a non-DeFi-native user might not understand at a glance.
 */
export function TermTooltip({ term, children, showIcon, className }: Props) {
  const definition = TERMS[term]
  const showHelpIcon = showIcon ?? !children

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("inline-flex items-center gap-1 cursor-help", className)}>
            {children}
            {showHelpIcon && <HelpCircle className="h-3 w-3 opacity-60" />}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs leading-snug" side="top">
          {definition}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
