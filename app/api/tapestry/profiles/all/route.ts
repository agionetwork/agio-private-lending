import { NextResponse } from "next/server"
import { searchProfiles } from "@/lib/tapestry-server"

export const dynamic = "force-dynamic"
export const revalidate = 60 // edge cache, 1 min

/**
 * Return every wallet that has claimed a Tapestry profile in the Agio
 * namespace. Used by the leaderboard to seed the universe of candidates
 * before fetching FairScale scores.
 *
 * GET /api/tapestry/profiles/all
 *   { wallets: string[], count: number }
 */
export async function GET() {
  try {
    const { profiles } = await searchProfiles(undefined, 100, 0)
    const wallets = Array.from(
      new Set(
        profiles
          .map((p) => p.walletAddress || p.wallet?.address || p.profile?.walletAddress)
          .filter((w): w is string => typeof w === "string" && w.length > 0),
      ),
    )
    return NextResponse.json({ wallets, count: wallets.length })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ wallets: [], error: msg }, { status: 500 })
  }
}
