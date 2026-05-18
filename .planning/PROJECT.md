# RKN Tycoon

## What This Is

2D idle-clicker веб-игра в стиле Cookie Clicker на тему интернет-цензуры (юмористическая сатира на Роскомнадзор). Игрок кликает по большой кнопке «Заблокировать», копит блокировки как валюту, покупает апгрейды кликов и автоматических цензоров, растит «цензурную империю». Целевая аудитория — русскоязычные игроки.

## Core Value

Кликабельный satire-loop работает: клик → видимый рост счётчика блокировок → покупка апгрейда/цензора → автоматический доход → новый клик. Если этот цикл не «залипает» — всё остальное не имеет смысла.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

<!-- Current scope. Building toward these. -->

**Игровое ядро (Phase 1-7):**
- [ ] Большая кнопка «Заблокировать» с откликом (анимация, число +1, click-SFX)
- [ ] Валюта «блокировки» с поддержкой больших чисел (break_infinity.js, форматирование К/М/Б/Т)
- [ ] Каталог апгрейдов клика (множители за клик)
- [ ] Каталог автоматических цензоров (генерация валюты в секунду)
- [ ] Покупка/перепокупка с растущей ценой
- [ ] Сохранение в localStorage (автосейв)
- [ ] Один уровень престижа («орден ФСБ» или аналог) с множителем после ресета
- [ ] Случайные кликабельные события («золотое печенье» — VPN-утечка и т.п.)
- [ ] Базовые ачивки (плашки за миллстоуны)
- [ ] ASCII/терминальная стилизация (моноширинный шрифт, бордюры, glow)
- [ ] Click-SFX через Howler.js
- [ ] Полностью русскоязычный интерфейс
- [ ] Адаптивная вёрстка (desktop primary, mobile-friendly)

**Сайт + бэкенд (Phase 8-10):**
- [ ] Landing-страница `/` с SEO-метатегами и кнопкой «Играть»
- [ ] Полноэкранный игровой режим `/play`
- [ ] Динамические OG-картинки для шеринга достижений
- [ ] Регистрация email+password без подтверждения (BetterAuth)
- [ ] Анонимная игра + миграция save'а в БД при регистрации (anonymous plugin)
- [ ] Глобальные лидерборды (по lifetime blocks и по prestige stars)
- [ ] Аналитика игровых событий в Postgres (отдельно от веб-аналитики)

**Деплой (Phase 11):**
- [ ] Vercel (Next standalone) + Supabase (Postgres)
- [ ] Production env vars в Vercel, .env.local для разработки

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Английская/мультиязычная локализация — целевая аудитория RU, сатира опирается на культурный контекст. i18n архитектура отложена на Phase 7+.
- Native mobile (iOS/Android) — web-only, PWA не приоритет в v1
- **Telegram Mini App** — явное решение пользователя на Next-pivot: только сайт, шеринг через OG-картинки. Не VK Mini App тоже.
- **Монетизация** — IAP, donations, subscriptions out of scope. Игра остаётся free.
- **Реклама** — никаких ad-сетей (Yandex, AdSense, прочее). Чистая бесплатная игра.
- Многоуровневый престиж / NG+ / metagame — v2+, сначала валидировать loop
- Фоновая музыка — v2 (только SFX в v1)
- Канвас/игровой движок (Phaser, PixiJS) — React+DOM достаточно для счётчиков и UI
- Игровые порталы (CrazyGames, Poki, Newgrounds, GameDistribution) — отказались от них в пользу собственного сайта; platform-adapter паттерн не нужен
- **Серверная анти-чит симуляция / HMAC-snapshot валидация** — стоимость >> вред для idle-жанра. Trust client, sanity-check только при leaderboard submit.
- Мультиплеер — out-of-scope для жанра (лидерборды — async submit, не мультиплеер)
- Push-уведомления — web-аудитория считает спамом
- Multi-currency в v1 — splits attention

## Context

- **Жанр**: incremental/idle-clicker. Референсы: Cookie Clicker (основной), Universal Paperclips (нарратив-зависимое прогрессирование), AdVenture Capitalist (UI плотности).
- **Сатирический контекст**: РКН как игровой антагонист-протагонист. Юмор должен быть достаточно острым, чтобы быть смешным, но без перехода в личные оскорбления — это игра, не политическая платформа.
- **Технический контекст**: idle-clicker = реактивный UI + игровая петля раз в N мс. Канвас и game-engine избыточны.
- **Цифровой контекст**: idle-игры быстро упираются в `Number.MAX_VALUE (1e308)` — `break_infinity.js` обязателен с самого начала.

## Constraints

- **Tech stack (frontend)**: Next.js 15 (App Router) + React 19 + TypeScript 5 strict + Tailwind CSS 4 + Zustand 5 + motion/react + break_infinity.js + Howler.js + Lucide React.
- **Tech stack (backend)**: тот же Next-проект — API routes + Prisma + Supabase Postgres + BetterAuth (email+password без подтверждения) + zod для валидации входов.
- **Persist**: localStorage primary (включая после регистрации; БД-sync на login/logout/важных моментах). Save с маркером `__D` для Decimal, `version: 1` + `migrate()`.
- **Deploy**: Vercel (Next host) + Supabase (Postgres). Production env vars в Vercel, локальная разработка через `.env.local`.
- **Платформа**: только веб-браузер (desktop primary, mobile-friendly). TG Mini App вырезан.
- **Локализация**: только русский в v1. i18n отложен на Phase 7+.
- **Anti-cheat**: trust client локально; серверная sanity-валидация только при leaderboard submit.
- **Объём v1**: играбельная демка → SEO-сайт → лидерборды. Без монетизации/рекламы.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js 15 + Supabase Postgres вместо Vite SPA | Собственный сайт с SEO + лидерборды + auth требуют backend; виральность через сайт, а не через игровые порталы | — Pending |
| React + Zustand вместо game-engine | idle-clicker = реактивный UI; больше обучающих данных для AI | — Pending |
| break_infinity.js с самого старта | После 1e308 обычный Number ломается, ретрофит дороже | — Pending |
| ASCII/терминальный арт-стиль | Соответствует теме «бюрократии/спецслужб», убирает арт-блокеры | — Pending |
| Один уровень престижа в v1 | Часть ядра idle-жанра, без него loop неполный | — Pending |
| Только SFX, без музыки в v1 | Click-feedback критичен, музыка — UX-роскошь | — Pending |
| Только RU в v1 | Сатира опирается на культурный контекст; i18n отложен на Phase 7+ | — Pending |
| Offline-прогресс кап = 1 час | Минимизировать риск balance-bug в v1, расширим в v2 | — Pending |
| Суффиксы только кириллица (К/М/Б/Т, далее научная нотация 1.23e15) | Тематично «бумажному» РКН-вайбу | — Pending |
| BetterAuth (не Auth.js v5) | True stable, native `anonymous` plugin для guest→registered save sync, native cookie+DB sessions, scrypt по умолчанию. См. `.planning/research/auth-comparison.md` | — Pending |
| Trust-client anti-cheat (не серверная симуляция) | Стоимость серверной симуляции >> вред от чита в idle. Sanity-check только при leaderboard submit | — Pending |
| TG Mini App вырезан | Решение пользователя 2026-05-16: только сайт, шеринг через OG | — Pending |
| Vercel + Supabase | Минимум инфраструктурного шума: Vercel hosting Next из коробки, Supabase даёт Postgres с pooler'ом, бесплатный tier хватит на v1 | — Pending |
| Без монетизации/рекламы в v1 | Free игра; IAP/donations/ads out of scope полностью | — Pending |
| localStorage primary even после auth | YAGNI: БД-write только на sync-моментах, не на каждый tick | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

---
*Last updated: 2026-05-19 — switched deploy to Vercel + Supabase, dropped monetization and ads from scope.*
