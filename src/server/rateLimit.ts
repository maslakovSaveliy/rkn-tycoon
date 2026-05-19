import 'server-only'

interface Bucket {
  tokens: number
  lastRefillMs: number
}

const buckets = new Map<string, Bucket>()

export interface RateLimitConfig {
  capacity: number
  refillPerSec: number
}

export interface RateLimitResult {
  allowed: boolean
  retryAfterMs: number
}

export function checkRateLimit(key: string, cfg: RateLimitConfig): RateLimitResult {
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
