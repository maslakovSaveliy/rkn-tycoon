import 'server-only'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForAuth = globalThis as unknown as { dbAuth?: PrismaClient }

/**
 * Prisma client used exclusively by BetterAuth and its hooks.
 *
 * Connects as `auth_service` (BETTER_AUTH_DATABASE_URL) which has
 * BYPASSRLS — BetterAuth needs to INSERT into `user` / `session` /
 * `account` / `verification` during signup, signin, and session
 * rotation, none of which can carry an `app.current_user_id` GUC
 * because no userId exists yet. Letting BetterAuth's internal SQL
 * bypass RLS is safer than trying to add permissive policies that
 * widen the attack surface for every code path.
 *
 * Application code (saveRepo, eventsRepo, leaderboardRepo, etc.)
 * must NEVER import this client — it would silently bypass RLS.
 * Use `db` from @/lib/db wrapped in withRls instead.
 */
function createAuthClient(): PrismaClient {
  const connectionString =
    process.env['BETTER_AUTH_DATABASE_URL'] ?? process.env['DATABASE_URL']
  if (!connectionString) {
    throw new Error(
      'BETTER_AUTH_DATABASE_URL (or DATABASE_URL as fallback) is required for the auth Prisma client',
    )
  }
  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export const dbAuth: PrismaClient = globalForAuth.dbAuth ?? createAuthClient()

if (process.env.NODE_ENV !== 'production') {
  globalForAuth.dbAuth = dbAuth
}
