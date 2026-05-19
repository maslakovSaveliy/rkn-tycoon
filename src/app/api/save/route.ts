import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/server/auth'
import { checkRateLimit } from '@/server/rateLimit'
import { getSave, upsertSaveIfNewer } from '@/server/saveRepo'

export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  gameState: z.unknown(),
  version: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
})

function unauthorized() {
  return NextResponse.json(
    { error: { code: 'unauthorized', message: 'no session' } },
    { status: 401 },
  )
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return unauthorized()

  const row = await getSave(session.user.id)
  if (!row) {
    return NextResponse.json({ save: null }, { status: 200 })
  }
  return NextResponse.json(
    {
      save: {
        gameState: row.gameState,
        version: row.version,
        updatedAt: row.updatedAt.getTime(),
      },
    },
    { status: 200 },
  )
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return unauthorized()

  const rate = checkRateLimit(`save:${session.user.id}`, {
    capacity: 3,
    refillPerSec: 1 / 3,
  })
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: { code: 'rate_limited', message: 'too many saves' },
      },
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

  const result = await upsertSaveIfNewer({
    userId: session.user.id,
    gameState: parsed.data.gameState,
    version: parsed.data.version,
    updatedAt: new Date(parsed.data.updatedAt),
  })

  return NextResponse.json(
    {
      saved: result.saved,
      current: {
        gameState: result.current.gameState,
        version: result.current.version,
        updatedAt: result.current.updatedAt.getTime(),
      },
    },
    { status: 200 },
  )
}
