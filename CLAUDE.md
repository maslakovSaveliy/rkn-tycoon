<!-- GSD:project-start source:PROJECT.md -->
## Project

**RKN Tycoon**

2D idle-clicker веб-игра в стиле Cookie Clicker на тему интернет-цензуры (юмористическая сатира на Роскомнадзор). Игрок кликает по большой кнопке «Заблокировать», копит блокировки как валюту, покупает апгрейды кликов и автоматических цензоров, растит «цензурную империю». Целевая аудитория — русскоязычные игроки.

**Core Value:** Кликабельный satire-loop работает: клик → видимый рост счётчика блокировок → покупка апгрейда/цензора → автоматический доход → новый клик. Если этот цикл не «залипает» — всё остальное не имеет смысла.

### Constraints

- **Tech stack**: Next.js 15 (App Router) + React 19 + TypeScript 5 strict + Tailwind CSS 4 + Zustand 5 + Prisma + Supabase Postgres + BetterAuth + Framer Motion (`motion/react`) + Howler.js + Lucide React + break_infinity.js + zod. pnpm.
- **Backend**: Next API routes на том же проекте, Postgres через Prisma → Supabase. BetterAuth для регистрации email+password без подтверждения. Аналитика игровых событий в Postgres-таблице `Event`.
- **Deploy**: Vercel (Next host) + Supabase (Postgres). Production env vars в Vercel; локальная разработка через `.env.local` с Supabase connection-strings.
- **Платформа**: только веб-браузер (desktop primary, mobile-friendly). TG Mini App вырезан из scope.
- **Локализация**: только русский в v1. i18n отложен на Phase 7+.
- **Anti-cheat**: trust client локально; серверная валидация только при leaderboard submit (sanity-проверки: монотонность `total_blocks_ever`, разумный потолок BPS относительно `playtime_seconds`).
- **Объём v1**: играбельная демка → лидерборды. Без монетизации, IAP, donations, рекламы.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

### Core Technologies (Locked, Versions Pinned at install time)

| Technology | Target Version | Purpose | Why |
|------------|----------------|---------|-----|
| **Next.js** | `^15.5` (App Router) | React framework, routing, SSR, API routes | Single project for landing/game/API. Server Components для SEO, client components для игры. |
| **React** | `^19.0` | UI framework | Next 15 — последняя ветка для React 19. **React Compiler не включаем** — он может инлайнить замыкания в rAF-цикле непредсказуемо. |
| **react-dom** | `^19.0` | DOM renderer | Pair with React. |
| **TypeScript** | `^5.9` (strict) | Type safety | TS 6.0 ещё свежее, держимся на 5.9.x пока экосистема не догонит. |
| **Tailwind CSS** | `^4.3` (Oxide engine) | Utility-first CSS | CSS-first `@theme` config; ASCII-терминальная эстетика собирается через `var(--color-*)` без `tailwind.config.js`. |
| **@tailwindcss/postcss** | `^4.3` | Tailwind v4 + Next интеграция | Next 15 нативно работает через PostCSS pipeline. **Не** ставить `@tailwindcss/vite`. |
| **Zustand** | `^5.0` | Game state store | Один store со slice-функциями. Селекторы предотвращают re-render storms при 10 Гц тике. |
| **break_infinity.js** | `^2.2` | Big-number арифметика | Required с первого дня: `Number.MAX_VALUE` (≈1.8e308) ловится в <1ч idle-игры. |
| **motion** (post-rebrand `framer-motion`) | `^12.38` | Анимации | Click button bounce, toasts. **Import from `motion/react`**. Не ставить `motion` и `framer-motion` одновременно. |
| **howler.js** | `^2.2.4` | SFX | Mobile-unlock на первом touch; `mp3+webm/ogg` fallback. |
| **lucide-react** | `^1.16` | Иконки | Tree-shakeable named imports. |
| **Prisma** | `^7.x` | ORM | Type-safe Postgres queries; в Prisma 7 datasource URL живёт в `prisma.config.ts`. |
| **@prisma/client** | matches `prisma` | Runtime client | Generate-step после миграций. |
| **@prisma/adapter-pg** | matches `prisma` | Postgres driver adapter | Prisma 7 требует явный driver adapter. |
| **Supabase** | hosted Postgres | БД | DATABASE_URL — pooled (port 6543, pgbouncer), DIRECT_URL — direct (port 5432). |
| **better-auth** | `^1.6.11` (exact pin) | Аутентификация | True stable, `emailAndPassword: { enabled: true }`, scrypt по умолчанию, **native `anonymous` plugin** для guest→registered save migration. См. `.planning/research/auth-comparison.md`. |
| **@better-auth/prisma-adapter** | matches `better-auth` | Prisma adapter | Schema через CLI. |
| **zod** | `^3.x` или `^4.x` | Валидация | Все API routes валидируют input через zod. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **pnpm** | Package manager | `packageManager` field в `package.json` + `engines.node` (>=20). |
| **ESLint 9** (flat config) | Linting | Required plugins: `@typescript-eslint`, `eslint-plugin-import` (для `no-restricted-paths` enforcing 7-зон boundary), `eslint-config-next`. Включить `no-floating-promises`. |
| **Prettier** | Formatting | `.prettierrc.json` уже в репо. |
| **Vitest** | Tests | Engine-тесты — `environment: 'node'`. |

### Optional in later phases (НЕ ставить в Phase 1)

| Tool | When |
|------|------|
| `next/og` | Phase 8 — динамические OG-картинки |
| Plausible self-hosted / PostHog | Phase 10 — веб-аналитика (выбор в плане Phase 10) |

## Installation (Phase 1 will execute)

```bash
pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack

# Core runtime
pnpm add zustand break_infinity.js motion zod
pnpm add lucide-react howler
pnpm add @prisma/client @prisma/adapter-pg pg
pnpm add -D prisma @types/howler @types/pg

# Dev tools
pnpm add -D vitest @vitest/ui jsdom
pnpm add -D eslint-plugin-import

# Подключение к Supabase идёт через .env.local — DATABASE_URL + DIRECT_URL.
pnpm prisma init
```

Точные команды и порядок — в `01-01-PLAN.md`.

## Key Decisions

### Next.js 15 vs Next 16
Next 16 уже доступен, но фиксируемся на 15:
- Стек уже спроектирован вокруг 15
- React Compiler в 16 default — нам не нужен (см. ниже)
- Тулинг (Prisma, BetterAuth, Tailwind v4) ещё калибруется под 16

### React Compiler — отключаем
Авто-мемоизация может непредсказуемо инлайнить замыкания в game loop (rAF callback захватывает `useGameStore.getState`).

### Engine / View / Server boundary через ESLint
**7 зон** в `src/`:
- `engine/` — pure TS. Запрещены: `react`, `next/*`, `app/*`, `server/*`, `state/*`, `ui/*`, DOM globals.
- `state/` — Zustand vanilla store + persist. Может: `engine/`, `lib/`, `data/`, `types/`. Без `react`-хуков.
- `ui/` — React client components с `'use client'`. Может: `engine/`, `state/`, `lib/`, `types/`, `data/`.
- `lib/` — pure utils. **`lib/db.ts` (Prisma client singleton) — server-only**, не должен попасть в client bundle (enforced через `import 'server-only'`).
- `data/` — контент-конфиги. Импорт только из `lib/`, `types/`.
- `server/` — server-only код (BetterAuth конфиг, репозиторные функции). Все файлы начинаются с `import 'server-only'`.
- `app/` (Next App Router) — композиция.

### Save persistence — localStorage остаётся primary
Сейв пишется в localStorage (Decimal codec `{__D: "..."}`, `version`, `migrate()`). Сервер ничего не хранит для **гостя**.

После регистрации (Phase 9): BetterAuth `anonymous` plugin → `onLinkAccount` callback переносит localStorage save в БД (Supabase Postgres). Дальше — двусторонний sync.

### Anti-cheat — trust client локально, validate at the gate
- Save лежит в localStorage в открытом виде. Юзер может редактировать — ничего страшного.
- Серверная валидация **только** при `/api/leaderboard` submit: монотонность `total_blocks_ever`, потолок BPS относительно `playtime_seconds`.
- HMAC snapshots и server-симуляция — out of scope.

## Integration Gotchas (Prescriptive)

### 1. Next 15 App Router — RSC vs Client boundary
- **Default — Server Component.** Файлы под `app/` без `'use client'` рендерятся на сервере.
- **`'use client'` обязателен** для: `useState`, `useEffect`, Zustand-хуки, Framer Motion, Howler.
- Game рендерится в client component (`ui/AppShell.tsx`), монтируется в `app/play/page.tsx`.

### 2. Prisma 7 + Supabase + Vercel

Prisma 7 требует явный driver adapter. Использовать `@prisma/adapter-pg` поверх `pg`, DATABASE_URL берём из Supabase Pooler (port 6543, pgbouncer transaction mode):

```ts
// src/lib/db.ts
import 'server-only'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createClient(): PrismaClient {
  const connectionString = process.env['DATABASE_URL']
  if (!connectionString) throw new Error('DATABASE_URL is not set')
  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({ adapter })
}

export const db = globalForPrisma.prisma ?? createClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
```

Миграции (`prisma db push` / `migrate`) — через `DIRECT_URL` (port 5432, direct). Vercel env vars: задать обе.

### 3. Tailwind 4 + Next 15
- **No `tailwind.config.js`.** Theme в CSS через `@theme {}`.
- `app/globals.css` начинается с `@import "tailwindcss";`.
- Через `@tailwindcss/postcss` в `postcss.config.mjs`.

### 4. Zustand `persist` + `break_infinity.js` serialization (CRITICAL)

Сериализация Decimal'ов **обязана** идти через кастомный replacer/reviver с маркером `__D`. Decimal шиппит свой `toJSON`, поэтому replacer должен читать `this[key]`, не `value`:

```ts
function replacer(this: unknown, key: string, value: unknown): unknown {
  const original = typeof this === 'object' && this !== null
    ? (this as Record<string, unknown>)[key] : value
  if (original instanceof Decimal) return { __D: original.toString() }
  return value
}
```

### 5. Game-loop timing — `requestAnimationFrame` over `setInterval` (CRITICAL)

- rAF throttle'ится до ~1Hz на скрытых вкладках — экономит CPU.
- `setInterval` фигачит на полную в hidden tabs → phantom production → broken offline progress.
- Delta-time accumulator: framerate колеблется → logic стабильно 10Hz.
- **Offline progress** считается в `onRehydrateStorage`, не в foreground rAF.

### 6. BetterAuth integration

Phase 9. Контракт:

```ts
// src/server/auth.ts
import 'server-only'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from '@better-auth/prisma-adapter'
import { anonymous } from 'better-auth/plugins'
import { db } from '@/lib/db'

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: 'postgresql' }),
  emailAndPassword: { enabled: true, requireEmailVerification: false },
  plugins: [
    anonymous({
      onLinkAccount: async ({ anonymousUser, newUser }) => {
        // перенос save'а гостя → авторизованного юзера
      },
    }),
  ],
  rateLimit: { window: 60, max: 10 },
})
```

### 7. break_infinity.js — pitfalls

- `Decimal` immutable; конструктор — единственный entry.
- **Never `==` или `<`/`>`** между Decimal и Number. Use `.gte()`, `.lt()`, `.eq()`.
- **Formatting**: библиотека не даёт K/M/B/T formatter — пишем сами с кириллическими К/М/Б/Т.
- **Don't render raw `Decimal` в JSX** — всегда через formatter.

### 8. Howler.js — mobile audio unlock

- Первый клик unlock'ает аудио **если** Howl уже инстанциирован. Инстанциируем на module load.
- Provide `mp3` + `webm` — Safari плохо ест Ogg.
- Один `Howl` на SFX-файл; reuse + `.play()`.

### 9. Lucide React — tree-shaking

- Always **named imports**: `import { Shield, Zap } from "lucide-react"`.
- Never `import * as Icons from "lucide-react"`.

### 10. zod validation — каждый API route

Никогда не доверяем `req.json()` без zod-parse.

## Alternatives Considered

| Locked Choice | Plausible Alternative | When Alt Would Win |
|---|---|---|
| Next 15 + Supabase | Vite SPA + localStorage only | Если откажемся от лидербордов/auth — но это был старый план, мы его явно отбросили. |
| Next 15 | Next 16 | После v1, когда Prisma/BetterAuth догонят. |
| BetterAuth | Auth.js v5 | Если нужно ~80 встроенных OAuth-провайдеров и не нужен `anonymous` plugin. |
| Supabase | Neon / PlanetScale / собственный Postgres | Если упрёмся в лимиты бесплатного tier или нужна другая регион-комбинация. |
| Vercel | Cloudflare Pages / Netlify / self-host | Если упрёмся в лимиты Hobby tier. |
| Prisma 7 | Drizzle / Kysely | Если type-inference из миграций важнее DX. |
| Zustand | Jotai / Valtio | Atom-граф или mutable syntax. |
| break_infinity.js | break_eternity.js | Если числа уйдут за 1e9e15 (multi-tier prestige с глубоким NG+). |
| DOM rendering | PixiJS / Phaser | Particle-heavy effects, sprite animation. Не наш кейс. |
| Howler.js | Native Web Audio | Per-sample DSP, reverbs. Не наш кейс. |
| motion | react-spring / GSAP | Physics-elastic или timeline-cinematic. Overkill. |

## What NOT to Use

| Avoid | Why | Use Instead |
|---|---|---|
| `setInterval` для game tick | Throttle на hidden tabs не работает; phantom production | rAF + accumulator |
| Plain `Number` для валюты | Ломается за `1e308` | `break_infinity.js` Decimal |
| `JSON.stringify` на сторе с Decimals | Silently сериализует Decimals как `{}` | replacer/reviver через `createJSONStorage` |
| `@tailwind base/components/utilities` директивы | v3 синтаксис; no-op в v4 | `@import "tailwindcss";` |
| `tailwind.config.js` для v4 | Игнорируется | `@theme {}` в CSS |
| `tailwindcss` как PostCSS plugin | Переименован в `@tailwindcss/postcss` | `@tailwindcss/postcss` |
| `@tailwindcss/vite` | Это для Vite-проектов | `@tailwindcss/postcss` для Next |
| `import * as Icons from "lucide-react"` | Bundle взрывается на ~1MB | Named imports |
| `framer-motion` для нового кода | Legacy имя | `motion` |
| Оба `motion` + `framer-motion` | pnpm peer-dep duplication | Один |
| `next-auth@v4` | Legacy, нет нативного anonymous-flow | BetterAuth |
| `next-auth@v5` | 2.5 года в бете, Credentials провайдер second-class | BetterAuth |
| `<audio>` для SFX | Latency, нет mobile-unlock magic | Howler.js |
| `req.json()` без zod | Прод-эксплоиты | `Body.safeParse(await req.json())` |
| `PrismaClient` без singleton в dev | Connection pool exhaustion при HMR | `lib/db.ts` singleton |
| React Compiler | Может инлайнить game-loop closures | Отключён в `next.config.ts` |
| `DATABASE_URL` для миграций | Pooler не любит DDL | `DIRECT_URL` для `prisma migrate`/`db push` |

## Version Compatibility Matrix

| Package A | Compatible With | Notes |
|---|---|---|
| `next@15.x` | `react ^19`, `react-dom ^19` | Next 15 — последняя ветка на React 19. |
| `next@15.x` | `node >=20` | LTS требование. |
| `tailwindcss@4.x` | `@tailwindcss/postcss@4.x` | Версия в lockstep. |
| `prisma@7.x` | `@prisma/client@7.x`, `@prisma/adapter-pg@7.x` | Driver adapter обязателен. |
| `better-auth@1.6.x` | `prisma ^5 \|\| ^6 \|\| ^7`, `next ^14 \|\| ^15 \|\| ^16`, `react ^18 \|\| ^19` | Wide peer. |
| `zustand@5.x` | `react >=18` | OK с React 19. |
| `motion@12.x` | `react ^18 \|\| ^19` | Не ставить вместе с `framer-motion`. |
| `lucide-react@^1.16` | `react ^16.5+` | Самый широкий peer. |
| `howler@^2.2.4` | без React-peer | Plain JS. |
| `break_infinity.js@^2.2` | без peers | Plain JS, последний релиз 2022 — feature-complete. |
| `typescript@5.9.x` | `next ^15 \|\| ^16` | OK. |

## Confidence Assessment

| Recommendation | Confidence | Basis |
|---|---|---|
| Next 15 + Supabase Postgres стек | HIGH | User decision |
| BetterAuth over Auth.js v5 | HIGH | Research (см. `.planning/research/auth-comparison.md`), `anonymous` plugin решает guest-flow |
| Vercel hosting | HIGH | User decision |
| `@tailwindcss/postcss` для Next 15 | MEDIUM | Подтверждено в Phase 1 |
| Trust-client anti-cheat | MEDIUM | Дешёвый для idle-жанра; пересмотр если в логах увидим массовый чит |
| rAF + 10Hz accumulator | HIGH | Standard pattern (MDN); проверен в большинстве idle-игр |
| localStorage primary + БД-sync only при auth | HIGH | YAGNI: для гостя БД-write — лишний traffic |

## Sources

- [Next.js 15 docs — App Router](https://nextjs.org/docs/app)
- [Tailwind CSS v4 announcement](https://tailwindcss.com/blog/tailwindcss-v4)
- [Zustand persist + serialization](https://zustand.docs.pmnd.rs/integrations/persisting-store-data)
- [break_infinity.js README](https://github.com/Patashu/break_infinity.js/)
- [BetterAuth docs](https://better-auth.com)
- [Prisma docs — Next.js best practices](https://www.prisma.io/docs/orm/more/help-and-troubleshooting/help-articles/nextjs-prisma-client-dev-practices)
- [Supabase × Prisma](https://supabase.com/docs/guides/database/prisma)
- [Vercel × Next.js deploy](https://vercel.com/docs/frameworks/nextjs)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## Workflow

- **Atomic commits** с conventional commits префиксами: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`.
- Каждое крупное архитектурное решение обсуждается с пользователем до реализации.
- Ветка `main` (не `master`). Все коммиты в `main` пока проект соло.
- Skills использовать по делу:
  - `/vercel-react-best-practices` — для работы с Next/React patterns
  - `/ui-ux-pro-max` — для дизайна экранов
  - `/context7` — актуальные доки библиотек (Tailwind v4 + Next 15, BetterAuth, Prisma, Supabase)
  - `/security-best-practices` — секьюрность API routes, auth
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
