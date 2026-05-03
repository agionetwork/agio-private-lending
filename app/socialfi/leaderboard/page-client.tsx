"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Trophy, Award } from "lucide-react"
import Link from "next/link"
import { useLoans, type ParsedLoan } from "@/hooks/useLoans"
import { calculateAllPoints, formatPoints, type TokenPrices } from "@/lib/points"
import { useTokenPrices } from "@/hooks/useTokenPrices"
import { resolveWalletProfiles, getCustomProperty, type TapestryProfileResponse } from "@/lib/tapestry"

interface LeaderboardEntry {
  rank: number
  wallet: string
  points: number
}

// Display names hidden from the public leaderboard (test/seed accounts).
// Filter happens after Tapestry resolution; these names disappear from the
// list and ranks renumber to skip them.
const EXCLUDED_DISPLAY_NAMES = new Set([
  "Agio Test Agent",
  "Lucas Ferreira",
  "Marina Costa",
])

function shortenAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr
  return addr.slice(0, 4) + '...' + addr.slice(-4)
}

function getRankDisplay(rank: number) {
  if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500 mx-auto" />
  if (rank === 2) return <Trophy className="h-5 w-5 text-gray-400 mx-auto" />
  if (rank === 3) return <Trophy className="h-5 w-5 text-orange-500 mx-auto" />
  return <span className="text-muted-foreground font-medium">{rank}</span>
}

function buildLeaderboard(loans: ParsedLoan[], tokenPrices?: TokenPrices): LeaderboardEntry[] {
  const walletPointsMap = calculateAllPoints(loans, tokenPrices)

  const entries: LeaderboardEntry[] = []
  walletPointsMap.forEach((points, wallet) => {
    entries.push({ rank: 0, wallet, points })
  })

  return entries
}

async function mergeAgentPoints(
  entries: LeaderboardEntry[]
): Promise<LeaderboardEntry[]> {
  if (entries.length === 0) return entries

  try {
    const res = await fetch("/api/agent-owners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallets: entries.map((e) => e.wallet) }),
    })
    const { mapping } = (await res.json()) as { mapping: Record<string, string | null> }

    // Merge agent points into owner entries
    const merged = new Map<string, number>()
    for (const entry of entries) {
      const owner = mapping[entry.wallet]
      const target = owner || entry.wallet
      merged.set(target, (merged.get(target) || 0) + entry.points)
    }

    return Array.from(merged.entries()).map(([wallet, points]) => ({
      rank: 0,
      wallet,
      points,
    }))
  } catch {
    return entries // fallback to unmerged
  }
}

interface SocialPointsResponse {
  points: Record<string, { connect: number; profileEdit: number; friends: number; total: number }>
  holders: string[]
}

/**
 * Add off-chain social points (+10 connect, +10 profile edit, +5 per friend)
 * onto on-chain entries, AND surface wallets that have only social activity
 * (connected but never transacted) so they show on the leaderboard too.
 */
async function mergeSocialPoints(
  entries: LeaderboardEntry[]
): Promise<LeaderboardEntry[]> {
  try {
    // Union of on-chain wallets + social-point holders → ensures connect-only
    // users appear in the leaderboard even with zero on-chain activity.
    const initialHoldersRes = await fetch("/api/social-points/all?wallets=")
    const initialBody = (await initialHoldersRes.json()) as SocialPointsResponse
    const allHolders = new Set<string>(initialBody.holders ?? [])
    const onChainSet = new Set(entries.map((e) => e.wallet))
    const socialOnly = [...allHolders].filter((w) => !onChainSet.has(w))
    const allWallets = [...onChainSet, ...socialOnly]
    if (allWallets.length === 0) return entries

    // Now request points for the full union (including social-only wallets).
    const wallets = allWallets.join(",")
    const res = await fetch(`/api/social-points/all?wallets=${encodeURIComponent(wallets)}`)
    const body = (await res.json()) as SocialPointsResponse

    const out: LeaderboardEntry[] = entries.map((e) => ({
      ...e,
      points: e.points + (body.points[e.wallet]?.total ?? 0),
    }))
    for (const w of socialOnly) {
      const total = body.points[w]?.total ?? 0
      if (total > 0) out.push({ rank: 0, wallet: w, points: total })
    }
    return out
  } catch {
    return entries
  }
}

/**
 * Resolve profiles for every entry and drop the test/seed accounts in a single
 * async pass — applied BEFORE setMergedLeaderboard so the table never flashes
 * the excluded entries before settling. Returning the resolved profiles too
 * lets the renderer reuse them without a second resolve cycle.
 */
async function resolveAndFilter(
  entries: LeaderboardEntry[]
): Promise<{ entries: LeaderboardEntry[]; profileMap: Map<string, TapestryProfileResponse> }> {
  if (entries.length === 0) return { entries, profileMap: new Map() }
  let profileMap: Map<string, TapestryProfileResponse>
  try {
    profileMap = await resolveWalletProfiles(entries.map((e) => e.wallet))
  } catch {
    profileMap = new Map()
  }
  const kept = entries.filter((entry) => {
    const tp = profileMap.get(entry.wallet)
    if (!tp) return true
    const name = getCustomProperty(tp.profile, "displayName") || tp.profile.username
    return !name || !EXCLUDED_DISPLAY_NAMES.has(name)
  })
  return { entries: kept, profileMap }
}

export default function LeaderboardPageClient() {
  const { loans, loading } = useLoans()
  const { prices } = useTokenPrices()
  const [profileMap, setProfileMap] = useState<Map<string, TapestryProfileResponse>>(new Map())
  const [mergedLeaderboard, setMergedLeaderboard] = useState<LeaderboardEntry[]>([])

  // Extract simple { symbol: price } map for points calculation
  const tokenPrices = useMemo<TokenPrices>(() => {
    const result: TokenPrices = {}
    for (const [symbol, data] of Object.entries(prices)) {
      result[symbol] = data.price
    }
    return result
  }, [prices])

  const rawLeaderboard = useMemo(() => buildLeaderboard(loans, tokenPrices), [loans, tokenPrices])

  // Merge chain runs synchronously through agent → social → profile-resolve +
  // exclusion filter, in a SINGLE pass. setMergedLeaderboard receives the
  // final post-exclusion list, so the table never renders excluded entries
  // and snaps to its final size. Cancellation token guards against stale
  // late-arriving promises overwriting fresh data.
  useEffect(() => {
    let cancelled = false
    mergeAgentPoints(rawLeaderboard)
      .then(mergeSocialPoints)
      .then(resolveAndFilter)
      .then(({ entries, profileMap: pm }) => {
        if (cancelled) return
        setMergedLeaderboard(entries)
        setProfileMap(pm)
      })
      .catch(() => {
        if (!cancelled) setMergedLeaderboard(rawLeaderboard)
      })
    return () => { cancelled = true }
  }, [rawLeaderboard])

  const sorted = useMemo(() =>
    [...mergedLeaderboard]
      .sort((a, b) => b.points - a.points)
      .map((entry, i) => ({ ...entry, rank: i + 1 })),
  [mergedLeaderboard])

  return (
    <div className="flex-1 p-4 md:p-8 pt-6 max-w-7xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2">
            <Award className="h-5 w-5 text-yellow-500" />
            Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : sorted.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">No activity yet</p>
              <p className="text-sm mt-1">The leaderboard will populate as users interact with the protocol</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px] text-center">#</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((entry) => (
                  <TableRow key={entry.wallet}>
                    <TableCell className="text-center">
                      {getRankDisplay(entry.rank)}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const tp = profileMap.get(entry.wallet)
                        const displayName = tp ? (getCustomProperty(tp.profile, "displayName") || tp.profile.username) : null
                        const pfp = tp ? getCustomProperty(tp.profile, "profileImage") : undefined
                        return (
                          <Link href={`/socialfi/profile/${entry.wallet}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                            <Avatar className="h-8 w-8">
                              {pfp ? <AvatarImage src={pfp} alt={displayName || entry.wallet} /> : null}
                              <AvatarFallback className="bg-blue-600 text-white text-xs">
                                {(displayName || entry.wallet).slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">
                                {displayName || shortenAddress(entry.wallet)}
                              </p>
                            </div>
                          </Link>
                        )
                      })()}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-semibold">{formatPoints(entry.points)}</span>
                      <span className="text-yellow-500 text-xs font-bold ml-1">PTS</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
