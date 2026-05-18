# Phase 6: Prestige («Звёзды Цензора»)

**Goal:** Endgame-loop закрыт. После 1e9 lifetime blocks игрок может prestige'нуться, теряя run-progress ради permanent +2%/star income multiplier.

**Requirements:** PRES-01..PRES-07.

## Decisions

### D-61 — Stars formula = `floor(sqrt(totalBlocksEver / 1e9))`, прибавка = delta vs current stars
PRES-02 даёт `stars_gained = floor(sqrt(total_blocks / 1e9))`, но это неоднозначно (total_blocks = lifetime? сессионный? с момента последнего prestige?). Канон: lifetime-based абсолютная цель, прибавка = `target - prestigeStars`.

```ts
function projectedStars(totalBlocksEver: Decimal): number {
  return Math.floor(Math.sqrt(totalBlocksEver.div(1e9).toNumber()))
}
function pendingStarGain(state) {
  return Math.max(0, projectedStars(state.totalBlocksEver) - state.prestigeStars)
}
```

- Player может prestige'нуться когда `pendingStarGain >= 1` (≡ PRES-01: первая возможность — totalBlocksEver >= 1e9 → projectedStars=1 ≥ 1 > stars=0).
- После prestige: `prestigeStars = projectedStars(state.totalBlocksEver)`, `prestigeMult = 1 + 0.02 * prestigeStars`.

### D-62 — Reset wipes blocks/upgrades/censors/clickValue/cps; preserves lifetime/stars/achievements/streak
Per PRES-04/05:
- **Wipe:** `blocks = 0`, `clickValue = 1`, `cps = 0`, `purchasedClickUpgrades = []`, `censorCounts = {}`, `activeEvent = null`, `activeMultipliers = []`, `clickBoosts = []`, `nextEventSpawnAt = 0` (force respawn).
- **Preserve:** `totalBlocksEver`, `prestigeStars` (updated), `unlockedAchievements`, `telegramLeakStreak`, `tickCount`, settings store (separate persist key).
- `lastTick` updated to `Date.now()` (reset offline accumulator).

### D-63 — `prestigeMult` рекомпьютируется при любом изменении `prestigeStars`
Не только `performPrestige`, но и Black Swan event branch-1 (+1 star). Helper `computePrestigeMult(stars) = 1 + 0.02 * stars`. Вызывается:
- В `performPrestige` action
- В `clickEvent` после `prestigeStarsDelta`
- В `onRehydrateStorage` (для save'ов где prestigeStars > 0 но prestigeMult застрял на 1.0)

### D-64 — Two-step confirm modal (PRES-06)
Modal с двумя экранами:
1. **Preview** — «Указом N подведомственному кадру разъясняется: при принятии награды (X звёзд) текущие блокировки и аппарат подлежат списанию. Лицевой счёт обнуляется. Прошу принять решение.» + кнопки «Отказаться» / «Далее».
2. **Confirm** — «Указом Президента вы повышены в звании. Прежние заслуги списаны в архив. Звёзды Цензора: N → M.» + кнопка «Подтвердить» / «Назад».

ESC закрывает; backdrop click — закрыт только на шаге 1 (шаг 2 требует явного выбора, чтобы случайно не сбросить).

### D-65 — Эполет UI = inline ASCII звёзды в header (PRES-07)
Маленький компонент `EpauletIndicator` в header рядом с achievements/sound. Renders `★ × N` или unicode star count. Скрывается при `prestigeStars === 0`. Click открывает что-нибудь? Нет — просто индикатор.

### D-66 — Достижение «Орден на грудь» (#10) теперь срабатывает
В Phase 5 ачивки 10/11 были stub'нуты с `prestigeStars >= 1` / `>= 5`. После Phase 6 они активны — predicate уже написан, ничего менять не нужно. Они зафайрят при следующем tick после `performPrestige`.

### D-67 — Prestige button gated в UI, но action defensive
Кнопка показывается только если `pendingStarGain >= 1`. Action `performPrestige` тоже проверяет — guard на случай race condition или dev-вызова из console.

### D-68 — Save changes — НЕ нужна миграция
Все state-поля для prestige уже в v3 (prestigeStars existed since Phase 5 stub). Phase 6 только добавляет логику reset'а — формат save не меняется. `CURRENT_SAVE_VERSION` остаётся 3.

## Tasks

1. `src/engine/prestige.ts` (new) + `.test.ts` — pure `projectedStars`, `pendingStarGain`, `computePrestigeMult` + tests.
2. `src/state/gameStore.ts`:
   - Action `performPrestige()` — guard + wipe + bump stars + recompute mult.
   - `clickEvent` дополнительно recompute prestigeMult после `prestigeStarsDelta`.
   - `onRehydrateStorage` рекомпьют prestigeMult из prestigeStars.
3. `src/ui/PrestigeButton.tsx` — header chip, видим при `pendingStarGain >= 1`, opens modal.
4. `src/ui/PrestigeModal.tsx` — two-step confirm + press-release flavor.
5. `src/ui/EpauletIndicator.tsx` — ★ × N в header.
6. `src/ui/AppShell.tsx` — wire оба.
7. Verify + smoke.

## Files

**New:** `src/engine/prestige.ts` + test, `src/ui/PrestigeButton.tsx`, `src/ui/PrestigeModal.tsx`, `src/ui/EpauletIndicator.tsx`

**Modified:** `src/state/gameStore.ts`, `src/ui/AppShell.tsx`, `src/engine/index.ts` (barrel)

## Commits

1. `feat(engine): prestige math (projectedStars, pendingStarGain, computePrestigeMult) + tests`
2. `feat(state): performPrestige action + recompute mult on event/rehydrate`
3. `feat(ui): PrestigeButton + PrestigeModal two-step confirm`
4. `feat(ui): EpauletIndicator ★ × N in header`
5. `docs(roadmap): mark Phase 6 done`

## Out of Scope
- Multi-tier prestige (NG+, second currency from stars) — v2
- Prestige-shop / star spending — v2
- Sound на prestige confirm — Phase 7 (Howler)
