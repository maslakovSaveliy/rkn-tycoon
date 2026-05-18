# Phase 5: Events + Achievements

**Goal:** Активная игра — глубина. 6 random clickable events (включая negative), 12 deterministic achievements с toast + панелью.

**Requirements:** EVNT-01..05, ACHV-01..04.

## Decisions

### D-50 — Multiplier layer как массив `activeMultipliers`
`GameState.activeMultipliers: ActiveMultiplier[]`, где
```ts
type MultKind = 'click' | 'cps'
interface ActiveMultiplier {
  id: string           // event id для дедупликации (один event = один mult)
  kind: MultKind
  value: number        // мультипликатор (>1 boost, <1 nerf)
  expiresAt: number    // Date.now() ms
}
```
Engine: `effectiveClickMult(state, now)` = `prestigeMult * product(m.value for m in activeMultipliers if m.kind=='click' && m.expiresAt > now)`. Аналогично `effectiveCpsMult`. Expired multipliers фильтруются в `applyTick` (pure-friendly — `now` приходит из rAF wrapper). 

### D-51 — Click-counter мультипликаторы (для «Внеплановая проверка»)
Event ×77 click value на следующие 77 кликов — это **click-counter** мультипликатор, не timed. Отдельное поле:
```ts
clickBoosts: { id: string; value: number; clicksRemaining: number }[]
```
`applyClick` декрементит `clicksRemaining`; когда =0 → удаляется. Эффект суммируется с timed click multipliers.

### D-52 — Event spawn в rAF tick
В `applyTick` (или wrapped в action `tick`): если нет `activeEvent` и `now >= nextEventSpawnAt`, выбрать event по weighted random, spawn'ить с `spawnedAt`/`expiresAt = +13_000ms` и случайной позицией (≤80% viewport bounds). Спавн интервал: `90_000-300_000ms` random. Expired event → activeEvent=null + reschedule next spawn.

### D-53 — Event effects encoded в data + applied через switch
`src/data/events.ts` экспортит `EVENTS` array + `applyEventEffect(state, eventId, now)` (pure-ish, возвращает state diff). Switch по `effect.kind`: 
- `'click-mult-timed'`: push в activeMultipliers с expiresAt
- `'cps-mult-timed'`: push с expiresAt
- `'cps-instant-lump'`: blocks += cps*seconds*prestigeMult (e.g. +1min CPS)
- `'click-mult-counter'`: push в clickBoosts
- `'cps-mult-instant-toggle'`: «Свободный интернет!» instant +13× CPS — это краткий boost. Implement как 1-сек timed mult с value=13.
- `'random-fork'`: «Чёрный лебедь» 50/50 — random выбор внутри.

### D-54 — Прогресс «VPN? Не слышал» — счётчик подряд
GameState добавляет `telegramLeakStreak: number`. При клике по «Утечка в Telegram» инкремент; при ЛЮБОМ другом event-clickе или expire без клика — reset to 0. 10 в подряд → unlock ачивки #12. Tracking — отдельный action `noteEventClick(eventId)`.

### D-55 — Achievements как predicate-defined data
`src/data/achievements.ts` — 12 объектов:
```ts
interface AchievementDef {
  id: string; name: string; description: string
  /** Pure predicate over GameState — should be cheap (called every tick). */
  check: (s: GameState) => boolean
}
```
State: `unlockedAchievements: string[]`. Tick проходит по списку, для каждого не-unlocked зовёт `check(state)`, если true — push в unlockedAchievements + enqueue toast.

### D-56 — Toast queue как transient store
`achievementToastQueue: { id: string; shownAt: number }[]` — добавляется при unlock, dropped когда `now - shownAt > 4000ms`. UI рендерит последние ≤3 как stack снизу-справа.

### D-57 — Achievements panel always visible на /play (D-36 reveal не нужно)
Маленькая иконка-кнопка в header → opens panel (или sidebar). 12 ячеек grid: unlocked показывают name+description, locked = `???` placeholder per ACHV-04.

### D-58 — Phase-6 ачивки stub'аются locked
- `#10 Орден на грудь` (первый prestige) — predicate `s.prestigeStars >= 1`. Поле `prestigeStars: number` уже в state? Нет. Добавлю заглушку `prestigeStars: 0` чтобы ачивка просто никогда не сработала пока Phase 6 не добавит инкремент.
- `#11 Ветеран службы` (5 prestige) — predicate `prestigeStars >= 5`. Same.

### D-59 — Save migration v2 → v3
Bump `CURRENT_SAVE_VERSION = 3`. Add fields:
- `activeEvent: null` (transient — strip from persist)
- `activeMultipliers: []` (transient strip)
- `clickBoosts: []` (transient strip — events are session-bound; resuming the next day shouldn't honor a 30s boost from yesterday)
- `nextEventSpawnAt: 0` (recomputed on hydrate)
- `telegramLeakStreak: 0` (PERSIST — ачивка переживает session)
- `unlockedAchievements: []` (PERSIST)
- `achievementToastQueue: []` (transient strip)
- `prestigeStars: 0` (PERSIST — нужен для Phase 6, инициализация сейчас 0)

v2→v3 миграция: seed `unlockedAchievements: []`, `telegramLeakStreak: 0`, `prestigeStars: 0`.

### D-60 — Event UI: floating clickable button, не overlay
Event icon рендерится как fixed-position button с случайной (`top`, `left`) в `viewport * [10%, 80%]`. CSS pulse animation для attention. Click → action `clickEvent()` → effect apply + remove. Auto-disappear: при tick'е expires проверяется.

## Tasks (waves)

### Wave A — Achievements (foundation)
A1. `src/data/achievements.ts` — 12 defs с predicate'ами.
A2. State extension: `unlockedAchievements`, `achievementToastQueue`, `prestigeStars`, persist v3 migration.
A3. Tick'овая логика: `checkAchievements(state)` → push новые в unlocked + toast queue.
A4. UI: `AchievementToast.tsx` (stack снизу справа), `AchievementsPanel.tsx` (12 cells grid), кнопка-trigger в header.
A5. Tests: `checkAchievements` против разных state'ов.

### Wave B — Multiplier layer + Events data
B1. State extension: `activeMultipliers`, `clickBoosts`. v3 migration update.
B2. `src/engine/multipliers.ts` — pure `effectiveClickMult(state, now)` + `effectiveCpsMult(state, now)` + `pruneExpired(state, now)`.
B3. Engine refactor: `applyTick(state, dtMs, now)` использует pruned mult layer. `applyClick(state, now)` тоже + декрементит clickBoosts. **Signature change** — обнови все callsites.
B4. `src/data/events.ts` — 6 event defs, `applyEventEffect(state, eventId, now)`.
B5. Tests: pruneExpired, click counter decrement, effect application.

### Wave C — Event spawn + UI
C1. State: `activeEvent`, `nextEventSpawnAt`, `telegramLeakStreak`. Actions: `spawnEvent` (internal), `clickEvent(id)`, `expireEvent()`.
C2. Tick integration: in `tick()` action, after applyTick — check spawn/expire conditions.
C3. UI: `EventOverlay.tsx` рендерит floating button если activeEvent != null. Pulse animation. Click → clickEvent.
C4. Black swan random fork: 50/50 «+15 минут CPS instant» / «+1 prestigeStar» (effectively unlocks ачивка #10 если ещё нет).

### Wave D — Verify + smoke
D1. `pnpm verify` зелёный.
D2. Manual smoke:
   - Кликнуть → toast «Первая жалоба рассмотрена»
   - Купить ×50 censor одного типа → toast «Штатное расписание»
   - В console: `useGameStore.getState().devSpawnEvent('vpn-leak')` → event button → click → frenzy multiplier видно в DebugHud
   - Reload — unlocked achievements + telegramLeakStreak переживают; activeMultipliers — нет

## Critical files

**New:**
- `src/data/events.ts`, `src/data/achievements.ts`
- `src/engine/multipliers.ts` + `.test.ts`
- `src/ui/AchievementToast.tsx`, `src/ui/AchievementsPanel.tsx`, `src/ui/AchievementsButton.tsx`
- `src/ui/EventOverlay.tsx`

**Modified:**
- `src/types/save.ts` (v3 fields)
- `src/engine/migrations.ts` (v2→v3) + test
- `src/engine/economy.ts` (signature with `now`)
- `src/engine/tick.ts` (pass now to onSteps callback?)
- `src/state/gameStore.ts` (extended actions, recomputes)
- `src/ui/AppShell.tsx` (render new UI)
- `src/ui/DebugHud.tsx` (show active multipliers count?)

## Commits (planned)

Wave A:
1. `feat(data): 12 achievements with deterministic predicates`
2. `feat(state): unlockedAchievements + toast queue + tick check + save v3`
3. `feat(ui): AchievementToast + AchievementsPanel + header trigger`

Wave B:
4. `feat(engine): multiplier layer (timed mults + click counters) with now arg`
5. `feat(data): 6 events with effect kinds + applyEventEffect`

Wave C:
6. `feat(state): event spawn/expire/click + telegramLeakStreak`
7. `feat(ui): EventOverlay floating button with pulse animation`

Wave D:
8. `docs(roadmap): mark Phase 5 done`

## Out of Scope

- Real prestige logic — Phase 6
- Sound on event spawn/achievement unlock — Phase 7 (когда добавим Howler)
- Cinematic transitions, particles — Phase 7
