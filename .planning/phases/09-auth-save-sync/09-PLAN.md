# Phase 9: Auth + Save Sync (BetterAuth)

**Goal:** email+password регистрация без подтверждения, anonymous-сессия с первого визита, save переезжает в Supabase Postgres при signup'е через `onLinkAccount`. Дальше двусторонний sync localStorage ↔ БД.

**Requirements:** AUTH-01..07, DB-01, DB-02, DB-04, API-01, API-04.

## Decisions

### D-90 — Two-tier save sync: localStorage primary + DB на auth-моментах
localStorage остаётся первичным хранилищем (как сейчас, throttled 10s). После signup'а появляется второй слой — Supabase Save. Запись в БД throttled на 30s + flush на visibilitychange (тот же паттерн что у localStorage, но реже — чтобы не дёргать Supabase лимиты). До signup'а — БД не трогаем, только локально.

### D-91 — Conflict resolution = newer `updatedAt` wins
Без merge-стратегии. Одно устройство — один save. При login клиент шлёт свой `updatedAt`, сервер сравнивает: если client старше — отдаёт server-версию, клиент перезаливает в localStorage; если client новее — обновляет БД и отдаёт client-версию обратно. Multi-tab race разрешается через timestamps без блокировок (мелкое расхождение в долях секунды никого не убьёт).

### D-92 — Settings store остаётся local-only
`settingsStore` (soundEnabled) **не** синкается в БД. Юзер на другом устройстве может выставить звук по своему вкусу. Не стоит лишних таблиц/миграций.

### D-93 — Anonymous плагин по умолчанию для всех гостей
BetterAuth `anonymous` plugin создаёт user-запись + session-cookie на первом запросе из `/play`. Все игроки с самого начала имеют `userId` (просто без email). Save хранится в localStorage под этим anon-userId. При signup → `onLinkAccount` мигрирует save на нового authed-userId.

### D-94 — Auth UI = модалка, не отдельная страница
Тот же паттерн что `UpgradesMenu` / `PrestigeModal`. Header кнопка `войти` / `зарегаться` → модалка с email+password, toggle между sign-in / sign-up внутри. Залогиненный юзер видит `email · выйти`.

### D-95 — Auth contract в `src/server/auth.ts`
BetterAuth конфиг с `prismaAdapter`, `emailAndPassword: { enabled: true, requireEmailVerification: false }`, `anonymous()` плагин с `onLinkAccount` callback'ом, rate-limit `{ window: 60, max: 10 }`. Все API routes используют `auth.api.getSession({ headers: await headers() })` для проверки.

### D-96 — `/api/auth/[...all]` catch-all route
Все BetterAuth endpoints (sign-up/sign-in/sign-out/session) обслуживаются одним catch-all route handler'ом. BetterAuth даёт готовый `toNextJsHandler` хелпер.

### D-97 — Save endpoint защищён сессией + own rate-limit
`POST /api/save` принимает `{ gameState, version, updatedAt }`, валидирует zod, проверяет `userId` через сессию, обновляет/возвращает Save row. Rate-limit отдельный от BetterAuth: 1 запрос / 3s на userId.

### D-98 — Cleanup unlinked anonymous-юзеров = backlog
Cron для удаления anon-юзеров старше 30 дней (AUTH-07) — Phase 11 deploy task (Vercel Cron). Сейчас просто оставляем TODO в `src/server/auth.ts`.

### D-99 — Save schema — JSON column, не нормализуем
`Save.gameState Json` — храним весь GameState (включая Decimal'ы как `{__D}` строки через тот же codec) одним JSONB-полем. Indexes/queries на отдельные поля нам не нужны — save читается целиком по userId. Меньше миграций при изменении GameState.

### D-100 — Hydration order при login
Когда юзер залогинился (был уже игравшим анонимом → signup, или authed-юзер вернулся):
1. Текущий localStorage state помечается `updatedAt`
2. Fetch `/api/save` → server payload
3. Compare timestamps:
   - Server newer → overwrite localStorage + rehydrate store
   - Client newer → POST `/api/save` с current state
4. Resume normal play

Реализуется хуком `useAuthSync` в AppShell, фаирится при изменении session.

## Tasks

### Wave A — Setup (нужен user-input для Supabase)
A1. **User action:** создать Supabase-проект на supabase.com (free tier). Скопировать `DATABASE_URL` (Connection Pooling → Transaction → port 6543) и `DIRECT_URL` (Direct connection → port 5432) в `.env.local`. Сообщить мне когда готово.
A2. `pnpm add better-auth@1.6.11 @better-auth/prisma-adapter` + `pnpm add -D @better-auth/cli` (для миграций auth schema).
A3. `BETTER_AUTH_SECRET=$(openssl rand -base64 32)` в `.env.local`.

### Wave B — Prisma schema + миграции
B1. `prisma/schema.prisma`: добавить модели `User`, `Session`, `Account`, `Verification` (по контракту BetterAuth) + `Save`.
B2. `prisma db push` (через `DIRECT_URL`) — применить схему на Supabase.
B3. `prisma generate` — сгенерировать client.

### Wave C — Server auth
C1. `src/server/auth.ts`: `betterAuth({...})` с `prismaAdapter`, `emailAndPassword`, `anonymous` plugin, rate-limit.
C2. `src/app/api/auth/[...all]/route.ts`: catch-all через `toNextJsHandler(auth)`.
C3. `src/server/saveRepo.ts`: `getSave(userId)` / `upsertSave(userId, payload)` + handling Save→GameState codec.

### Wave D — Save endpoint
D1. `src/app/api/save/route.ts`:
   - `GET`: session-protected, returns `{ gameState, version, updatedAt }` или 404
   - `POST`: zod-валидация body, last-write-wins
   - Rate-limit (in-memory token bucket per userId)
D2. `src/state/serverSync.ts` (lib-side): `fetchSave()` / `pushSave(state)` HTTP helpers.

### Wave E — Auth UI
E1. `src/lib/authClient.ts`: `createAuthClient` из `better-auth/react` с правильным `baseURL`.
E2. `src/ui/AuthModal.tsx`: email+password form, sign-in/sign-up toggle, errors, loading.
E3. `src/ui/AuthButton.tsx`: header chip — `войти` / `email · выйти` в зависимости от session.
E4. AppShell: добавить AuthButton в header toolbar, mount AuthModal по флагу.

### Wave F — Hydration sync
F1. `src/ui/useAuthSync.ts`: хук слушает session changes, делает merge per D-100.
F2. gameStore: расширить с `_serverUpdatedAt` (transient — для сравнения с сервером).
F3. AppShell: использует `useAuthSync()` после hydration.

### Wave G — Verify
G1. `pnpm verify` зелёный + новые тесты на conflict resolution helper.
G2. Manual smoke:
   - Открыть `/play` инкогнито → анонимная сессия создалась, save в localStorage
   - Накопить блокировки
   - Зарегистрироваться → save переехал в Supabase
   - Открыть в другом инкогнито → войти → save подтянулся с сервера
   - Выйти → state остался в localStorage анон-юзера
   - Войти снова → server save затянулся

## Critical files

**New:**
- `src/server/auth.ts`
- `src/server/saveRepo.ts`
- `src/app/api/auth/[...all]/route.ts`
- `src/app/api/save/route.ts`
- `src/lib/authClient.ts`
- `src/state/serverSync.ts`
- `src/ui/AuthButton.tsx`
- `src/ui/AuthModal.tsx`
- `src/ui/useAuthSync.ts`

**Modified:**
- `prisma/schema.prisma` (User/Session/Account/Verification/Save)
- `prisma.config.ts` (DIRECT_URL для migrate)
- `.env.local` (BETTER_AUTH_SECRET)
- `src/state/gameStore.ts` (transient `_serverUpdatedAt`, action `applyServerSave`)
- `src/ui/AppShell.tsx` (wire AuthButton + useAuthSync)

## Commits (planned)

1. `chore(deps): better-auth + prisma adapter for auth`
2. `feat(db): Prisma schema for BetterAuth (User/Session/Account/Verification) + Save`
3. `feat(server): BetterAuth config with anonymous plugin + onLinkAccount save migration`
4. `feat(api): /api/auth catch-all + /api/save endpoint with last-write-wins`
5. `feat(ui): AuthModal + AuthButton in header`
6. `feat(state): server-sync hook + applyServerSave action`
7. `test(server): save conflict resolution`
8. `docs(roadmap): mark Phase 9 done`

## Out of Scope (deferred)

- OAuth (Google / Yandex / TG Login) — post-v1
- Email verification flow — пользователь явно отказал
- 2FA — post-v1
- Cron cleanup unlinked anonymous-users — Phase 11 (Vercel Cron job)
- Settings cross-device sync — D-92 keeps it local
