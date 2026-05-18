# Phase 3: Idle Loop (Click Upgrades + Auto-Censors + Buy UX + Autosave)

**Goal:** Полный idle-loop играбелен end-to-end. Клик умножается купленными апгрейдами, авто-цензоры дают пассивный CPS, ×1/×10/Max-покупка масштабирует. Состояние переживает 10s autosave + reload.

**Requirements:** CLICK-03, CLICK-04, AUTO-01, AUTO-02, AUTO-03, AUTO-04, SAVE-01.

## Decisions

### D-30 — Click upgrades = одноразовые multiplier'ы
REQUIREMENTS-list лочит 10 апгрейдов: каждый — «куплено = да/нет», даёт фиксированный множитель к click value (×2, ×3, ×4, ×5, ×7, ×10). Не Cookie-Clicker-style repeatable. State хранит `purchasedClickUpgrades: string[]` (id'ы).

### D-31 — Auto-censors = repeatable с 1.15^n cost ramp
8 цензоров (Стажёр → Суверенный интернет). Каждый покупается многократно. Стоимость n-й покупки: `base * 1.15^n`. State хранит `censorCounts: Record<string, number>`. Closed-form для max-buy через геометрическую сумму (см. D-34).

### D-32 — Throttled autosave 10s + flush на visibilitychange/beforeunload
Zustand persist по умолчанию пишет на КАЖДЫЙ `setState` → 10Hz tick = 10 writes/sec. Жирно. Обёртка `throttledLocalStorage` в `persistStorage.ts` дебаунсит `setItem` на 10s; listener в AppShell делает immediate-flush на `visibilitychange` / `beforeunload`. SAVE-01 закрыт.

### D-33 — Layout: 3-column desktop / stacked mobile
Desktop ≥1024px: левая колонка click upgrades (scrollable), центр блок счётчик+кнопка, правая колонка censors (scrollable). Mobile: всё стэком, кнопка sticky внизу.

### D-34 — Max-buy через closed-form формулу геометрической прогрессии
`maxAffordableCensors(blocks, baseCost, currentCount, ratio=1.15)`:
- Сумма геометрической прогрессии: `S = baseCost * 1.15^currentCount * (1.15^n - 1) / (1.15 - 1) <= blocks`
- Решаем для `n`: `n = floor(log_1.15(blocks * 0.15 / (baseCost * 1.15^currentCount) + 1))`
- Реализация через `Decimal.log10` + деление, потом `floor`. Без break_infinity-специфичных helper'ов (которые в API есть, но семантика не идеальна).
- Возвращаем `{ count: Decimal, totalCost: Decimal }`. Count кэстится в number для UI (max 1e6 за одну покупку в Phase 3 разумно).

### D-35 — Save migration v1 → v2
GameState получает новые поля `purchasedClickUpgrades` и `censorCounts`. Бамп `CURRENT_SAVE_VERSION = 2`. В `engine/migrations.ts` добавить ветку:
```ts
if (version === 1) { state = { ...state, purchasedClickUpgrades: [], censorCounts: {} }; version = 2 }
```
Юзеры с Phase 1/2 сейвами получат пустой набор апгрейдов без потери блокировок.

### D-36 — Unlock policy: предпросмотр от 0.5×cost
Карточка апгрейда видна (locked / disabled) когда `totalBlocksEver >= 0.5 * cost`. До этого порога — скрыта. Карточка цензора всегда видна (8 штук — нет смысла прятать).

### D-37 — Flavor copy authored против TONE.md
Каждая карточка — 1-2 предложения бюрократическим register'ом. Без имён живых лиц. Тон тестируется audit-checklist'ом из TONE.md (раздел 5).

### D-38 — Click multiplier композиция через `lib/economy-derived.ts`
Чистая utility-функция `clickMultiplier(state)`: `prestigeMult * product(upgrade.mult for upgrade in purchased)`. Используется engine.applyClick и UI BlocksCounter (для tooltip "next click: +N"). Аналогично `aggregateCps(state, censors)`. Вынесено в lib чтобы не плодить циклов engine ↔ data.

Wait — `engine` НЕ должен импортить из `data`. Реальная декомпозиция:
- `data/clickUpgrades.ts`, `data/censors.ts` — константы.
- `engine/economy.ts` — операции **получают** агрегаты (clickValue, cps) как уже-вычисленные числа.
- `lib/economy-derived.ts` — pure utility, читает state + data, считает clickMultiplier/aggregateCps. Импортится из `state/gameStore.ts` (action `click()` берёт деривированный clickValue из этой функции и вызывает engine).
- Альтернатива: gameStore сам считает через data + передаёт engine. Проще — без новой папки.

**Финальное решение:** держать computations в `state/gameStore.ts` — оно уже знает и engine, и data. Никаких новых модулей. Engine остаётся pure (принимает Decimal параметры).

## State shape diff (v2)

```ts
interface GameState {
  // v1 fields preserved
  blocks: Decimal
  totalBlocksEver: Decimal
  clickValue: Decimal     // derived, кэшируется при покупке; reload пересчитает в onRehydrate
  cps: Decimal            // derived, аналогично
  prestigeMult: number
  lastTick: number
  tickCount: number
  uptimeStartMs: number

  // v2 new
  purchasedClickUpgrades: string[]   // id'ы купленных
  censorCounts: Record<string, number> // censor id → count owned
}
```

`clickValue` и `cps` остаются в state (как ранее), но пересчитываются после каждой покупки. Сейв содержит и сырые `purchasedClickUpgrades`+`censorCounts` и derived `clickValue`+`cps` — на reload оба источника совпадают (если data list не менялся между версиями).

## Tasks

### T1 — Data files
- `src/data/clickUpgrades.ts`: 10 объектов `{ id, name, description, cost: Decimal, multiplier: number }`. Imports `Decimal` from break_infinity.js (data zone разрешает).
- `src/data/censors.ts`: 8 объектов `{ id, name, description, baseCost: Decimal, baseCps: Decimal }`.

Хм, `data` zone — ESLint запрещает импорт react/next/server. Но `break_infinity.js` это plain JS, не запрещено. Проверить.

### T2 — State migration + new actions
- `src/types/save.ts`: bump CURRENT_SAVE_VERSION = 2, add fields, update initialState.
- `src/engine/migrations.ts`: add v1→v2 branch.
- `src/state/gameStore.ts`:
  - Actions: `purchaseClickUpgrade(id)`, `purchaseCensor(id, count)`.
  - Recompute helpers (private): `recomputeClickValue()`, `recomputeCps()` — called after each purchase.
  - On rehydrate: call both recompute helpers (data list might have changed between deploys).

### T3 — Max-buy formula
- `src/lib/maxBuy.ts` (new pure module + test): `maxBuyCensor(blocks, baseCost, currentCount): { count, totalCost }`.
- Edge cases: blocks=0 → {0,0}, count overflow protection (cap at 1e9 per single buy).

### T4 — Throttled autosave
- `src/state/persistStorage.ts`: replace `wrappedLocalStorage` with `throttledLocalStorage` (10s debounce on setItem). Expose `flushPendingSave()` for unload.
- `src/ui/AppShell.tsx`: visibilitychange/beforeunload listener now calls `flushPendingSave()` instead of touching the store.

### T5 — UI cards
- `src/ui/UpgradeCard.tsx`: name, description, cost, multiplier; disabled when unaffordable; locked/dimmed pre-unlock per D-36.
- `src/ui/CensorCard.tsx`: name, description, count, current CPS, next cost; ×1/×10/Max buttons.
- `src/ui/BuyButtons.tsx`: reusable trio of buy buttons with `onBuy(count)`.

### T6 — Panel layout
- `src/ui/UpgradePanel.tsx`: scrollable column rendering UpgradeCard for each unlocked upgrade.
- `src/ui/CensorPanel.tsx`: scrollable column rendering all 8 CensorCard.
- `src/ui/AppShell.tsx`: 3-col grid desktop, stacked mobile; ClickButton + BlocksCounter in middle.

### T7 — Tests
- `src/lib/maxBuy.test.ts`: 0 blocks, exactly 1 affordable, 10 affordable, overflow cap, ratio 1.15 sanity.
- `src/engine/migrations.test.ts`: v1 save → v2 result has empty arrays/records.

### T8 — Verify + manual smoke
- `pnpm verify` зелёный.
- Click 100 раз → купить «Резиновая печать» → click даёт +2.
- Купить 10 «Стажёр-цензор» → BPS отображает 5; счётчик растёт.
- Reload mid-play → counts/upgrades intact.
- visibilitychange → save flushes (devtools localStorage обновлён).
- Wait 10s после клика без visibility смены → save сам триггерится.

## Critical files

**New:**
- `src/data/clickUpgrades.ts`, `src/data/censors.ts`
- `src/lib/maxBuy.ts` + `.test.ts`
- `src/ui/UpgradeCard.tsx`, `src/ui/CensorCard.tsx`, `src/ui/BuyButtons.tsx`
- `src/ui/UpgradePanel.tsx`, `src/ui/CensorPanel.tsx`

**Modified:**
- `src/types/save.ts` (v2 fields + version bump)
- `src/engine/migrations.ts` (v1→v2)
- `src/engine/migrations.test.ts` (new case)
- `src/state/gameStore.ts` (actions, recompute, partialize new fields)
- `src/state/persistStorage.ts` (throttle + flush export)
- `src/ui/AppShell.tsx` (layout, flush wiring)
- `src/ui/BlocksCounter.tsx` (optional: show «+N за клик» under counter)

## Commits (planned)

1. `feat(data): 10 click upgrades + 8 auto-censors with bureaucratic flavor`
2. `feat(types,engine): save v2 + migrate v1→v2 for upgrades/censor counts`
3. `feat(lib): maxBuyCensor closed-form geometric series + tests`
4. `feat(state): purchase actions + derived click/cps recompute`
5. `feat(state): 10s throttled localStorage save + manual flush export`
6. `feat(ui): UpgradeCard + CensorCard + BuyButtons`
7. `feat(ui): UpgradePanel + CensorPanel + 3-col AppShell layout`
8. `feat(ui): show effective click value under BlocksCounter`
9. `docs(roadmap): mark Phase 3 done`

## Out of Scope (deferred)

- Per-generator upgrades (GUPG-01/02) — v2 release
- Offline progress — Phase 4
- Random events / achievements — Phase 5
- Prestige — Phase 6
- ASCII box-drawing borders — Phase 7
