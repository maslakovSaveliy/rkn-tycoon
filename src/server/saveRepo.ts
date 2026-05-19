import 'server-only'
import { db } from '@/lib/db'

export interface SaveRow {
  gameState: unknown
  version: number
  updatedAt: Date
}

export async function getSave(userId: string): Promise<SaveRow | null> {
  const row = await db.save.findUnique({ where: { userId } })
  if (!row) return null
  return {
    gameState: row.gameState,
    version: row.version,
    updatedAt: row.updatedAt,
  }
}

export interface UpsertInput {
  userId: string
  gameState: unknown
  version: number
  updatedAt: Date
}

export interface UpsertResult {
  saved: boolean
  current: SaveRow
}

/**
 * Last-write-wins upsert. If the incoming `updatedAt` is older than the
 * stored one, leaves the DB untouched and returns the stored row so the
 * client can rehydrate from server.
 */
export async function upsertSaveIfNewer(input: UpsertInput): Promise<UpsertResult> {
  const existing = await db.save.findUnique({ where: { userId: input.userId } })

  if (existing && existing.updatedAt >= input.updatedAt) {
    return {
      saved: false,
      current: {
        gameState: existing.gameState,
        version: existing.version,
        updatedAt: existing.updatedAt,
      },
    }
  }

  const upserted = await db.save.upsert({
    where: { userId: input.userId },
    create: {
      userId: input.userId,
      gameState: input.gameState as object,
      version: input.version,
      updatedAt: input.updatedAt,
    },
    update: {
      gameState: input.gameState as object,
      version: input.version,
      updatedAt: input.updatedAt,
    },
  })

  return {
    saved: true,
    current: {
      gameState: upserted.gameState,
      version: upserted.version,
      updatedAt: upserted.updatedAt,
    },
  }
}
