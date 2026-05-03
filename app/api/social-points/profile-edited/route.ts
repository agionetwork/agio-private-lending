import { NextRequest, NextResponse } from "next/server"
import { isValidSolanaAddress } from "@/lib/agent/auth"
import { awardProfileEditIfNew } from "@/lib/social-points"

/**
 * Idempotent — fired by tapestry-profile-provider after the first successful
 * Tapestry profile update for a wallet. Subsequent edits don't re-award.
 */
export async function POST(req: NextRequest) {
  try {
    const { wallet } = await req.json()
    if (!wallet || !isValidSolanaAddress(wallet)) {
      return NextResponse.json({ error: "Missing or invalid wallet" }, { status: 400 })
    }
    const awarded = await awardProfileEditIfNew(wallet)
    return NextResponse.json({ awarded })
  } catch (err: any) {
    console.error("[social-points/profile-edited]", err)
    return NextResponse.json({ awarded: false })
  }
}
