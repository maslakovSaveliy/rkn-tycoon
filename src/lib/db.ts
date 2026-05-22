import 'server-only'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

/**
 * Application Prisma client.
 *
 * Connects as `app_user` (DATABASE_URL), which is NOT BYPASSRLS — every
 * query is subject to the RLS policies in prisma/migrations/*_enable_rls.
 * Use withRls(userId, fn) from @/lib/withRls to set the per-tx GUC that
 * those policies read; an unscoped query against a user-owned table will
 * see zero rows and write nothing.
 *
 * For BetterAuth internal queries (which can't carry a userId context),
 * use `dbAuth` from @/lib/dbAuth — that client connects as `auth_service`
 * with BYPASSRLS.
 */
function createClient(): PrismaClient {
  const connectionString = process.env['DATABASE_URL']
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set')
  }
  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export const db: PrismaClient = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}
