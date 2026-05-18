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

## Что готово

Phases 1-8 закрыты. Игра играбельна end-to-end:

| # | Фаза | Что внутри |
|---|------|-----------|
| 1 | Foundation | Next + TS + Tailwind + Prisma + ESLint boundary + Vitest |
| 2 | Click Loop | Кнопка + procedural Web Audio click + К/М/Б/Т formatter + pooled +N popup + sound toggle |
| 3 | Idle Loop | 10 click upgrades + 8 censors с 1.15ⁿ ramp + ×1/×10/×Max + 10s throttled save |
| 4 | Offline Progress | 1h cap + «Пока вас не было…» модалка |
| 5 | Events + Achievements | 6 random events (multiplier layer) + 12 ачивок + toast queue + grid panel |
| 6 | Prestige | «Звёзды Цензора» reset на 1e9 lifetime, sqrt formula, +2%/star, two-step press-release modal |
| 7 | ASCII Polish + SEO base | JetBrains Mono Cyrillic, 5-color palette, `.ascii-frame` + `.text-glow`, layout Metadata |
| 8 | SEO bundle | Favicon (РКН), OG-картинка матчит favicon, `robots.txt`, `sitemap.xml` |

Дополнительно (вне нумерованных фаз):
- Mobile-first AppShell rewrite (scroll-locked, vertical stack, upgrades menu modal)
- Three.js + AsciiEffect rotating ASCII logo с auto-fit-to-frustum
- Save schema v3 с миграциями (v1 → v2 → v3 chain)
- 75/75 vitest зелёных

## Что дальше

- **Phase 9** — Auth + Save Sync (BetterAuth email+password без verification, anonymous plugin → `onLinkAccount` миграция localStorage → БД)
- **Phase 10** — Leaderboards top-100 + game event analytics в Postgres
- **Phase 11** — Production deploy на Vercel + Supabase

Полный план — `.planning/ROADMAP.md`.

---

## Workflow

- Атомарные коммиты с conventional commits (`feat`, `fix`, `chore`, `docs`, `test`, `refactor`)
- Ветка `main` (не `master`)
- Каждое крупное архитектурное решение обсуждается перед реализацией и логируется в `.planning/phases/NN-*/NN-PLAN.md` как `D-NN` decision

---

## Лицензия

Не определена. Не для коммерческого распространения без разрешения автора.
