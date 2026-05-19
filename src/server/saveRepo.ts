import 'server-only'
import { db } from '@/lib/db'
import { upsertFromSave } from './leaderboardRepo'

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

  const lb = deriveLeaderboard(input.gameState)
  if (lb) {
    await upsertFromSave({ userId: input.userId, ...lb })
  }

  return {
    saved: true,
    current: {
      gameState: upserted.gameState,
      version: upserted.version,
      updatedAt: upserted.updatedAt,
    },
  }
}

interface LbMetrics {
  tbeMantissa: number
  tbeExponent: number
  prestigeStars: number
  playtimeSeconds: number
}

function deriveLeaderboard(gameState: unknown): LbMetrics | null {
  if (!gameState || typeof gameState !== 'object') return null
  const g = gameState as Record<string, unknown>

  const tbe = parseDecimalPayload(g['totalBlocksEver'])
  if (!tbe) return null

  const prestigeStars = typeof g['prestigeStars'] === 'number' ? Math.max(0, g['prestigeStars']) : 0
  const playtimeSeconds =
    typeof g['playtimeSeconds'] === 'number'
      ? Math.max(0, Math.floor(g['playtimeSeconds']))
      : 0

  return {
    tbeMantissa: tbe.mantissa,
    tbeExponent: tbe.exponent,
    prestigeStars,
    playtimeSeconds,
  }
}

interface DecimalParts {
  mantissa: number
  exponent: number
}

/**
 * Codec format: { __D: "1.23e+456" } or { __D: "0" } or { __D: "-1.5e-10" }.
 * Parse the string into mantissa/exponent directly — Number() saturates at
 * 1e308 so anything past that needs raw-string handling.
 */
function parseDecimalPayload(v: unknown): DecimalParts | null {
  if (!v || typeof v !== 'object') return null
  const marker = (v as Record<string, unknown>)['__D']
  if (typeof marker !== 'string') return null

  const m = /^(-?)(\d+(?:\.\d+)?)(?:[eE]([+-]?\d+))?$/.exec(marker.trim())
  if (!m) return null
  const sign = m[1] === '-' ? -1 : 1
  const rawDigits = m[2] ?? '0'
  const rawExpStr = m[3] ?? '0'
  const rawExp = parseInt(rawExpStr, 10)
  if (!Number.isFinite(rawExp)) return null

  const dotIdx = rawDigits.indexOf('.')
  const digitsClean = dotIdx === -1 ? rawDigits : rawDigits.replace('.', '')
  const fracLen = dotIdx === -1 ? 0 : rawDigits.length - dotIdx - 1

  const stripped = digitsClean.replace(/^0+/, '')
  if (stripped === '') return { mantissa: 0, exponent: 0 }

  const firstDigit = stripped[0] ?? '0'
  const restDigits = stripped.slice(1, 16)
  const mantissaStr = restDigits ? `${firstDigit}.${restDigits}` : firstDigit
  const mantissa = sign * Number.parseFloat(mantissaStr)

  const leadingZeros = digitsClean.length - stripped.length
  const intLen = digitsClean.length - fracLen
  const exponent = rawExp + (intLen - 1) - leadingZeros

  return { mantissa, exponent }
}
