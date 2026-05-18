# Architecture Research

**Domain:** 2D idle-clicker web game (React 18 + TypeScript 5 + Zustand + break_infinity.js)
**Researched:** 2026-05-15
**Confidence:** HIGH (Zustand patterns verified via official docs; idle-loop pattern verified via web sources; engine/view split is standard JS-game architecture)

---

## TL;DR

- **Single Zustand store, sliced via composition.** Multiple files, one `useGameStore`. Selectors give per-component re-render isolation. `useSyncExternalStore` is what Zustand already uses under the hood; you do not need to call it directly.
- **Game loop = single `requestAnimationFrame` driver that calls `store.getState().tick(deltaMs)` on a fixed accumulator.** Logic runs at 10 Hz (100 ms); render runs at whatever rAF gives you. Store mutations are batched per tick — the click button only re-renders when its selected slice changes.
- **Engine is pure TypeScript in `src/engine/`** (no React import anywhere). View is `src/ui/`. Content (balance numbers) is typed TS data in `src/content/`. This boundary is the most important architectural decision; it lets you unit-test the loop in Vitest with no DOM.
- **Persistence: `persist` middleware with a hand-written `PersistStorage` that walks the state and converts `Decimal` ↔ `{ __t: "D", v: string }` markers.** `createJSONStorage` reviver/replacer also works but a custom storage is cleaner for nested Decimals in arrays.
- **Build order:** engine types → content data → store slices → tick loop → persist → UI shell → click button → upgrade list → auto-censors → events → achievements → prestige → SFX. Each layer testable before the next.

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        VIEW LAYER (React)                         │
│  ┌────────────┐  ┌──────────────┐  ┌──────────┐  ┌────────────┐  │
│  │ ClickButton│  │ UpgradeList  │  │ Censors  │  │ EventPopup │  │
│  └─────┬──────┘  └──────┬───────┘  └────┬─────┘  └─────┬──────┘  │
│        │  (selectors — per-slice subscribe via Zustand)          │
└────────┼─────────────────┼───────────────┼──────────────┼────────┘
         │                 │               │              │
         ▼                 ▼               ▼              ▼
┌──────────────────────────────────────────────────────────────────┐
│                    STATE LAYER (Zustand store)                    │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │   useGameStore = create(persist(immer((set,get)=>({...}))))│  │
│  │                                                          │    │
│  │   slices: currency | upgrades | censors | events |       │    │
│  │           achievements | prestige | meta(lastTickAt)     │    │
│  │                                                          │    │
│  │   actions: click() | buyUpgrade(id) | buyCensor(id) |    │    │
│  │            tick(dtMs) | prestige() | loadEvent(id)       │    │
│  └──────────────────────────────────────────────────────────┘    │
└────────┬──────────────────────────────────────────────┬──────────┘
         │ store.getState().tick(dt)                    │ subscribe
         │                                              │
┌────────▼──────────────────────────────────────────────┴──────────┐
│                  ENGINE LAYER (pure TS, no React)                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐  │
│  │ tickLoop │ │ economy  │ │ pricing  │ │ events   │ │ achv   │  │
│  │ (rAF)    │ │ (income) │ │ (cost)   │ │ (spawner)│ │ (check)│  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └────────┘  │
├──────────────────────────────────────────────────────────────────┤
│                    CONTENT LAYER (typed data)                     │
│  upgrades.ts  censors.ts  achievements.ts  events.ts  balance.ts │
├──────────────────────────────────────────────────────────────────┤
│              INFRA LAYER (Decimal, Howler, storage)               │
│  decimal.ts (break_infinity)  sfx.ts (Howler)  storage.ts (LS)   │
└──────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Engine (`src/engine/`) | Pure game math: income/sec, cost growth, achievement predicates, RNG. No DOM, no React. | Plain TS functions taking and returning data. |
| Content (`src/content/`) | All tunable balance numbers as typed data. Hot-tweakable without touching logic. | `as const satisfies UpgradeDef[]` arrays. |
| Store (`src/state/`) | Single Zustand store, composed from slice creators. Holds runtime state + actions. | `create()(persist(immer(slices)))`. |
| Tick loop (`src/engine/tickLoop.ts`) | One rAF driver. Computes `dt`, calls `store.getState().tick(dt)`. Started once in `App.tsx` via `useEffect`. | Plain function returning a `stop()` cleanup. |
| UI (`src/ui/`) | React components. Read state via selectors. Dispatch actions. Animate with Framer Motion. | Function components + `useGameStore(selector)`. |
| Infra (`src/lib/`) | Wrappers around third-party libs (Decimal, Howler), formatter, storage helpers. | Thin adapters; everything else imports from here. |

---

## Recommended Project Structure

```
rkn-tycoon/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── package.json
├── public/
│   └── sfx/                       # click.ogg, purchase.ogg, prestige.ogg
└── src/
    ├── main.tsx                   # ReactDOM.createRoot, mount <App/>
    ├── App.tsx                    # Layout shell; starts tick loop; mounts panels
    │
    ├── engine/                    # PURE TS — no React imports allowed
    │   ├── types.ts               # GameState, UpgradeDef, CensorDef, etc.
    │   ├── tickLoop.ts            # rAF loop, fixed-step accumulator
    │   ├── economy.ts             # totalIncomePerSec(state), applyIncome(state, dt)
    │   ├── pricing.ts             # nextCost(def, ownedCount)
    │   ├── purchase.ts            # canAfford, buyUpgrade, buyCensor (pure reducers)
    │   ├── events.ts              # rollEventSpawn, applyEvent, expireEvent
    │   ├── achievements.ts        # checkAchievements(state) → newly-unlocked[]
    │   ├── prestige.ts            # prestigeGain(state), applyPrestige(state)
    │   ├── rng.ts                 # seedable RNG (mulberry32) — testable
    │   └── __tests__/             # Vitest: pure-function tests, no jsdom needed
    │       ├── economy.test.ts
    │       └── pricing.test.ts
    │
    ├── content/                   # DATA — typed const arrays, hot-tunable
    │   ├── upgrades.ts            # UPGRADES: readonly UpgradeDef[]
    │   ├── censors.ts             # CENSORS: readonly CensorDef[]
    │   ├── achievements.ts        # ACHIEVEMENTS: readonly AchievementDef[]
    │   ├── events.ts              # EVENTS: readonly EventDef[]
    │   ├── balance.ts             # COST_GROWTH, PRESTIGE_REQ, TICK_HZ, etc.
    │   └── strings.ru.ts          # All RU strings (single source of truth)
    │
    ├── state/                     # ZUSTAND — composes engine + content
    │   ├── store.ts               # useGameStore = create(persist(immer(...)))
    │   ├── slices/
    │   │   ├── currencySlice.ts   # blocks: Decimal, totalClicks: number
    │   │   ├── upgradesSlice.ts   # ownedUpgrades: Record<string, number>
    │   │   ├── censorsSlice.ts    # ownedCensors:  Record<string, number>
    │   │   ├── achievementsSlice.ts
    │   │   ├── eventsSlice.ts     # activeEvent | null, expiresAt
    │   │   ├── prestigeSlice.ts   # tokens: Decimal, runs: number
    │   │   └── metaSlice.ts       # lastTickAt, version, sfxEnabled
    │   ├── selectors.ts           # Memoized reusable selectors
    │   └── persist.ts             # PersistStorage with Decimal codec
    │
    ├── lib/                       # INFRA — third-party adapters
    │   ├── decimal.ts             # re-export break_infinity Decimal; helpers (D, ZERO)
    │   ├── format.ts              # format(Decimal) → "1.23M" / "4.56aa"
    │   ├── sfx.ts                 # Howler wrapper: sfx.play("click")
    │   └── id.ts                  # nanoid or crypto.randomUUID wrapper
    │
    ├── ui/                        # REACT — view layer
    │   ├── App.tsx → moved up (or keep here)
    │   ├── shell/
    │   │   ├── TerminalFrame.tsx  # ASCII bordered chrome
    │   │   ├── Header.tsx         # title + totals
    │   │   └── Footer.tsx         # version + reset
    │   ├── click/
    │   │   ├── ClickButton.tsx    # the big button
    │   │   └── FloatingPlusOne.tsx # +1 popup animation
    │   ├── shop/
    │   │   ├── UpgradeList.tsx
    │   │   ├── UpgradeRow.tsx
    │   │   ├── CensorList.tsx
    │   │   └── CensorRow.tsx
    │   ├── events/
    │   │   └── EventPopup.tsx     # clickable golden-cookie equivalent
    │   ├── achievements/
    │   │   └── AchievementToast.tsx
    │   ├── prestige/
    │   │   └── PrestigePanel.tsx
    │   └── hooks/
    │       ├── useTickLoop.ts     # starts/stops tickLoop in App
    │       └── useFormattedBlocks.ts
    │
    └── styles/
        ├── tailwind.css
        └── ascii.css              # CRT scanlines, glow, monospace
```

### Structure Rationale

- **`engine/` vs `ui/`:** Hard import boundary. Engine never imports React; UI never duplicates math. Enables Vitest unit tests on game math (`pricing.test.ts`) with no jsdom or fake timers. Lint rule (`eslint-plugin-import` `no-restricted-paths`) enforces it.
- **`content/` separate from `engine/`:** Balance designers (you, with a coffee) tweak numbers without touching logic. JSON considered and rejected — TS `const satisfies UpgradeDef[]` gives compile-time validation AND tree-shaking; JSON gives neither and forces a parse step.
- **`state/slices/` composition (one store, many files):** Single store = single subscription, single persist key, atomic actions across slices (a click both adds blocks AND checks achievements). Multiple stores fragment subscriptions and complicate persistence.
- **`lib/decimal.ts` as the only place that imports `break_infinity.js`:** If you ever swap to `decimal.js` or `break_eternity.js` (incremental games sometimes outgrow break_infinity around 1e1e308), it's one file.
- **`public/sfx/`:** Vite serves these as static URLs; Howler loads by URL. Don't import audio through the bundler — needless re-bundling.

---

## Architectural Patterns

### Pattern 1: Single Zustand Store, Composed Slices

**What:** One `useGameStore` built from slice creators that each own a typed sub-state and its actions. Combined via spread.

**When to use:** Always, for this game. An idle-clicker has ~7 slices and tight cross-slice atomicity (a single tick mutates currency, censors income, events, achievements).

**Trade-offs:** Single store means a single persist blob (good for save versioning, bad if one slice corrupts the whole save — mitigate with versioned migrations). Slice files keep code organized without sacrificing atomicity.

**Concrete types:**

```typescript
// src/engine/types.ts
import type Decimal from "break_infinity.js";

export type UpgradeId = string;
export type CensorId  = string;
export type EventId   = string;
export type AchievementId = string;

export interface UpgradeDef {
  readonly id: UpgradeId;
  readonly nameRu: string;
  readonly descRu: string;
  readonly baseCost: string;          // Decimal source (string for content)
  readonly costGrowth: number;        // e.g. 1.15
  readonly clickMultAdd: number;      // additive bonus to per-click yield
}

export interface CensorDef {
  readonly id: CensorId;
  readonly nameRu: string;
  readonly descRu: string;
  readonly baseCost: string;
  readonly costGrowth: number;
  readonly baseCps: string;           // blocks per second per unit owned
}

export interface AchievementDef {
  readonly id: AchievementId;
  readonly nameRu: string;
  readonly descRu: string;
  // Predicate is pure; receives a snapshot of game state.
  readonly check: (s: GameSnapshot) => boolean;
}

export interface EventDef {
  readonly id: EventId;
  readonly nameRu: string;
  readonly durationMs: number;
  readonly effect:
    | { kind: "instantBlocks"; mult: number }     // grant mult * cps * 15s
    | { kind: "tempClickMult"; mult: number }     // x mult to clicks for duration
    | { kind: "tempCpsMult";   mult: number };    // x mult to cps for duration
}

// ---- runtime state shape (what lives in the store) ----
export interface CurrencySlice {
  blocks: Decimal;
  totalBlocksEver: Decimal;           // for achievements & prestige
  totalClicks: number;
}

export interface UpgradesSlice {
  ownedUpgrades: Record<UpgradeId, number>;
}

export interface CensorsSlice {
  ownedCensors: Record<CensorId, number>;
}

export interface AchievementsSlice {
  unlockedAchievements: Record<AchievementId, number>; // id -> unlockedAt (epoch ms)
}

export interface EventsSlice {
  activeEvent: { id: EventId; expiresAt: number } | null;
  nextEventRollAt: number;            // epoch ms
}

export interface PrestigeSlice {
  prestigeTokens: Decimal;            // "ордена ФСБ"
  prestigeRuns: number;
}

export interface MetaSlice {
  lastTickAt: number;                 // epoch ms — for offline catch-up if ever enabled
  version: number;                    // save schema version
  sfxEnabled: boolean;
}

export type GameSnapshot =
  CurrencySlice & UpgradesSlice & CensorsSlice &
  AchievementsSlice & EventsSlice & PrestigeSlice & MetaSlice;

export interface GameActions {
  click(): void;
  buyUpgrade(id: UpgradeId): void;
  buyCensor(id: CensorId): void;
  tick(dtMs: number): void;
  claimEvent(): void;
  prestige(): void;
  toggleSfx(): void;
  hardReset(): void;
}

export type GameStore = GameSnapshot & GameActions;
```

```typescript
// src/state/slices/currencySlice.ts
import type { StateCreator } from "zustand";
import { D, ZERO } from "@/lib/decimal";
import type { GameStore, CurrencySlice } from "@/engine/types";
import { perClickYield } from "@/engine/economy";

export const createCurrencySlice: StateCreator<
  GameStore, [["zustand/immer", never]], [], CurrencySlice
> = (set) => ({
  blocks: ZERO,
  totalBlocksEver: ZERO,
  totalClicks: 0,
});

// click() lives in a separate "actions" creator that imports the whole store
// so it can mutate currency AND check achievements atomically.
```

```typescript
// src/state/store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { GameStore } from "@/engine/types";
import { createCurrencySlice }     from "./slices/currencySlice";
import { createUpgradesSlice }     from "./slices/upgradesSlice";
import { createCensorsSlice }      from "./slices/censorsSlice";
import { createAchievementsSlice } from "./slices/achievementsSlice";
import { createEventsSlice }       from "./slices/eventsSlice";
import { createPrestigeSlice }     from "./slices/prestigeSlice";
import { createMetaSlice }         from "./slices/metaSlice";
import { createActions }           from "./slices/actions";
import { decimalStorage }          from "./persist";

export const useGameStore = create<GameStore>()(
  persist(
    immer((...a) => ({
      ...createCurrencySlice(...a),
      ...createUpgradesSlice(...a),
      ...createCensorsSlice(...a),
      ...createAchievementsSlice(...a),
      ...createEventsSlice(...a),
      ...createPrestigeSlice(...a),
      ...createMetaSlice(...a),
      ...createActions(...a),         // tick, click, buy*, prestige, ...
    })),
    {
      name: "rkn-tycoon@v1",
      storage: decimalStorage,        // see Pattern 4
      version: 1,
      migrate: (persisted, version) => persisted, // grow over time
      partialize: (s) => {
        // Strip functions; persist only data slices.
        const { click, buyUpgrade, buyCensor, tick,
                claimEvent, prestige, toggleSfx, hardReset, ...data } = s;
        return data;
      },
    },
  ),
);
```

### Pattern 2: Fixed-Step rAF Game Loop, React-Decoupled

**What:** A single `requestAnimationFrame` driver computes real-world `dt`, accumulates it, and dispatches discrete `tick(STEP_MS)` calls into the store. UI re-renders only when its selected slice changes — independent of tick rate.

**When to use:** Any browser game where game logic and render rate should be decoupled. Standard pattern (Gaffer-on-Games, MDN Anatomy of a video game).

**Why rAF over `setInterval(..., 100)`:** rAF is paused by the browser when the tab is hidden (battery + correctness — no runaway income in background), supplies a high-resolution timestamp, and aligns naturally with paint. The fixed-step accumulator handles tab-throttling: if rAF returns after a 5 s pause, you can either skip catch-up or process N steps depending on policy. `setInterval` is sloppy under throttling and causes drift.

**Trade-offs:** Slightly more code than `setInterval(tick, 100)`. Worth it. Hidden-tab pause is the killer feature — it eliminates a class of "I left it overnight and the save broke" bugs.

```typescript
// src/engine/tickLoop.ts
import { useGameStore } from "@/state/store";

const STEP_MS = 100;                  // 10 Hz simulation
const MAX_CATCHUP_STEPS = 50;         // cap at 5 s of catch-up per frame

export function startTickLoop(): () => void {
  let rafId = 0;
  let last = performance.now();
  let acc = 0;
  let running = true;

  const frame = (now: number) => {
    if (!running) return;
    const dt = Math.min(now - last, 1000); // clamp huge gaps (tab switch)
    last = now;
    acc += dt;

    let steps = 0;
    while (acc >= STEP_MS && steps < MAX_CATCHUP_STEPS) {
      useGameStore.getState().tick(STEP_MS);
      acc -= STEP_MS;
      steps += 1;
    }
    // If we hit MAX_CATCHUP_STEPS, drop the rest (anti-runaway).
    if (steps >= MAX_CATCHUP_STEPS) acc = 0;

    rafId = requestAnimationFrame(frame);
  };

  rafId = requestAnimationFrame(frame);
  return () => { running = false; cancelAnimationFrame(rafId); };
}
```

```typescript
// src/ui/hooks/useTickLoop.ts
import { useEffect } from "react";
import { startTickLoop } from "@/engine/tickLoop";

export function useTickLoop() {
  useEffect(() => startTickLoop(), []);
}
```

```typescript
// src/state/slices/actions.ts (the tick action body)
import type { StateCreator } from "zustand";
import type { GameStore } from "@/engine/types";
import { applyIncome }           from "@/engine/economy";
import { tickEvents }            from "@/engine/events";
import { checkAchievements }     from "@/engine/achievements";

export const createActions: StateCreator<
  GameStore, [["zustand/immer", never]], [], Pick<GameStore, "tick" | "click" | "buyUpgrade" | "buyCensor" | "claimEvent" | "prestige" | "toggleSfx" | "hardReset">
> = (set, get) => ({
  tick(dtMs) {
    set((s) => {
      applyIncome(s, dtMs);          // mutates s.blocks, s.totalBlocksEver
      tickEvents(s, Date.now());     // may expire activeEvent, may roll new
      const newly = checkAchievements(s); // returns ids; mutates s.unlockedAchievements
      s.lastTickAt = Date.now();
      // newly-unlocked → emit a toast via a tiny event bus (see Pattern 6)
      if (newly.length) queueToasts(newly);
    });
  },
  click() { /* … */ },
  buyUpgrade(id) { /* … */ },
  buyCensor(id) { /* … */ },
  claimEvent() { /* … */ },
  prestige() { /* … */ },
  toggleSfx() { set((s) => { s.sfxEnabled = !s.sfxEnabled; }); },
  hardReset() { /* … */ },
});
```

### Pattern 3: Per-Slice Selector Subscriptions (no whole-tree re-render)

**What:** Each component subscribes to the smallest possible slice via a selector. Zustand's `useGameStore` already wraps `useSyncExternalStore`, so re-renders are limited to components whose selected value changed (referential equality on primitives, `shallow` for objects).

**When to use:** Everywhere. Never call `useGameStore()` without a selector.

**Trade-offs:** Requires discipline. A naked `useGameStore()` re-renders the component every tick (10×/s). The `ClickButton` must select `blocks` only; the `UpgradeList` must select `ownedUpgrades` only. Use `shallow` for object/array selectors.

```typescript
// src/ui/click/ClickButton.tsx
import { useGameStore } from "@/state/store";
import { format } from "@/lib/format";

export function ClickButton() {
  // ✅ Subscribes only to `blocks`. Re-renders ~10×/s as currency grows.
  const blocks = useGameStore((s) => s.blocks);
  const click  = useGameStore((s) => s.click);

  return (
    <button onClick={click} className="…">
      {format(blocks)}
    </button>
  );
}
```

```typescript
// src/ui/shop/UpgradeRow.tsx
import { useGameStore } from "@/state/store";
import { useShallow } from "zustand/react/shallow";

export function UpgradeRow({ id }: { id: string }) {
  // ✅ shallow comparison — re-renders only when *this* upgrade's count changes.
  const { owned, canAfford } = useGameStore(useShallow((s) => ({
    owned: s.ownedUpgrades[id] ?? 0,
    canAfford: s.blocks.gte(nextCostFor(id, s)),  // derived inside selector
  })));
  // …
}
```

**Note on `useSyncExternalStore`:** Zustand v4+ uses it internally. You only need to call it directly if you bypass Zustand (e.g. subscribing to a non-Zustand source like a Howler event). Not needed here.

### Pattern 4: Decimal-Aware Persistence

**What:** A custom `PersistStorage` implementation that recursively encodes `Decimal` instances on save and decodes them on load. Avoids `createJSONStorage`'s reviver pitfalls with nested arrays/objects.

**When to use:** Any game using a bignum library whose instances don't survive `JSON.parse`. `Decimal`, `Date`, `Map`, `Set` all need this treatment. `Decimal` is the one that matters here.

**Trade-offs:** ~30 lines of marshalling code. Alternative is `superjson` (heavier dep, more deps in the bundle). Hand-rolled is cheaper for one type.

```typescript
// src/state/persist.ts
import type { PersistStorage, StorageValue } from "zustand/middleware";
import Decimal from "break_infinity.js";

const TAG = "__D";

// Walks any value, replacing Decimal instances with { __D: "1.23e456" }.
function encode(value: unknown): unknown {
  if (value instanceof Decimal) return { [TAG]: value.toString() };
  if (Array.isArray(value)) return value.map(encode);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value)) out[k] = encode((value as any)[k]);
    return out;
  }
  return value;
}

function decode(value: unknown): unknown {
  if (value && typeof value === "object") {
    if (TAG in (value as any) && typeof (value as any)[TAG] === "string") {
      return new Decimal((value as any)[TAG]);
    }
    if (Array.isArray(value)) return value.map(decode);
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value)) out[k] = decode((value as any)[k]);
    return out;
  }
  return value;
}

export const decimalStorage: PersistStorage<unknown> = {
  getItem: (name) => {
    const raw = localStorage.getItem(name);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as StorageValue<unknown>;
      return { ...parsed, state: decode(parsed.state) };
    } catch {
      return null; // corrupt save — start fresh
    }
  },
  setItem: (name, value) => {
    const payload = { ...value, state: encode(value.state) };
    localStorage.setItem(name, JSON.stringify(payload));
  },
  removeItem: (name) => localStorage.removeItem(name),
};
```

### Pattern 5: Content as Typed `const` Data

**What:** Balance data lives in `src/content/*.ts` as `as const satisfies ReadonlyArray<…Def>`. Engine functions consume it. UI reads `nameRu`/`descRu` for display.

**When to use:** Always for game data. Compile-time validation, autocomplete, no parsing, tree-shakeable, diffable in git.

**Trade-offs:** Recompile to retune. Acceptable — Vite HMR makes this ~200 ms. JSON only wins if non-developers (modders) edit data; not the case here.

```typescript
// src/content/upgrades.ts
import type { UpgradeDef } from "@/engine/types";

export const UPGRADES = [
  { id: "fat_finger",   nameRu: "Толстый палец",        descRu: "+1 к клику",
    baseCost: "15",   costGrowth: 1.15, clickMultAdd: 1 },
  { id: "rubber_stamp", nameRu: "Резиновая печать",     descRu: "+5 к клику",
    baseCost: "100",  costGrowth: 1.15, clickMultAdd: 5 },
  { id: "court_order",  nameRu: "Постановление суда",   descRu: "+50 к клику",
    baseCost: "1100", costGrowth: 1.15, clickMultAdd: 50 },
  // ...
] as const satisfies readonly UpgradeDef[];
```

### Pattern 6: Side-Effects via a Tiny Event Bus (SFX, toasts)

**What:** Pure store mutations enqueue intents (`"play:click"`, `"toast:achv:firstK"`). A React-side hook drains the queue and triggers Howler/toasts. Keeps the store pure (testable) and side effects in the view layer.

**When to use:** Any time an action needs to fire a sound, animation, or UI flourish. Avoid calling `Howler.play()` directly inside a Zustand `set()` — that couples engine to view and breaks SSR/test environments.

```typescript
// src/lib/bus.ts — 20 lines, zero deps
type Listener<T> = (e: T) => void;
export function createBus<T>() {
  const ls = new Set<Listener<T>>();
  return {
    emit: (e: T) => ls.forEach((l) => l(e)),
    on: (l: Listener<T>) => { ls.add(l); return () => ls.delete(l); },
  };
}

// src/lib/sfx.ts
import { Howl } from "howler";
import { createBus } from "./bus";
type SfxEvent = "click" | "purchase" | "prestige" | "event";
export const sfxBus = createBus<SfxEvent>();

const sounds: Record<SfxEvent, Howl> = {
  click:    new Howl({ src: ["/sfx/click.ogg"],    volume: 0.5 }),
  purchase: new Howl({ src: ["/sfx/purchase.ogg"], volume: 0.6 }),
  prestige: new Howl({ src: ["/sfx/prestige.ogg"], volume: 0.7 }),
  event:    new Howl({ src: ["/sfx/event.ogg"],    volume: 0.7 }),
};

// In App.tsx: useEffect(() => sfxBus.on((e) => {
//   if (useGameStore.getState().sfxEnabled) sounds[e].play();
// }), []);
```

### Pattern 7: Achievement Checks on Tick + on Purchase (not every change)

**What:** `checkAchievements(state)` runs at the end of `tick()` (10 Hz) AND at the end of `buyUpgrade`/`buyCensor`/`prestige`. Predicates are pure and cheap (numeric comparisons). Already-unlocked ids are skipped via the `unlockedAchievements` record.

**When to use:** Idle games with O(10–50) achievements and milestone predicates. Scales fine.

**Why not `store.subscribe()`:** Subscribing to every state change runs the check 10×/s anyway PLUS once per click. Inlining in `tick()` is simpler and gives one obvious "where do unlocks happen" location.

```typescript
// src/engine/achievements.ts
import { ACHIEVEMENTS } from "@/content/achievements";
import type { GameSnapshot, AchievementId } from "./types";

export function checkAchievements(s: GameSnapshot): AchievementId[] {
  const newly: AchievementId[] = [];
  const now = Date.now();
  for (const def of ACHIEVEMENTS) {
    if (s.unlockedAchievements[def.id] !== undefined) continue;
    if (def.check(s)) {
      s.unlockedAchievements[def.id] = now; // immer-safe mutation
      newly.push(def.id);
    }
  }
  return newly;
}
```

### Pattern 8: Scheduled Random Events (not polled per tick)

**What:** When an event ends, schedule `nextEventRollAt = now + jitter(60s, 180s)`. On each tick, if `nextEventRollAt <= now` AND `activeEvent == null`, roll for an event. Far cheaper than rolling RNG every tick.

**When to use:** Any "golden cookie"-style sporadic spawn. Mirrors Cookie Clicker's approach.

**Trade-offs:** Slightly more state (one timestamp). Worth it — RNG calls are not free at 10 Hz × hours of play.

```typescript
// src/engine/events.ts
import { EVENTS } from "@/content/events";
import type { GameSnapshot } from "./types";
import { rng } from "./rng";

const MIN_GAP_MS = 60_000;
const MAX_GAP_MS = 180_000;

export function tickEvents(s: GameSnapshot, now: number) {
  // expire
  if (s.activeEvent && s.activeEvent.expiresAt <= now) {
    s.activeEvent = null;
    s.nextEventRollAt = now + MIN_GAP_MS + rng() * (MAX_GAP_MS - MIN_GAP_MS);
  }
  // spawn
  if (!s.activeEvent && now >= s.nextEventRollAt) {
    const def = EVENTS[Math.floor(rng() * EVENTS.length)];
    s.activeEvent = { id: def.id, expiresAt: now + def.durationMs };
  }
}
```

---

## Data Flow

### Click Flow (most common path)

```
[User clicks button]
        │
        ▼
ClickButton.onClick()  ← React event handler
        │
        ▼
useGameStore.getState().click()
        │
        ▼
set((s) => {                              ← immer producer
   s.blocks = s.blocks.add(perClickYield(s));
   s.totalBlocksEver = s.totalBlocksEver.add(...);
   s.totalClicks += 1;
   const newly = checkAchievements(s);
   if (newly.length) toastBus.emit(newly);
   sfxBus.emit("click");
})
        │
        ▼
Zustand notifies subscribers
        │
        ├──→ ClickButton: blocks changed → re-render (cheap)
        ├──→ Header.totals: blocks changed → re-render (cheap)
        └──→ UpgradeList: ownedUpgrades unchanged → SKIP
        │
        ▼
useEffect listening to sfxBus → Howler.play("click")
```

### Tick Flow (every 100 ms)

```
rAF frame
        │
        ▼
accumulator >= 100 ms?
        │
        ▼  yes
store.tick(100)
        │
        ▼
set((s) => {
   applyIncome(s, 100);                   ← s.blocks += cps * 0.1
   tickEvents(s, Date.now());             ← maybe spawn/expire
   const newly = checkAchievements(s);
   s.lastTickAt = Date.now();
})
        │
        ▼
Subscribers re-render only where selected slice changed.
```

### Persistence Flow

```
[any action runs]
        │
        ▼
Zustand persist middleware (debounced ~100ms after last change)
        │
        ▼
partialize(state)  → strips functions
        │
        ▼
decimalStorage.setItem(name, { state, version })
        │
        ▼
encode(state)  → walks tree, replaces Decimal → { __D: "..." }
        │
        ▼
JSON.stringify → localStorage.setItem("rkn-tycoon@v1", "...")

──────── on app boot ────────

main.tsx → useGameStore is instantiated
        │
        ▼
persist middleware: localStorage.getItem("rkn-tycoon@v1")
        │
        ▼
JSON.parse → decode(state) → walks tree, replaces { __D: ".." } → new Decimal()
        │
        ▼
migrate(persisted, version) → returns state (currently identity)
        │
        ▼
Store hydrated. App.tsx renders. useTickLoop() starts rAF.
```

---

## Build Order (subsystem dependencies)

Recommended phase ordering — each step is independently testable.

1. **Infra**: `lib/decimal.ts`, `lib/format.ts`. Tests: format edge cases (0, 999, 1e6, 1e308, 1e400). No game logic yet.
2. **Engine types & content schema**: `engine/types.ts`, empty `content/*.ts` with type-checked sample. Compiles? Move on.
3. **Engine pure functions**: `engine/pricing.ts`, `engine/economy.ts`. Vitest unit tests with synthetic state, no React.
4. **Store skeleton + slices**: `state/store.ts` with all slices but no actions yet beyond reset. Verify `useGameStore.getState()` returns a typed shape in the browser console.
5. **Actions + tick**: `state/slices/actions.ts`. `tick(100)` callable manually — verify blocks grow when censors are seeded.
6. **rAF loop + App shell**: `engine/tickLoop.ts`, `ui/hooks/useTickLoop.ts`, minimal `App.tsx`. Game runs invisibly. Manually-seeded state grows over time. **Milestone: loop alive.**
7. **Persist + Decimal codec**: `state/persist.ts`. Reload page; state restores. Add `version: 1` and a no-op `migrate`. **Milestone: saves survive refresh.**
8. **ClickButton + currency display**: First visible UI. Click → number grows. **Milestone: minimum viable click.**
9. **Content: upgrades** + `UpgradeList`/`UpgradeRow`. Buy → click yields more. **Milestone: minimum viable purchase.**
10. **Content: censors** + `CensorList`. Buy → idle income works. **Milestone: full idle loop.**
11. **SFX**: `lib/sfx.ts` + `sfxBus`. Wire into click/purchase. Verify mute toggle persists.
12. **Achievements**: `engine/achievements.ts`, `content/achievements.ts`, `AchievementToast`. Wire toasts.
13. **Random events**: `engine/events.ts`, `EventPopup`. Verify spawn cadence and effects.
14. **Prestige**: `engine/prestige.ts`, `PrestigePanel`. Verify reset + multiplier persistence.
15. **Polish**: ASCII frame, Framer Motion animations, CRT scanlines, responsive layout.
16. **Deploy**: Vite build → `gh-pages` action → itch.io zip.

**Critical dependency edges:**

```
decimal/format ─┬─→ engine/* ──→ state/* ──→ ui/*
                │
                └─→ content/* ─→ engine/* (via parameters)

state/store ──→ tickLoop (calls getState().tick)
              └→ persist  (decimalStorage)

ui/* ──depends-on──→ state/store + lib/format + lib/sfx
```

No cycles. UI never imports engine directly (only through the store). Engine never imports UI.

---

## Engine ↔ View Boundary (the one you must not blur)

| Concern | Engine (`src/engine/`, `src/content/`, `src/lib/decimal.ts`) | View (`src/ui/`, `src/lib/sfx.ts`) |
|---|---|---|
| Imports React? | **No** | Yes |
| Imports DOM? | **No** | Yes |
| Imports `useGameStore`? | **No** (functions take `GameSnapshot` as arg) | Yes (via selectors) |
| Imports `break_infinity.js`? | Yes (math) | Only `format()` from `lib/format` |
| Plays sounds? | No — emits intents via bus | Yes — listens to bus |
| Tested with | Vitest, no jsdom | Vitest + jsdom OR Playwright |
| Imports `content/*`? | Yes | Only for display strings (nameRu, descRu) |

**Enforcement:** Add `eslint-plugin-import` with `no-restricted-paths`:

```jsonc
// .eslintrc — restricted-paths rule
{
  "rules": {
    "import/no-restricted-paths": ["error", {
      "zones": [
        { "target": "./src/engine", "from": "./src/ui",    "message": "engine must not import ui" },
        { "target": "./src/engine", "from": "./src/state", "message": "engine must not import state" },
        { "target": "./src/content","from": "./src/ui",    "message": "content must not import ui" },
        { "target": "./src/content","from": "./src/state", "message": "content must not import state" }
      ]
    }]
  }
}
```

This is the single highest-leverage architectural enforcement. Without it, code drifts into "ClickButton imports `applyIncome` directly" within a week.

---

## Scaling Considerations

This is a single-player offline web game. "Scaling" means **save size**, **frame budget**, and **save-version migrations** — not users.

| Scale | Adjustments |
|---|---|
| 0–10 upgrades, 0–10 censors | Current design. 60 fps trivially. Save size ~2 KB. |
| 50 upgrades, 50 censors, 100 achievements | Still fine. Selectors keep render cost flat. Save size ~10 KB. |
| 200+ upgrades or save-bloat (long play) | Consider splitting persist into "core" + "history" keys. Compress save with `lz-string` before `localStorage` (saves 5–10x). Move achievement predicates into a JIT-evaluated dependency map (only re-check predicates whose inputs changed). |
| Save schema evolves across versions | Implement `migrate(persisted, version)` properly — version 1 → 2 might rename a field, fold two upgrades, etc. Never break existing saves silently — show a "save migrated" notice. |

### Scaling Priorities

1. **First bottleneck:** Whole-tree re-renders if a developer forgets a selector and writes `useGameStore()`. Mitigate by code review + a custom ESLint rule banning bare `useGameStore()` calls.
2. **Second bottleneck:** Per-tick allocations from Immer + Decimal arithmetic in long sessions. Immer's structural sharing handles this; Decimal allocates per op but is cheap. Profile only if frames drop.
3. **Third bottleneck:** `localStorage` quota (~5 MB). At ~10 KB per save it's a non-issue. Add `lz-string` compression only if save grows beyond 1 MB.

---

## Anti-Patterns

### Anti-Pattern 1: Calling `useGameStore()` without a selector

**What people do:** `const state = useGameStore();` then destructure.
**Why it's wrong:** Component re-renders on every state change — 10×/s during tick, every click, every income update. Kills frame rate, drains battery.
**Do this instead:** Always pass a selector. Use `useShallow` for object/array selectors.

### Anti-Pattern 2: Storing computed values in the store

**What people do:** Persist `incomePerSec` and update it in every action.
**Why it's wrong:** Source of bugs (must update everywhere that affects it), bloats save, blurs the source of truth.
**Do this instead:** Compute in `engine/economy.ts:incomePerSec(state)`. Memoize in selectors if needed.

### Anti-Pattern 3: Playing audio inside a Zustand `set()` callback

**What people do:** `set((s) => { s.blocks = ...; Howler.play("click"); })`.
**Why it's wrong:** Couples engine to view. Breaks tests (no Howler in jsdom). Persist middleware may serialize the action mid-side-effect.
**Do this instead:** Emit on a bus inside the action body (after `set`); subscribe to the bus in a React `useEffect`.

### Anti-Pattern 4: Running the loop via `setInterval(tick, 100)`

**What people do:** "It's an idle game, 100 ms is fine." `setInterval(() => store.tick(100), 100)`.
**Why it's wrong:** Browsers throttle inactive-tab timers to 1 Hz (some to 0). Your fixed `dt = 100` is a lie — actual time elapsed could be 10× more. Income drifts. Background play is broken.
**Do this instead:** rAF + accumulator (Pattern 2). Browser pauses rAF in hidden tabs — you control the catch-up policy explicitly.

### Anti-Pattern 5: One Zustand store per slice

**What people do:** `useCurrencyStore`, `useUpgradesStore`, `useEventsStore`, …
**Why it's wrong:** Click action must atomically update currency AND check achievements. Cross-store atomicity requires manual coordination. Persistence becomes N separate keys with N migration paths.
**Do this instead:** One store, slices composed in `store.ts` (Pattern 1).

### Anti-Pattern 6: Putting balance numbers in component JSX

**What people do:** `<button>+{owned * 5} blocks</button>` with the `5` inline.
**Why it's wrong:** Tuning balance means hunting through `.tsx` files. Designers can't help. Numbers diverge from engine math.
**Do this instead:** All numbers in `src/content/*.ts`. Engine reads them; UI displays formatted results.

### Anti-Pattern 7: `JSON.stringify(state)` directly to localStorage

**What people do:** Skip the custom storage, just `JSON.stringify` the Zustand state.
**Why it's wrong:** `new Decimal(123)` survives stringify as `{}` (no own enumerable props that round-trip). On reload, `state.blocks.add(1)` throws — `add` is on the prototype, but `state.blocks` is now a plain object. Save is silently corrupt.
**Do this instead:** Pattern 4 — custom `PersistStorage` with `__D` markers.

### Anti-Pattern 8: Checking achievements on every state change via `store.subscribe()`

**What people do:** `useGameStore.subscribe((s) => checkAchievements(s))` at startup.
**Why it's wrong:** Fires on every set (clicks, ticks, purchases) — and the subscription callback runs AFTER state is committed, so any mutation inside it triggers a second commit, risking loops.
**Do this instead:** Inline at end of `tick()` and purchase actions (Pattern 7). One obvious site, no re-entrancy.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---|---|---|
| `break_infinity.js` | Imported only in `src/lib/decimal.ts`; re-exported as `D`, `ZERO`, `Decimal`. | If you outgrow ~1e1e308, swap to `break_eternity.js` here — one file. |
| Howler.js | `src/lib/sfx.ts` owns all `Howl` instances. UI subscribes to `sfxBus`. | Lazy-load on first user gesture (browser autoplay policy). |
| Framer Motion | Used inline in `ui/*` components for click feedback and event popups. | Pin variants to avoid layout thrash on every tick. |
| Tailwind 4 | All styling. `tailwind.config.ts` + `src/styles/tailwind.css`. | Use `@apply` sparingly; prefer utility classes. |
| Vite 5 | Build, dev server, asset handling. `vite.config.ts` sets base path for GH Pages. | `base: "/rkn-tycoon/"` for GH Pages; flip to `"./"` for itch.io zip. |
| GitHub Pages | `.github/workflows/deploy.yml` builds and pushes `dist/` to `gh-pages`. | Use `peaceiris/actions-gh-pages`. |
| itch.io | Manual: `pnpm build && cd dist && zip -r ../rkn-tycoon.zip .` upload. | Set `base: "./"` for relative asset paths in the zip. |

### Internal Boundaries

| Boundary | Communication | Notes |
|---|---|---|
| `ui/*` ↔ `state/*` | React hook `useGameStore(selector)`; action calls `store.getState().action()`. | Never direct mutation of state; always via actions. |
| `state/*` ↔ `engine/*` | State actions call engine pure functions with `(state, dt)` and let immer mutate. | Engine never imports state. |
| `engine/*` ↔ `content/*` | Engine imports `UPGRADES`, `CENSORS`, etc. as readonly arrays. | Content is the static-data leaf node. |
| `state/*` ↔ `lib/decimal.ts` | Direct import for math. | The only place outside `lib/` allowed to call Decimal methods. |
| Side-effects (`ui/*` ↔ `lib/sfx.ts`) | `sfxBus.emit()` from actions; `sfxBus.on()` in a top-level `useEffect`. | Engine emits intents, view executes. |

---

## Sources

- [Zustand — Persisting store data (official docs)](https://zustand.docs.pmnd.rs/reference/integrations/persisting-store-data) — `createJSONStorage`, `PersistStorage`, custom storage patterns (HIGH confidence)
- [Zustand persist middleware — pmndrs/zustand on GitHub](https://github.com/pmndrs/zustand/blob/main/docs/reference/integrations/persisting-store-data.md) — current API, reviver/replacer, custom storage examples (HIGH confidence)
- [Zustand discussion #1720 — Date objects not persisted correctly](https://github.com/pmndrs/zustand/discussions/1720) — confirms class instances need custom codec; same pattern applies to Decimal (HIGH confidence)
- [Performant Game Loops in JavaScript — Aleksandr Hovhannisyan](https://www.aleksandrhovhannisyan.com/blog/javascript-game-loop/) — fixed-step accumulator pattern, rAF rationale (HIGH confidence)
- [Anatomy of a video game — MDN](https://developer.mozilla.org/en-US/docs/Games/Anatomy) — canonical rAF main-loop reference (HIGH confidence)
- [How to make a game loop for your idle game — GitHub gist](https://gist.github.com/HipHopHuman/3e9b4a94b30ac9387d9a99ef2d29eb1a) — idle-specific accumulator example (MEDIUM confidence, illustrative)
- [Stop Using setInterval. Use requestAnimationFrame — webdevsimplified](https://blog.webdevsimplified.com/2021-12/request-animation-frame/) — corroborates throttling/battery argument (MEDIUM confidence)
- [A Detailed Explanation of JavaScript Game Loops and Timing — Isaac Sukin](https://isaacsukin.com/news/2015/01/detailed-explanation-javascript-game-loops-and-timing) — definitive long-form reference on fixed/variable timestep (HIGH confidence)
- [break_infinity.js — Patashu/break_infinity.js](https://github.com/Patashu/break_infinity.js) — API surface (`add`, `gte`, `toString`, prototype-based methods → cannot survive raw `JSON.parse`) (HIGH confidence)

---

*Architecture research for: 2D idle-clicker web game (React + Zustand + break_infinity.js)*
*Researched: 2026-05-15*
