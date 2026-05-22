import 'server-only'
import type { Prisma } from '@prisma/client'
import { db } from './db'

/**
 * Run a database operation inside an RLS-scoped transaction.
 *
 * Opens a `db.$transaction(...)` and immediately calls
 *   select set_config('app.current_user_id', <userId>, true)
 * so the policies defined in `prisma/migrations/*_enable_rls/migration.sql`
 * see the current user. The third `true` argument makes the setting local
 * to the transaction, which is what makes this work safely under
 * pgbouncer transaction-mode pooling (port 6543) — the GUC is discarded
 * the moment the transaction ends, so a recycled connection can never
 * leak the previous request's identity into the next one.
 *
 * Pass the returned `tx` to every Prisma call inside `fn`; using the
 * bare `db` client would skip the GUC and return zero rows.
 *
 * @example
 *   return withRls(userId, (tx) => tx.save.findUnique({ where: { userId } }))
 */
export async function withRls<T>(
  userId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  if (!userId) {
    throw new Error('[withRls] userId is required')
  }
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`select set_config('app.current_user_id', ${userId}, true)`
    return fn(tx)
  })
}
