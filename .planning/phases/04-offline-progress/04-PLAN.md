# Phase 4: Offline Progress + «Пока вас не было…»

**Goal:** Возвращение в parked tab — приятно. Игрок получает накопленный CPS-доход (cap 1ч), модалка показывает что произошло.

**Requirements:** SAVE-05.

## Decisions

### D-40 — Pure engine helper для расчёта оффлайн-дохода
`src/engine/offline.ts` — pure function `computeOfflineGains(lastTick, now, cps, prestigeMult)`. Принимает примитивы + Decimal, возвращает `{ durationMs (capped), earned (Decimal) }`. Без зависимостей от React/Next/state. Тестируется в engine zone.

### D-41 — Cap = 1 час, threshold = 60 секунд
- `OFFLINE_CAP_MS = 3_600_000` (REQUIREMENTS SAVE-05).
- `OFFLINE_THRESHOLD_MS = 60_000` — модалка показывается **только** если оффлайн ≥ 1 минуты. Иначе игнор (refresh страницы не должен спавнить модалку).
- Below threshold: всё равно credit'им earned (даже за 30s), но без модалки. Это honest — игрок получает доход. Просто не дёргаем UX.

### D-42 — Apply в `onRehydrateStorage` (engine path), не rAF
SAVE-05 явно: «computed in onRehydrateStorage, not via foreground rAF ticks». Микрозадача в gameStore.onRehydrateStorage: после успешной рехидрации читает state.lastTick + state.cps + state.prestigeMult, зовёт `computeOfflineGains`, патчит state с прибавкой и записывает `offlineEarnings` transient-поле.

### D-43 — `offlineEarnings` — transient в GameStore, не persisted
```ts
offlineEarnings: { durationMs: number; earned: Decimal } | null
```
В `partialize` НЕ кладём — на следующий reload не должно остаться. Action `dismissOfflineEarnings()` зануляет (модалка дёргает).

### D-44 — Модалка — bureaucratic press-release styled
Шапка: «УВЕДОМЛЕНИЕ». Тело: «За время вашего отсутствия (X) подведомственный аппарат произвёл Y блокировок в установленном порядке. Прошу принять к сведению.». Кнопка: «Ознакомлен». Тон — TONE.md.

### D-45 — Format duration helper
`lib/time.ts` → `formatDuration(ms)`: «12 секунд», «5 минут», «47 минут», «1 час». Округление к целым; больше часа всё равно покажет «1 час» (cap кэпит). Кириллица + правильные русские падежи (5 минут vs 1 минута).

## Tasks

1. `src/engine/offline.ts` + `.test.ts` — pure helper, 4 cases (no-time-passed, sub-threshold, normal, cap).
2. `src/lib/time.ts` + `.test.ts` — `formatDuration` с падежами (1/2-4/5+).
3. `src/types/save.ts` — добавить `offlineEarnings` поле + initialState = null.
4. `src/state/gameStore.ts` — onRehydrateStorage применяет gains; action `dismissOfflineEarnings`.
5. `src/ui/OfflineProgressModal.tsx` — модалка, ESC/click-outside/«Ознакомлен» → dismiss.
6. `src/ui/AppShell.tsx` — render модалки если `offlineEarnings != null`.
7. Verify + smoke (manual reload after 60s simulating offline).

## Critical files

**New:** `src/engine/offline.ts` + test, `src/lib/time.ts` + test, `src/ui/OfflineProgressModal.tsx`

**Modified:** `src/types/save.ts`, `src/state/gameStore.ts`, `src/ui/AppShell.tsx`

## Commits

1. `feat(engine): computeOfflineGains with 1h cap + tests`
2. `feat(lib): formatDuration с русскими падежами + tests`
3. `feat(state): offlineEarnings transient + apply on rehydrate + dismiss`
4. `feat(ui): «Пока вас не было…» modal`
5. `docs(roadmap): mark Phase 4 done`

## Out of Scope

- Multi-currency offline (Phase 5+)
- Variable cap для prestige bonus (Phase 6)
- Sound on modal open — Phase 5/6
