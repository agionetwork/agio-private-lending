import { NextRequest, NextResponse } from "next/server"
import { isValidSolanaAddress } from "@/lib/agent/auth"
import {
  getSocialPointsBatch,
  listSocialPointHolders,
} from "@/lib/social-points"

/**
 * Combined batch resolve for the leaderboard:
 *   - Returns social-point breakdowns for each requested wallet.
 *   - Also returns the full list of wallets that have ANY social points,
 *     so the leaderboard can union them with the on-chain transactor set
 *     (catches users who connected but never fired an Anchor tx).
 *
 * GET /api/social-points/all?wallets=A,B,C
 */
export async function GET(req: NextRequest) {
  const param = req.nextUrl.searchParams.get("wallets") || ""
  const wallets = param
    .split(",")
    .map((s) => s.trim())
    .filter((s) => isValidSolanaAddress(s))
    .slice(0, 100)

  const [points, holders] = await Promise.all([
    wallets.length > 0 ? getSocialPointsBatch(wallets) : Promise.resolve({}),
    listSocialPointHolders(),
  ])

  return NextResponse.json({ points, holders })
}
