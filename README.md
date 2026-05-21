# RKN Tycoon

> 2D idle-clicker про интернет-цензуру. Сатира. Кликайте «ЗАБЛОКИРОВАТЬ»,
> копите блокировки, нанимайте цензоров, стройте цензурную империю.

ASCII-терминальная эстетика, Cyrillic monospace, рамки `╔═╗`, амбер-на-чёрном.
Кликабельные случайные события, ачивки с бюрократическими описаниями,
prestige через «Звёзды Цензора».

---

## Стек

| Слой       | Технология                                              |
| ---------- | ------------------------------------------------------- |
| Frontend   | Next.js 15 (App Router) · React 19 · TypeScript 5 strict |
| Стили      | Tailwind CSS v4 · JetBrains Mono (Cyrillic) через `next/font` |
| State      | Zustand 5 + persist (localStorage)                       |
| Big-number | break_infinity.js (Decimal codec с маркером `__D`)       |
| 3D-логотип | three.js + AsciiEffect (генеративный)                    |
| Backend    | Next API Routes · Prisma 7                               |
| Database   | Supabase (Postgres)                                      |
| Auth       | BetterAuth (планируется в Phase 9)                       |
| Tests      | Vitest 4                                                  |
| Lint       | ESLint 9 (flat config) с 7-зон import-boundary           |
| Deploy     | Vercel                                                    |

---

## Quickstart

Требуется: **pnpm 10**, **Node ≥20**, Supabase-проект (бесплатный tier).

```bash
# 1. install deps
pnpm install

# 2. .env.local с DATABASE_URL и DIRECT_URL из Supabase (см. .env.example)
cp .env.example .env.local

# 3. применить (пустую сейчас) Prisma schema + сгенерировать client
pnpm db:push
pnpm db:generate

# 4. поднять Next dev server
pnpm dev
# → http://localhost:3000          (landing placeholder)
# → http://localhost:3000/play     (игра)
# → http://localhost:3000/api/health (Prisma → SELECT 1)
```

### Все scripts

| Command              | Что делает                                              |
| -------------------- | ------------------------------------------------------- |
| `pnpm dev`           | Next dev server                                         |
| `pnpm build`         | Production build                                        |
| `pnpm start`         | Запустить production build                              |
| `pnpm lint`          | ESLint flat config + 7-зон boundary                     |
| `pnpm typecheck`     | `tsc --noEmit`                                          |
| `pnpm test`          | Vitest run                                              |
| `pnpm test:watch`    | Vitest watch                                            |
| `pnpm verify`        | typecheck + lint + test (CI gate)                       |
| `pnpm db:push`       | `prisma db push`                                        |
| `pnpm db:generate`   | `prisma generate`                                       |
| `pnpm db:studio`     | `prisma studio`                                         |

---

## Архитектура src/

7-зон import boundary enforced через ESLint
(`import/no-restricted-paths` + `no-restricted-imports` для package-уровня):

```
src/
├── engine/   — pure TS (codec, tick, migrations, economy, multipliers, prestige, achievements, offline)
├── state/    — Zustand stores (gameStore, settingsStore, persistStorage)
├── data/     — content (clickUpgrades, censors, events, achievements)
├── lib/      — pure utils (numbers formatter, time RU plural, maxBuy, audio, db Prisma singleton)
├── ui/       — React client components (AppShell, ClickButton, AsciiLogo, modals, panels)
├── app/      — Next App Router (routes, api, layout, metadata, robots, sitemap, icon)
├── server/   — server-only код (наполняется в Phase 9+)
└── types/    — shared TS types (save shape, GameState)
```

- `engine/` не импортит ничего из `react`, `next`, `state`, `ui`, `app`, `server`, `motion`, `howler`, `lucide`, `@prisma/client`, `better-auth`.
- `state/` — vanilla Zustand, без React-hooks (хуки только в `ui/`).
- `data/` чистый — только `lib/` и `types/`.
- `lib/db.ts` помечен `import 'server-only'` — не попадёт в client bundle.

---

## Workflow

- Атомарные коммиты с conventional commits (`feat`, `fix`, `chore`, `docs`, `test`, `refactor`)
- Ветка `main`
- Каждое крупное архитектурное решение обсуждается перед реализацией и логируется в `.planning/phases/NN-*/NN-PLAN.md` как `D-NN` decision

---

## Лицензия

Не определена. Не для коммерческого распространения без разрешения автора.
