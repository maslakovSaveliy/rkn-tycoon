# Prisma Migrations Workflow

## TL;DR

- **Dev** — `pnpm db:migrate` (interactive, creates + applies a new migration)
- **CI / Prod** — `pnpm db:migrate-deploy` (no prompt, applies pending only)
- **Status** — `pnpm db:migrate-status`
- **Emergency** — `pnpm db:push` (schema-first, NO history; only for hotfix)

Prisma 7 schema engine cannot run through pgbouncer transaction mode, so
`prisma.config.ts` points its `datasource.url` at `DIRECT_URL` (port 5432).
The runtime `PrismaClient` keeps using the pooled `DATABASE_URL` via
`@prisma/adapter-pg`.

## Adding a new migration

1. Edit `prisma/schema.prisma`.
2. Run `pnpm db:migrate`. Prisma will prompt for a name (e.g. `add_user_avatar`).
3. Review the generated `prisma/migrations/<ts>_<name>/migration.sql` —
   especially if you renamed a column (Prisma's diff defaults to DROP+CREATE,
   which loses data; prefer `ALTER TABLE ... RENAME COLUMN`).
4. Commit BOTH the schema change and the migration folder.
5. CI applies via `pnpm db:migrate-deploy` (or run manually before deploy).

## Custom SQL migrations (RLS, triggers, functions)

For SQL that Prisma's diff can't express (RLS policies, helper functions,
GRANTs), create a migration with `--create-only` and write the SQL manually:

```bash
pnpm prisma migrate dev --name enable_rls --create-only
# Edit prisma/migrations/<ts>_enable_rls/migration.sql
pnpm prisma migrate dev  # applies it
```

## Database roles

Two roles live in Postgres (created via Supabase MCP, NOT in any migration):

- `app_user` — used by `DATABASE_URL`. Subject to RLS. Every game query goes
  through `withRls(userId, ...)` which sets `app.current_user_id` GUC in a
  transaction.
- `auth_service` — used by `BETTER_AUTH_DATABASE_URL`. `BYPASSRLS` so the
  BetterAuth library can INSERT into `user` / `session` / `account` during
  signup/login without a userId context.
- `postgres` (superuser) — used by `DIRECT_URL`. Only for `prisma migrate`.

### Rotating passwords

1. Generate: `openssl rand -base64 32`
2. In Supabase SQL editor: `ALTER ROLE app_user PASSWORD '<new>';`
3. Update Vercel env var `DATABASE_URL` (or `BETTER_AUTH_DATABASE_URL`).
4. Redeploy. Sessions stay valid; only DB connections re-auth.

### Initial role bootstrap

```sql
-- Run once per Supabase project (main + each branch).
create role auth_service with login password '<rotated-A>' bypassrls;
create role app_user with login password '<rotated-B>';

grant usage on schema public to app_user, auth_service;
grant select, insert, update, delete on all tables in schema public to app_user;
grant select, usage on all sequences in schema public to app_user;
alter default privileges in schema public
  grant select, insert, update, delete on tables to app_user;
alter default privileges in schema public
  grant select, usage on sequences to app_user;

grant all on all tables in schema public to auth_service;
grant all on all sequences in schema public to auth_service;
alter default privileges in schema public
  grant all on tables to auth_service;
alter default privileges in schema public
  grant all on sequences to auth_service;
```

## RLS smoke check (manual)

Run this after any policy change to verify defense-in-depth still works.
Free-tier Supabase doesn't support DB branches, so we don't have an
automated integration suite — these are the curl checks against a
running `pnpm dev`:

```bash
# 1. Signup creates a session cookie (BetterAuth → auth_service, BYPASSRLS).
curl -s -X POST 'http://localhost:3000/api/auth/sign-up/email' \
  -H 'Content-Type: application/json' \
  --cookie-jar /tmp/c.txt \
  -d '{"email":"rls-test@example.com","password":"testtest123","name":"rls"}'

# 2. GET own save (owner_all policy + withRls GUC). New user → {save: null}.
curl -s --cookie /tmp/c.txt http://localhost:3000/api/save

# 3. POST own save (with check ("userId" = current_user_id())). Should 200.
curl -s -X POST --cookie /tmp/c.txt -H 'Content-Type: application/json' \
  -d '{"gameState":{"blocks":{"__D":"100"},"totalBlocksEver":{"__D":"100"},"playtimeSeconds":120,"prestigeStars":0},"version":5,"updatedAt":1779480000000}' \
  http://localhost:3000/api/save

# 4. Leaderboard (public_read policy + user_public_lookup with column GRANT).
curl -s 'http://localhost:3000/api/leaderboard?by=blocks'

# 5. Cleanup — delete the test user via Supabase MCP (or SQL editor):
#    DELETE FROM "user" WHERE email = 'rls-test@example.com';
```

Expected RLS deny invariants (verify in psql / Supabase SQL editor):

- `SET ROLE app_user; SELECT * FROM "save";` → `0 rows` (no GUC set)
- `SET ROLE app_user; SELECT email FROM "user";` → `permission denied
  for column email` (column GRANT excludes it)
- `BEGIN; SELECT set_config('app.current_user_id', '<other-uid>', true);
  INSERT INTO "save" (...) VALUES (...);` with `userId = current user`
  but GUC = different user → `new row violates row-level security policy`

If any of these allow data through, an RLS policy is permissive when it
shouldn't be — rollback per the steps below and patch.

## Troubleshooting

### "permission denied for table foo" from app code

The query bypasses RLS context. Wrap it in `withRls(userId, tx => ...)` —
without the GUC, `app_user` sees zero rows AND can't write.

### Migration drift in dev

`pnpm db:migrate-status` reports the truth. To rebase your dev DB onto
the latest committed migration set:

```bash
pnpm db:migrate reset   # WARNING: drops + recreates the dev DB
```

Never run reset against prod.

### Prod is ahead of local migrations folder

Pull the missing migration file from git, then `pnpm db:migrate-deploy`
(it applies pending migrations idempotently). If history really diverged,
mark the missing one as applied with:

```bash
pnpm prisma migrate resolve --applied <migration_name>
```

### Bootstrapping migrate on a DB that already has tables

(Done once on 2026-05-23 for this project.) When switching from
`prisma db push` to `prisma migrate`:

1. Generate the SQL from the current schema:
   `pnpm prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script > prisma/migrations/<ts>_init/migration.sql`
2. Strip any leading log lines.
3. Mark it as already applied on every environment that already has
   the tables: `pnpm prisma migrate resolve --applied <ts>_init`.
4. Commit the migration folder.
