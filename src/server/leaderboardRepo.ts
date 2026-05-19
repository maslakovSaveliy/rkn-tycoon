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

  // Two flat queries instead of relation-include + relation-where. Same
  // shape on the wire, avoids a Prisma 7 driver-adapter codepath that
  // 500'd on Vercel for the joined variant.
  const overshoot = Math.min(limit * 4, 400)
  const entries = await db.leaderboardEntry.findMany({
    orderBy,
    take: overshoot,
  })
  if (entries.length === 0) return []

  const users = await db.user.findMany({
    where: { id: { in: entries.map((e) => e.userId) }, isAnonymous: false },
    select: { id: true, name: true, email: true },
  })
  const byId = new Map(users.map((u) => [u.id, u]))

  const rows: LeaderboardRow[] = []
  for (const e of entries) {
    const u = byId.get(e.userId)
    if (!u) continue
    rows.push({
      userId: e.userId,
      name: pickDisplayName(u.name, u.email),
      totalBlocks: { mantissa: e.tbeMantissa, exponent: e.tbeExponent },
      prestigeStars: e.prestigeStars,
      playtimeSeconds: e.playtimeSeconds,
    })
    if (rows.length >= limit) break
  }
  return rows
}

function pickDisplayName(name: string | null, email: string): string {
  if (name && name.trim()) return name
  const at = email.indexOf('@')
  return at > 0 ? email.slice(0, at) : 'игрок'
}
