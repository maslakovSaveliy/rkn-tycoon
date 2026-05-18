# Phase 2: Core Click Loop

**Goal:** Клик-verb «вкусный». Один клик → +N popup, SFX, рост счётчика с кириллическими К/М/Б/Т, tab title живой. После этого dopamine-loop работает даже без контента.

**Requirements:** CORE-01, CORE-03, CORE-05, CLICK-01, CLICK-02, AUDIO-01, AUDIO-02, AUDIO-03.

## Decisions

### D-21 — SFX через Web Audio API напрямую (Phase 2 only)
**Решение пользователя:** procedural click через Web Audio. Не ставим Howler в Phase 2 — синтезируем короткий envelope+sine на лету в `src/lib/audio.ts`. Mobile-unlock через `AudioContext.resume()` на первом user-gesture.

**Howler не вычеркнут навсегда:** когда понадобятся sample-based SFX (prestige fanfare, achievement chime, ad-reward sting), вернёмся к Howler в Phase 5/6. Phase 2 — minimal viable click sound.

### D-22 — Pooled +N popup, без motion/react
Без `motion`-библиотеки в Phase 2. Pool из ~16 заранее созданных `<div>` элементов с CSS-keyframes-анимацией (`transform: translateY(-40px); opacity: 0` за ~700мс). Активируются ring-buffer'ом по клику. Никаких React-перерендеров на каждый клик.

### D-23 — Sound toggle в новом `state/settingsStore.ts`
Не пихаем `soundEnabled` в `gameStore` — settings и game state имеют разные жизненные циклы (settings переживают prestige reset). Отдельный store с persist под ключом `rkn-tycoon-settings@v1`.

### D-24 — Tab title через React effect, не engine
Mutation `document.title` — UI-only. Effect в `ui/useTabTitle.ts`, подписан на `blocks` через Zustand-селектор. Engine остаётся pure.

### D-25 — Formatter из чистого `lib/numbers.ts`
Не в engine — formatter использует `Decimal.toString()` парсинг, не arithmetic. Engine не должен зависеть от форматирования. UI и DebugHud импортят `formatNumber` из `lib/`.

## Tasks

### Task 1 — `src/lib/numbers.ts` + tests
- `formatNumber(d: Decimal): string` — кириллические суффиксы К (1e3) / М (1e6) / Б (1e9) / Т (1e12), научная нотация от 1e15 (`1.23e15`).
- Round до 2 significant decimals: `1.23К`, `45.6М`, `7.89Б`.
- Малые числа (<1000): без суффикса, до 2 decimals — `42`, `999`, `123.45`.
- Negative numbers: prefix `-`.
- Edge: `0` → `"0"`, `NaN`/inf → `"∞"`.
- Vitest cases: 0, малое, граница К, граница М/Б/Т, граница e15, негативное.

### Task 2 — `src/state/settingsStore.ts`
- Zustand store, persist под `rkn-tycoon-settings@v1`.
- `soundEnabled: boolean` (default `true`), `setSoundEnabled(v)`.
- Без attachToWindow для prod.

### Task 3 — `src/lib/audio.ts` (procedural Web Audio)
- Lazy `AudioContext` (создаётся при первом `playClick()`).
- `playClick()`: envelope ~30мс, mix sine 1100Hz (метал-печать) + short noise burst. Громкость ~-12dB.
- Проверяет `settingsStore.getState().soundEnabled` — false skip.
- SSR-safe (`typeof window === 'undefined'` → noop).
- Mobile unlock: `audioCtx.resume()` если `suspended`.
- AUDIO-02: один AudioContext, OscillatorNode и BufferSource создаются per-call (cheap, GC-friendly).

### Task 4 — `src/ui/useTabTitle.ts`
- Hook subscribes к `blocks` через store.
- Effect: `document.title = \`${formatNumber(blocks)} блокировок — RKN Tycoon\``.
- Cleanup восстанавливает `RKN Tycoon`.

### Task 5 — `src/ui/PlusPopup.tsx`
- Pool из 16 фиксированных DOM-узлов с `position: absolute`, изначально `opacity: 0`.
- Exposes `spawnPopup(text: string, x?: number, y?: number)` через imperative ref handle ИЛИ обычный Zustand-like single-store за пределами React (mini event queue).
- CSS animation: `--popup-rise` keyframes (translateY -40px + fade) длительностью 700мс, replay через перезапись className.

### Task 6 — `src/ui/ClickButton.tsx`
- Большая кнопка ЗАБЛОКИРОВАТЬ. Tailwind ASCII-style (border, mono, uppercase, ≥56×56).
- `onPointerDown` (не click — latency меньше):
  1. `gameStore.click()` (engine applyClick).
  2. `audio.playClick()`.
  3. `popupController.spawn('+1', e.clientX, e.clientY)` или relative coords.
- Visual scale 1.0→0.95→1.0 ≤50мс через `:active` или transient state.
- `useCallback` чтобы не recreating handler на каждый rerender.

### Task 7 — Sound toggle UI
- Маленькая кнопка в углу `<header>` AppShell: «Звук: вкл/выкл».
- Читает/пишет `settingsStore`.

### Task 8 — Wire AppShell
- Импорт ClickButton, PlusPopup, useTabTitle, sound toggle.
- Layout: header (toggle), counter (top), ClickButton (center), DebugHud (bottom).
- Counter использует `formatNumber(blocks)`.
- Phase 1 placeholder убирается.

### Task 9 — Counter компонент `src/ui/BlocksCounter.tsx`
- `<header>` блок с большим числом, обновляется live.
- `formatNumber(blocks)` через селектор.
- Подпись «блокировок».

### Task 10 — DebugHud за флагом
- D-09 из 01-CONTEXT: HUD теперь за `?debug=1` или `process.env.NODE_ENV === 'development'`.
- В prod build не виден.

### Task 11 — Tests + verify
- `src/lib/numbers.test.ts` — formatter edge cases.
- `pnpm verify` зелёный.
- Manual: open `/play`, click button → counter растёт, +1 popup появляется, звук слышен, title меняется, toggle мутит.

## Critical Files

- `src/lib/numbers.ts` (new) + `.test.ts`
- `src/lib/audio.ts` (new)
- `src/state/settingsStore.ts` (new)
- `src/ui/useTabTitle.ts` (new)
- `src/ui/PlusPopup.tsx` (new)
- `src/ui/ClickButton.tsx` (new)
- `src/ui/BlocksCounter.tsx` (new)
- `src/ui/SoundToggle.tsx` (new)
- `src/ui/AppShell.tsx` (modify — wire all)
- `src/ui/DebugHud.tsx` (modify — gate behind flag)

## Verification

- [x] `pnpm verify` зелёный (typecheck+lint+test — 25/25)
- [x] `/play`: большая кнопка ЗАБЛОКИРОВАТЬ виднеется, min-w 280px / min-h 80px
- [x] Клик растит счётчик (К/М/Б/Т formatter работает); counter обновляется live
- [x] `+1` popup всплывает у курсора, исчезает за ~700мс
- [x] Click SFX слышен; toggle мутит/включает; настройка переживает reload
- [x] Tab title `1.23К блокировок — RKN Tycoon`
- [x] `pnpm dev`: console.log `useGameStore.getState().devSetBlocks('5e12')` → counter показывает `5.00Т`
- [x] `devSetBlocks('5e15')` → `5.00e15` (научная)
- [x] DebugHud за флагом — visibility hook (`?debug=1` в prod, всегда в dev)
- [ ] Mobile: первый touch unlock'ает аудио (требует ручной проверки на iOS/Android устройстве — desktop OK)

## Commits (planned)

1. `feat(lib): formatNumber with К/М/Б/Т + scientific fallback`
2. `test(lib): formatNumber edge cases`
3. `feat(state): settingsStore with soundEnabled persist`
4. `feat(lib): procedural Web Audio click`
5. `feat(ui): useTabTitle hook mutates document.title`
6. `feat(ui): PlusPopup pooled DOM with CSS keyframes`
7. `feat(ui): ClickButton with pointerdown handler`
8. `feat(ui): BlocksCounter + SoundToggle components`
9. `feat(ui): wire AppShell with click loop + gate DebugHud`

## Out of Scope

- Howler — Phase 5/6 (sample-based SFX).
- Upgrades / censors / autosave timer — Phase 3.
- ASCII box-drawing borders, self-hosted fonts — Phase 7.
- Achievements toast popup — Phase 5.
