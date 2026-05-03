'use client'

import { useContext, useMemo, useState, useEffect, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { LoansContext } from '@/components/loans-provider'

// Re-export shared types and functions from loan-utils so existing client
// imports (`from '@/hooks/useLoans'`) keep working without changes.
export { LoanStatus, parseLoanAccounts, getStatusLabel, formatDuration } from '@/lib/loan-utils'
export type { ParsedLoan, OfferType } from '@/lib/loan-utils'

// Import LoanStatus for use inside this file
import { LoanStatus } from '@/lib/loan-utils'

export function useLoans() {
  const context = useContext(LoansContext)
  if (!context) {
    throw new Error('useLoans must be used within a LoansProvider')
  }

  const { loans, loading, error, refetch } = context
  const { publicKey } = useWallet()

  // Resolve agent wallet (Privy wallet) so agent-created loans show as user's own
  const [agentWallet, setAgentWallet] = useState<string | null>(null)
  // Resolve stealth wallets (Cloak privacy mode) so private loans show as user's own
  const [stealthWallets, setStealthWallets] = useState<string[]>([])

  useEffect(() => {
    if (!publicKey) {
      setAgentWallet(null)
      setStealthWallets([])
      return
    }
    const wallet = publicKey.toBase58()
    let cancelled = false

    fetch(`/api/agent/public-key?wallet=${wallet}`)
      .then(res => res.json())
      .then(data => {
        if (!cancelled) setAgentWallet(data.agentPublicKey || null)
      })
      .catch(() => {
        if (!cancelled) setAgentWallet(null)
      })

    fetch(`/api/private-offer/list?wallet=${wallet}`)
      .then(res => res.json())
      .then(data => {
        if (!cancelled) setStealthWallets(Array.isArray(data?.stealthPublicKeys) ? data.stealthPublicKeys : [])
      })
      .catch(() => {
        if (!cancelled) setStealthWallets([])
      })

    return () => { cancelled = true }
  }, [publicKey])

  const stealthSet = useMemo(() => new Set(stealthWallets), [stealthWallets])

  // True iff `addr` is a stealth wallet that the current user owns.
  const isMyStealth = useCallback(
    (addr: string | null) => !!addr && stealthSet.has(addr),
    [stealthSet],
  )

  // Check if an address belongs to the current user (owner wallet, agent wallet, or any of their stealths)
  const isMyWallet = useCallback((addr: string | null) => {
    if (!publicKey || !addr) return false
    const pk = publicKey.toBase58()
    if (addr === pk) return true
    if (agentWallet !== null && addr === agentWallet) return true
    if (stealthSet.has(addr)) return true
    return false
  }, [publicKey, agentWallet, stealthSet])

  // Filter helpers — match owner, agent, and stealth wallets
  const myBorrowedLoans = useMemo(() => {
    if (!publicKey) return []
    return loans.filter(l => isMyWallet(l.borrower))
  }, [loans, publicKey, isMyWallet])

  const myLentLoans = useMemo(() => {
    if (!publicKey) return []
    return loans.filter(l => isMyWallet(l.lender))
  }, [loans, publicKey, isMyWallet])

  const myLoans = useMemo(() => {
    if (!publicKey) return []
    return loans.filter(l => isMyWallet(l.borrower) || isMyWallet(l.lender))
  }, [loans, publicKey, isMyWallet])

  const activeLoans = useMemo(() =>
    loans.filter(l => l.status === LoanStatus.Accepted),
  [loans])

  const openOffers = useMemo(() =>
    loans.filter(l => l.status === LoanStatus.Pending && l.privateStatus === 0),
  [loans])

  // Lend offers: lender posted, waiting for borrower to accept (public only)
  const availableLendOffers = useMemo(() =>
    loans.filter(l => l.status === LoanStatus.Pending && l.offerType === 'lend' && l.privateStatus === 0),
  [loans])

  // Borrow requests: borrower posted, waiting for lender to accept (public only)
  const availableBorrowOffers = useMemo(() =>
    loans.filter(l => l.status === LoanStatus.Pending && l.offerType === 'borrow' && l.privateStatus === 0),
  [loans])

  return {
    loans,
    loading,
    error,
    refetch,
    myBorrowedLoans,
    myLentLoans,
    myLoans,
    activeLoans,
    openOffers,
    availableBorrowOffers,
    availableLendOffers,
    agentWallet,
    stealthWallets,
    isMyWallet,
    isMyStealth,
  }
}
