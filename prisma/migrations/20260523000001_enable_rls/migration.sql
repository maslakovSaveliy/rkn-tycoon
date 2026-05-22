-- Row Level Security hardening.
--
-- Two roles serve queries (created out-of-band via Supabase MCP, see
-- prisma/MIGRATIONS.md for the bootstrap SQL):
--
--   * app_user (NO BYPASSRLS) — game / leaderboard / event queries.
--     The application wraps every operation in withRls(userId, fn) which
--     opens a transaction and sets the app.current_user_id GUC. RLS
--     policies below read that GUC via app.current_user_id().
--
--   * auth_service (BYPASSRLS) — BetterAuth library queries only. signup
--     and session create can't carry a userId context, so the role bypasses
--     RLS entirely. No application code uses this connection directly.
--
-- Public read on leaderboard_entry stays open; everything else is owner-only.

-- Helper schema + function: read the per-tx GUC, return null when unset
-- (so policies that compare userId = current_user_id() naturally deny
-- when no context is established, e.g. unauthenticated requests).
create schema if not exists app;
grant usage on schema app to app_user, auth_service;

create or replace function app.current_user_id()
returns text
language sql
stable
as $$ select nullif(current_setting('app.current_user_id', true), '') $$;

grant execute on function app.current_user_id() to app_user, auth_service;

-- Enable RLS on every user-data table. Default deny — without an
-- explicit policy, app_user sees zero rows and writes nothing.
alter table "user" enable row level security;
alter table "session" enable row level security;
alter table "account" enable row level security;
alter table "verification" enable row level security;
alter table "save" enable row level security;
alter table "leaderboard_entry" enable row level security;
alter table "event" enable row level security;

-- save: read + write only own row.
create policy "save_owner_all" on "save"
  for all to app_user
  using ("userId" = app.current_user_id())
  with check ("userId" = app.current_user_id());

-- event: same; analytics rows are private.
create policy "event_owner_all" on "event"
  for all to app_user
  using ("userId" = app.current_user_id())
  with check ("userId" = app.current_user_id());

-- leaderboard_entry: PUBLIC select (top-N is shared), owner-only write.
create policy "leaderboard_public_read" on "leaderboard_entry"
  for select to app_user, auth_service
  using (true);

create policy "leaderboard_owner_insert" on "leaderboard_entry"
  for insert to app_user
  with check ("userId" = app.current_user_id());

create policy "leaderboard_owner_update" on "leaderboard_entry"
  for update to app_user
  using ("userId" = app.current_user_id())
  with check ("userId" = app.current_user_id());

-- user: own row read + update. INSERT/DELETE handled by auth_service via BYPASSRLS.
create policy "user_own_read" on "user"
  for select to app_user
  using (id = app.current_user_id());

create policy "user_own_update" on "user"
  for update to app_user
  using (id = app.current_user_id())
  with check (id = app.current_user_id());

-- session: owner scoped.
create policy "session_owner_all" on "session"
  for all to app_user
  using ("userId" = app.current_user_id())
  with check ("userId" = app.current_user_id());

-- account: owner scoped.
create policy "account_owner_all" on "account"
  for all to app_user
  using ("userId" = app.current_user_id())
  with check ("userId" = app.current_user_id());

-- verification: stateless token table managed solely by BetterAuth.
-- No policy → app_user can never read or write. auth_service bypasses RLS.
