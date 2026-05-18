# Phase 1: Foundation + Tone Bible - Context

**Gathered:** 2026-05-16 (rewritten for Next.js pivot)
**Status:** Ready for planning

<domain>
## Phase Boundary

Runnable Next 15 + React 19 + TypeScript strict scaffold с:
- engine/view/server **7-зон** boundary, enforced ESLint'ом,
- rAF + 10 Hz фиксированным шагом, который тикает game store на странице `/play`,
- Zustand `persist` с кастомным кодеком, который round-trip'ит `Decimal` через localStorage,
- save-payload с `version: 1` + `migrate()` stub + восстановлением из повреждённого сейва,
- глобальным `prestige_multiplier = 1.0`, продёрнутым через формулу дохода с первого коммита,
- Prisma + Postgres локально через `docker-compose.yml` (пустая schema, только generator + datasource),
- `/api/health` route с `db.$queryRaw\`SELECT 1\`` — доказывает что Next API + Prisma + Postgres взлетают,
- landing-placeholder на `/` с кнопкой «Играть» (→ `/play`),
- Debug HUD как client component на `/play`,
- `.planning/TONE.md` уже locked (восстановлен из бэкапа, не трогаем).

**НЕ в этой фазе** (отложено):
- Любой игровой контент (кликабельная кнопка, каталоги, копи) — Phase 2-3
- Auth, BetterAuth, User-модель — Phase 9
- Лидерборды, аналитика — Phase 10
- IAP, ads — Phase 11-12
- Production Dockerfile, reverse-proxy, домен — Phase 13
- Self-hosted шрифты, ASCII-полировка — Phase 7
- Landing-метатеги, OG — Phase 7/8

</domain>

<decisions>
## Implementation Decisions

### Engine / View / Server boundary (7 zones)
- **D-01:** `eslint-plugin-import` + `import/no-restricted-paths` enforce'ит границу. Базовый инструмент, без отдельного плагина, работает по путям файлов.
- **D-02:** Зоны:
  - `src/engine/**` — pure TS. ЗАПРЕЩЕНО импортить: `react`, `react-dom`, `next/*`, `motion`, `motion/react`, `howler`, `lucide-react`, `@prisma/client`, `better-auth*`, `src/state/**`, `src/ui/**`, `src/app/**`, `src/server/**`, любые DOM-globals (`document`, `window` — `no-restricted-globals`).
  - `src/state/**` — Zustand vanilla store + persist middleware. Может импортить: `src/engine/**`, `src/lib/**` (client-safe parts only), `src/data/**`, `src/types/**`. ЗАПРЕЩЕНО: `react`-хуки в этом слое (хуки в `ui/` через `useStore(selector)`), `src/server/**`, `src/app/**`.
  - `src/ui/**` — React **client components** с `'use client'`. Может: `src/engine/**`, `src/state/**`, `src/lib/**` (client-safe), `src/data/**`, `src/types/**`. ЗАПРЕЩЕНО: `src/server/**`, прямой импорт `@prisma/client` или `lib/db`.
  - `src/lib/**` — pure utils (formatters, time, random helpers). Тот же запретный список что у `engine/`. **Исключения**: `src/lib/db.ts` (Prisma singleton) — server-only, помечается `import 'server-only'`.
  - `src/data/**` — контент-конфиги (upgrades, censors, events, achievements — заполняются в Phase 2-5). Импорт только из `src/lib/**`, `src/types/**`. Без сторов, без UI.
  - `src/app/**` (Next App Router) — pages, layouts, route handlers. Может всё, но файлы под `'use client'` не должны импортить `src/server/**`.
  - `src/server/**` — server-only код. Все файлы начинаются с `import 'server-only'`. Доступен только из `src/app/api/**` и server components. В Phase 1 — почти пустой (`server/health.ts` если что-то будет шарится; иначе папка-плейсхолдер).
- **D-03:** Дополнительные ESLint-правила:
  - `@typescript-eslint/no-floating-promises` (сейвы и API-вызовы не теряются)
  - `no-restricted-syntax` для `CallExpression[callee.name="Number"][arguments.0.type="Identifier"]` где аргумент имеет тип Decimal (или просто запрет `Number(x)` где `x` — `Decimal` — через свой кастомный matcher)
  - `eslint-config-next` для базовых React-rules

### Структура src/
- **D-04:** Layout:
  ```
  src/
  ├─ app/             # Next App Router
  │  ├─ layout.tsx    # Root layout (Phase 1: минимальный, без metadata-полировки)
  │  ├─ page.tsx      # Landing placeholder (заголовок + кнопка → /play)
  │  ├─ globals.css   # @import "tailwindcss"; + @theme {}
  │  ├─ play/
  │  │  └─ page.tsx   # Рендерит <AppShell /> client component
  │  └─ api/
  │     └─ health/
  │        └─ route.ts  # GET → { ok, version, db: 'connected' }
  ├─ engine/          # Pure TS: tick.ts, codec.ts, migrations.ts, economy.ts
  ├─ state/           # Zustand store + persist (gameStore.ts, persistStorage.ts)
  ├─ ui/              # React client components (AppShell.tsx, DebugHud.tsx)
  ├─ data/            # Контент-конфиги (.gitkeep в Phase 1, .ts файлы в Phase 2+)
  ├─ lib/             # Pure utils + Prisma singleton (db.ts server-only)
  ├─ server/          # Server-only код (.gitkeep в Phase 1, наполняется в Phase 9+)
  └─ types/           # Shared types (save.ts, game.ts)

  prisma/
  ├─ schema.prisma    # Только generator + datasource в Phase 1
  └─ migrations/      # Пустая в Phase 1

  docker-compose.yml  # postgres:16-alpine service
  Dockerfile          # НЕТ в Phase 1 (Phase 13)
  ```
- **D-05:** `src/app/globals.css` — единственный CSS-вход, `@import "tailwindcss";` + `@theme {}` блок. Tailwind v4 интеграция с Next 15 — через `@tailwindcss/postcss` в `postcss.config.mjs` (предположение; финально подтверждается в 01-01-PLAN.md через context7).

### Prisma + Postgres
- **D-12:** Prisma singleton в `src/lib/db.ts`:
  ```ts
  import 'server-only'
  import { PrismaClient } from '@prisma/client'
  const globalForPrisma = global as unknown as { prisma?: PrismaClient }
  export const db = globalForPrisma.prisma ?? new PrismaClient(...)
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
  ```
- **D-13:** `docker-compose.yml` в корне с одним сервисом `postgres:16-alpine`:
  - port 5432 → host port (или dev-only 5433 если конфликт)
  - volume mount `./.data/postgres:/var/lib/postgresql/data` (gitignored)
  - environment: `POSTGRES_DB=rkn_tycoon`, `POSTGRES_USER=rkn`, `POSTGRES_PASSWORD` — из `.env` (gitignored)
  - `.env.example` коммитится с placeholder'ами; `.env.local` копируется руками
- **D-16:** Prisma schema в Phase 1 — **пустая**:
  ```prisma
  generator client { provider = "prisma-client-js" }
  datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
  }
  ```
  Никаких моделей. BetterAuth + игровые модели прилетают в Phase 9-11.
- **D-17:** `/api/health` route:
  ```ts
  // src/app/api/health/route.ts
  import { db } from '@/lib/db'
  export async function GET() {
    await db.$queryRaw`SELECT 1`
    return Response.json({ ok: true, version: process.env.npm_package_version, db: 'connected' })
  }
  ```
  Vitest-тест (через mock DB или integration) проверяет 200-ответ.

### TONE.md
- **D-06:** Файл `.planning/TONE.md` уже существует (восстановлен из бэкапа). **Не трогаем содержимое.** Phase 1 только верифицирует:
  - Файл существует и непустой
  - Содержит 5 секций: Философия / Красные линии / Бюрократический register / good-bad примеры / Re-audit checklist
  - Last-modified date — отметить в `01-05-PLAN.md` verification step
- **D-07:** Файл считается «authored» — Phase 3+ блокируются если он отсутствует или пуст.

### Phase 1 dev-UI + тесты
- **D-08:** Видимый Debug HUD как client component (`'use client'`) в `src/ui/DebugHud.tsx`:
  ```
  blocks: 1.23e10 | BPS: 0 | tick #1234 | FPS: 60 | save v1 | storage: 1.2KB | uptime: 12:34:56
  ```
  Подключён к стору через Zustand selector. Стилизация — terminal-минимальная (моноширинный, чёрный фон, зелёный текст) даже сейчас — задаёт тон будущим экранам.
- **D-09:** В Phase 1 HUD всегда видим на `/play`. С Phase 2+ — за флагом (`?debug=1` или `process.env.NODE_ENV === 'development'`).
- **D-10:** Vitest ставится в Phase 1. Минимум **5 юнит-тестов**:
  1. Codec round-trip: `Decimal('1.23e456')` → JSON → parse → `.eq()` исходному.
  2. Codec round-trip nested: вложенный `Decimal` в объекте, в массиве.
  3. Tick accumulator: подача 250мс delta даёт 2 тика по 100мс + 50мс остаток (через тестируемый `runAccumulator(250, 0, 100)`).
  4. Migrate stub: `migrate(state, 0)` возвращает state как есть (идентичность).
  5. Corrupted save: невалидный JSON в localStorage → logged error, чистый старт без throw.
  Опционально (если время позволит) **6-й**: `/api/health` route handler возвращает 200 (через `import { GET } from '@/app/api/health/route'` + mock'нутая `db`).
- **D-11:** Тесты живут в `src/**/*.test.ts` рядом с кодом (collocated). Vitest config: `environment: 'node'` для engine, `'jsdom'` точечно если потребуется (DebugHud-тест в Phase 1 можно опустить — HUD проверяем глазами в браузере).

### Phase 1 не делает
- **D-14:** Auth, BetterAuth, User-модель — Phase 9. В Phase 1 не ставим `better-auth`, не пишем `src/server/auth.ts`.
- **D-15:** Игровая логика (click button, upgrade catalog, censor catalog, achievements) — Phase 2+. В Phase 1 engine знает только: tick → пересчитать `blocks += clickValue + cps * dt` (с `prestigeMult` через формулу), сохранить через persist. Click value и CPS в Phase 1 — статичные нули (или ручка для теста: `state.devGiveBlocks(...)`).
- **D-18:** SEO-метатеги (`app/layout.tsx` metadata), OG-картинки — Phase 7/8. В Phase 1 layout минимальный.

### Claude's Discretion
- Время в tick'е: `performance.now()` для delta внутри rAF; `Date.now()` сохраняется в стор как `lastTick` для будущего offline (Phase 4). Записать оба.
- Autosave в Phase 1: persist middleware + сохранение на `visibilitychange` и `beforeunload`. 10s timer — Phase 3 (см. ROADMAP). В Phase 1 простой подход: persist срабатывает при изменении стора.
- Маркер Decimal в JSON: `__D` (заглавный, REQUIREMENTS SAVE-02 явно фиксирует).
- Структура Zustand: один стор с slice-функциями (currency-slice, meta-slice, settings-slice). Combine'аем в `createStore` в `state/gameStore.ts`.
- `'use client'` директива нужна на: `ui/AppShell.tsx`, `ui/DebugHud.tsx`, `app/play/page.tsx` (если рендерит client напрямую — иначе делегирует на client-компонент через RSC обёртку).
- Префиттинг шрифтов (JetBrains Mono / IBM Plex Mono) — Phase 7. В Phase 1 — системный моноширинный (`font-family: ui-monospace, monospace`).
- `.editorconfig`, `.prettierrc.json` (уже в репо — не трогать), `package.json#engines.node` (>=20), pnpm lockfile — стандартный housekeeping в Phase 1.
- Conventional commits — все коммиты атомарные, `feat/fix/chore/docs/test/refactor` префиксы.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project locks
- `CLAUDE.md` (rewritten 2026-05-16) — Next 15 стек, integration gotchas (Prisma singleton, Tailwind 4+Next, Zustand+Decimal, rAF accumulator, BetterAuth contract для Phase 9, Howler unlock, Lucide tree-shaking). Самый важный референс.
- `.planning/PROJECT.md` — vision, constraints, key decisions (Next 15, Postgres, Docker self-host, BetterAuth, trust-client anti-cheat).
- `.planning/REQUIREMENTS.md` — конкретные требования с ID: CORE-02 (Decimal везде), CORE-04 (rAF 10 Hz), CORE-06 (prestige_multiplier через формулу), SAVE-02 (`__D` маркер), SAVE-03 (`version: 1` + `migrate()`), SAVE-04 (corrupted save fallback), DEPLOY-01 (docker-compose Postgres локально), DB-03 (Prisma singleton), API-03/05 (`/api/health`), WEB-02 (`/play` route), TONE-01/02/03.

### Phase scope
- `.planning/ROADMAP.md` §Phase 1 — Goal, Success Criteria (10 пунктов), Depends on, Requirements. Лочит «что должно быть истинно» по итогу фазы.

### Будут созданы в этой фазе
- `src/types/save.ts` — Save shape, GameState типы; будущие фазы импортят отсюда.
- `src/engine/codec.ts`, `engine/tick.ts`, `engine/migrations.ts`, `engine/economy.ts` — engine entry-points.
- `src/state/gameStore.ts`, `state/persistStorage.ts` — Zustand store + persist.
- `src/lib/db.ts` — Prisma singleton.
- `src/ui/AppShell.tsx`, `src/ui/DebugHud.tsx` — client UI.
- `src/app/page.tsx`, `src/app/play/page.tsx`, `src/app/api/health/route.ts`.

### Будут созданы НЕ в этой фазе (упоминаем для downstream)
- `.planning/research/auth-comparison.md` — research результат для BetterAuth-выбора (создаётся параллельно).
- `src/server/auth.ts` — Phase 9.

### Внешние гайды (читать при планировании)
- CLAUDE.md §"Zustand persist + break_infinity.js serialization (CRITICAL)" — официальный паттерн `createJSONStorage` с replacer/reviver.
- CLAUDE.md §"Game-loop timing — requestAnimationFrame over setInterval (CRITICAL)" — delta-time accumulator.
- CLAUDE.md §"Prisma client singleton (HMR-safe)" — паттерн в `src/lib/db.ts`.
- CLAUDE.md §"Tailwind 4 + Next 15" — `@tailwindcss/postcss`, `@import "tailwindcss";`, `@theme {}`.
- CLAUDE.md §"Next 15 App Router — RSC vs Client boundary" — где ставить `'use client'`.
- Через `/context7` при имплементации 01-01-PLAN: подтвердить точные команды `create-next-app`, последний stable Next 15 minor, точную интеграцию Tailwind v4.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Репозиторий **очищен** (только `CLAUDE.md`, `.planning/`, `lancedb/`). Phase 1 строит src/ с нуля.
- `.prettierrc.json` уже в репо — не пересоздавать, использовать as-is.
- `.planning/TONE.md` уже существует — locked, не трогать содержимое.

### Established Patterns
- CLAUDE.md фиксирует все паттерны (engine/view/server boundary, Decimal codec, rAF accumulator, Prisma singleton, Tailwind v4) до первой строки кода.
- ESLint rules — `no-floating-promises`, кастомный matcher для `Number(decimal)`, `no-restricted-globals` для DOM-globals в engine — должны быть в `eslint.config.js` с Phase 1.

### Integration Points
- `src/state/gameStore.ts` — единственная точка контакта engine ↔ ui. Engine читает/пишет через slice-функции, UI читает через `useStore(selector)`.
- `localStorage` ключ — фиксируем явно: `rkn-tycoon@v1`. Включаем версию в имя — будущие breaking migrations можно сделать новой версией ключа, а не только через `migrate()`.
- `src/app/api/health/route.ts` ↔ `src/lib/db.ts` ↔ Postgres (docker-compose). Только этот path в Phase 1 трогает Prisma.

</code_context>

<specifics>
## Specific Ideas

- Debug HUD стилизуем терминально-минимально (mono, чёрный фон, зелёный текст) через Tailwind utility-классы — задаёт тон будущим экранам без ассет-блокеров.
- TONE.md good/bad примеры писать в Phase 5/7 когда нужен флавор-копирайт; Phase 1 файл — placeholder с структурой (уже есть).
- Persist storage key — `rkn-tycoon@v1` (версия в имени).
- `.env.example`:
  ```
  DATABASE_URL="postgresql://rkn:rkn_dev_password@localhost:5432/rkn_tycoon?schema=public"
  ```
- `package.json#scripts`:
  - `dev`: `next dev`
  - `build`: `next build`
  - `start`: `next start`
  - `lint`: `next lint` (или `eslint .`)
  - `typecheck`: `tsc --noEmit`
  - `test`: `vitest`
  - `test:watch`: `vitest --watch`
  - `db:up`: `docker compose up -d postgres`
  - `db:down`: `docker compose down`
  - `db:push`: `prisma db push`
  - `db:generate`: `prisma generate`

</specifics>

<deferred>
## Deferred Ideas

- Боевой UI (кликабельная кнопка, счётчик, popup) — Phase 2.
- К/М/Б/Т formatter — Phase 2 (CORE-03 mapped to Phase 2).
- 10-секундный autosave таймер — Phase 3 (SAVE-01).
- Offline progress — Phase 4 (SAVE-05).
- Random events, achievements — Phase 5.
- Prestige — Phase 6.
- JetBrains Mono / IBM Plex Mono self-hosting, ASCII box-drawing borders, CRT glow, layout metadata API — Phase 7.
- Landing с описанием/CTA + dynamic OG — Phase 8.
- BetterAuth, anonymous plugin, save sync, User модель — Phase 9.
- Leaderboards, game analytics, Plausible/PostHog — Phase 10.
- Stripe/CloudPayments, Boosty/DonationAlerts buttons, IAP webhooks — Phase 11.
- Yandex/AdSense rewarded ads, locale split — Phase 12.
- Production Dockerfile, reverse-proxy, prisma migrate deploy, itch.io static export — Phase 13.

</deferred>

---

*Phase: 01-foundation-tone-bible*
*Context rewritten: 2026-05-16 after Next.js pivot (was Vite SPA, now Next 15 + Prisma + Postgres). Decisions D-01..D-11 preserved conceptually; D-12..D-18 new for Prisma/health/empty-schema; tested rejection of TG Mini App and portal-adapter scope.*
