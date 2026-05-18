# Stack Research

**Domain:** 2D idle-clicker web game (Cookie Clicker–style, React + DOM, no canvas/engine)
**Researched:** 2026-05-15
**Confidence:** HIGH (versions verified directly against npm registry; integration patterns verified against official docs)

> Stack is **locked** by user. This document validates exact versions, surfaces integration gotchas, and prescribes concrete patterns. It does not propose alternatives to the locked choices.

---

## Recommended Stack (Locked, Versions Pinned)

### Core Technologies

| Technology | Recommended Version | Purpose | Why (for this project) |
|------------|---------------------|---------|------------------------|
| **React** | `18.3.1` (locked at 18; see decision below) | UI framework | UI-first reactive rendering for counters/upgrades; massive AI training corpus; ecosystem maturity for the rest of locked stack. |
| **react-dom** | `18.3.1` | DOM renderer | Pair with React. |
| **TypeScript** | `5.9.3` (latest 5.x; **do not jump to 6.x** mid-stack) | Type safety, strict mode | TS 5 strict catches Decimal/Number footguns, state-shape regressions in upgrades catalog. TS 6.0 just shipped (2026-Q1/Q2) — too fresh for a small game; many tools still print warnings on 6. |
| **Vite** | `5.4.21` (latest 5.x) — **OR** `6.4.2` (latest 6.x) — see note | Dev server, build, bundling | Locked stack says "Vite 5". Vite 5.4.x is still actively patched (security backports). Vite 7/8 exist but bring Rolldown migration churn — not worth it for v1. **If picking today, prefer Vite 6.4.x:** same ergonomics, Node 18 dropped (fine — we use 20+), 15–30% faster cold start, fully supported by `@tailwindcss/vite`. Both 5.4.x and 6.4.x are acceptable; pin to one and don't float. |
| **Tailwind CSS** | `4.3.0` (Oxide engine) | Utility-first CSS | CSS-first `@theme` config fits monospace/ASCII terminal aesthetic; ~10x faster builds than v3; no `tailwind.config.js` needed. |
| **@tailwindcss/vite** | `4.3.0` | Tailwind v4 Vite integration | The supported v4 path. **Do not** use the old `tailwindcss` PostCSS plugin (renamed to `@tailwindcss/postcss` in v4). Peer requires Vite `^5.2 || ^6 || ^7 || ^8` — fully compatible with chosen Vite. |
| **Zustand** | `5.0.13` | Game state store | Single-store-with-slices fits idle-game shape (currency + upgrades + meta). Selectors prevent re-render storms when ticking the big number 60x/sec. Peer deps: `react >=18`, `use-sync-external-store >=1.2`. |
| **motion** (package name) | `12.38.0` | Animation library | Click button bounce, currency-tick animation, achievement toasts. **Use the new `motion` package, not `framer-motion`** — see rebrand note. |
| **break_infinity.js** | `2.2.0` | Big-number arithmetic | Required from day 1: `Number.MAX_VALUE` (≈1.8e308) gets hit in <1 hour of idle play. `Decimal` class is ~10x faster than `decimal.js` for incremental games (trades precision for speed — acceptable for cosmetic counters). |
| **howler.js** | `2.2.4` | SFX playback | Click SFX with mobile-unlock-on-first-touch baked in; format fallback (mp3/ogg/webm); 7 KB gzip. Last release is 3+ years old but the library is feature-complete and still the de-facto choice. |
| **lucide-react** | `1.16.0` | Icon set | Tree-shakeable per-icon import (~0.5–1 KB each); React 16–19 peer; matches monochrome terminal aesthetic with `strokeWidth` tuning. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **pnpm** | Package manager (locked) | Use `packageManager` field in `package.json` and `engines.node` (>=20). pnpm + Vite play well; watch out for `shamefully-hoist=true` only if a transitive dep complains (it shouldn't with this stack). |
| **@vitejs/plugin-react** | React SWC/Babel HMR | Pair with Vite. Use `@vitejs/plugin-react` (Babel) for now — `plugin-react-swc` is faster but has weaker source-map fidelity for game-loop debugging. |
| **vite-plugin-checker** (optional) | Inline TS/ESLint errors in HMR overlay | Highly recommended — catches Decimal-vs-number type confusion at edit time, not at runtime. |
| **eslint** + **@typescript-eslint** | Linting | Strict config; enable `no-floating-promises` (saves don't lose data) and `no-restricted-globals` to flag direct `Number(decimal)` calls. |
| **prettier** | Formatting | 2-space, single quotes — match Vite's React template defaults. |
| **gh-pages** (optional) | GitHub Pages deploy | Or wire `vite build` → `gh-pages -d dist` in a GitHub Action. For itch.io, just `pnpm build` then zip `dist/`. |

---

## Installation

```bash
# Initialize (pnpm + Vite React-TS template)
pnpm create vite@latest rkn-tycoon -- --template react-ts
cd rkn-tycoon

# Core runtime
pnpm add react@18.3.1 react-dom@18.3.1
pnpm add zustand@5.0.13
pnpm add motion@12.38.0
pnpm add break_infinity.js@2.2.0
pnpm add howler@2.2.4
pnpm add lucide-react@1.16.0

# Styling — Tailwind v4 + Vite integration
pnpm add -D tailwindcss@4.3.0 @tailwindcss/vite@4.3.0

# Build / dev
pnpm add -D vite@5.4.21 @vitejs/plugin-react@latest
pnpm add -D typescript@5.9.3 @types/react@18 @types/react-dom@18 @types/howler

# Optional but recommended
pnpm add -D vite-plugin-checker
pnpm add -D gh-pages
```

> **Pin everything.** No `^` in `package.json` for the locked-stack libs. Lock the file (`pnpm-lock.yaml`) is committed. Use `pnpm install --frozen-lockfile` in CI.

### `vite.config.ts` (minimal)

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "./", // critical for itch.io zip + GitHub Pages subpath
  plugins: [react(), tailwindcss()],
  build: {
    target: "es2022",
    sourcemap: true, // keep for v1; flip off if bundle size matters
  },
});
```

### `src/index.css` (Tailwind v4 entry — note the new syntax)

```css
@import "tailwindcss";

@theme {
  --font-family-mono: "IBM Plex Mono", ui-monospace, monospace;
  --color-rkn-red: #c62828;
  --color-rkn-bg:  #0a0a0a;
  --color-rkn-fg:  #e0e0e0;
}
```

> **Do NOT** use `@tailwind base; @tailwind components; @tailwind utilities;` — that is v3 syntax and silently does nothing in v4.

---

## Key Decision: React 18 vs React 19

**Verdict: Stay on React 18.3.1 for v1.** Migrate to React 19 in a dedicated post-v1 milestone if there is a tangible win.

| Factor | React 18.3.1 | React 19.2.x |
|--------|--------------|--------------|
| Stability | 3+ years in production; everything works | Stable since Dec 2024; ecosystem mostly caught up by 2026 |
| `motion` peer | `^18 \|\| ^19` ✓ | ✓ |
| Zustand 5 peer | `>=18` ✓ | ✓ |
| React Compiler | n/a | Optional; v1.0 since 2025-10 — auto-memoization is real |
| Concurrent features | Available | Available + Actions, Server Components (not needed here) |
| AI codegen accuracy | Higher (more training data) | Slightly lower; compiler rules trip older patterns |
| `useEffect` for game loop | Standard patterns documented | Compiler may surprise you if you mutate refs in render |
| Risk for a small game | None | Low — but the Compiler can mask bad patterns until they bite later |

**Why 18 wins here:** This is a tiny game with a hot path (game tick) that we control by hand. The Compiler's main selling point is auto-memoization in component-heavy UIs — we have ~10 components. Zero upside, small migration risk. If you start fresh and want React 19, the only required change is `react@19.2.6` + `react-dom@19.2.6`; the rest of the stack supports both peers.

Confidence: **HIGH** (verified peer ranges via npm).

---

## Integration Gotchas (Prescriptive)

### 1. Tailwind 4 + Vite — what changed from v3

- **No `tailwind.config.js`.** Theme tokens live in CSS via `@theme { ... }`. If you need a JS-side token (e.g. inside a TS file), re-declare it in code, or import the CSS var: `style={{ color: "var(--color-rkn-red)" }}`.
- **No `content: [...]` array.** v4 auto-detects files via your Vite source graph. Files outside the graph (e.g., an HTML snippet inline-included by a script) won't get scanned — keep all JSX inside `src/`.
- **`@apply` still works** but is discouraged. Prefer composing utilities directly in JSX.
- **PostCSS plugin renamed.** If a tutorial says `npm install tailwindcss postcss autoprefixer` and writes a `postcss.config.js`, that's v3. With `@tailwindcss/vite` you need neither PostCSS nor autoprefixer.
- **Known dev-mode bug:** Tailwind v4 + Vite occasionally fails to apply styles on the *very first* page load in dev (GitHub discussion #16399). Hard-refresh fixes it. Production builds unaffected.
- **Browser baseline jump:** v4 requires Safari 16.4+, Chrome 111+, Firefox 128+. Fine for itch.io desktop, fine for any phone <3 years old.

### 2. Zustand `persist` middleware + `break_infinity.js` serialization (CRITICAL)

`JSON.stringify` on a `Decimal` returns `{}` — your save will silently lose every number. You **must** supply a custom storage with a replacer/reviver, or pre/post-process in `partialize`/`merge`.

**Recommended pattern — custom `JSONStorage` with replacer/reviver:**

```ts
// src/game/store.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import Decimal from "break_infinity.js";

type GameState = {
  blocks: Decimal;            // currency
  perClick: Decimal;
  perSecond: Decimal;
  upgrades: Record<string, number>; // owned counts
  prestigeMult: Decimal;
  lastTick: number;           // ms epoch — for offline progress
  click: () => void;
  buy: (id: string) => void;
};

const replacer = (_key: string, value: unknown) =>
  value instanceof Decimal ? { __d: value.toString() } : value;

const reviver = (_key: string, value: unknown) => {
  if (
    value &&
    typeof value === "object" &&
    "__d" in (value as Record<string, unknown>)
  ) {
    return new Decimal((value as { __d: string }).__d);
  }
  return value;
};

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      blocks: new Decimal(0),
      perClick: new Decimal(1),
      perSecond: new Decimal(0),
      upgrades: {},
      prestigeMult: new Decimal(1),
      lastTick: Date.now(),
      click: () =>
        set((s) => ({ blocks: s.blocks.add(s.perClick.mul(s.prestigeMult)) })),
      buy: (_id) => {
        /* ... */
      },
    }),
    {
      name: "rkn-tycoon-save-v1",
      version: 1, // bump on save-format changes; provide `migrate`
      storage: createJSONStorage(() => localStorage, { replacer, reviver }),
      // Only persist *state*, never persist actions:
      partialize: (s) => ({
        blocks: s.blocks,
        perClick: s.perClick,
        perSecond: s.perSecond,
        upgrades: s.upgrades,
        prestigeMult: s.prestigeMult,
        lastTick: s.lastTick,
      }),
      // Calculate offline progress on rehydrate:
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const now = Date.now();
        const elapsedSec = Math.max(0, (now - state.lastTick) / 1000);
        const offlineCap = 60 * 60 * 4; // cap at 4h, tune to feel
        const ticks = Math.min(elapsedSec, offlineCap);
        state.blocks = state.blocks.add(state.perSecond.mul(ticks));
        state.lastTick = now;
      },
    },
  ),
);
```

**Why this pattern:**
- `replacer` tags `Decimal` instances as `{ __d: "1.2345e678" }` — `Decimal.toString()` round-trips losslessly.
- `reviver` rebuilds `Decimal` on load. Any sentinel works (`__d`, `$$decimal`, etc.) — be consistent.
- `version` + `migrate` give you an out when the save shape changes (e.g., adding `prestigeMult` in a later patch).
- `onRehydrateStorage` is the canonical offline-progress hook — cleaner than running it on first render in a component.
- `partialize` keeps functions out of the JSON blob (they aren't serializable anyway, but it makes the save smaller and grep-friendlier when debugging).

**Anti-pattern:** Calling `Decimal(JSON.parse(localStorage.getItem(...)))` yourself in a `useEffect`. Zustand's `persist` is the supported path — use it.

Confidence: **HIGH** (Zustand persist supports `replacer`/`reviver` via `createJSONStorage`; pattern is the standard from the Zustand discussion threads).

### 3. `motion` rebrand — package name and imports

- The library is still maintained under both names. **For new projects use `motion`** (the post-rebrand package; same maintainer, same versioning continuum as `framer-motion`).
- Import from `motion/react`, not from `motion`:

  ```ts
  // ✓ Correct
  import { motion, AnimatePresence } from "motion/react";

  // ✗ Wrong (this is the vanilla JS subpath)
  import { animate } from "motion";

  // ✗ Legacy (works but burns the rebrand benefit)
  import { motion } from "framer-motion";
  ```
- `framer-motion@12.38.0` and `motion@12.38.0` are version-locked siblings — pick one, do not install both (peer-dep duplication warnings from pnpm).
- Be wary of GPU-heavy animations on the click button at 60 Hz; prefer `transform: scale()` over animating `width`/`height`. Use `layoutId` sparingly — it forces extra measurement passes.

### 4. Game-loop timing — `requestAnimationFrame` over `setInterval` (CRITICAL)

For an idle game, the loop must (a) compute deterministically by delta-time, (b) keep working when the user tabs away, (c) not eat CPU on a hidden tab. There is one right answer.

**Pattern — single `requestAnimationFrame` driver, delta-time accumulator, fixed-rate logic tick:**

```ts
// src/game/loop.ts
import { useGame } from "./store";

const TICK_MS = 100; // logic at 10 Hz is plenty for an idle game

export function startGameLoop() {
  let last = performance.now();
  let acc = 0;

  const frame = (now: number) => {
    const dt = now - last;
    last = now;
    acc += dt;

    while (acc >= TICK_MS) {
      // pull state via getState() — NOT useGame() — to avoid subscribing
      const s = useGame.getState();
      const earned = s.perSecond.mul(TICK_MS / 1000).mul(s.prestigeMult);
      useGame.setState({
        blocks: s.blocks.add(earned),
        lastTick: Date.now(),
      });
      acc -= TICK_MS;
    }
    rafId = requestAnimationFrame(frame);
  };
  let rafId = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(rafId);
}
```

Mount once at app root:

```tsx
// App.tsx
useEffect(() => startGameLoop(), []);
```

**Why this and not `setInterval(tick, 100)`:**
- `requestAnimationFrame` is throttled (to ~1 Hz) on hidden tabs by every modern browser — saves laptop battery while user is on a different tab. Crucial for itch.io, where players Alt-Tab constantly.
- `setInterval` keeps firing on hidden tabs at full rate — wastes CPU and produces "phantom production" that *looks* like offline progress but actually ran in the foreground.
- The delta-time accumulator means: framerate drops to 30 FPS → logic still ticks 10x/sec by catching up. Framerate spikes to 144 Hz → logic still ticks 10x/sec by skipping. No drift, no double-ticks.
- **Offline progress is computed separately** in `onRehydrateStorage` (see Zustand pattern above), comparing `Date.now() - lastTick`. The RAF loop handles *foreground* ticks only.
- React's render loop is decoupled: components subscribe to `blocks` via Zustand selectors and re-render only when the slice changes.

**Sub-pattern — prevent re-render storms:**

```tsx
// Subscribe only to the formatted display string, not the raw Decimal:
const blocksDisplay = useGame((s) => format(s.blocks));
```

A `Decimal` is mutated *by reference* each tick (well, replaced — same reference identity rules apply), so subscribing to `s.blocks` re-renders 10x/sec. Subscribe to a derived primitive, or use Zustand's `useShallow`/equality function.

Confidence: **HIGH** (RAF + accumulator is the standard browser game-loop pattern; documented in MDN Anatomy of a video game; matches Cookie Clicker's own approach of decoupled logic tick from render).

### 5. break_infinity.js — pitfalls

- **`Decimal` is immutable** for math ops (`add`, `mul`, `pow` return new instances) but the constructor is the only entry — there's no `new Decimal(otherDecimal)` deep-copy concern.
- **Never use `==` or `<`/`>`** between `Decimal`s and numbers. Use `.gte()`, `.lt()`, `.eq()`. TS won't catch this — add an ESLint rule.
- **Formatting:** library does *not* ship a K/M/B/T/aa/ab formatter. Write your own (~30 lines) — match Cookie Clicker's notation choices. Don't pull in a heavy number-formatting lib.
- **Don't render raw `Decimal` in JSX.** `{decimal}` calls `toString()` which renders full exponent strings (`"1.234e567"`). Always pass through a formatter.

### 6. Howler.js — mobile audio unlock

- The first click on the page unlocks audio automatically (Howler plays an empty buffer on `touchend`/`mousedown`) — *as long as Howler has been initialized before that click*. So: instantiate `new Howl({...})` at module load, not lazily on first click, or you lose the unlock window.
- Provide both `mp3` and `webm`/`ogg` for the click SFX — Safari historically chokes on Ogg.
- One `Howl` per SFX file; reuse the instance and call `.play()` — do not `new Howl` per click.

### 7. Lucide React — tree-shaking

- Always use **named imports**: `import { Shield, Zap } from "lucide-react"`. Never `import * as Icons from "lucide-react"` (kills tree-shaking; pulls all ~1400 icons).
- For dynamic icon selection (e.g., upgrade icon driven by data), use a static `const ICONS = { shield: Shield, zap: Zap }` map — keeps the bundler's hands on the references.

---

## Alternatives Considered (Locked — Documented for Future-Self)

| Locked Choice | Plausible Alternative | When Alternative Would Win |
|---------------|-----------------------|----------------------------|
| React 18 | React 19 | Larger UI surface area where the React Compiler's auto-memo saves real work; v2 with multi-screen meta-game. |
| Zustand | Jotai / Valtio | Atom-graph state (Jotai) if the game grows many independent reactive pieces. Proxy state (Valtio) if you prefer mutable syntax — but persist becomes harder. |
| break_infinity.js | break_eternity.js | Numbers above ~1e9e15 (idle games with deep prestige loops, e.g. *Antimatter Dimensions*). Not needed for v1 (one prestige level). |
| Howler.js | Native Web Audio API | If you need per-sample DSP (reverbs, sidechain). For one-shot SFX, Howler wins on ergonomics. |
| motion | react-spring / GSAP | `react-spring` for physics-y elastic feels; GSAP for timeline-heavy cinematics. Overkill for click bounces and toasts. |
| localStorage + JSON | IndexedDB via `idb-keyval` | Save grows past ~5 MB (localStorage quota varies 5–10 MB per origin) or you need binary blobs. Not a v1 concern. |
| Vite | Next.js / Remix | If you needed SSR/SEO. Idle games are CSR — SSR adds complexity for zero gain. itch.io serves static. |
| DOM rendering | PixiJS / Phaser | If you add particle-heavy effects or sprite animation. For counters + buttons, DOM is faster to ship and more accessible. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `setInterval` for the game tick | Keeps firing at full rate on hidden tabs; drifts under load; no delta-time accumulation | `requestAnimationFrame` + delta-time accumulator (see §4) |
| Plain `Number` for game currency | Breaks past `1e308`; loses precision much earlier | `break_infinity.js` Decimal from day 1 |
| `JSON.stringify` on a store with Decimals | Silently serializes Decimals as `{}` — save corruption | Custom `replacer`/`reviver` via `createJSONStorage` (see §2) |
| `@tailwind base/components/utilities` directives | v3 syntax; no-op in Tailwind 4 | `@import "tailwindcss";` |
| `tailwind.config.js` for v4 | Ignored in v4 (config has moved to CSS `@theme`) | `@theme { --color-x: #...; }` in CSS |
| `tailwindcss` as a PostCSS plugin in v4 | Renamed to `@tailwindcss/postcss`; old name is the Vite/CLI package | `@tailwindcss/vite` plugin (no PostCSS needed) |
| Subscribing to raw `Decimal` state in React | Re-renders the component every game tick (10 Hz) | Subscribe to the *formatted string* via a selector |
| `import * as Icons from "lucide-react"` | Defeats tree-shaking — ships ~1 MB of unused icons | Named imports only |
| `framer-motion` for new code | Legacy package name post-rebrand | `motion` (same maintainer, same code, current name) |
| Both `motion` and `framer-motion` installed | pnpm peer-dep duplication; two copies of the library | Pick one; remove the other |
| `react-scripts` / CRA | Deprecated since 2023; abandoned | Vite (already locked) |
| Storing save as a raw object in `useState` + `useEffect(localStorage)` | Manual rehydration ordering bugs; loses Decimals | Zustand `persist` middleware (canonical) |
| Music streaming via `<audio>` tag for SFX | Latency spikes on first play; no mobile-unlock magic | Howler.js (already locked) |
| Server-side anything | Out of scope; itch.io is static hosting | Pure CSR + localStorage |

---

## Stack Patterns by Variant

**If you decide to migrate to React 19 later:**
- Bump `react`/`react-dom` to `19.2.x`. No other locked-stack package needs changes (peers already allow it).
- Do *not* enable the React Compiler until you've verified game-loop performance — the Compiler may inline closures that you intentionally kept stable (e.g., the RAF callback's captured `useGame.getState`).

**If save size grows past ~1 MB:**
- Move from `localStorage` to IndexedDB via `idb-keyval`. Zustand `persist` supports it: `createJSONStorage(() => idbStorage)`. Same replacer/reviver pattern.
- Add `gzip`/`lz-string` compression layer in the custom storage's `setItem`/`getItem`.

**If itch.io / GitHub Pages base path bites you:**
- `vite.config.ts` → `base: "./"` (relative). This works for both itch.io zip (no path) and GitHub Pages project subpath (`/rkn-tycoon/`). Do *not* use `base: "/"`.

**If you add a second prestige tier in v2:**
- Switch `break_infinity.js` → `break_eternity.js`. API is a superset; same `Decimal` class name. Migrate saves by re-parsing — `break_eternity` reads `break_infinity` strings.

---

## Version Compatibility Matrix

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `tailwindcss@4.3.0` | `@tailwindcss/vite@4.3.0` | Version-lock these together. v4 ships them as a pair. |
| `@tailwindcss/vite@4.3.0` | `vite ^5.2 \|\| ^6 \|\| ^7 \|\| ^8` | Vite 5.4.21 and 6.4.2 both verified peers. |
| `zustand@5.0.13` | `react >=18` | Works fine with React 18.3.1 and 19.2.6. |
| `motion@12.38.0` | `react ^18 \|\| ^19`, `react-dom ^18 \|\| ^19` | Same source as `framer-motion@12.38.0` — do not install both. |
| `lucide-react@1.16.0` | `react ^16.5 \|\| ^17 \|\| ^18 \|\| ^19` | Widest peer; safe everywhere. |
| `howler@2.2.4` | No React peer | Plain JS; framework-agnostic. |
| `break_infinity.js@2.2.0` | No peers | Plain JS; framework-agnostic. Last release 2022 but library is feature-complete. |
| `typescript@5.9.3` | `vite ^5/6/7/8` | TS 5.9.x is the stable choice; TS 6 (just released 2026) — wait one quarter. |
| `@vitejs/plugin-react` | `vite ^5/6/7/8`, `react ^18/19` | Use the Babel variant (not SWC) for v1 sourcemap quality. |

---

## Confidence Assessment

| Recommendation | Confidence | Basis |
|----------------|------------|-------|
| Exact versions of every package | HIGH | Queried npm registry directly (`npm view <pkg> version`) on 2026-05-15 |
| Peer dependency compatibility | HIGH | Queried `peerDependencies` field directly per package |
| React 18 over React 19 for v1 | HIGH | Both work; risk asymmetry favors 18 for a tiny solo project |
| Tailwind 4 setup (CSS-first, `@tailwindcss/vite`) | HIGH | Official upgrade guide; confirmed peer ranges |
| Zustand persist + Decimal replacer/reviver | HIGH | Official `createJSONStorage` API supports replacer/reviver; standard pattern in Zustand discussions |
| RAF + delta-time accumulator over `setInterval` | HIGH | Standard browser game-loop pattern (MDN); hidden-tab throttling behavior is browser-spec |
| `motion` over `framer-motion` package name | HIGH | Official rebrand; both packages exist at same version, `motion` is the maintained path |
| Vite 5.4.21 vs 6.4.2 ambiguity | MEDIUM | Both supported; user said "Vite 5" — honoring that, but flagging Vite 6 as preferred if reconsidered |
| Offline-progress cap of 4h | MEDIUM | Cookie Clicker uses 1h with decay; common idle-game range is 2–8h; design choice, not a tech constraint |
| Logic tick rate of 10 Hz | MEDIUM | Plenty for counter feel; bump to 30 Hz if number animation feels chunky |

---

## Sources

- **npm registry (direct query, 2026-05-15)** — authoritative versions and peer dependencies for: react, react-dom, zustand, motion, framer-motion, tailwindcss, @tailwindcss/vite, vite (5/6/7/8 lines), typescript, howler, lucide-react, break_infinity.js. HIGH confidence.
- [Tailwind CSS v4.0 announcement](https://tailwindcss.com/blog/tailwindcss-v4) — Oxide engine, CSS-first config, Vite plugin. HIGH.
- [Tailwind CSS Upgrade Guide](https://tailwindcss.com/docs/upgrade-guide) — v3 → v4 breaking changes. HIGH.
- [Tailwind v4 + Vite + React dev-mode first-load bug (#16399)](https://github.com/tailwindlabs/tailwindcss/discussions/16399) — known gotcha. MEDIUM.
- [Zustand persist middleware docs](https://zustand.docs.pmnd.rs/reference/integrations/persisting-store-data) — `createJSONStorage`, replacer/reviver, `partialize`, `onRehydrateStorage`, `version`/`migrate`. HIGH.
- [Zustand discussion: storing non-serializable data (#1873)](https://github.com/pmndrs/zustand/discussions/1873) — custom serialization patterns. HIGH.
- [Motion (Framer Motion rebrand) upgrade guide](https://motion.dev/docs/react-upgrade-guide) — `motion/react` import path, package rename. HIGH.
- [Motion library home](https://motion.dev/) — current docs. HIGH.
- [React v19 release notes](https://react.dev/blog/2024/12/05/react-19) — features, migration. HIGH.
- [React Compiler v1.0 release](https://react.dev/blog/2025/10/07/react-compiler-1) — GA status and rules. HIGH.
- [break_infinity.js README](https://github.com/Patashu/break_infinity.js/) — Decimal API, design tradeoffs. HIGH.
- [Howler.js GitHub](https://github.com/goldfire/howler.js/) — mobile audio unlock behavior. HIGH.
- [Lucide React guide](https://lucide.dev/guide/packages/lucide-react) — tree-shaking, ES module structure. HIGH.
- [MDN — Anatomy of a video game](https://developer.mozilla.org/en-US/docs/Games/Anatomy) — RAF + fixed-step accumulator pattern. HIGH.
- [Performant Game Loops in JavaScript (Hovhannisyan)](https://www.aleksandrhovhannisyan.com/blog/javascript-game-loop/) — delta-time math, hidden-tab throttling. MEDIUM.
- [How to make a game loop for your idle game (gist)](https://gist.github.com/HipHopHuman/3e9b4a94b30ac9387d9a99ef2d29eb1a) — idle-specific patterns. MEDIUM.
- [Vite migration guide](https://vite.dev/guide/migration) — v5 → v6 → v7 → v8 changes. HIGH.

---
*Stack research for: 2D idle-clicker web game (React + DOM, no canvas)*
*Researched: 2026-05-15*
