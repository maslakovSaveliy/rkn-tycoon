import 'server-only'
import { randomBytes } from 'node:crypto'
import { db } from '@/lib/db'

export interface EventInput {
  eventType: string
  payload?: unknown
  clientCreatedAt?: number
}

export interface InsertBatchInput {
  userId: string
  sessionId: string | null
  events: EventInput[]
}

const MAX_BATCH = 50

export async function insertBatch(input: InsertBatchInput): Promise<{ inserted: number }> {
  if (input.events.length === 0) return { inserted: 0 }
  const slice = input.events.slice(0, MAX_BATCH)

  const rows = slice.map((e) => ({
    id: randomBytes(12).toString('hex'),
    userId: input.userId,
    sessionId: input.sessionId,
    eventType: String(e.eventType).slice(0, 64),
    payload: e.payload === undefined ? undefined : (e.payload as object),
    createdAt: e.clientCreatedAt
      ? new Date(e.clientCreatedAt)
      : new Date(),
  }))

  const result = await db.event.createMany({
    data: rows,
    skipDuplicates: true,
  })

  return { inserted: result.count }
}
