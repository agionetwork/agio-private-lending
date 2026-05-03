import { NextRequest, NextResponse } from "next/server"
import { isValidSolanaAddress } from "@/lib/agent/auth"
import { awardConnectIfNew } from "@/lib/social-points"

/**
 * Idempotent — first call for a wallet returns `{awarded: true}`, subsequent
 * calls return `{awarded: false}`. The wallet provider fires this on first
 * successful connect; safe to retry.
 */
export async function POST(req: NextRequest) {
  try {
    const { wallet } = await req.json()
    if (!wallet || !isValidSolanaAddress(wallet)) {
      return NextResponse.json({ error: "Missing or invalid wallet" }, { status: 400 })
    }
    const awarded = await awardConnectIfNew(wallet)
    return NextResponse.json({ awarded })
  } catch (err: any) {
    console.error("[social-points/connect]", err)
    return NextResponse.json({ awarded: false })
  }
}
