import { NextRequest, NextResponse } from "next/server"
import { isValidSolanaAddress } from "@/lib/agent/auth"
import { getRedis, isRedisConfigured } from "@/lib/agent/redis"

/**
 * Reverse: is this on-chain pubkey one of our stealth wallets?
 *
 * Returns just a boolean — never the owner. The UI uses this to decide
 * whether to render an address as `Anonymous (private)` instead of resolving
 * a Tapestry profile or SNS domain that could de-anonymize the stealth.
 *
 * Privacy note: knowing "X is a stealth" is something an observer could
 * already infer from on-chain Cloak unshield patterns, so exposing a yes/no
 * here doesn't widen the leak. We never expose the owner.
 *
 * Two query shapes:
 *   GET /api/stealth/check?address=X        → { isStealth: bool }
 *   GET /api/stealth/check?addresses=A,B,C  → { stealthAddresses: ["A","C"] }
 */
export async function GET(req: NextRequest) {
  const single = req.nextUrl.searchParams.get("address")
  const batch = req.nextUrl.searchParams.get("addresses")

  if (!isRedisConfigured()) {
    return NextResponse.json(
      single ? { isStealth: false } : { stealthAddresses: [] },
    )
  }
  const redis = getRedis()

  if (single) {
    if (!isValidSolanaAddress(single)) {
      return NextResponse.json({ isStealth: false })
    }
    try {
      // Upstash supports `exists` returning 0 or 1.
      const exists = await redis.exists(`stealth:${single}:owner`)
      return NextResponse.json({ isStealth: exists > 0 })
    } catch {
      return NextResponse.json({ isStealth: false })
    }
  }

  if (batch) {
    const candidates = batch
      .split(",")
      .map((s) => s.trim())
      .filter((s) => isValidSolanaAddress(s))
      .slice(0, 100) // hard cap so a malicious caller can't DoS Redis

    if (candidates.length === 0) {
      return NextResponse.json({ stealthAddresses: [] })
    }

    try {
      const results = await Promise.all(
        candidates.map((addr) => redis.exists(`stealth:${addr}:owner`)),
      )
      const stealthAddresses = candidates.filter((_, i) => results[i] > 0)
      return NextResponse.json({ stealthAddresses })
    } catch {
      return NextResponse.json({ stealthAddresses: [] })
    }
  }

  return NextResponse.json({ isStealth: false })
}
