import { getRedis, isRedisConfigured } from "@/lib/agent/redis"
import {
  searchProfiles,
  getFollowers,
  getFollowing,
} from "@/lib/tapestry-server"

/**
 * Off-chain "social" points awarded for engagement actions that don't show up
 * as on-chain loans. Stored in Redis and merged into the leaderboard alongside
 * the loan-derived points.
 *
 *   - +10 once per wallet on first connect
 *   - +10 once per wallet on first profile edit
 *   - +5 per Tapestry friendship (mutual follow), recomputed from Tapestry
 *
 * Friend count is cached in Redis with a 5-minute TTL — Tapestry pagination
 * gets expensive when the leaderboard renders dozens of wallets at once.
 */

const POINTS_PER_CONNECT = 10
const POINTS_PER_PROFILE_EDIT = 10
const POINTS_PER_FRIEND = 5

const FRIEND_CACHE_TTL_SECS = 5 * 60

const KEY_CONNECTED = (w: string) => `social:connected:${w}`
const KEY_PROFILE_EDITED = (w: string) => `social:profile_edited:${w}`
const KEY_FRIEND_COUNT = (w: string) => `social:friend_count:${w}`
const KEY_HOLDERS_SET = "social:holders"

export interface SocialPointsBreakdown {
  connect: number
  profileEdit: number
  friends: number
  friendCount: number
  total: number
}

/**
 * Award the connect bonus if the wallet hasn't been seen before. Idempotent.
 * Returns whether a new bonus was awarded (for analytics / the toast).
 */
export async function awardConnectIfNew(wallet: string): Promise<boolean> {
  if (!isRedisConfigured()) return false
  const redis = getRedis()
  // SETNX-style: write only if absent.
  const set = await redis.set(KEY_CONNECTED(wallet), "1", { nx: true })
  if (set) {
    await redis.sadd(KEY_HOLDERS_SET, wallet)
    return true
  }
  return false
}

export async function awardProfileEditIfNew(wallet: string): Promise<boolean> {
  if (!isRedisConfigured()) return false
  const redis = getRedis()
  const set = await redis.set(KEY_PROFILE_EDITED(wallet), "1", { nx: true })
  if (set) {
    await redis.sadd(KEY_HOLDERS_SET, wallet)
    return true
  }
  return false
}

/**
 * Wallets that have ever been awarded any social points. Used by the
 * leaderboard so we can include connect-only/profile-only users that have
 * no on-chain loan footprint yet.
 */
export async function listSocialPointHolders(): Promise<string[]> {
  if (!isRedisConfigured()) return []
  try {
    const all = await getRedis().smembers(KEY_HOLDERS_SET)
    return Array.isArray(all) ? all : []
  } catch {
    return []
  }
}

/**
 * Mutual-follow count for a wallet, via Tapestry. Cached for 5 minutes per
 * wallet so the leaderboard's batch resolve doesn't pay full pagination cost
 * on every render. Returns 0 on any failure (never throws).
 */
async function fetchFriendCount(wallet: string): Promise<number> {
  // Resolve wallet → Tapestry profile id.
  const profilesRes = await searchProfiles(wallet, 1, 0).catch(() => null)
  const profile = profilesRes?.profiles?.[0]?.profile
  if (!profile?.id) return 0
  const profileId = profile.id

  // Followers + following (cap at 100 each — covers virtually all real users).
  const [followersRes, followingRes] = await Promise.all([
    getFollowers(profileId, 100, 1).catch(() => ({ profiles: [] })),
    getFollowing(profileId, 100, 1).catch(() => ({ profiles: [] })),
  ])
  const followerIds = new Set(
    (followersRes.profiles ?? []).map((p) => p.profile?.id).filter(Boolean) as string[],
  )
  let mutual = 0
  for (const f of followingRes.profiles ?? []) {
    if (f.profile?.id && followerIds.has(f.profile.id)) mutual++
  }
  return mutual
}

async function getCachedFriendCount(wallet: string): Promise<number> {
  if (!isRedisConfigured()) return 0
  const redis = getRedis()
  const cached = await redis.get<number>(KEY_FRIEND_COUNT(wallet))
  if (cached !== null && cached !== undefined) return Number(cached) || 0
  const count = await fetchFriendCount(wallet)
  await redis.set(KEY_FRIEND_COUNT(wallet), count, { ex: FRIEND_CACHE_TTL_SECS })
  return count
}

/**
 * Resolve full social-points breakdown for a single wallet. Hot path is the
 * Redis flag reads + a possibly cached friend count.
 */
export async function getSocialPoints(wallet: string): Promise<SocialPointsBreakdown> {
  if (!isRedisConfigured()) {
    return { connect: 0, profileEdit: 0, friends: 0, friendCount: 0, total: 0 }
  }
  const redis = getRedis()
  const [connected, edited, friendCount] = await Promise.all([
    redis.exists(KEY_CONNECTED(wallet)),
    redis.exists(KEY_PROFILE_EDITED(wallet)),
    getCachedFriendCount(wallet),
  ])
  const connect = connected > 0 ? POINTS_PER_CONNECT : 0
  const profileEdit = edited > 0 ? POINTS_PER_PROFILE_EDIT : 0
  const friends = friendCount * POINTS_PER_FRIEND
  return {
    connect,
    profileEdit,
    friends,
    friendCount,
    total: connect + profileEdit + friends,
  }
}

/**
 * Batch resolve. Friend lookups run in parallel — cap inputs at 100 to keep
 * one request bounded. Tapestry calls dominate the latency on cold cache.
 */
export async function getSocialPointsBatch(
  wallets: string[],
): Promise<Record<string, SocialPointsBreakdown>> {
  const capped = wallets.slice(0, 100)
  const results = await Promise.all(capped.map((w) => getSocialPoints(w)))
  const out: Record<string, SocialPointsBreakdown> = {}
  for (let i = 0; i < capped.length; i++) out[capped[i]] = results[i]
  return out
}
