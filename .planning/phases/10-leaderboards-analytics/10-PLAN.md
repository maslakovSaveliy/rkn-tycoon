# Phase 10: Leaderboards + Game Analytics

**Goal:** Глобальные leaderboards (top-100 по `totalBlocksEver` и по `prestigeStars`), таблица `Event` для аналитики игровых эвентов. UI — страница `/leaderboard` + кнопка в header. Анонимные юзеры скрыты из публичного списка.

**Requirements:** LB-01..05, EVT-A-01..04, API-02.

## Decisions

### D-110 — Auto-update LeaderboardEntry прямо из `/api/save` POST
Не делаем отдельный submit endpoint. Каждый push save'а на сервер сам триггерит upsert строки в `LeaderboardEntry` (server-side derive из `gameState`). Меньше API surface, меньше rate-limit drift, меньше способов отделить save от LB.

### D-111 — Анонимные юзеры скрыты с публичного leaderboard
Фильтр `user.isAnonymous = false`. Они всё равно видят свой собственный rank через отдельный endpoint (если захотим), но в публичной табличке только зарегистрированные. Privacy + signal.

### D-112 — Display name = `user.name` или fallback на email-prefix
На signup мы уже сохраняем `name = email.split('@')[0]`. Если name пуст — берём email до `@`. Email целиком не показываем.

### D-113 — Sanity простой: монотонность + конечность
- `totalBlocksEver` не убывает (per userId)
- `prestigeStars` не убывает
- Numeric ≥ 0, конечно (не NaN/inf)
- BPS-cap откладываю — prestige делает стэкинг легальных значений астрономическим. Для v1 ловим только мусор.

### D-114 — `/leaderboard` страница = ISR 60s
Server component fetcher с `revalidate: 60`. На Vercel это даёт edge-cache, обновление каждую минуту. Materialized view не нужен — DB-side query top 100 быстрый при индексе.

### D-115 — `Event` таблица с двумя индексами
`(userId, createdAt DESC)` для «события юзера» + `(eventType, createdAt DESC)` для агрегаций. `payload` Jsonb. Per-row ~200 bytes — для миллионов событий нормально.

### D-116 — Client batches via ring buffer + flush
- Queue in-memory (sessionStorage не используем, события не критичны если потеряны при крэше)
- Auto-flush каждые 60s + на `visibilitychange` + на достижении 20 событий в очереди
- Idempotency не нужна — duplicate events в DB не страшно

### D-117 — Web analytics отложен
PostHog / Plausible — не ставим в Phase 10. Хук-place для скрипта в layout — добавляю TODO, юзер сможет dropin'нуть когда захочет.

### D-118 — `playtimeSeconds` в GameState
Аккумулирует ms из tick'ов. Save schema bump → v4. Миграция: для v3 saves подставить 0 (мы не знаем сколько играли — потеряли).

### D-119 — Rate-limit на /api/events
Same pattern as /api/save: token bucket 3 capacity / 1 token per 3s per userId. На batch это около 60 событий в минуту — должно хватать.

### D-120 — Event types — открытый список, но 5 семантических для start
- `game.click_milestone` (totalBlocksEver достигло 1e3/1e6/1e9/1e12)
- `game.upgrade_purchased` (id апгрейда)
- `game.censor_purchased` (id + count)
- `game.event_clicked` (id события)
- `game.prestige_done` (gainedStars)

Эти эвенты эмитятся клиентом через `enqueueEvent` в gameStore.

## Tasks

### Wave A — Schema
A1. Prisma schema: добавить `LeaderboardEntry` + `Event` модели.
A2. Apply migration через MCP.
A3. `pnpm db:generate`.

### Wave B — GameState v4
B1. `types/save.ts`: добавить `playtimeSeconds: number`, bump `CURRENT_SAVE_VERSION = 4`.
B2. `engine/migrations.ts`: v3 → v4 step (seeds `playtimeSeconds: 0`).
B3. `engine/economy.ts`: `applyTick` инкрементит `playtimeSeconds += dtMs/1000`.
B4. `state/gameStore.ts` partialize + migrate расширить новым полем.
B5. Vitest: добавить v3→v4 миграция, applyTick growth test.

### Wave C — Server
C1. `src/server/leaderboardRepo.ts`: `upsertFromSave({ userId, totalBlocksEver, prestigeStars, playtimeSeconds })` + `top({ by: 'blocks' | 'stars', limit: 100 })`.
C2. `src/server/eventsRepo.ts`: `insertBatch(userId, sessionId, events)`.
C3. `src/server/saveRepo.ts`: расширить `upsertSaveIfNewer` чтобы вызывать `leaderboardRepo.upsertFromSave` после успешной записи save.
C4. `/api/save` POST: парсит `gameState`, извлекает `totalBlocksEver` (`__D` строка → BigInt-сравнение для монотонности), `prestigeStars`, `playtimeSeconds`. Передаёт в repo.
C5. `/api/events` POST: zod batch validation + rate-limit + insert.
C6. `/api/leaderboard` GET: `?by=blocks|stars&limit=100` → top, фильтр `user.isAnonymous=false`.

### Wave D — Client
D1. `src/state/eventsClient.ts`: queue + flusher (60s + visibility + maxQueue=20).
D2. `src/state/gameStore.ts`: `enqueueEvent(type, payload)` action, вызывает eventsClient.
D3. Хуки в существующих actions:
   - `purchaseClickUpgrade` → enqueue `game.upgrade_purchased`
   - `purchaseCensor` → enqueue `game.censor_purchased`
   - `clickEvent` → enqueue `game.event_clicked`
   - `performPrestige` → enqueue `game.prestige_done`
   - tick milestone check → enqueue `game.click_milestone` когда переход через 1e3/1e6/1e9/1e12.

### Wave E — UI
E1. `src/app/leaderboard/page.tsx`: server component, `revalidate: 60`, рендер top-100 для blocks + stars (tabs).
E2. `src/ui/LeaderboardButton.tsx`: header chip → `Link` на `/leaderboard`.
E3. AppShell wires LeaderboardButton.

### Wave F — Verify
F1. `pnpm verify` зелёный.
F2. Manual:
   - Залогин → накопи blocks → 30s push → проверь LeaderboardEntry в Supabase
   - Открой `/leaderboard` → видишь себя
   - Купи апгрейд / событие / prestige → проверь Event таблицу
   - Аноним не появляется в публичной табличке

## Critical files

**New:**
- `src/app/api/events/route.ts`
- `src/app/api/leaderboard/route.ts`
- `src/app/leaderboard/page.tsx`
- `src/server/leaderboardRepo.ts`
- `src/server/eventsRepo.ts`
- `src/state/eventsClient.ts`
- `src/ui/LeaderboardButton.tsx`

**Modified:**
- `prisma/schema.prisma` (+LeaderboardEntry, +Event)
- `src/types/save.ts` (+playtimeSeconds, version 4)
- `src/engine/migrations.ts` (+v3→v4)
- `src/engine/economy.ts` (playtimeSeconds in applyTick)
- `src/state/gameStore.ts` (partialize+migrate+enqueueEvent hooks)
- `src/server/saveRepo.ts` (call leaderboardRepo)
- `src/app/api/save/route.ts` (extract LB metrics)
- `src/ui/AppShell.tsx` (LeaderboardButton in header)

## Commits (planned)

1. `feat(db): LeaderboardEntry + Event models + migration`
2. `feat(engine): save v4 with playtimeSeconds + migration v3→v4`
3. `feat(server): leaderboard + events repos; saveRepo updates LB on push`
4. `feat(api): /api/leaderboard, /api/events, /api/save updates LB`
5. `feat(state): events client batch flusher + enqueueEvent hooks`
6. `feat(ui): /leaderboard page + header LeaderboardButton`
7. `test(engine,server): v3→v4 migration + LB sanity`
8. `docs(roadmap): mark Phase 10 done`

## Out of Scope (deferred)

- Web analytics (PostHog/Plausible) — TODO в layout
- Friend leaderboards / per-region — v2
- Daily/weekly leaderboards — v2
- Player profile page — v2
- BPS cap sanity validator — нужна метрика max-theoretical-BPS, v2
