import 'server-only'
import { db } from '@/lib/db'

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

export async function upsertFromSave(input: UpsertInput): Promise<void> {
  if (!Number.isFinite(input.tbeMantissa) || !Number.isFinite(input.tbeExponent)) {
    return
  }
  if (input.prestigeStars < 0 || input.playtimeSeconds < 0) return

  const existing = await db.leaderboardEntry.findUnique({
    where: { userId: input.userId },
  })

  if (existing) {
    if (compareTbe(existing.tbeMantissa, existing.tbeExponent, input.tbeMantissa, input.tbeExponent) > 0) {
      return
    }
    if (existing.prestigeStars > input.prestigeStars) return
  }

  await db.leaderboardEntry.upsert({
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
}

function compareTbe(am: number, ae: number, bm: number, be: number): number {
  if (ae !== be) return ae - be
  return am - bm
}

export async function getTop(by: LeaderboardSort, limit = 100): Promise<LeaderboardRow[]> {
  const orderBy =
    by === 'blocks'
      ? [{ tbeExponent: 'desc' as const }, { tbeMantissa: 'desc' as const }]
      : [{ prestigeStars: 'desc' as const }, { tbeExponent: 'desc' as const }]

  const rows = await db.leaderboardEntry.findMany({
    where: { user: { isAnonymous: false } },
    orderBy,
    take: limit,
    include: { user: { select: { name: true, email: true } } },
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
 * Never falls back to the email local-part — that's PII (firstname.lastname@…
 * etc). When the player skipped the optional nickname field, we show an
 * anonymized short hash of their userId instead. */
export function pickDisplayName(name: string | null, userId: string): string {
  const trimmed = name?.trim()
  if (trimmed) return trimmed
  return `игрок_${userId.slice(0, 6)}`
}
