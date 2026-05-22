import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/server/auth'
import { insertBatch } from '@/server/eventsRepo'
import { checkRateLimit } from '@/server/rateLimit'

export const dynamic = 'force-dynamic'

/** Cap individual event payloads at 4 KB serialised; analytics events never
 * carry more than a few hundred bytes legitimately. */
const MAX_PAYLOAD_BYTES = 4096

const EventSchema = z.object({
  eventType: z.string().min(1).max(64),
  payload: z
    .unknown()
    .optional()
    .refine(
      (v) => {
        if (v === undefined) return true
        try {
          return JSON.stringify(v).length <= MAX_PAYLOAD_BYTES
        } catch {
          return false
        }
      },
      { message: 'payload exceeds size limit' },
    ),
  clientCreatedAt: z.number().int().nonnegative().optional(),
})

const BodySchema = z.object({
  sessionId: z.string().min(1).max(64).optional(),
  events: z.array(EventSchema).max(50),
})

function unauthorized() {
  return NextResponse.json(
    { error: { code: 'unauthorized', message: 'no session' } },
    { status: 401 },
  )
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return unauthorized()

  const rate = checkRateLimit(`events:${session.user.id}`, {
    capacity: 3,
    refillPerSec: 1 / 3,
  })
  if (!rate.allowed) {
    return NextResponse.json(
      { error: { code: 'rate_limited', message: 'too many batches' } },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil(rate.retryAfterMs / 1000)) },
      },
    )
  }

  const raw: unknown = await req.json().catch(() => null)
  const parsed = BodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'bad_request', message: 'invalid body' } },
      { status: 400 },
    )
  }

  const result = await insertBatch({
    userId: session.user.id,
    sessionId: parsed.data.sessionId ?? null,
    events: parsed.data.events,
  })

  return NextResponse.json({ inserted: result.inserted }, { status: 200 })
}
