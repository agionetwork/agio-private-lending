"use client"

import { useEffect, useState } from "react"

/**
 * Returns true iff `address` is a server-known stealth wallet (i.e. someone
 * created it via Cloak/private flow). Used to mask identity displays so a
 * lender/borrower stealth never resolves to a Tapestry profile or SNS domain.
 *
 * Module-level cache (keyed by address) keeps the page's many WalletNameCells
 * from each firing a separate request.
 */

type CacheValue = boolean | "pending"
const cache = new Map<string, CacheValue>()
const subscribers = new Map<string, Set<(v: boolean) => void>>()

async function fetchOne(address: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/stealth/check?address=${encodeURIComponent(address)}`)
    if (!res.ok) return false
    const data = await res.json()
    return Boolean(data?.isStealth)
  } catch {
    return false
  }
}

function notify(address: string, value: boolean) {
  cache.set(address, value)
  const subs = subscribers.get(address)
  if (subs) {
    for (const fn of subs) fn(value)
    subscribers.delete(address)
  }
}

/**
 * Pre-populate the stealth cache for a batch of addresses. Call from a
 * top-level data provider (e.g. LoansProvider) BEFORE rendering child
 * components so each WalletNameCell's `useIsStealth` reads a hot cache and
 * never flashes the raw address. Existing cache entries are not overwritten.
 */
export async function prefetchStealth(addresses: Array<string | null | undefined>): Promise<void> {
  const toFetch = Array.from(
    new Set(
      addresses.filter(
        (a): a is string => typeof a === "string" && a.length > 0 && cache.get(a) === undefined,
      ),
    ),
  )
  if (toFetch.length === 0) return
  // Mark as pending so any in-flight `useIsStealth` calls subscribe instead
  // of firing duplicate single-address requests.
  for (const a of toFetch) cache.set(a, "pending")
  try {
    // Batch endpoint accepts up to 100 ids; chunk just in case.
    const CHUNK = 100
    const stealthSet = new Set<string>()
    for (let i = 0; i < toFetch.length; i += CHUNK) {
      const slice = toFetch.slice(i, i + CHUNK)
      const url = `/api/stealth/check?addresses=${encodeURIComponent(slice.join(","))}`
      const res = await fetch(url)
      if (!res.ok) continue
      const data = await res.json()
      if (Array.isArray(data?.stealthAddresses)) {
        for (const a of data.stealthAddresses) stealthSet.add(a)
      }
    }
    for (const a of toFetch) notify(a, stealthSet.has(a))
  } catch {
    // On failure, settle as `false` so subscribers don't wait forever. The
    // single-address fallback in useIsStealth still kicks in for cache misses.
    for (const a of toFetch) notify(a, false)
  }
}

export function useIsStealth(address: string | null | undefined): boolean {
  // Default to false (don't flash "Anonymous" for non-stealth addresses).
  const initial = address ? cache.get(address) : undefined
  const [isStealth, setIsStealth] = useState<boolean>(
    initial === true ? true : false,
  )

  useEffect(() => {
    if (!address) {
      setIsStealth(false)
      return
    }

    const cached = cache.get(address)
    if (cached === true) {
      setIsStealth(true)
      return
    }
    if (cached === false) {
      setIsStealth(false)
      return
    }

    if (cached === "pending") {
      // Subscribe to the in-flight result.
      let subs = subscribers.get(address)
      if (!subs) {
        subs = new Set()
        subscribers.set(address, subs)
      }
      const cb = (v: boolean) => setIsStealth(v)
      subs.add(cb)
      return () => {
        subs?.delete(cb)
      }
    }

    // First request for this address.
    cache.set(address, "pending")
    let cancelled = false
    fetchOne(address).then((v) => {
      if (!cancelled) setIsStealth(v)
      notify(address, v)
    })
    return () => {
      cancelled = true
    }
  }, [address])

  return isStealth
}
