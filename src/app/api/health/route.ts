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
    // Log the real error server-side; never leak err.message to the client —
    // pg/Prisma errors can contain hostnames, connection-string fragments,
    // and pgbouncer details that disclose infra topology.
    console.error('[health] db check failed:', err)
    return NextResponse.json(
      {
        ok: false,
        version: process.env.npm_package_version ?? 'unknown',
        db: 'disconnected',
        error: 'database unreachable',
      },
      { status: 503 },
    )
  }
}
