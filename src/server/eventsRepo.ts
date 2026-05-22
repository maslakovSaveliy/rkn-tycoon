import 'server-only'
import { randomBytes } from 'node:crypto'
import { withRls } from '@/lib/withRls'

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
/** Allow client clocks to drift up to 7 days behind (legitimate offline catch-up)
 * and 60s ahead (skewed device clock). Anything outside the window is clamped
 * to `now` so analytics queries don't see synthetic timestamps. */
const PAST_DRIFT_MS = 7 * 24 * 60 * 60 * 1000
const FUTURE_DRIFT_MS = 60 * 1000

function clampClientCreatedAt(client: number | undefined, now: number): Date {
  if (!client) return new Date(now)
  if (client < now - PAST_DRIFT_MS) return new Date(now)
  if (client > now + FUTURE_DRIFT_MS) return new Date(now)
  return new Date(client)
}

export async function insertBatch(input: InsertBatchInput): Promise<{ inserted: number }> {
  if (input.events.length === 0) return { inserted: 0 }
  const slice = input.events.slice(0, MAX_BATCH)
  const now = Date.now()

  const rows = slice.map((e) => ({
    id: randomBytes(12).toString('hex'),
    userId: input.userId,
    sessionId: input.sessionId,
    eventType: String(e.eventType).slice(0, 64),
    payload: e.payload === undefined ? undefined : (e.payload as object),
    createdAt: clampClientCreatedAt(e.clientCreatedAt, now),
  }))

  // RLS `event_owner_all` policy + `with check ("userId" = current_user_id())`
  // ensures we cannot smuggle an event under a different userId even if `rows`
  // is built incorrectly. set_config inside withRls is the only place where
  // app.current_user_id gets stamped.
  const result = await withRls(input.userId, (tx) =>
    tx.event.createMany({
      data: rows,
      skipDuplicates: true,
    }),
  )

  return { inserted: result.count }
}
