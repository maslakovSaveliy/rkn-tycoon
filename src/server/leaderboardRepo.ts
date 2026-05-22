import 'server-only'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { withRls } from '@/lib/withRls'

export type LeaderboardSort = 'blocks' | 'stars'

export interface LeaderboardRow {
  userId: string
  name: string
  totalBlocks: { mantissa: number; exponent: number }
  prestigeStars: number
  playtimeSeconds: number
}

export interface UpsertInput {
  userId: string
  tbeMantissa: number
  tbeExponent: number
  prestigeStars: number
  playtimeSeconds: number
}

export type UpsertResult =
  | { ok: true }
  | { ok: false; reason: SanityReason }

export type SanityReason =
  | 'invalid_numbers'
  | 'min_playtime'
  | 'bps_ceiling'
  | 'tbe_downgrade'

/** Below this we don't trust the submission at all — playing for 1 minute
 * already covers warm-up time and prevents instant-cheat dominance. */
export const MIN_PLAYTIME_SEC = 60
/** Anti-cheat ceiling baseline (log10). Empirically generous: at endgame with
 * fully maxed censors and click upgrades the legitimate exponent grows at
 * roughly 1 per minute. 25 gives ~14 orders of magnitude headroom above what
 * any human could legitimately reach in v1 economy. */
const TBE_CEILING_BASELINE_LOG = 25
const PRESTIGE_PER_STAR = 0.02

/** Server-side BPS-vs-playtime ceiling. Allows TBE up to:
 *   10^(baseline + log10(playtime) + log10(1 + 0.02*stars))
 * which scales linearly with time and with the prestige multiplier. */
export function computeMaxTbeExponent(
  playtimeSeconds: number,
  prestigeStars: number,
): number {
  const t = Math.max(1, playtimeSeconds)
  const prestigeMult = 1 + PRESTIGE_PER_STAR * Math.max(0, prestigeStars)
  return (
    TBE_CEILING_BASELINE_LOG + Math.log10(t) + Math.log10(prestigeMult)
  )
}

export function compareTbe(am: number, ae: number, bm: number, be: number): number {
  if (ae !== be) return ae < be ? -1 : 1
  if (am === bm) return 0
  return am < bm ? -1 : 1
}

/**
 * Run the leaderboard upsert against an existing transaction client.
 *
 * Callers that already opened their own withRls (e.g. saveRepo.upsertSaveIfNewer)
 * should use this variant to keep everything in one transaction — Prisma's
 * driver adapter doesn't allow nesting $transaction calls.
 *
 * Callers entering from a public API surface (none today, but reserved)
 * should use `upsertFromSave` which opens its own withRls transaction.
 */
export async function upsertFromSaveInTx(
  tx: Prisma.TransactionClient,
  input: UpsertInput,
): Promise<UpsertResult> {
  if (!Number.isFinite(input.tbeMantissa) || !Number.isFinite(input.tbeExponent)) {
    return { ok: false, reason: 'invalid_numbers' }
  }
  if (input.prestigeStars < 0 || input.playtimeSeconds < 0) {
    return { ok: false, reason: 'invalid_numbers' }
  }
  if (input.playtimeSeconds < MIN_PLAYTIME_SEC) {
    return { ok: false, reason: 'min_playtime' }
  }

  // Anti-cheat: implied BPS must stay under the ceiling. Mantissa is in [1,10)
  // post-normalization so contributes at most ~0.95 to the effective exponent —
  // we compare exponent against the ceiling with that margin baked in.
  const maxExp = computeMaxTbeExponent(input.playtimeSeconds, input.prestigeStars)
  if (input.tbeExponent > maxExp) {
    console.warn('[leaderboard] rejected: bps_ceiling', {
      userId: input.userId,
      tbeExponent: input.tbeExponent,
      maxExp,
      playtimeSeconds: input.playtimeSeconds,
      prestigeStars: input.prestigeStars,
    })
    return { ok: false, reason: 'bps_ceiling' }
  }

  const existing = await tx.leaderboardEntry.findUnique({
    where: { userId: input.userId },
  })

  if (existing) {
    const cmp = compareTbe(
      existing.tbeMantissa,
      existing.tbeExponent,
      input.tbeMantissa,
      input.tbeExponent,
    )
    // Monotonicity: TBE must never decrease at the same-or-lower star count.
    if (cmp > 0 && existing.prestigeStars >= input.prestigeStars) {
      return { ok: false, reason: 'tbe_downgrade' }
    }
    if (existing.prestigeStars > input.prestigeStars) {
      return { ok: false, reason: 'tbe_downgrade' }
    }
  }

  await tx.leaderboardEntry.upsert({
    where: { userId: input.userId },
    create: {
      userId: input.userId,
      tbeMantissa: input.tbeMantissa,
      tbeExponent: input.tbeExponent,
      prestigeStars: input.prestigeStars,
      playtimeSeconds: input.playtimeSeconds,
    },
    update: {
      tbeMantissa: input.tbeMantissa,
      tbeExponent: input.tbeExponent,
      prestigeStars: input.prestigeStars,
      playtimeSeconds: input.playtimeSeconds,
    },
  })

  return { ok: true }
}

/**
 * Standalone-entry version: opens its own RLS-scoped transaction.
 * Keep the existing public name for backwards-compat with unit tests.
 */
export async function upsertFromSave(input: UpsertInput): Promise<UpsertResult> {
  return withRls(input.userId, (tx) => upsertFromSaveInTx(tx, input))
}

/**
 * Public leaderboard read. NOT wrapped in withRls — the
 * `leaderboard_public_read` RLS policy permits select for everyone, and
 * an unauthenticated /api/leaderboard request has no userId to set in
 * the GUC anyway.
 */
export async function getTop(by: LeaderboardSort, limit = 100): Promise<LeaderboardRow[]> {
  const orderBy =
    by === 'blocks'
      ? [{ tbeExponent: 'desc' as const }, { tbeMantissa: 'desc' as const }]
      : [{ prestigeStars: 'desc' as const }, { tbeExponent: 'desc' as const }]

  // Don't pull email — app_user lacks column GRANT on user.email after the
  // _leaderboard_user_select migration, and we never display the email
  // anyway (pickDisplayName only uses name + falls back to userId hash).
  const rows = await db.leaderboardEntry.findMany({
    where: { user: { isAnonymous: false } },
    orderBy,
    take: limit,
    include: { user: { select: { name: true } } },
  })

  return rows.map((r) => ({
    userId: r.userId,
    name: pickDisplayName(r.user.name, r.userId),
    totalBlocks: { mantissa: r.tbeMantissa, exponent: r.tbeExponent },
    prestigeStars: r.prestigeStars,
    playtimeSeconds: r.playtimeSeconds,
  }))
}

/** Public display name on the leaderboard.
 * Email is never read (column GRANT prevents app_user from selecting it).
 * When the player skipped the optional nickname field, we show an
 * anonymized short hash of their userId instead. */
export function pickDisplayName(name: string | null, userId: string): string {
  const trimmed = name?.trim()
  if (trimmed) return trimmed
  return `игрок_${userId.slice(0, 6)}`
}
