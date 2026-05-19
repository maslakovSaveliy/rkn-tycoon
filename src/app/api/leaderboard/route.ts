import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getTop, type LeaderboardSort } from '@/server/leaderboardRepo'

export const revalidate = 60

const QuerySchema = z.object({
  by: z.enum(['blocks', 'stars']).default('blocks'),
  limit: z.coerce.number().int().positive().max(100).default(100),
})

export async function GET(req: Request) {
  const url = new URL(req.url)
  const parsed = QuerySchema.safeParse({
    by: url.searchParams.get('by') ?? undefined,
    limit: url.searchParams.get('limit') ?? undefined,
  })
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'bad_request', message: 'invalid query' } },
      { status: 400 },
    )
  }
  try {
    const rows = await getTop(parsed.data.by as LeaderboardSort, parsed.data.limit)
    return NextResponse.json({ rows }, { status: 200 })
  } catch (err) {
    console.error('[api/leaderboard] getTop failed', {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    })
    return NextResponse.json(
      { error: { code: 'internal', message: 'leaderboard query failed' } },
      { status: 500 },
    )
  }
}
