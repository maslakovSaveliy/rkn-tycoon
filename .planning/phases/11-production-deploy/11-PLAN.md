# Phase 11: Production Deploy (Vercel + Supabase)

**Goal:** Игра живёт в проде. main → автоматический Vercel deploy, PRs → preview, env vars управляются в Vercel UI. Supabase Postgres уже подключён.

**Requirements:** DEPLOY-01..04.

## Decisions

### D-130 — Vercel host
Hobby tier (free) хватит для v1: 100GB bandwidth/mo, 100 GB-hr serverless. Idle-кликер — лёгкая нагрузка.

### D-131 — Auto-deploy main + preview на PRs
Стандартный Vercel git integration. Push в main → production deploy. PR → preview URL.

### D-132 — Prisma миграции вручную через MCP или локально
В v1 не настраиваем CI миграции. Schema changes делаем через `apply_migration` (Supabase MCP) или `prisma db push` локально с `DIRECT_URL`. Vercel build не запускает миграции — это избавляет от race conditions и проблем с DIRECT_URL pooling.

### D-133 — `prisma generate` в Vercel build step
В `package.json` добавить `postinstall: prisma generate` чтобы Prisma client всегда был свежий на Vercel.

### D-134 — `BETTER_AUTH_URL` — production URL
Server-side BetterAuth конфиг требует точный `baseURL` для cookie domain и redirect handling. На Vercel — это production-домен (или Vercel-default `.vercel.app`). Client использует `window.location.origin` → автоматически работает на любых preview URLs.

### D-135 — Vercel env vars
- `DATABASE_URL` — Supabase pooled (port 6543)
- `DIRECT_URL` — Supabase direct (port 5432) — не нужен в runtime, но Prisma config его читает; ставим тоже
- `BETTER_AUTH_SECRET` — 32-byte random
- `BETTER_AUTH_URL` — production URL (e.g. `https://rkn-tycoon.vercel.app`)
- `NEXT_PUBLIC_BETTER_AUTH_URL` — то же самое (для client fallback)

### D-136 — Без custom домена в v1
Стартуем на `*.vercel.app`. Custom domain (`rkn-tycoon.ru`) — позже когда юзер купит и настроит DNS.

### D-137 — `output: 'standalone'` НЕ нужен
Vercel сам оптимизирует Next build. `output: 'standalone'` нужен только для Docker/self-host.

## Tasks

### Wave A — Pre-flight (моя сторона)
A1. `pnpm build` проходит локально.
A2. Добавить `postinstall: prisma generate` в `package.json`.
A3. Проверить что нет leak'ов server env vars в client bundle.
A4. Убедиться что все API routes используют Node runtime (default), не Edge — Prisma не работает на Edge без Accelerate.
A5. Добавить Google OAuth redirect URI placeholder в auth config — на будущее (не активируем сейчас).

### Wave B — User: Vercel setup
B1. Push initial commit в GitHub репо (если ещё не).
B2. Vercel → New Project → Import Git Repository → выбрать `rkn-tycoon`.
B3. Framework Preset: **Next.js** (auto-detected).
B4. Build settings: default (Next.js detected).
B5. Environment Variables (Production + Preview):
   - `DATABASE_URL` = Supabase pooled
   - `DIRECT_URL` = Supabase direct
   - `BETTER_AUTH_SECRET` = output of `openssl rand -base64 32` (можно тот же что локально)
   - `BETTER_AUTH_URL` = `https://<your-project>.vercel.app` (заполнить после первого deploy'а — Vercel даёт URL)
   - `NEXT_PUBLIC_BETTER_AUTH_URL` = то же самое
B6. Deploy → ждать первый build.
B7. После первого deploy'а — обновить `BETTER_AUTH_URL` + `NEXT_PUBLIC_BETTER_AUTH_URL` точным URL'ом и redeploy.

### Wave C — Verify
C1. Открыть production URL → ASCII логотип крутится, /play работает.
C2. Анонимная сессия создаётся (cookie появляется).
C3. Накопить блокировки → подождать 30s → проверить в Supabase save row есть.
C4. Sign up через UI → проверь что анонимный save мигрировал.
C5. `/leaderboard` отрисовывает себя.
C6. 404 на `/foo` показывает кастомную страницу.

### Wave D — Custom domain (опционально, позже)
D1. Купить `rkn-tycoon.ru` (Reg.ru / namecheap / любой регистратор).
D2. Vercel → Settings → Domains → Add → следовать DNS-инструкциям.
D3. Обновить `BETTER_AUTH_URL` + `NEXT_PUBLIC_BETTER_AUTH_URL` + `metadataBase` в `layout.tsx` (уже `rkn-tycoon.ru` — норм).
D4. Redeploy.

## Critical files

**Modified:**
- `package.json` (postinstall script)

## Out of Scope

- CI миграции через GitHub Actions — manual via MCP пока хватит
- Cron job для cleanup anon-юзеров (AUTH-07) — Vercel Cron task, отдельный sprint
- Sentry / error tracking — v2
- Web analytics (PostHog/Plausible) — TODO в layout
- Custom domain — Wave D отдельно
