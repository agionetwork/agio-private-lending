import { NextRequest, NextResponse } from "next/server"

/**
 * Cloak relay proxy. The Cloak devnet relay (`api.devnet.cloak.ag`) does not
 * return `Access-Control-Allow-Origin`, so the browser blocks SDK fetches
 * with a generic "NetworkError when attempting to fetch resource". We proxy
 * everything through the same origin (`/api/cloak-proxy/relay/...`) so the
 * SDK's fetches succeed without CORS hassles.
 *
 * Upstream defaults to the Cloak devnet relay. Override via the
 * `CLOAK_RELAY_UPSTREAM` env var when running against another deployment.
 */

const UPSTREAM = process.env.CLOAK_RELAY_UPSTREAM || "https://api.devnet.cloak.ag"

const HOP_BY_HOP = new Set([
  "host",
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "content-length",
  "content-encoding",
])

function stripHopHeaders(headers: Headers): Headers {
  const out = new Headers()
  headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) out.set(key, value)
  })
  return out
}

async function proxy(req: NextRequest, pathSegments: string[]) {
  const upstreamUrl = `${UPSTREAM}/${pathSegments.join("/")}${req.nextUrl.search}`

  const init: RequestInit = {
    method: req.method,
    headers: stripHopHeaders(req.headers),
    redirect: "follow",
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer()
  }

  let upstream: Response
  try {
    upstream = await fetch(upstreamUrl, init)
  } catch (err: any) {
    return NextResponse.json(
      { error: `cloak-relay-proxy upstream fetch failed: ${err?.message ?? err}`, upstreamUrl },
      { status: 502 },
    )
  }

  const body = await upstream.arrayBuffer()
  return new NextResponse(body, {
    status: upstream.status,
    headers: stripHopHeaders(upstream.headers),
  })
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params
  return proxy(req, path)
}
export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params
  return proxy(req, path)
}
export async function OPTIONS(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params
  return proxy(req, path)
}
