# Requirements: RKN Tycoon

**Defined:** 2026-05-16
**Core Value:** Кликабельный satire-loop работает: клик → видимый рост счётчика блокировок → покупка апгрейда/цензора → автоматический доход → новый клик.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases. All Active until shipped and validated.

### Core (фундамент: store, тик, валюта, формат)

- [ ] **CORE-01**: Игрок видит счётчик «блокировок» в верхней части экрана, обновляющийся в реальном времени
- [ ] **CORE-02**: Большие числа поддерживаются через break_infinity.js (Decimal) во всех расчётах и сохранениях
- [ ] **CORE-03**: Числа форматируются с кириллическими суффиксами К/М/Б/Т для первых четырёх порядков, далее научной нотацией (1.23e15)
- [ ] **CORE-04**: Игровой цикл работает через requestAnimationFrame с фиксированным шагом 100 мс (10 Hz) для логики, decoupled от рендера
- [ ] **CORE-05**: Заголовок вкладки браузера показывает живой счётчик блокировок («1.23К блокировок — RKN Tycoon»)
- [ ] **CORE-06**: Глобальный множитель дохода (`prestige_multiplier`, временные ивенты) учитывается во всех формулах дохода с первого коммита (значение по умолчанию = 1.0)

### Click (кликабельная кнопка + апгрейды клика)

- [ ] **CLICK-01**: По центру экрана большая кнопка-печать «ЗАБЛОКИРОВАТЬ»; клик даёт блокировки
- [ ] **CLICK-02**: Клик визуально реагирует (scale 1.0→0.95→1.0, ≤50 мс), издаёт SFX, показывает плавающий «+N» (pooled, не создаёт DOM на каждый клик)
- [ ] **CLICK-03**: 10 апгрейдов клика разблокируются последовательно (см. контент-список ниже), множат click value
- [ ] **CLICK-04**: Карточка апгрейда показывает название, описание (бюрократическим тоном), текущую стоимость, эффект; disabled при недостатке валюты

### Censors (автоматические генераторы)

- [ ] **AUTO-01**: 8 автоматических цензоров (см. контент-список) генерируют пассивный доход CPS
- [ ] **AUTO-02**: Стоимость каждой следующей копии генератора растёт по формуле `cost_n = base * 1.15^n`
- [ ] **AUTO-03**: Карточка цензора показывает: имя, флавор-текст, текущее количество, текущий CPS, цену следующей покупки
- [ ] **AUTO-04**: Кнопки «Купить ×1 / ×10 / Max» доступны на каждой карточке; Max вычисляется в closed-form

### Save (персистентность)

- [ ] **SAVE-01**: Состояние игры автоматически сохраняется в localStorage каждые 10 секунд и при visibilitychange
- [ ] **SAVE-02**: Сохранение использует кастомный кодек `PersistStorage` с маркером `{__D: "1.23e456"}` для Decimal-инстансов
- [ ] **SAVE-03**: Сейв имеет поле `version: 1` и stub-функцию `migrate(state, fromVersion)` для будущих миграций
- [ ] **SAVE-04**: При загрузке страницы состояние восстанавливается; повреждённый сейв логирует ошибку и стартует чистое состояние (не падает)
- [ ] **SAVE-05**: Offline-доход рассчитывается при загрузке: `min(now - lastTick, 1 час) * totalCPS`; показывается модалка «Пока вас не было…»

### Prestige (один уровень, «Звёзды Цензора»)

- [ ] **PRES-01**: Когда суммарные блокировки за всё время ≥ 1e9, открывается кнопка «Повышение»
- [ ] **PRES-02**: Расчёт звёзд: `stars_gained = floor(sqrt(total_blocks / 1e9))`
- [ ] **PRES-03**: Каждая звезда даёт +2% к глобальному множителю дохода, постоянно после ресета
- [ ] **PRES-04**: Ресет очищает: текущие блокировки, все генераторы, все апгрейды клика
- [ ] **PRES-05**: Ресет сохраняет: звёзды, ачивки, total-lifetime-блокировки, настройки
- [ ] **PRES-06**: Модалка подтверждения в стиле «пресс-релиза» («Указом Президента вы повышены в звании…») с двумя кнопками
- [ ] **PRES-07**: Эполет-индикатор в UI показывает текущее количество звёзд

### Events (случайные кликабельные)

- [ ] **EVNT-01**: Игровой цикл спавнит событие случайно каждые 90–300 секунд
- [ ] **EVNT-02**: Активное событие появляется на экране как кликабельная иконка, исчезает через 13 секунд
- [ ] **EVNT-03**: При клике активируется эффект; статус (countdown, множитель) виден игроку
- [ ] **EVNT-04**: 6 типов событий реализованы (VPN-утечка, Свободный интернет, Внеплановая проверка, Утечка в Telegram, Государственный заказ, Чёрный лебедь — см. контент)
- [ ] **EVNT-05**: Временные эффекты-множители (например, «frenzy» ×7) корректно встраиваются в формулу дохода через слой временных модификаторов

### Achievements (ачивки)

- [ ] **ACHV-01**: 12 ачивок (см. контент-список) с триггерами milestone/behavioral/narrative; все детерминированные
- [ ] **ACHV-02**: Триггеры проверяются на каждом тике (предикаты дешёвые)
- [ ] **ACHV-03**: При разблокировке показывается всплывающий toast с названием и описанием
- [ ] **ACHV-04**: Постоянная панель «Награды» показывает все ачивки (разблокированные и заблокированные с placeholder «???»)

### UI / Aesthetic (ASCII-терминал + флавор)

- [ ] **UI-01**: Весь интерфейс в моноширинном шрифте (JetBrains Mono / IBM Plex Mono с кириллическим subset)
- [ ] **UI-02**: Применяется ASCII/terminal-стилистика: box-drawing границы (`╔═╗║╚╝`), subtle CRT-glow (CSS text-shadow), палитра ≤5 цветов (амбер/зелёный/тёмный фон/акценты)
- [ ] **UI-03**: У каждого апгрейда, цензора, события и ачивки есть «официальное описание» в бюрократическом тоне (1–2 предложения)
- [ ] **UI-04**: Layout адаптивный: на десктопе primary, mobile (≥360px ширины) — playable без зума

### Audio (звук)

- [ ] **AUDIO-01**: Клик-SFX воспроизводится через Howler.js на каждый клик кнопки «Заблокировать»
- [ ] **AUDIO-02**: Howl-инстансы пулируются (не создаются новые на каждый клик); используется один Howl с несколькими sprite/instances
- [ ] **AUDIO-03**: Переключатель «Звук вкл/выкл» в углу UI; состояние сохраняется в localStorage

### Tone / Content Guardrails

- [ ] **TONE-01**: Tone bible как `.planning/TONE.md` или раздел внутри REQUIREMENTS — фиксируется до написания первой строки сатирического копи
- [ ] **TONE-02**: Контент не упоминает реальных живых лиц по имени-фамилии; цели сатиры — институции, законы, аббревиатуры
- [ ] **TONE-03**: Re-audit копирайтинга на каждой phase transition

### Deploy (Vercel + Supabase)

- [ ] **DEPLOY-01**: Supabase-проект создан; `DATABASE_URL` (pooled, port 6543) и `DIRECT_URL` (direct, port 5432) лежат в `.env.local` для разработки и в Vercel env vars для production
- [ ] **DEPLOY-02**: Vercel-проект подключён к main-ветке; preview deployments на PR
- [ ] **DEPLOY-03**: `prisma db push` / `migrate deploy` запускаются через `DIRECT_URL` локально или в Vercel build step
- [ ] **DEPLOY-04**: Production-домен подключён в Vercel (custom domain)

### Web / SEO (landing + OG-шеринг)

- [ ] **WEB-01**: Landing-страница `/` с заголовком, кратким описанием игры, кнопкой «Играть» (→ `/play`), скриншотами/тизером, SEO-метатегами (title, description, OG image, Twitter card)
- [ ] **WEB-02**: Полноэкранный игровой режим `/play` без landing-шелла; именно эта страница рендерит активную игру
- [ ] **WEB-03**: Динамические OG-картинки через `next/og` (Next 15 native) на роуте `/api/og?stars=N&blocks=X` для шеринга достижений в TG
- [ ] **WEB-04**: `robots.txt` + `sitemap.xml` сгенерированы Next-native способом (`app/robots.ts`, `app/sitemap.ts`)
- [ ] **WEB-05**: `app/layout.tsx` Metadata API задаёт default OG-картинку, Twitter card, lang="ru"

### Auth (BetterAuth)

- [ ] **AUTH-01**: Регистрация email+password без подтверждения email; пароль хешируется scrypt (BetterAuth default) и хранится в Postgres
- [ ] **AUTH-02**: Логин/логаут через cookie-based session (BetterAuth `cookie+DB` strategy)
- [ ] **AUTH-03**: Игра доступна анонимно через BetterAuth `anonymous` plugin; гость уже имеет `userId` сразу при первой загрузке `/play`
- [ ] **AUTH-04**: При регистрации `anonymous` plugin вызывает `onLinkAccount({ anonymousUser, newUser })` — наш callback переносит игровой save из БД (или из присланного клиентом payload'а) на нового юзера
- [ ] **AUTH-05**: API routes авторизуются через `auth.api.getSession({ headers })`; protected endpoints отвечают 401 при отсутствии сессии
- [ ] **AUTH-06**: BetterAuth rate-limit конфиг на signup/signin endpoints (window=60s, max=10 попыток с IP)
- [ ] **AUTH-07**: Cron задача чистит unlinked anonymous-юзеров старше 30 дней (избегаем разрастания таблицы `user`)

### Leaderboards

- [ ] **LB-01**: Глобальный лидерборд по `total_blocks_ever`, top 100, страница `/leaderboard`
- [ ] **LB-02**: Лидерборд по `prestige_stars`, top 100, та же страница (таб или отдельный список)
- [ ] **LB-03**: `POST /api/leaderboard` submit-endpoint — серверная sanity-проверка: монотонность `total_blocks_ever` (не меньше предыдущего значения юзера), потолок BPS относительно `playtime_seconds` (max ~10× теоретического оптимума), отрицательные/NaN/inf отвергаются
- [ ] **LB-04**: Только авторизованные юзеры (anonymous включительно) могут submit'ить; гости пишут под anonymous-user-id
- [ ] **LB-05**: Кеш топ-100 в Postgres (materialized view или denormalized таблица), refresh каждые 60s

### Game-event analytics

- [ ] **EVT-A-01**: Игровые события (`prestige_done`, `milestone_blocks`, etc.) пишутся через `POST /api/events` в Postgres-таблицу `Event`
- [ ] **EVT-A-02**: Веб-аналитика (страницы, CTR, source) через Plausible self-hosted ИЛИ PostHog cloud — выбор в Phase 10 плане
- [ ] **EVT-A-03**: События батчатся клиентом (queue + flush на visibilitychange) — не один POST на каждый эвент
- [ ] **EVT-A-04**: Сервер пишет с `userId` + `sessionId` + UTC timestamp + полезной нагрузкой; индексы по `(eventType, createdAt)` и `userId`

### Database (Prisma + Supabase Postgres)

- [ ] **DB-01**: Prisma schema модели: `User` (BetterAuth managed), `Session` (BetterAuth managed), `Save` (gameState JSON + version), `LeaderboardEntry`, `Event`
- [ ] **DB-02**: Миграции через `prisma db push` (или `prisma migrate`) против `DIRECT_URL`; runtime использует `DATABASE_URL` (Supabase pooler, port 6543)
- [ ] **DB-03**: `lib/db.ts` Prisma client singleton (HMR-safe); все импорты `db` — server-only; driver — `@prisma/adapter-pg` с Supabase pooler URL
- [ ] **DB-04**: Подключение через Supabase pgbouncer (transaction mode); `connection_limit=1` в URL для serverless-окружения Vercel

### API conventions

- [ ] **API-01**: Все API routes валидируют request body через zod (`Body.safeParse`); 400 при failure с понятной ошибкой
- [ ] **API-02**: Write endpoints (`/api/events`, `/api/leaderboard`) — rate-limit в-памяти (token bucket) или через Postgres-counters; без Redis в v1
- [ ] **API-03**: Все routes возвращают JSON; ошибки в формате `{ error: { code, message } }`
- [ ] **API-04**: CORS — same-origin, без external origins в v1
- [ ] **API-05**: `/api/health` route возвращает `{ ok: true, version, db: 'connected' }` после `SELECT 1` через Prisma

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Generator Upgrades

- **GUPG-01**: Per-generator upgrades разблокируются при 10/25/50/100/150/200/250 владении
- **GUPG-02**: Каждый GUPG даёт +1% или ×2 CPS для своего цензора

### Cosmetic

- **COSM-01**: Visual side-panel «Реестр запрещённых сайтов» с прокручиваемым списком фейковых доменов
- **COSM-02**: «Decree log» внизу экрана — пресс-релизы об ивентах в стиле «Указ №NNN: …»

### Power-user

- **PWR-01**: JSON-export/import сейва кнопкой
- **PWR-02**: Statistics screen (clicks/sec, total clicks, time played)

### Audio

- **AUDIO-V2-01**: Фоновая музыка (toggleable, default off) — балалайка/ретро-синтвейв

### Content depth

- **CONT-01**: Расширить список click upgrades до 15
- **CONT-02**: Расширить список auto-censors до 12

### Endgame

- **META-01**: Multi-tier prestige (второй слой над звёздами)
- **META-02**: Mini-game challenges (Cookie Clicker dungeons-style)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Английская/мультиязычная локализация | Целевая аудитория RU, сатира опирается на культурный контекст. i18n отложен на Phase 7+. |
| Native mobile (iOS/Android) / PWA | Web-only в v1 |
| Telegram Mini App | Вырезан пользователем 2026-05-16: только сайт, шеринг в TG через OG-картинки |
| VK Mini App | Та же причина — only собственный сайт |
| Игровые порталы (CrazyGames, Poki, Newgrounds, GameDistribution) | Сменили стратегию: виральность через свой сайт + SEO + TG-шеринг |
| Мультиплеер (real-time) | Лидерборды — async submit, мультиплеер не нужен жанру |
| Фоновая музыка в v1 | Click-feedback приоритет; музыка — UX-роскошь |
| Канвас / игровой движок (Phaser, PixiJS) | React+DOM достаточно для счётчиков и UI |
| Multi-currency в v1 | Splits attention; одна валюта в v1, вторая ресурс в v2 если loop валидирован |
| Multi-tier prestige в v1 | NGU Idle-сложность; валидируем 1 уровень сперва |
| Реальные имена живых официальных лиц / диссидентов | Defamation risk, тонально вне сатирического контракта |
| Daily login bonuses / streaks | Dark pattern, web-аудитория не любит |
| **Монетизация (IAP / subscriptions / donations / Stripe / CloudPayments / Boosty)** | Free игра; out of scope полностью |
| **Реклама (rewarded video / Yandex / AdSense / любые ad-сети)** | Free игра; out of scope полностью |
| Серверная анти-чит симуляция / HMAC-snapshot валидация | Стоимость >> вред в idle. Sanity-check только при leaderboard submit |
| Lore-dump tutorial | Idle-clicker учит через tooltip + first-click feedback |
| Browser push-уведомления | Web-аудитория считает спамом |
| Animated mascot characters | Блокирует ассет-пайплайн; ASCII-арт — наш ответ |
| RNG-locked ачивки (0.01% drops) | Save-scumming, rage-quit risk; все ачивки детерминированные |
| Активный бой / боссы (Trimps-style) | Меняет жанровый контракт |
| Skill tree / branching upgrades | Удваивает контент-нагрузку; линейные треки в v1 |
| Email verification flow | Пользователь явно отказал — нулевое сопротивление регистрации |
| OAuth-провайдеры (Google, Yandex, TG Login) в v1 | Email+password достаточно; OAuth добавим post-v1 если нужно |

## Content Lists (locked for v1)

### Click Upgrades (10)
1. Резиновая печать (×2, 100)
2. Чёрный список 1.0 (×2, 500)
3. Регламент блокировки (×2, 2 500)
4. Закон Яровой (×3, 15 000)
5. DPI-оборудование (×3, 100 000)
6. Единый реестр запрещённых сайтов (×4, 750 000)
7. Автоматизированная система «Ревизор» (×5, 5e6)
8. AI-классификатор контента (×5, 4e7)
9. Квантовый цензор (×7, 3e8)
10. Указ Президента №451 (×10, 2.5e9)

### Auto-Censors (8)
1. Стажёр-цензор (CPS 0.5, base 15)
2. Районный эксперт (CPS 5, base 100)
3. Региональное управление (CPS 47, base 1 100)
4. Отдел мониторинга СМИ (CPS 260, base 12 000)
5. Эшелон ТСПУ (CPS 1 400, base 130 000)
6. Нейросеть-классификатор (CPS 7 800, base 1.4e6)
7. Министерство правды (CPS 44 000, base 2e7)
8. Суверенный интернет (CPS 260 000, base 3.3e8)

### Achievements (12)
1. Первая жалоба рассмотрена — первый клик
2. Реестр пополнен — 1 000 блокировок
3. Бюрократ среднего звена — 1М блокировок
4. Великий цензор — 1Б блокировок
5. Архитектор тишины — 1Т блокировок
6. Указ подписан — первый купленный click upgrade
7. Штатное расписание — 50 одного цензора
8. Закон Яровой принят — куплен Click Upgrade #4
9. Великий китайский файрвол младший — 100 ТСПУ Эшелонов
10. Орден на грудь — первый престиж
11. Ветеран службы — 5 престижей
12. VPN? Не слышал — кликнуть 10 «Утечек в Telegram» подряд без промаха

### Random Events (6)
1. VPN-утечка — frenzy ×7 на 30 сек (rarity 40%)
2. Свободный интернет! — instant +13× CPS (30%)
3. Внеплановая проверка — ×77 click value на следующие 77 кликов (15%)
4. Утечка в Telegram — NEGATIVE: −5% income/30s; клик даёт прогресс к ачивке «VPN? Не слышал» (10%)
5. Государственный заказ — +1 минута CPS instant lump (4%)
6. Чёрный лебедь — 50/50: +15 минут CPS ИЛИ +1 звезда (1%)

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CORE-01 | Phase 2 | Pending |
| CORE-02 | Phase 1 | Pending |
| CORE-03 | Phase 2 | Pending |
| CORE-04 | Phase 1 | Pending |
| CORE-05 | Phase 2 | Pending |
| CORE-06 | Phase 1 | Pending |
| CLICK-01 | Phase 2 | Pending |
| CLICK-02 | Phase 2 | Pending |
| CLICK-03 | Phase 3 | Pending |
| CLICK-04 | Phase 3 | Pending |
| AUTO-01 | Phase 3 | Pending |
| AUTO-02 | Phase 3 | Pending |
| AUTO-03 | Phase 3 | Pending |
| AUTO-04 | Phase 3 | Pending |
| SAVE-01 | Phase 3 | Pending |
| SAVE-02 | Phase 1 | Pending |
| SAVE-03 | Phase 1 | Pending |
| SAVE-04 | Phase 1 | Pending |
| SAVE-05 | Phase 4 | Pending |
| PRES-01 | Phase 6 | Pending |
| PRES-02 | Phase 6 | Pending |
| PRES-03 | Phase 6 | Pending |
| PRES-04 | Phase 6 | Pending |
| PRES-05 | Phase 6 | Pending |
| PRES-06 | Phase 6 | Pending |
| PRES-07 | Phase 6 | Pending |
| EVNT-01 | Phase 5 | Pending |
| EVNT-02 | Phase 5 | Pending |
| EVNT-03 | Phase 5 | Pending |
| EVNT-04 | Phase 5 | Pending |
| EVNT-05 | Phase 5 | Pending |
| ACHV-01 | Phase 5 | Pending |
| ACHV-02 | Phase 5 | Pending |
| ACHV-03 | Phase 5 | Pending |
| ACHV-04 | Phase 5 | Pending |
| UI-01 | Phase 7 | Pending |
| UI-02 | Phase 7 | Pending |
| UI-03 | Phase 7 | Pending |
| UI-04 | Phase 7 | Pending |
| AUDIO-01 | Phase 2 | Pending |
| AUDIO-02 | Phase 2 | Pending |
| AUDIO-03 | Phase 2 | Pending |
| TONE-01 | Phase 1 | Pending |
| TONE-02 | Phase 1 | Pending |
| TONE-03 | Phase 1 | Pending |
| DEPLOY-01 | Phase 11 | Pending |
| DEPLOY-02 | Phase 11 | Pending |
| DEPLOY-03 | Phase 11 | Pending |
| DEPLOY-04 | Phase 11 | Pending |
| WEB-01 | Phase 8 | Pending |
| WEB-02 | Phase 1 | Pending |
| WEB-03 | Phase 8 | Pending |
| WEB-04 | Phase 8 | Done |
| WEB-05 | Phase 7 | Done |
| AUTH-01 | Phase 9 | Pending |
| AUTH-02 | Phase 9 | Pending |
| AUTH-03 | Phase 9 | Pending |
| AUTH-04 | Phase 9 | Pending |
| AUTH-05 | Phase 9 | Pending |
| AUTH-06 | Phase 9 | Pending |
| AUTH-07 | Phase 9 | Pending |
| LB-01 | Phase 10 | Pending |
| LB-02 | Phase 10 | Pending |
| LB-03 | Phase 10 | Pending |
| LB-04 | Phase 10 | Pending |
| LB-05 | Phase 10 | Pending |
| EVT-A-01 | Phase 10 | Pending |
| EVT-A-02 | Phase 10 | Pending |
| EVT-A-03 | Phase 10 | Pending |
| EVT-A-04 | Phase 10 | Pending |
| DB-01 | Phase 9 | Pending |
| DB-02 | Phase 9 | Pending |
| DB-03 | Phase 1 | Done |
| DB-04 | Phase 9 | Pending |
| API-01 | Phase 9 | Pending |
| API-02 | Phase 10 | Pending |
| API-03 | Phase 1 | Done |
| API-04 | Phase 9 | Pending |
| API-05 | Phase 1 | Done |

**Coverage:**
- v1 requirements: 80 total
  - Gameplay (unchanged): CORE 6 + CLICK 4 + AUTO 4 + SAVE 5 + PRES 7 + EVNT 5 + ACHV 4 + UI 4 + AUDIO 3 + TONE 3 = 45
  - Deploy: 4
  - Site/backend: WEB 5 + AUTH 7 + LB 5 + EVT-A 4 + DB 4 + API 5 = 30
  - Total: 45 + 4 + 30 = 79 (rounding for placeholder counts; see actual rows above)
- Mapped to phases ✓

---
*Requirements defined: 2026-05-16*
*Last updated: 2026-05-19 — switched deploy block to Vercel + Supabase. Monetization (MON-*) and ads (ADS-*) blocks deleted: scope decision keeps the game free with no in-app purchases or advertising.*
