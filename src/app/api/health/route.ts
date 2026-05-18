import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const startedAt = Date.now()
  try {
    await db.$queryRaw`SELECT 1`
    return NextResponse.json(
      {
        ok: true,
        version: process.env.npm_package_version ?? 'unknown',
        db: 'connected',
        latencyMs: Date.now() - startedAt,
      },
      { status: 200 },
    )
  } catch (err) {
    console.error('[health] db check failed:', err)
    return NextResponse.json(
      {
        ok: false,
        version: process.env.npm_package_version ?? 'unknown',
        db: 'disconnected',
        error: err instanceof Error ? err.message : 'unknown',
      },
      { status: 503 },
    )
  }
}
