import "dotenv/config"
import { defineConfig } from "prisma/config"

/**
 * Prisma CLI config (migrate, db push, introspect).
 *
 * IMPORTANT: this datasource is consumed ONLY by the Prisma CLI's schema
 * engine — NOT by the runtime client. The schema engine needs a direct
 * Postgres connection (port 5432) because pgbouncer transaction-mode
 * pooling rejects the session-level commands (DDL, advisory locks, etc.)
 * that migrate emits. So we point this at DIRECT_URL.
 *
 * The runtime PrismaClient in src/lib/db.ts and src/lib/dbAuth.ts uses the
 * pooled DATABASE_URL / BETTER_AUTH_DATABASE_URL via @prisma/adapter-pg —
 * separate code path, separate URLs.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
})
