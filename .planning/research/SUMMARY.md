# Project Research Summary

**Project:** RKN Tycoon
**Domain:** 2D idle-clicker web game (Cookie Clicker-style, React + DOM, Russian-language satire)
**Researched:** 2026-05-15
**Confidence:** HIGH

---

## Executive Summary

RKN Tycoon is a browser-only idle-clicker in a mature, well-understood genre. The genre's conventions are stable and non-negotiable: players coming from Cookie Clicker expect a single satisfying click verb, exponential number growth via break_infinity.js, idle income from generator tiers, a prestige reset, and random "golden cookie" events. The differentiator is entirely in theme, voice, and content density — bureaucratic-Soviet deadpan on every upgrade, a rubber-stamp click button, and ASCII/terminal chrome. The stack is fully locked (React 18 + TS 5 strict + Vite 5 + Tailwind 4 + Zustand + motion/react + break_infinity.js + Howler + Lucide), all versions are npm-verified, and all peer dependencies are compatible. No stack decisions remain open.

The recommended build order is a strict dependency spine: engine types and content data first, then Zustand store with custom Decimal persistence, then the rAF tick loop, then the click button. The moment the core loop is alive and saves survive a refresh, all downstream work becomes additive. Zustand's `persist` middleware with a custom `PersistStorage` that walks the state tree and serializes `Decimal` instances as `{ __D: "1.23e456" }` strings is the single most critical implementation detail — it must exist before any public build ships, because retrofitting it after players have corrupted saves is MEDIUM-to-HIGH recovery cost.

The primary risks are all well-documented and preventable: silent `Decimal` corruption on JSON round-trip (must land in Phase 1), missing save version/migrate schema (must land in Phase 1), per-tick whole-tree re-renders from bare `useGameStore()` calls (prevented by granular Zustand selectors), `setInterval` instead of `requestAnimationFrame` (rAF + delta-time accumulator is the only correct pattern for hidden-tab throttling), and the two-build deploy reality for GitHub Pages vs itch.io (different `base` values, different zip strategies). Tone discipline — punching at institutions and processes, never at named individuals — is a design constraint as much as a legal one and must be written into a tone bible before the first upgrade description is authored.

---

## Key Findings

### Recommended Stack

The stack is locked and fully validated against the npm registry as of 2026-05-15. Every peer dependency is satisfied. The critical integration patterns are: `@import "tailwindcss"` (not the v3 `@tailwind` directives) in `index.css`; `@tailwindcss/vite` plugin (not PostCSS); `motion/react` import path (not `framer-motion`, not the bare `motion` path); `create<GameState>()(persist(immer(...)))` curried form for Zustand (non-curried loses type inference with middleware); and `useGame.getState()` inside the rAF loop rather than a hook subscription. Vite 5.4.21 is honored per user specification; Vite 6.4.2 is flagged as a viable alternative with 15-30% faster cold start and identical ergonomics.

**Core technologies:**
- `react@18.3.1` + `react-dom@18.3.1`: UI framework — stable, high AI-codegen accuracy, ecosystem maturity. React 19 skipped for v1: compiler auto-memo is wasted on ~10 components; small migration risk not worth it.
- `typescript@5.9.3` strict: catches Decimal/number footguns and state-shape regressions at edit time. TS 6 just shipped (2026-Q1/Q2) — wait one quarter.
- `vite@5.4.21`: dev server and bundler. `base: "./"` in `vite.config.ts` is the starting point (works for itch.io zip); `base: "/rkn-tycoon/"` for the GitHub Pages build. Two separate build scripts required.
- `tailwindcss@4.3.0` + `@tailwindcss/vite@4.3.0`: CSS-first config via `@theme {}` in `index.css`. No `tailwind.config.js`, no PostCSS, no autoprefixer. Design tokens (`--color-rkn-red: #c62828`, `--font-family-mono`) defined in CSS become Tailwind utilities automatically.
- `zustand@5.0.13`: single store, sliced via composition. Selectors isolate re-renders at 10 Hz tick rate. Custom `decimalStorage` handles Decimal serialization.
- `motion@12.38.0` (import from `motion/react`): click button bounce, achievement toasts, prestige animation. Use CSS keyframes for floating "+N" click popups — mounting/unmounting `<motion.div>` per click at 15+ clicks/sec causes frame drops.
- `break_infinity.js@2.2.0`: required from day 1. `Number.MAX_VALUE` (~1e308) is reachable in under an hour of idle play. Every game-economy field must be `Decimal` — no mixing with plain `number`. Never use `==`, `<`, `>`, `+`, `-` on Decimals.
- `howler@2.2.4`: click SFX. One `Howl` instance per SFX file at module load; reuse with `.play()`. `pool: 20` for rapid-click overlap. Initialize before first click to capture the mobile audio-unlock window.
- `lucide-react@1.16.0`: named imports only. Never `import *` — ships ~1 MB of unused icons.

**Two-build deploy reality (all four researchers converged on this):**
- GitHub Pages: `base: '/rkn-tycoon/'` (absolute subpath). Deploy via `peaceiris/actions-gh-pages` in `.github/workflows/deploy.yml`. This is the dev/preview environment — do not advertise this URL to players.
- itch.io: `base: './'` (relative). Zip with `cd dist && zip -r ../rkn-tycoon-itch.zip .` — trailing dot ensures `index.html` is at zip root, not inside a `dist/` folder. This is the canonical public URL.
- localStorage is per-origin. `user.github.io` and `html-classic.itch.zone` are different origins — saves do not transfer. Players who build progress on GH Pages preview will lose it on itch.io. Ship JSON export/import before sharing the GH Pages URL publicly.
- Define `pnpm build:gh` and `pnpm build:itch` as separate package.json scripts (or use a `DEPLOY_TARGET` env var) to prevent shipping with the wrong base path.

### Expected Features

All four researchers converged on the same feature set. The concrete content artifacts below are ship-ready for REQUIREMENTS.md.

**Must have (table stakes) — missing any of these makes the game feel broken:**
- Big "ЗАБЛОКИРОВАТЬ" click button with full juice: CSS `:active` scale depression, floating "+N" popup (pooled, CSS-animated, not Framer Motion), click SFX via cached Howl, counter scale pulse. All feedback channels fire within 50 ms of `pointerdown` (not `click` — saves the "wait for up" delay). `touch-action: manipulation` eliminates 300 ms mobile tap delay.
- Single currency "блокировки" with `break_infinity.js` + suffix formatting always visible at top. See Open Questions for Cyrillic vs Latin suffix decision.
- 10 click upgrades (linear track, no branching), cost ramp ~5-7x per tier, multiplicative click effect.
- 8 auto-censors (idle generators), 1.15x cost growth per copy owned, base CPS ~7x per tier.
- Buy 1 / 10 / Max buttons. Max-affordable computable in closed form.
- localStorage autosave throttled to every 2 seconds + `visibilitychange` + `beforeunload`. NOT on every `setState`.
- Offline progress on reload: `(Date.now() - lastTickAt) / 1000 * perSecond`, capped. See Open Questions for cap value.
- One prestige tier ("Звёзды Цензора"): threshold 1e9 lifetime blocks, formula `floor((total / 1e9)^0.5)` stars, each star = +2% global income multiplier. Reset wipes blocks + generators + click upgrades; preserves stars, achievements, lifetime counter.
- 4-6 random clickable events: spawn every 90-300 s, 13 s window to click.
- 10-12 achievements with toast popups + persistent panel. All deterministic milestones — no RNG-locked achievements.
- Sound on/off toggle, persisted. Default on.
- Tab title live counter: `document.title = format(blocks) + ' блокировок'`.
- ASCII/terminal aesthetic: IBM Plex Mono or JetBrains Mono (Cyrillic subset), box-drawing borders, CRT glow.
- Bureaucratic flavor text (deadpan officialese) on every upgrade, censor, achievement, and event.

**Should have (differentiators):**
- Decree event log at bottom: `[ВНИМАНИЕ] Указ №451: разблокирован цензор «Эшелон ТСПУ»` — pure flavor.
- "Реестр запрещённых сайтов" scrolling cosmetic panel with fake-blocked domains.
- JSON save export/import (one button each) — critical if GH Pages URL is shared before itch.io launch.
- Statistics panel: clicks/sec, total clicks, time played.

**Defer to v2+:**
- Multi-tier prestige — only after v1 telemetry shows players prestiging 3+ times.
- Generator-specific upgrades at owned milestones (10/25/50/100).
- Background music (toggleable, default off).
- PWA offline install, CrazyGames SDK, cross-tab sync.

**Concrete content catalog (ship-ready for REQUIREMENTS.md):**

10 click upgrades (cost ramp ~5-7x per tier):

| # | Russian name | Cost | Effect |
|---|---|---|---|
| 1 | Резиновая печать | 100 | Click x2 |
| 2 | Чёрный список 1.0 | 500 | Click x2 |
| 3 | Регламент блокировки | 2 500 | Click x2 |
| 4 | Закон Яровой | 15 000 | Click x3 |
| 5 | DPI-оборудование | 100 000 | Click x3 |
| 6 | Единый реестр запрещённых сайтов | 750 000 | Click x4 |
| 7 | Автоматизированная система «Ревизор» | 5e6 | Click x5 |
| 8 | AI-классификатор контента | 4e7 | Click x5 |
| 9 | Квантовый цензор | 3e8 | Click x7 |
| 10 | Указ Президента №451 | 2.5e9 | Click x10 |

8 auto-censors (idle generators, 1.15x cost growth per copy, ~7x CPS per tier):

| # | Russian name | Base CPS | Base cost |
|---|---|---|---|
| 1 | Стажёр-цензор | 0.5 | 15 |
| 2 | Районный эксперт | 5 | 100 |
| 3 | Региональное управление | 47 | 1 100 |
| 4 | Отдел мониторинга СМИ | 260 | 12 000 |
| 5 | Эшелон ТСПУ | 1 400 | 130 000 |
| 6 | Нейросеть-классификатор | 7 800 | 1.4e6 |
| 7 | Министерство правды | 44 000 | 2e7 |
| 8 | Суверенный интернет | 260 000 | 3.3e8 |

12 achievements (all deterministic milestones):

| # | Russian name | Trigger |
|---|---|---|
| 1 | Первая жалоба рассмотрена | First click |
| 2 | Реестр пополнен | 1 000 blocks |
| 3 | Бюрократ среднего звена | 1e6 blocks |
| 4 | Великий цензор | 1e9 blocks |
| 5 | Архитектор тишины | 1e12 blocks |
| 6 | Указ подписан | Buy first click upgrade |
| 7 | Штатное расписание | Own 50 of one generator type |
| 8 | Закон Яровой принят | Buy click upgrade #4 |
| 9 | Великий китайский файрвол младший | Own 100 ТСПУ Echelons |
| 10 | Орден на грудь | First prestige |
| 11 | Ветеран службы | 5 prestiges |
| 12 | VPN? Не слышал | Click 10 "Утечка в Telegram" events without missing one |

6 random events (spawn 90-300 s random, 13 s window):

| # | Russian name | Effect | Rarity |
|---|---|---|---|
| 1 | VPN-утечка | x7 income for 30 s (frenzy) | 40% |
| 2 | Свободный интернет! | Instant +13x current CPS in blocks | 30% |
| 3 | Внеплановая проверка | x77 click value for next 77 clicks | 15% |
| 4 | Утечка в Telegram | NEGATIVE: -5% income for 30 s | 10% |
| 5 | Государственный заказ | +1 minute CPS as instant lump sum | 4% |
| 6 | Чёрный лебедь | +15 min CPS OR 1 free prestige star (50/50) | 1% |

Prestige name: **"Звёзды Цензора"** (Censor's Stars). Pluralizes cleanly across all counts. Maps to ASCII star glyphs (★, ✦). Prestige threshold: 1e9 lifetime blocks. Formula: `stars_gained = floor((totalBlocksEver / 1e9) ^ 0.5)`. Each star = +2% global income multiplier, permanent. Confirm modal styled as a press-release ("Указом Президента вы повышены в звании. Старая структура расформирована.").

### Architecture Approach

The architecture is a strict four-layer stack enforced by an ESLint `no-restricted-paths` rule: **Content** (typed `const` data in `src/content/*.ts`) feeds **Engine** (pure TS in `src/engine/`, zero React imports) which feeds **State** (Zustand store in `src/state/`, composed from slice creators via `create<GameStore>()(persist(immer(...)))`) which feeds **UI** (React components in `src/ui/`, subscribing only via granular selectors). The tick loop lives in `src/engine/tickLoop.ts` as a single `requestAnimationFrame` driver with a 100 ms fixed step, a delta-time accumulator, and a `MAX_CATCHUP_STEPS = 50` cap. Side effects (SFX, achievement toasts) travel through a 20-line in-process event bus so engine functions remain pure and testable in Vitest without jsdom. The `break_infinity.js` import is centralized in `src/lib/decimal.ts` — if the library ever needs to be swapped for `break_eternity.js` (needed above ~1e9e15), it is one file change.

**Major components:**
1. `src/engine/` — pure TS: `tickLoop` (rAF + accumulator), `economy` (incomePerSec, applyIncome), `pricing` (nextCost = base * 1.15^owned), `events` (scheduled spawn via `nextEventRollAt` timestamp, weighted random draw), `achievements` (predicate checks at end of tick + purchase), `prestige` (gain formula + reset). No React, no DOM. Vitest testable.
2. `src/content/` — typed `as const satisfies readonly XxxDef[]` data: `upgrades.ts`, `censors.ts`, `achievements.ts`, `events.ts`, `balance.ts`, `strings.ru.ts`. Balance tweaks require only content file edits, no logic changes. Single source of truth for all Russian strings.
3. `src/state/` — Zustand store with slices for currency, upgrades, censors, achievements, events, prestige, meta. Custom `decimalStorage` in `persist.ts` walks the state tree and encodes/decodes `Decimal` via `{ __D: "1.23e456" }` markers. Save key: `"rkn-tycoon@v1"`, `version: 1`, `migrate` function in place from day one.
4. `src/ui/` — React components subscribing via granular selectors. `ClickButton` subscribes only to the formatted blocks string (not the raw `Decimal`). `UpgradeRow` subscribes only to its own owned count + affordability via `useShallow`. Never call `useGameStore()` without a selector.
5. `src/lib/` — thin adapters: `decimal.ts` (single break_infinity import + `D`/`ZERO` helpers), `format.ts` (К/М/Б/Т/аа/аб formatter), `sfx.ts` (cached Howl instances + `sfxBus`), `bus.ts` (20-line typed event bus for SFX/toast intents).

**Build order — the dependency spine:**

```
Step 1:  lib/decimal.ts + lib/format.ts               (format tests in Vitest)
Step 2:  engine/types.ts + content/*.ts skeleton        (compile-time check)
Step 3:  engine/pricing.ts + engine/economy.ts          (pure-function Vitest tests)
Step 4:  state/store.ts + slices + state/persist.ts     (Decimal codec)
Step 5:  engine/tickLoop.ts + actions + App.tsx shell   (loop runs invisibly)
Step 6:  PAGE REFRESH TEST — saves survive              [MILESTONE: persistence]
Step 7:  ClickButton + currency display                 [MILESTONE: minimum viable click]
Step 8:  content/upgrades.ts + UpgradeList              [MILESTONE: minimum viable purchase]
Step 9:  content/censors.ts + CensorList                [MILESTONE: full idle loop]
Step 10: lib/sfx.ts + sfxBus + click/purchase wiring
Step 11: engine/achievements.ts + AchievementToast
Step 12: engine/events.ts + EventPopup
Step 13: engine/prestige.ts + PrestigePanel
Step 14: ASCII chrome, Framer Motion discrete animations, CRT polish
Step 15: Two-build deploy (GH Pages action + itch.io zip)
```

### Critical Pitfalls

All four research files converge on the same top risks, listed in prevention-priority order:

1. **Decimal serialization lost in JSON (Phase 1, non-negotiable)** — `JSON.stringify(new Decimal(123))` silently produces `{}`. On reload, `.add()` throws `TypeError: state.blocks.add is not a function`. Fix: custom `PersistStorage` with `encode`/`decode` functions that walk the state tree, replacing `Decimal` instances with `{ __D: "1.23e456" }` strings and rebuilding them on load. Unit test: `encode(state) → JSON.parse → decode → .add(new Decimal(1))` must not throw. Ship zero public builds without this.

2. **Save schema versioning missing (Phase 1, non-negotiable)** — Without `version: 1` + `migrate(persisted, version)` in Zustand `persist`, any balance patch that renames or adds a state field corrupts every player's save. Recovery cost after real players have saves is MEDIUM-HIGH with no technical fix for already-corrupted data. Write `SaveV1` TypeScript type; bump version for any shape change; write explicit migration functions.

3. **`setInterval` instead of `requestAnimationFrame` (Phase 1)** — `setInterval(tick, 100)` keeps firing at full rate on hidden tabs. `requestAnimationFrame` is throttled to ~1 Hz on hidden tabs by every modern browser (battery saving, browser spec). The rAF + fixed-step accumulator with `MAX_CATCHUP_STEPS` cap is the only correct pattern. Offline progress is computed separately in `onRehydrateStorage` by comparing `Date.now() - lastTickAt`, not by counting foreground ticks.

4. **Per-tick whole-tree re-render (Phase 1 store setup)** — `useGameStore()` with no selector re-renders the component on every state change (10 Hz). With 20+ upgrade cards this kills frame rate. Always use granular selectors. Subscribe to the formatted string, not the raw `Decimal`. Use `useShallow` for object/array selectors.

5. **Two-build deploy base path (Phase 0 planning, Phase 7 execution)** — `base: '/'` in Vite produces a blank page on GitHub Pages (`/assets/index.js` returns a 404; real path is `/rkn-tycoon/assets/index.js`). `base: './'` works for itch.io but not GH Pages. Solution: two build commands. All asset references via Vite `import` (never hardcoded `/path` strings).

6. **Tone drift into harmful content (Phase 0 tone bible, re-audited every phase)** — Satire must target institutions, laws, and bureaucratic process — never named living individuals, dissidents, or ethnic/religious groups. The joke is "you, the player, are building the censorship apparatus — isn't it absurd how easy it is." Write the tone bible before authoring the first upgrade description. Rule: does it punch up at the system, or down at people? Up = keep. Down = cut.

7. **Howler per-click instantiation (Phase 1 SFX)** — `new Howl({...}).play()` per click leaks memory linearly; after ~1000 clicks browser caps concurrent audio and clicks silently fail. Fix: one `Howl` per SFX at module load, `pool: 20` for overlap.

8. **Framer Motion on the click hot path (Phase 1 click feel)** — Mounting/unmounting `<motion.div>` per click at 15+ clicks/sec causes frame drops and detached DOM nodes. Fix: CSS keyframe animations for "+N" popups in pooled fixed slots. Reserve Framer Motion for discrete events (achievement banners, prestige screen, menu transitions).

---

## Implications for Roadmap

Based on research, all four files agree on a strict dependency spine. The suggested phase structure follows that spine exactly, with each phase independently testable before the next begins.

### Phase 0: Bootstrap + Tone Bible

**Rationale:** Tailwind 4 setup mistakes are cheaper to fix at hour 0 than at hour 40. The tone bible must precede all content authoring. The two-build deploy scripts must be defined now so all asset references are Vite-managed from the start.
**Delivers:** Vite 5 + React 18 + TS 5 strict + Tailwind 4 dev environment (`@import "tailwindcss"`, `@tailwindcss/vite`, `@theme {}` tokens); `pnpm build:gh` and `pnpm build:itch` scripts; tone bible document; IBM Plex Mono or JetBrains Mono self-hosted with Cyrillic subset.
**Avoids:** Pitfall 9 (wrong Vite base), Pitfall 13 (v3 Tailwind idioms), Pitfall 12 (tone drift starting from upgrade #1).
**Research flag:** Standard patterns fully documented in STACK.md — skip deep research phase.

### Phase 1: Engine Core + Persistence

**Rationale:** The dependency spine's foundation. Every subsequent phase depends on correct Decimal types, a running game loop, and saves that survive page refresh. All three must be proven together. A save bug discovered after players have saves is MEDIUM-HIGH recovery cost.
**Delivers:** `lib/decimal.ts` + `lib/format.ts` (tested: 0, 999, 1e6, 1e308, 1e500); `engine/types.ts` (all interfaces including `GameStore`, `UpgradeDef`, `CensorDef`, `AchievementDef`, `EventDef`); `content/*.ts` (all typed data — the full 10-upgrade / 8-censor / 12-achievement / 6-event catalogs with Russian names and costs); `state/store.ts` with `decimalStorage` and `version: 1`; `engine/tickLoop.ts` (rAF + accumulator + `MAX_CATCHUP_STEPS`). **Milestone:** page refresh restores exact state including Decimal fields.
**Avoids:** Pitfall 1 (Decimal lost in JSON), Pitfall 2 (no save versioning), Pitfall 4 (per-tick localStorage write — throttle to 2 s here), Pitfall 8 (mixed Decimal/number economy fields), Pitfall 14 (Zustand types as `any`).
**Research flag:** Implementation fully specified in STACK.md (§2 Zustand + Decimal pattern) and ARCHITECTURE.md (Pattern 4 + build order). Standard patterns — skip deep research phase.

### Phase 2: Core Loop UI

**Rationale:** The click button is the game. With engine and persistence proven, this phase validates the core verb before any content is loaded.
**Delivers:** `ClickButton` (CSS `:active`, pooled CSS-animated "+N", counter pulse), currency display at top (formatted), click SFX via `sfxBus` + cached `Howl` (`pool: 20`), tab title live counter, sound toggle persisted. **Milestone:** clicking feels good, number grows, refresh restores it.
**Avoids:** Pitfall 5 (Howl per-click leak), Pitfall 6 (Framer Motion on hot path), Pitfall 15 (dead click feel), Pitfall 3 (ClickButton subscribes only to formatted blocks string).
**Research flag:** Standard patterns — skip deep research phase.

### Phase 3: Upgrades + Auto-Censors + Economy Balance

**Rationale:** Click upgrades and auto-generators are the idle loop. Depends on the engine's `pricing.ts` and `economy.ts` already tested. Balance sim spreadsheet required before building 30 upgrade cards — cost/income divergence discovered late is expensive.
**Delivers:** `content/upgrades.ts` (all 10 upgrades) + `content/censors.ts` (all 8 censors), `UpgradeList`/`UpgradeRow` (Buy 1/10/Max, affordability gating), `CensorList`/`CensorRow` (idle per-row activity indicator — ASCII glyph cycle every few seconds so auto-income feels visible). Balance simulation: verify "interesting decision every 30-90 s early-game, every 5-15 min mid-game." **Milestone:** full idle loop — click generates blocks, censors generate passive income, upgrades multiply click yield.
**Avoids:** Pitfall 7 (cost/income divergence — balance sim required before cards built), Pitfall 16 (auto-income invisible), Pitfall 3 (UpgradeRow subscribes only to its own slice via `useShallow`).
**Research flag:** If balance sim reveals divergence from the proposed numbers, a focused 1-2 hour research spike on idle-game progression curves is warranted before building the upgrade cards. Otherwise standard patterns.

### Phase 4: Events + Achievements

**Rationale:** Events and achievements are read-only consumers of the game state — additive after the core loop is proven. Events need the timed-multiplier concept in the income calculation, but the `EventsSlice` slot is already defined in Phase 1.
**Delivers:** `engine/events.ts` (scheduled spawn via `nextEventRollAt`, 6 event types with weighted random draw), `EventPopup` (13 s countdown, click-to-claim), timed-multiplier in `applyIncome`, `engine/achievements.ts` (12 predicate checks at end of `tick()` + purchase actions), `AchievementToast` (`AnimatePresence` — discrete event, not per-tick). **Milestone:** events spawn and resolve correctly, achievement #12 ("VPN? Не слышал") requires active skill.
**Avoids:** Pitfall 6 (achievement toasts use Framer Motion for discrete events only).
**Research flag:** Standard patterns fully specified in ARCHITECTURE.md (Patterns 7, 8) — skip deep research phase.

### Phase 5: Prestige

**Rationale:** Prestige depends on having something to reset (upgrades + censors built in Phase 3) and a global multiplier slot in the income formula (defined as `prestigeMult: Decimal` initialized to 1.0 in Phase 1). The emotional design of the prestige screen is the make-or-break moment of v1 retention.
**Delivers:** `engine/prestige.ts` (`prestigeGain = floor((totalBlocksEver / 1e9)^0.5)`, reset logic), `PrestigePanel` (unlock gate at 1e9 total lifetime blocks, two-step confirm modal with preview of what is preserved vs reset, press-release styling, star count display with ★ glyphs, full-screen prestige animation + SFX). **Milestone:** prestige resets blocks/upgrades/censors, preserves stars + achievements, player reaches old peak faster after reset.
**Avoids:** Pitfall 17 (prestige punitive — first reset must deliver visible acceleration within 5 minutes of re-buying; confirm modal must show exact reward before player commits).
**Research flag:** Prestige formula and UX requirements fully documented in FEATURES.md and PITFALLS.md — standard patterns.

### Phase 6: Polish + ASCII Chrome

**Rationale:** Visual polish is independent of game logic and applies cleanly only after all interactive surfaces exist. Framer Motion transitions applied before components exist waste iteration time.
**Delivers:** `TerminalFrame` shell with box-drawing borders, CRT scanline overlay (`ascii.css`), Cyrillic monospace font served from `public/fonts/`, bureaucratic flavor text (tone-bible compliant) on every upgrade/censor/event/achievement, decree event log at bottom, responsive layout (min 360 px wide, 56x56 px click button touch target), `prefers-reduced-motion` media query respected. Tone re-audit: re-read all copy in one sitting — does any line punch down instead of up?
**Avoids:** Pitfall 12 (tone re-audit at each milestone), UX pitfall (Cyrillic with no Cyrillic font fallback).
**Research flag:** Standard patterns — skip deep research phase.

### Phase 7: Deploy

**Rationale:** Deploy requires proven, stable output. The two-build reality must be handled explicitly.
**Delivers:** `.github/workflows/deploy.yml` (push to `gh-pages` branch via `peaceiris/actions-gh-pages` using `pnpm build:gh`); itch.io upload script (`cd dist && zip -r ../rkn-tycoon-itch.zip .`); `unzip -l` verification that `index.html` is at zip root; itch.io project settings (viewport 1280x800); private/draft itch.io upload tested before going public. JSON save export/import shipped here if GH Pages was shared with playtesters.
**Avoids:** Pitfall 9 (wrong Vite base), Pitfall 10 (itch.io zip wrong), Pitfall 11 (cross-origin save loss).
**Research flag:** All deploy steps documented with exact commands in PITFALLS.md (Pitfalls 9, 10, 11) — standard patterns.

### Phase Ordering Rationale

The ordering follows the dependency spine all four research files agree on:

- Engine types before everything: `Decimal` type must be defined before any economy function, before the store is shaped, before any UI subscribes.
- Persistence before first public build: save corruption after real players have saves is MEDIUM-HIGH recovery cost with no retroactive technical fix.
- Click button before upgrades: the click verb is the core loop. Upgrades are content layered on a proven verb.
- Balance sim before upgrade cards: discovering a broken economy curve after building 30 cards means rebuilding all of them.
- Events and achievements after the loop: they are read-only consumers. Adding them last means zero risk of breaking the loop.
- Prestige after events/achievements: the confirm modal preview references both ("these achievements will be preserved, these upgrades will be reset").
- Polish after all interactive surfaces: applying CSS chrome before components exist wastes iteration time.
- Deploy last: optimize the build pipeline only when the game is stable.

### Research Flags

Phases with standard, fully-documented patterns (no deeper research needed):
- Phase 0 — Vite 5 + Tailwind 4 + pnpm setup is 100% documented in STACK.md.
- Phase 1 — Zustand `persist` + Decimal codec pattern is fully specified in STACK.md (§2) and ARCHITECTURE.md (Pattern 4).
- Phase 2 — Click button juice patterns documented in PITFALLS.md (Pitfalls 5, 6, 15).
- Phase 4 — Event and achievement architecture fully specified in ARCHITECTURE.md (Patterns 7, 8).
- Phase 5 — Prestige formula and UX documented in FEATURES.md and PITFALLS.md.
- Phase 6 — CSS/motion polish patterns documented across STACK.md and PITFALLS.md.
- Phase 7 — Exact deploy commands documented in PITFALLS.md (Pitfalls 9, 10, 11).

May benefit from a short research spike:
- Phase 3 (balance tuning only): if the balance simulation (cost growth vs income growth vs prestige timing) reveals divergence from the proposed numbers, a focused 1-2 hour research spike on idle-game progression curves before building the upgrade card UI is worth the time. If the sim validates the numbers, skip.

---

## Open Questions (User Must Decide Before Phase 3)

These are design choices, not technical constraints. They must be answered before or during Phase 3 planning.

1. **Offline progress cap:** FEATURES.md proposes 24h; STACK.md code example uses 4h; Cookie Clicker uses 1h with decay. Longer cap rewards returning players but can trivialize prestige timing. **Recommendation: 4h hard cap for v1** — generous enough to feel rewarding, short enough that prestige (which resets progress) remains meaningful.

2. **Cyrillic vs Latin number suffixes:** К/М/Б/Т vs K/M/B/T for the first four tiers. Cyrillic is more thematically consistent; Latin is what idle-game veterans recognize from Cookie Clicker. **Recommendation: Cyrillic (К/М/Б/Т) for first four suffixes, then Latin (aa/ab/ac...) for exponential suffixes** — no standard Cyrillic equivalents exist for the aa-range.

3. **Vite 5 vs Vite 6:** User specified Vite 5 and that choice is honored. STACK.md flags Vite 6.4.x as a viable alternative with faster cold start and identical ergonomics (one version bump, all other stack packages support both). Decision can be deferred to Phase 0 bootstrap.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions queried from npm registry on 2026-05-15; all peer dependency ranges verified. No ambiguity except Vite 5 vs 6 (user preference, both work). |
| Features | HIGH | Genre conventions are 15+ years mature; content catalogs reviewed for thematic consistency; balance formulas are standard across Cookie Clicker, AdVenture Capitalist, NGU Idle. |
| Architecture | HIGH | Zustand persist patterns verified against official docs; rAF + fixed-step accumulator is canonical (MDN); engine/view boundary is standard JS game architecture. |
| Pitfalls | HIGH (technical) / MEDIUM (game-feel) | Technical pitfalls (Decimal serialization, rAF, Tailwind 4 setup, Vite base path) are verified against official sources. Game-feel pitfalls (balance, prestige tuning) require playtest validation. |

**Overall confidence:** HIGH

### Gaps to Address

- **Balance validation:** The proposed balance numbers (1.15x cost growth, ~7x CPS per tier, 1e9 prestige threshold) are well-reasoned from genre conventions but require a spreadsheet simulation before Phase 3 implementation. Content catalog names and mechanics are correct; only the specific numeric values need sim validation.
- **Cyrillic font subset size:** IBM Plex Mono (SIL OFL) and JetBrains Mono (SIL OFL) both include Cyrillic. The exact subset to serve (Latin + Cyrillic only vs full font) should be decided at Phase 0 to minimize font file size and loading time.
- **Offline progress cap:** Must be decided before Phase 1 ships the `onRehydrateStorage` implementation. See Open Questions above.

---

## Sources

### Primary (HIGH confidence)
- npm registry (direct query, 2026-05-15) — versions and peer dependencies for all locked-stack packages
- [Tailwind CSS v4.0 docs + upgrade guide](https://tailwindcss.com/docs/upgrade-guide) — Oxide engine, CSS-first config, `@tailwindcss/vite`
- [Zustand persist middleware official docs](https://zustand.docs.pmnd.rs/reference/integrations/persisting-store-data) — `PersistStorage`, `createJSONStorage`, `partialize`, `onRehydrateStorage`, `version`/`migrate`
- [Motion (Framer Motion rebrand) docs](https://motion.dev/docs/react-upgrade-guide) — `motion/react` import path, package rename
- [MDN Anatomy of a video game](https://developer.mozilla.org/en-US/docs/Games/Anatomy) — rAF + fixed-step accumulator pattern
- [break_infinity.js README](https://github.com/Patashu/break_infinity.js/) — Decimal API, immutability, prototype-based methods
- [Howler.js GitHub](https://github.com/goldfire/howler.js/) — mobile audio unlock, pool option
- [Lucide React guide](https://lucide.dev/guide/packages/lucide-react) — tree-shaking via named imports
- [Vite static deploy guide](https://vitejs.dev/guide/static-deploy.html#github-pages) — GitHub Pages base path
- [itch.io HTML5 upload requirements](https://itch.io/docs/creators/html5) — zip structure, index.html at root

### Secondary (MEDIUM confidence)
- [Zustand discussion #1873](https://github.com/pmndrs/zustand/discussions/1873) — custom serialization patterns for non-JSON types
- [Zustand discussion #1720](https://github.com/pmndrs/zustand/discussions/1720) — class instances not persisted correctly
- [Performant Game Loops in JavaScript — Hovhannisyan](https://www.aleksandrhovhannisyan.com/blog/javascript-game-loop/) — delta-time math, hidden-tab throttling
- [Cookie Clicker wiki — building cost formula](https://cookieclicker.fandom.com/wiki/Building) — 1.15x cost growth, prestige math
- [r/incremental_games community post-mortems](https://www.reddit.com/r/incremental_games/) — idle-game balance conventions
- [Framer Motion performance guidance](https://motion.dev/docs/performance) — compositor-friendly properties, layoutId cost
- [Tailwind v4 + Vite dev-mode first-load bug (#16399)](https://github.com/tailwindlabs/tailwindcss/discussions/16399) — known dev-mode gotcha, production unaffected

### Tertiary (LOW confidence — creative/design)
- RKN/Roskomnadzor satirical references — drawn from public-domain Russian-language internet culture (ТСПУ, реестр запрещённых сайтов, ФЗ-149, Яровая package). Content names are creative proposals; user (native Russian speaker, target-audience-native) should review and tune voice before Phase 3 content implementation.

---
*Research completed: 2026-05-15*
*Ready for roadmap: yes*
