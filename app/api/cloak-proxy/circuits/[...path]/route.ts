import { NextRequest, NextResponse } from "next/server"

/**
 * Cloak circuits proxy. The S3 bucket hosting Cloak's ZK circuits
 * (`cloak-circuits.s3.us-east-1.amazonaws.com`) has no CORS configuration,
 * so browser fetches for `transaction.wasm` and `transaction_final.zkey`
 * are blocked. We proxy them through Next.js (same origin) so the SDK's
 * proof-generation pipeline can load circuits in the browser.
 *
 * The path is appended to `CLOAK_CIRCUITS_BASE` (defaults to the upstream
 * `circuits/0.1.0` directory). Files are large (wasm ~3 MB, zkey can be
 * tens of MB) — we set long-lived cache headers so the browser only fetches
 * each file once per session. Streaming a few-MB blob through Next.js is
 * fine for dev; for prod, consider self-hosting circuits with proper CORS.
 */

const UPSTREAM =
  process.env.CLOAK_CIRCUITS_UPSTREAM ||
  "https://cloak-circuits.s3.us-east-1.amazonaws.com/circuits/0.1.0"

async function proxy(req: NextRequest, pathSegments: string[]) {
  const upstreamUrl = `${UPSTREAM}/${pathSegments.join("/")}${req.nextUrl.search}`

  let upstream: Response
  try {
    upstream = await fetch(upstreamUrl, {
      method: "GET",
      // Forward Range header so the browser can resume large file fetches.
      headers: req.headers.get("range") ? { range: req.headers.get("range")! } : undefined,
      redirect: "follow",
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: `cloak-circuits-proxy upstream fetch failed: ${err?.message ?? err}`, upstreamUrl },
      { status: 502 },
    )
  }

  if (!upstream.ok) {
    return new NextResponse(`Upstream returned ${upstream.status} for ${upstreamUrl}`, {
      status: upstream.status,
    })
  }

  const headers = new Headers()
  const contentType = upstream.headers.get("content-type") || "application/octet-stream"
  headers.set("Content-Type", contentType)
  const contentLength = upstream.headers.get("content-length")
  if (contentLength) headers.set("Content-Length", contentLength)
  const lastModified = upstream.headers.get("last-modified")
  if (lastModified) headers.set("Last-Modified", lastModified)
  // Mirror upstream's immutable cache hint — circuit binaries are content-addressed.
  headers.set("Cache-Control", "public, max-age=31536000, immutable")

  return new NextResponse(upstream.body, { status: upstream.status, headers })
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params
  return proxy(req, path)
}
