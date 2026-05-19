# Roadmap: RKN Tycoon

## Overview

Vertical-slice MVP русскоязычного idle-clicker'а сатирически про Роскомнадзор на Next.js 15 (фронт + API) + Supabase Postgres, хостинг Vercel. Путь: фундамент (Decimal codec, save versioning, engine/view boundary, rAF 10Hz tick, TONE.md) → cделать клик «вкусным» → полный idle-loop → offline progress → активный геймплей (events + achievements) → закрыть loop престижем → ASCII-полировка + копирайт → SEO bundle (OG, robots, sitemap) → auth + save sync → лидерборды + аналитика → production deploy на Vercel + Supabase. Игра бесплатная без монетизации/рекламы.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, …): запланированная milestone-работа
- Decimal phases (2.1, 2.2): urgent inserts (помечаются INSERTED)

- [x] **Phase 1: Foundation + Tone Bible** — Next 15 + TS strict + Tailwind 4 + Prisma + 7-зон ESLint boundary + engine core (codec/tick/migrations/economy) + Zustand store с persist + DebugHud + landing-placeholder + `/play` + `/api/health` + Vitest (5 mandatory тестов). TONE.md уже locked.
- [x] **Phase 2: Core Click Loop** — большая «ЗАБЛОКИРОВАТЬ» кнопка с pooled `+N` popup, click SFX (procedural Web Audio), live К/М/Б/Т counter, tab-title counter, sound toggle.
- [x] **Phase 3: Idle Loop (Upgrades + Auto-Censors + Buy UX)** — 10 click upgrades, 8 auto-censors с 1.15× cost ramp, ×1/×10/Max кнопки, 10s autosave; idle game полностью играбельна.
- [x] **Phase 4: Offline Progress** — 1-часовой кап рассчитывается в `onRehydrateStorage`, модалка «Пока вас не было…» при возвращении.
- [x] **Phase 5: Events + Achievements** — 6 random clickable events (incl. negative Telegram-leak) с timed multipliers; 12 deterministic achievements с toast + persistent panel.
- [x] **Phase 6: Prestige («Звёзды Цензора»)** — reset на 1e9 lifetime blocks, sqrt-формула, +2% per star, press-release confirm modal, эполет indicator.
- [x] **Phase 7: ASCII Polish + Flavor Copy** — Cyrillic monospace fonts, box-drawing borders, CRT glow, ≤5-color palette, бюрократический копирайт на каждой сущности, responsive layout, tone re-audit. Сюда же `app/layout.tsx` metadata (default OG, Twitter card).
- [x] **Phase 8: SEO bundle (OG + robots + sitemap)** — static OG-картинка матчит favicon (РКН + хеш-рамка), `robots.txt` + `sitemap.xml` через App Router file-conventions. Landing-редизайн `/` и динамическая `/api/og` пропущены по решению пользователя.
- [x] **Phase 9: Auth + Save Sync (BetterAuth)** — email+password без verification, anonymous plugin, `onLinkAccount` миграция localStorage save → Supabase Postgres, server-side save read/write, rate-limit.
- [ ] **Phase 10: Leaderboards + Game Analytics** — Postgres `LeaderboardEntry` + `Event`; страница `/leaderboard` (top 100 по blocks + по stars); submit-sanity (монотонность, BPS-cap); веб-аналитика (Plausible/PostHog — выбор в плане Phase 10).
- [ ] **Phase 11: Production Deploy (Vercel + Supabase)** — Supabase-проект подключён, env vars в Vercel, custom domain, `prisma db push` через `DIRECT_URL`, health-check после deploy.

## Phase Details

### Phase 1: Foundation + Tone Bible
**Goal**: A runnable empty Next 15 app that boots `pnpm dev`, has the rAF tick loop driving a Zustand store with Decimal-aware persist, a 7-zone ESLint boundary, Prisma reachable through `/api/health`, a Debug HUD on `/play`, and a landing placeholder on `/`. TONE.md остаётся locked.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: CORE-02, CORE-04, CORE-06, SAVE-02, SAVE-03, SAVE-04, TONE-01, TONE-02, TONE-03, WEB-02, DB-03, API-03, API-05

### Phase 2: Core Click Loop
**Goal**: Клик-verb «вкусный»: один клик → видимый рост счётчика, juicy `+N` popup, SFX, live tab title — dopamine loop живёт ещё до контента.
**Depends on**: Phase 1
**Requirements**: CORE-01, CORE-03, CORE-05, CLICK-01, CLICK-02, AUDIO-01, AUDIO-02, AUDIO-03

### Phase 3: Idle Loop (Upgrades + Auto-Censors + Buy UX)
**Goal**: Полный idle-loop играбелен end-to-end: клики усиливаются апгрейдами, авто-цензоры дают CPS, ×1/×10/Max-покупка масштабирует — прогресс переживает 10s autosave.
**Depends on**: Phase 2
**Requirements**: CLICK-03, CLICK-04, AUTO-01, AUTO-02, AUTO-03, AUTO-04, SAVE-01

### Phase 4: Offline Progress + «Пока вас не было…»
**Goal**: Возвращение в parked tab — приятно: игра даёт offline-доход (capped 1ч) и объясняет что произошло.
**Depends on**: Phase 3
**Requirements**: SAVE-05

### Phase 5: Events + Achievements
**Goal**: Активная игра имеет глубину (random clickable events с risk/reward, включая negative) и completion drive (12 deterministic ачивок + toast + panel).
**Depends on**: Phase 4
**Requirements**: EVNT-01..05, ACHV-01..04

### Phase 6: Prestige («Звёзды Цензора»)
**Goal**: Endgame-loop закрыт: после 1e9 lifetime blocks игрок может prestige'нуться, теряя run-прогресс ради permanent income multiplier.
**Depends on**: Phase 5
**Requirements**: PRES-01..07

### Phase 7: ASCII Polish + Flavor Copy
**Goal**: Игра выглядит «зашипленной»: ASCII/terminal aesthetic консистентна, Cyrillic monospace рендерится корректно, у каждой сущности — бюрократический копирайт, tone re-audit. Сюда же layout-metadata (default OG, Twitter card).
**Depends on**: Phase 6
**Requirements**: UI-01..04, WEB-05

### Phase 8: SEO bundle (OG + robots + sitemap)
**Goal**: Static OG-картинка + robots + sitemap. Landing-редизайн и динамическая `/api/og` пропущены.
**Depends on**: Phase 7
**Requirements**: WEB-04 (+ static OG); WEB-01/WEB-03 dropped from v1 scope.

### Phase 9: Auth + Save Sync (BetterAuth)
**Goal**: Игрок может зарегаться email+password без подтверждения, save мигрирует на серверный аккаунт. Foundation для лидербордов.
**Depends on**: Phase 8
**Requirements**: AUTH-01..07, DB-01, DB-02, DB-04, API-01, API-04
**Success Criteria**:
  1. Prisma schema: `User`, `Session`, `Account`, `Verification` (BetterAuth-managed) + `Save` (gameState JSON + version + updatedAt + userId).
  2. Все юзеры (включая guest) имеют `userId` сразу при первой загрузке `/play` через `anonymous` plugin.
  3. `POST /api/auth/sign-up/email-password` создаёт авторизованного юзера + cookie-session; `onLinkAccount` callback переносит save из anonymous-userId на новый authenticated-userId.
  4. После регистрации save читается с сервера приоритетно; если save'ы расходятся — newer `updatedAt` побеждает.
  5. `POST /api/auth/sign-in/email-password` + `POST /api/auth/sign-out` работают; cookie-session валидна 7 дней.
  6. Rate-limit: 10 попыток sign-up/sign-in с IP за 60s.
  7. Cron task удаляет unlinked anonymous-юзеров старше 30 дней.

### Phase 10: Leaderboards + Game Analytics
**Goal**: Лидерборды живы — игроки видят свой ранг; аналитика игровых событий собирается в Postgres для balance-decision.
**Depends on**: Phase 9
**Requirements**: LB-01..05, EVT-A-01..04, API-02
**Success Criteria**:
  1. Prisma schema добавляет `LeaderboardEntry` + `Event`.
  2. `POST /api/leaderboard` принимает `{ totalBlocksEver, prestigeStars, playtimeSeconds }`; zod + sanity (монотонность по userId, BPS-cap).
  3. `/leaderboard` страница рендерит top 100 по blocks + top 100 по stars.
  4. `POST /api/events` принимает батч; клиент шлёт на visibilitychange + раз в 60s.
  5. Веб-аналитика: Plausible self-hosted ИЛИ PostHog cloud (выбор в плане).
  6. Rate-limit на write endpoints.

### Phase 11: Production Deploy (Vercel + Supabase)
**Goal**: Игра живёт на production-домене через Vercel + Supabase. Preview-deployments на PR, env vars управляются в Vercel UI.
**Depends on**: Phase 10
**Requirements**: DEPLOY-01..04
**Success Criteria**:
  1. Supabase-проект создан, схема применена через `DIRECT_URL`; runtime использует pooled `DATABASE_URL`.
  2. Vercel-проект подключён к main-ветке; production deploy успешен; preview-deployments живут на PR.
  3. Vercel env vars: `DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_SECRET` (Phase 9 onwards).
  4. Custom domain настроен в Vercel.
  5. Production `/api/health` → 200 `{ db: 'connected' }`.

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation + Tone Bible | 5/5 | Done | 2026-05-16 |
| 2. Core Click Loop | 1/1 | Done | 2026-05-16 |
| 3. Idle Loop (Upgrades + Auto-Censors + Buy UX) | 1/1 | Done | 2026-05-17 |
| 4. Offline Progress + «Пока вас не было…» | 1/1 | Done | 2026-05-18 |
| 5. Events + Achievements | 1/1 | Done | 2026-05-18 |
| 6. Prestige («Звёзды Цензора») | 1/1 | Done | 2026-05-18 |
| 7. ASCII Polish + Flavor Copy | 1/1 | Done | 2026-05-18 |
| 8. SEO bundle (OG + robots + sitemap) | 1/1 | Done | 2026-05-19 |
| 9. Auth + Save Sync (BetterAuth) | 1/1 | Done | 2026-05-19 |
| 10. Leaderboards + Game Analytics | 0/TBD | Not started | - |
| 11. Production Deploy (Vercel + Supabase) | 0/TBD | Not started | - |

---
*Last updated: 2026-05-19 — switched deploy target to Vercel + Supabase, removed monetization (Phase 11) and ads (Phase 12) entirely. Old phase 13 collapsed into new phase 11.*
