import 'server-only'

/*
 * ============================================================================
 * KNOWN LIMITATION — in-memory rate limiter
 *
 * This Map lives in module scope. On Vercel each Lambda invocation may land
 * on a fresh cold instance; warm instances are not shared across regions or
 * after rolling restarts. So the effective limit is `capacity * N_instances`,
 * which a fan-out attacker can defeat. Acceptable for MVP / hobby load with
 * single dub1 region (see vercel.json), but BEFORE opening public registration
 * + leaderboard submit to strangers this must move to a shared store:
 *   - Upstash Redis (preferred for serverless, free tier covers us), OR
 *   - A `rate_limit` table on Supabase keyed by `${userId}:${bucket}` with
 *     an `INSERT ... ON CONFLICT DO UPDATE` token-bucket update.
 * Tracking: post-audit plan task B6.
 * ============================================================================
 */

interface Bucket {
  tokens: number
  lastRefillMs: number
}

const buckets = new Map<string, Bucket>()

/** Idle buckets older than this are evicted by the cleanup interval. Set to
 * twice the time it takes to refill from 0 to full at the slowest refill rate
 * we actually use (1/3 token/sec → 3s × capacity 3 = 9s), padded generously. */
const BUCKET_IDLE_TTL_MS = 5 * 60 * 1000
const CLEANUP_INTERVAL_MS = 60 * 1000

// Module-scoped timer; only registers once per process.
let cleanupTimer: ReturnType<typeof setInterval> | null = null
function ensureCleanup(): void {
  if (cleanupTimer) return
  cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, bucket] of buckets) {
      if (now - bucket.lastRefillMs > BUCKET_IDLE_TTL_MS) {
        buckets.delete(key)
      }
    }
  }, CLEANUP_INTERVAL_MS)
  // Don't let this timer hold the Node process open during tests / shutdown.
  if (typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref()
  }
}

export interface RateLimitConfig {
  capacity: number
  refillPerSec: number
}

export interface RateLimitResult {
  allowed: boolean
  retryAfterMs: number
}

export function checkRateLimit(key: string, cfg: RateLimitConfig): RateLimitResult {
  ensureCleanup()
  const now = Date.now()
  const bucket = buckets.get(key) ?? { tokens: cfg.capacity, lastRefillMs: now }
  const elapsedSec = (now - bucket.lastRefillMs) / 1000
  const refilled = Math.min(cfg.capacity, bucket.tokens + elapsedSec * cfg.refillPerSec)

  if (refilled < 1) {
    const needed = 1 - refilled
    const retryAfterMs = Math.ceil((needed / cfg.refillPerSec) * 1000)
    bucket.tokens = refilled
    bucket.lastRefillMs = now
    buckets.set(key, bucket)
    return { allowed: false, retryAfterMs }
  }

  bucket.tokens = refilled - 1
  bucket.lastRefillMs = now
  buckets.set(key, bucket)
  return { allowed: true, retryAfterMs: 0 }
}
