# Pitfalls Research

**Domain:** 2D idle-clicker web game (React 18 + TS + Vite 5 + Tailwind 4 + Zustand + Framer Motion + break_infinity.js + Howler + localStorage)
**Theme:** Russian-language satire of Roskomnadzor (RKN Tycoon)
**Researched:** 2026-05-15
**Confidence:** HIGH for stack pitfalls, MEDIUM for game-feel/balance, HIGH for Tailwind 4 / Vite basePath issues

---

## Critical Pitfalls

### Pitfall 1: Decimal instances lost across JSON serialization

**What goes wrong:**
`break_infinity.js` exposes `Decimal` class instances with prototype methods (`.add()`, `.mul()`, `.cmp()`). After `JSON.stringify(state)` → write to `localStorage` → `JSON.parse(raw)`, those fields become plain `{ mantissa, exponent, sign }` objects. Calling `.add()` on them throws `TypeError: state.points.add is not a function`. The game appears to work the first session, breaks on every reload after.

**Why it happens:**
JSON has no notion of class instances. `Decimal.fromString()` / `new Decimal(plain)` rehydration is not automatic. Zustand `persist` middleware with default storage just serializes/deserializes JSON — it does not know about Decimal.

**How to avoid:**
- Choose a single canonical serial form (e.g. `Decimal.toString()` → base-conversion-safe string like `"1.234e567"`) and a single rehydration boundary.
- In Zustand `persist`, configure `serialize` / `deserialize` (or `storage: createJSONStorage(() => localStorage, { reviver, replacer })`) so every Decimal field becomes a string on save and a `new Decimal(str)` on load.
- Centralize: do NOT scatter `new Decimal(...)` calls across reducers. One `migrate`/`rehydrate` function per slice.
- Add a unit test: `serialize(state) → deserialize → state.points.add(new Decimal(1))` must not throw.

**Warning signs:**
- First page reload throws `Cannot read properties of undefined` or `.add is not a function`.
- Numbers display as `[object Object]` or `NaN` after refresh.
- Save file in DevTools `Application → Local Storage` contains objects like `{"mantissa":1,"exponent":3,"sign":1}` instead of strings.

**Phase to address:** Phase 1 (core loop) — fix BEFORE adding upgrades; later phases generate many more Decimal fields and the bug compounds.

---

### Pitfall 2: Save schema versioning missing → every balance patch wipes players

**What goes wrong:**
You ship v1 with `state.points`, `state.cps`. v1.1 renames `cps` → `passiveIncome` or adds a new field `state.prestige.tokens`. Existing players load → undefined fields → `Cannot read property 'tokens' of undefined` → game crashes on launch. Or worse, silently corrupts and shows zero progress.

**Why it happens:**
Developers iterate on game shape and forget that saves are the immutable artifact players already have. localStorage is forever (until the user clears it). Without a `version` field and migrations, every shape change is a breaking change.

**How to avoid:**
- Embed `version: 1` at the top of the save object from day one.
- Zustand `persist` has `version` + `migrate(persistedState, version)` — use both.
- For each version bump, write an explicit migration: `if (version < 2) state.passiveIncome = state.cps ?? '0'`.
- Have a "save-shape contract" — TypeScript type for `SaveV1`, `SaveV2`, never mutate old types.
- Test: load a v1 save in v2 build, verify no crash, no data loss.

**Warning signs:**
- Reducers read fields without `??` fallbacks.
- No `version` field in `localStorage` payload.
- "Just clear your save" appears in player support.

**Phase to address:** Phase 1 (persistence). Must exist before first public deploy; retrofitting after players have saves means you need an "amnesty migration" that may lose data.

---

### Pitfall 3: Per-tick re-render of the entire component tree

**What goes wrong:**
The game tick (e.g. `setInterval(tick, 100)`) calls `useGameStore.setState({ points: newPoints })`. Every component subscribed to the store (or using `useGameStore(state => state)` without a selector) re-renders 10×/sec. With 30+ upgrade cards on screen, animation jitters, click latency rises, fans spin. On low-end devices the game becomes unplayable.

**Why it happens:**
- `useGameStore()` with no selector subscribes to the whole state.
- Inline selectors `useGameStore(s => ({ points: s.points, cps: s.cps }))` return a new object reference each call → triggers re-render even when fields are unchanged → must use `shallow` equality.
- Upgrade cards each read `state.points` to compute `canAfford` and re-render every tick even when they can't afford.

**How to avoid:**
- ALWAYS use granular selectors: `const points = useGameStore(s => s.points)`.
- For tuples/objects: `useGameStore(s => [s.points, s.cps], shallow)` or `useShallow` from `zustand/react/shallow` (current Zustand v4/v5 idiom).
- Split state into slices; subscribe only to what a component needs.
- For purely-display numbers, consider a `useSyncExternalStore`-driven `<NumberDisplay />` that bypasses React rerenders and writes `textContent` directly inside a `requestAnimationFrame` loop. Cookie Clicker — and most successful idle games — DO NOT re-render the whole UI 10×/sec. The big number is essentially imperative.
- Profile with React DevTools "Highlight updates when components render". If a click highlights the whole tree, you have this bug.

**Warning signs:**
- React DevTools shows full-tree highlight on every tick.
- Chrome Performance tab shows continuous JS work even when idle.
- Clicks feel laggy as upgrade count grows past ~20.

**Phase to address:** Phase 2 (upgrades/auto-income). The bug only becomes visible once you have many subscribed components.

---

### Pitfall 4: localStorage write per tick → main-thread jank + quota burn

**What goes wrong:**
Naive autosave: persist after every `setState` (Zustand `persist` does this by default). 10 ticks/sec × `JSON.stringify` of growing state × synchronous localStorage write = 50–200ms hitches every second. Save also grows (e.g. event log) and eventually approaches the ~5MB localStorage quota.

**Why it happens:**
`localStorage.setItem` is synchronous and blocks the main thread. `JSON.stringify` cost scales with state size. Zustand `persist` default writes on every store change unless throttled.

**How to avoid:**
- Debounce/throttle persistence to 1–5 seconds (recommended: **2s autosave** + save-on-blur + save-on-visibilitychange:hidden + save-on-beforeunload).
- Zustand v5: wrap `storage` with a throttled wrapper, OR use the `partialize` option to persist only durable fields (skip ephemeral `lastClickAt`, animation queues).
- Don't store transient state (toasts, FX particles, recent-click ring buffer) in the persisted slice.
- Measure stringify cost: if it's >5ms, you have too much state.
- Verify save size is well under 1MB — leaves headroom.

**Warning signs:**
- DevTools Performance shows recurring `setItem` blocks.
- Save in `Application → Local Storage` grows monotonically per session.
- Game stutters every ~100ms.

**Phase to address:** Phase 1 — set the autosave cadence before ticks become expensive.

---

### Pitfall 5: Howler `new Howl()` per click → memory leak + audio glitches

**What goes wrong:**
Click handler does `new Howl({ src: ['/sfx/click.mp3'] }).play()`. Each click allocates a Howl instance (HTMLAudioElement + decoded buffer reference + listeners). After 1000 clicks the page consumes hundreds of MB. Browsers also cap concurrent decoded audio — eventually clicks silently fail.

**Why it happens:**
Tutorials show `new Howl(...).play()` as the simplest form. Developers don't realize Howl is meant to be allocated once and reused.

**How to avoid:**
- Create one Howl per SFX at module load (or via a sound-pool factory). Cache in a module-level map.
- Set `pool` option on the Howl (default 5) high enough for your max overlap (e.g. `pool: 20` for rapid clicks). Howler internally uses a sprite pool for overlapping playback.
- Call `sound.play()` on the cached instance — it returns a new `soundId` per play, doesn't reallocate.
- For very rapid clicks, throttle SFX to ~50ms minimum interval OR use `sprite` for variation.
- Use `Howler.html5PoolSize` carefully; prefer Web Audio backend (default) unless you have a reason.

**Warning signs:**
- Chrome Task Manager shows memory growing linearly with click count.
- Clicks stop producing sound after ~30s of rapid clicking.
- Console shows "play() failed" or "audio context" warnings.

**Phase to address:** Phase 1 (click feedback) — fix when SFX is first wired.

---

### Pitfall 6: Framer Motion on the hot path

**What goes wrong:**
Every click spawns a `<motion.div>` "+1" floating number with `AnimatePresence`. Click-spam at 15/s creates 15 new React subtrees per second, each with its own animation driver, each unmounting via `AnimatePresence` (which delays unmount). DOM grows, scheduler chokes, the big "Заблокировать" button visibly lags behind clicks.

**Why it happens:**
Framer Motion is great but heavy per-element. It's designed for occasional UI transitions, not bullet-hell-style particle effects. Each motion component installs effects, listeners, and a value tracker.

**How to avoid:**
- For "+N" damage-number popups: pool a fixed array of N=20 slots; reuse them. Don't mount/unmount per click.
- Or skip Framer Motion entirely for click feedback — use CSS keyframe `@keyframes click-pop` + `animationend` listener. ~100× cheaper.
- Reserve Framer Motion for menu transitions, achievement banners, prestige reset animation — discrete events, not continuous.
- Use `will-change: transform` sparingly; `transform` + `opacity` only (compositor-friendly).
- Run a stress test: hold mouse-down auto-clicker at 20 clicks/sec; FPS must stay ≥55.

**Warning signs:**
- Chrome Performance "Frames" bar shows red drops during click spam.
- The "+1" elements lag behind cursor.
- Memory snapshots show thousands of detached `<motion.div>` instances.

**Phase to address:** Phase 1 (click feel). Establish the click-FX pattern before reuse spreads.

---

### Pitfall 7: Cost-growth vs income-growth divergence → broken late game

**What goes wrong:**
Standard idle pattern: each upgrade purchase costs `baseCost × growth^owned` (e.g. growth=1.15). Income per upgrade is constant or linearly scaled. Without a counter-mechanism (multipliers, prestige), once you hit ~50 of an item, the next costs are reachable in seconds → trivial spam. Or the opposite: growth=1.5 and the player stalls at upgrade #20 staring at the screen.

**Why it happens:**
- Copy-pasting `growth=1.15` from Cookie Clicker without realizing CC compensates with hundreds of buildings, milestone multipliers (every 25), heavenly upgrades, season effects, etc.
- No spreadsheet model — balance is "vibes-based."
- Income scaling not tested at log scale.

**How to avoid:**
- Build a tiny spreadsheet/JS sim: project points & cps at t = 1 min, 10 min, 1 h, 1 d, 1 wk. Plot on log scale.
- Target an "interesting decision every 30–90 seconds" early game, every 5–15 minutes mid-game. If the next upgrade is reachable instantly, raise growth or reduce income multiplier.
- Standard ratio: cost-growth (~1.15) and per-tier income multiplier (~6–10×) such that "ratio of new item cost to income" lands in ~30–120s range.
- Add milestone multipliers (e.g. every 10 of an item = +1% global) — gives mid-game texture without complex math.
- Cap or curve early-game prestige so prestige #1 happens around 30–60 min play, not 5 min and not 10 hours.

**Warning signs:**
- Playtest: tester says "I don't know what to do" or "I'm just waiting."
- Math: at hour 1, player has 10 of every cheap upgrade and is staring at one unreachable expensive one.
- Math: at hour 1, player has 500+ of every item.

**Phase to address:** Phase 2 (economy). Lock balance with a simulation BEFORE building 30 upgrade cards on top of it.

---

### Pitfall 8: `break_infinity.js` used inconsistently → silent precision loss

**What goes wrong:**
Most state fields are `Decimal`, but `cost` is a plain `number` because "it's small." Player buys 500 of a cheap upgrade; cost grows beyond `Number.MAX_VALUE` because of growth^500; cost becomes `Infinity`; "Купить" button is greyed out forever. Or the inverse: a `number` field gets added to a `Decimal` via JS coercion → `NaN`.

**Why it happens:**
break_infinity rescues you only at the fields you opted in. Mixed types feel ok until exponents grow.

**How to avoid:**
- Rule: **every** game-economy field is `Decimal`. No mixed types in the economy module. Constants too (`new Decimal('1e15')` not `1e15`).
- Use TypeScript: `type Currency = Decimal` and forbid `number` in the economy slice via lint or branded types.
- Never compare with `<`, `>`, `===` — only `.cmp()`, `.lt()`, `.gte()`.
- Never use `+`, `-` on Decimals — only `.add()`, `.sub()`.
- ESLint rule or grep: `points\s*[+\-*/<>=]` should match nothing in economy code.

**Warning signs:**
- "Cannot afford" stays true forever past some upgrade tier.
- Numbers display `Infinity`, `NaN`, or `-1.7976931348623157e+308`.
- TypeScript error "Operator '+' cannot be applied to types 'Decimal' and 'number'" → fix the call site, don't `as number` it.

**Phase to address:** Phase 1 (currency). Define the rule before writing the second economy function.

---

### Pitfall 9: Vite `base` path wrong for GitHub Pages → blank page

**What goes wrong:**
Default Vite build uses `base: '/'`. GitHub Pages serves at `https://user.github.io/rkn-tycoon/`. After deploy, browser requests `/assets/index-abc.js` which 404s (real path is `/rkn-tycoon/assets/index-abc.js`). Page is blank, console shows MIME-type errors for HTML returned as JS.

**Why it happens:**
Vite is base-aware but only if you tell it. Project pages live under a subpath, user pages live at root. Same code, different bases.

**How to avoid:**
- `vite.config.ts`: `base: process.env.NODE_ENV === 'production' ? '/rkn-tycoon/' : '/'` (or use `import.meta.env.BASE_URL` consumer-side).
- Use `<base href={import.meta.env.BASE_URL}>` only if needed; React Router consumers should pass `basename={import.meta.env.BASE_URL}`.
- All asset references via `import logoUrl from './logo.png'` (Vite rewrites correctly) — NEVER hardcode `/logo.png`.
- Hash router (`#/path`) instead of browser router if using routing (GH Pages serves 404 on subpaths otherwise).
- For itch.io build: set `base: './'` (relative) — itch.io zips serve assets relative to the entry point. **This is a different build than GH Pages.** Make two build commands: `pnpm build:gh` and `pnpm build:itch`, or a `DEPLOY_TARGET` env var.

**Warning signs:**
- Deployed page is blank, console: "Failed to load module script: …MIME type 'text/html'".
- Network tab: all `/assets/*` requests are 404 and return the SPA index.html.

**Phase to address:** Phase 4 (deploy). But **think about it at Phase 1** — store assets via Vite imports, not literal paths, so deploy is friction-free.

---

### Pitfall 10: itch.io zip structure wrong → "no index.html found"

**What goes wrong:**
You zip `dist/` such that the zip's root contains a `dist/` folder. itch.io shows "index.html not found at archive root."

**Why it happens:**
itch.io HTML5 game uploader requires `index.html` at the archive root, not nested in a folder.

**How to avoid:**
- `cd dist && zip -r ../rkn-tycoon-itch.zip .` — note the trailing dot, zips contents not the folder.
- Confirm by `unzip -l rkn-tycoon-itch.zip | head` — first entry should be `index.html`, not `dist/`.
- Set "This file will be played in the browser" + viewport size (e.g. 1280×800) in itch.io project settings.
- Test by uploading a private/draft build first.
- Use `base: './'` in Vite config (see Pitfall 9) so paths inside the zip resolve.

**Warning signs:**
- itch.io shows "index.html not found."
- Game loads on itch.io but assets are broken (paths absolute → 404).

**Phase to address:** Phase 4 (deploy).

---

### Pitfall 11: Save tied to origin → moving GH Pages → itch.io loses progress

**What goes wrong:**
localStorage is keyed by origin (scheme + host + port). `user.github.io` and `html-classic.itch.zone` (where itch.io HTML5 games actually run) are different origins. A player who built progress on the GH Pages preview build loses everything when they move to the itch.io release. Worse, they might rage-quit and review-bomb.

**Why it happens:**
Web platform's same-origin storage model — there is no fix at the storage layer.

**How to avoid:**
- **Treat GH Pages as the dev/preview environment, not a public link.** Don't advertise the GH Pages URL to your audience. The itch.io URL is canonical for v1+.
- If GH Pages is shared (e.g. for closed playtesting), make a one-time "export save → JSON download" + "import save → paste JSON" feature. Cheap to build (one button each), saves social grief.
- Versioned save format (Pitfall 2) is a prerequisite — import must validate version + migrate.
- Document: "Save tied to URL — clear browser data on Save will reset."

**Warning signs:**
- Player feedback: "I lost my game" after URL change.
- itch.io comments mention "where did my progress go?"

**Phase to address:** Phase 4 (deploy planning). If preview link will be shared, ship export/import in Phase 4. Otherwise document in README and don't share GH Pages publicly.

---

### Pitfall 12: Tone — political satire crossing into harmful

**What goes wrong:**
The game is satire of an institution. It's funny when it mocks bureaucratic absurdity ("заполните форму №47-Б о блокировке формы №47-А"). It's not funny — and is a legal/platform risk — if it:
- Names individual real people in a way that reads as personal attack or invites harassment.
- Glorifies real harm to real people (jail, violence) as a "score" mechanic.
- Drifts toward content that itch.io / Newgrounds / CrazyGames would moderate (slurs against ethnic/religious groups, calls for real violence).
- Trivializes specific tragedies tied to censorship enforcement.

**Why it happens:**
- Iteration drift: each "edgier" patch feels like the small next step. After 10 small steps you're somewhere the day-0 version wouldn't have gone.
- Comedy bias: the funniest line in playtest is sometimes the one that crosses the line.
- Russian-language content reviewed by non-Russian moderators may misread sarcasm — or correctly read intent and ban.

**How to avoid:**
- Write a one-page "tone bible" in `.planning/` early — target = bureaucratic absurdity, antagonist = the *institution* and its *process*, not named individuals.
- Antagonists/characters are archetypes (Главный Цензор, Младший Инспектор) — not real names, not lookalike portraits.
- No real victims as "score." Currency is "блокировки" (an abstract bureaucratic count), not "посаженных людей."
- Periodic review: every milestone, re-read all text content cold; if a line stops being funny and starts feeling cruel, cut it.
- Pre-publish: read itch.io ToS + CrazyGames content policy. Russian-language games with political themes are accepted, but specific content categories aren't.
- If unsure about a line, the rule is: **does it punch up at the system, or down at people?** Up = keep. Down = cut.

**Warning signs:**
- Friends laugh nervously at playtest, not freely.
- A line makes you hesitate to show your parents/aunt/co-worker.
- A line names a specific living person.
- A mechanic rewards "harming" a recognizable real victim category.

**Phase to address:** Phase 1 (foundational tone) — author the tone bible before writing the first 20 upgrade descriptions. Then re-audit each milestone.

---

### Pitfall 13: Tailwind 4 + Vite — old v3 directives no longer work

**What goes wrong:**
Developer uses Tailwind 3 muscle memory: `@tailwind base; @tailwind components; @tailwind utilities;` in `index.css`, `tailwind.config.js` with `content: [...]`, PostCSS plugin `tailwindcss`. With Tailwind 4 this either errors at build, produces empty CSS, or silently breaks utilities.

**Why it happens:**
Tailwind 4 (released early 2025) replaced the v3 architecture:
- New entry directive: `@import "tailwindcss";` (single line) instead of three `@tailwind` directives.
- PostCSS plugin renamed: `@tailwindcss/postcss` (NOT `tailwindcss`).
- Vite has a first-class plugin: `@tailwindcss/vite` — recommended over PostCSS for Vite projects.
- Config moved to CSS: `@theme { --color-rkn: ...; }` blocks in CSS, not `tailwind.config.js` (config file is now optional / legacy).
- `content` array auto-detected (no manual paths).

**How to avoid:**
- Install: `pnpm add -D tailwindcss @tailwindcss/vite`.
- `vite.config.ts`: import `tailwindcss` from `@tailwindcss/vite` and add to `plugins: [tailwindcss(), react()]`.
- `src/index.css`: literally `@import "tailwindcss";` as the first line.
- Define design tokens via `@theme` in CSS (`--color-rkn-red: #c00; --font-mono: "JetBrains Mono", monospace;`) — they become `bg-rkn-red`, `font-mono` utilities automatically.
- DELETE `tailwind.config.js` unless you genuinely need plugins/preset compat.
- For terminal/ASCII look: define `--font-mono` and a `--color-glow-green` in `@theme`; use `text-glow-green font-mono` everywhere.

**Warning signs:**
- Utilities have no effect in browser (empty CSS shipped).
- Build error: "Cannot find module 'tailwindcss/plugin'".
- `tailwind.config.js` `content` paths are being edited but nothing changes.

**Phase to address:** Phase 0/1 (project bootstrap) — start with v4 idioms, don't migrate later.

---

### Pitfall 14: Zustand strict typing — actions inferred as `any`, persist breaking types

**What goes wrong:**
- `create((set) => ({ ... }))` without explicit generic — `set` is `any`, actions are `any`, IntelliSense gone, strict-mode TS doesn't catch typos.
- Wrapping with `persist(...)` middleware in the wrong order vs `devtools(...)` / `immer(...)` causes type inference to collapse to `unknown`.
- `partialize` returning a different shape than the state type silently breaks rehydration types.

**Why it happens:**
Zustand uses curried `create<T>()(...)` syntax for full type inference when middlewares are involved. Many tutorials show the non-curried form which loses type info with middleware.

**How to avoid:**
- Always: `create<GameState>()(persist((set, get) => ({ ... }), { name: 'rkn-tycoon', version: 1, migrate, partialize, storage: createJSONStorage(() => localStorage) }))`.
- Note the `()` after `<GameState>` — that's the type-safe form for middleware chains.
- Define `GameState` as `State & Actions` union with explicit action signatures: `incrementClicks: (n: Decimal) => void`.
- Slice pattern: split into `createClickSlice`, `createUpgradeSlice`, each typed as `StateCreator<GameState, [], [], ClickSlice>`. Combine in root `create`.
- `partialize: (state) => ({ points: state.points, upgrades: state.upgrades })` — return must be a subset; type with `Partial<GameState>`.
- Enable `strict: true` + `noUncheckedIndexedAccess: true` in tsconfig; lint-time catches half the bugs.

**Warning signs:**
- Hovering an action in VS Code shows `(parameter) set: any`.
- TS doesn't complain when you typo a state field name in `set({ poits: ... })`.
- `migrate(persisted, version)` — `persisted` is `unknown`, every access needs a cast.

**Phase to address:** Phase 1 (store setup). Type once correctly, save a week of debugging later.

---

### Pitfall 15: Click feedback that doesn't feel responsive

**What goes wrong:**
Click handler calls `setState` → React schedules → 16–50ms later the number updates. No sound, no visual pop, no haptic. The button "feels dead." Players bounce within 30 seconds because the core verb of an idle-clicker is *clicking*, and if clicking feels like nothing, there is no game.

**Why it happens:**
Developers focus on correctness ("the number went up") and forget that the *feedback loop* is the product. Cookie Clicker's click feels good because there are 4–6 simultaneous reinforcement channels: pointer-down depression, sound, scale animation, particle, number tick, milestone fanfare.

**How to avoid:**
For every click, ALL of these fire within one frame:
1. Visual: button presses (CSS `:active` scale 0.96 + brief brightness flash) — pure CSS, zero JS cost.
2. Audio: SFX via cached Howl (Pitfall 5) — short, varied (3–5 click samples randomized to avoid ear fatigue), <100ms.
3. Number popup: `+1` floats upward, fades — pooled, CSS-animated (Pitfall 6).
4. Counter visibly increments (with brief 1.05× scale pulse on the big number).
5. Optional: cursor flash / subtle screen shake at high multipliers.
- Click latency budget: under 50ms from `mousedown` to first visible/audible response. Use `pointerdown` not `click` (saves the "wait for up" delay).
- Test on a 4× CPU throttle in Chrome DevTools — must still feel snappy.
- Mobile: respond on `touchstart`, prevent the 300ms tap delay (`touch-action: manipulation`).

**Warning signs:**
- Playtester: "wait, did that register?"
- Click feels late even on fast hardware.
- Big number changes without any peripheral feedback.

**Phase to address:** Phase 1 (core loop). The juice IS the product.

---

### Pitfall 16: Auto-income that feels invisible

**What goes wrong:**
You add "Цензор" buildings that produce passive income. The big counter ticks up smoothly. But there's no visual representation of the buildings *doing* anything — no animation, no per-building output indicator, no occasional flair. Players don't feel ownership of the auto-income. The game stops being a "place to come back to" and becomes a "screen with a number on it."

**Why it happens:**
Designers conflate "the math is correct" with "the experience is satisfying." Cookie Clicker's grandmas visibly twitch and bake; AdVenture Capitalist has progress bars per business. Players need to *see* their empire working.

**How to avoid:**
- Each owned auto-source has a row with: icon, count, per-tick contribution number (animated up subtly), occasionally a flair (every 5–15s, the row pulses, an ASCII glyph cycles, a "+N" floats off it).
- Aggregate stat panel: "Доход: X блокировок/сек" — visibly updating, with sparkline of last 60s (cheap canvas or SVG).
- "Granny twitch" equivalent for ASCII theme: characters in a row blink/swap occasionally (`░░▒▒▓▓` cycling).
- DO NOT animate every building every frame — that's Pitfall 3/6 territory. Stagger: each row picks a random offset, animates once per few seconds.

**Warning signs:**
- Players close the tab while idle (vs. leave it open).
- "I bought it but I don't know if it's doing anything."
- The buildings panel looks identical 5 minutes after first purchase as 5 hours.

**Phase to address:** Phase 2 (auto-income/upgrades).

---

### Pitfall 17: Prestige feels punitive instead of rewarding

**What goes wrong:**
Player has played 2 hours, has impressive numbers and unlocked upgrades. Prestige button says "Reset everything for +5% income." They click → all progress gone → ×1.05 multiplier on a savings account that's now zero. They quit and don't come back.

**Why it happens:**
- Prestige reward (multiplier) feels small in the moment vs. the loss feels total.
- No permanent unlocks across prestiges (achievements, new mechanics, cosmetics).
- First prestige tuned too late (player is over-attached) or too early (player has no idea what they're losing).
- No animation/celebration of prestige — feels like a bug.

**How to avoid:**
- First prestige around 30–90 minutes of play. Tutorial-ish — show what it does *before* committing.
- Prestige multiplier curves so first reset feels like clearly accelerated progress: within 5 minutes after reset, player exceeds where they were pre-reset.
- Pre-prestige preview: "Получишь: 3 ордена ФСБ (+30% к доходу). Сохранятся: ачивки, ордена." — be explicit about what carries over.
- Visible celebration on prestige: full-screen animation, fanfare SFX, "Ты заслужил орден" cutscene-card. Make it feel like an accomplishment.
- Permanent meta: achievements, "tomes" / "ордена" count visible always — proof that progress isn't gone.
- In v1, ONE prestige tier is fine (per PROJECT.md) — but tune it so first-reset reward is *generous*. Better too rewarding than too stingy.

**Warning signs:**
- Playtester hovers prestige, reads it, doesn't click. Asks "why would I do that?"
- Or: clicks it, then quits within 2 minutes post-reset.
- Steam/itch.io review: "the reset is brutal, lost interest."

**Phase to address:** Phase 3 (prestige). But design the meta-currency layer in Phase 2 so prestige has something to hand off.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip save versioning in v1 | -30 min setup | Every balance change wipes all players or crashes | Never — must exist before first deploy |
| Plain `number` for "small" currencies | "It's simpler" | Late-game overflow, mixed-type bugs (Pitfall 8) | Never in economy code; OK for UI-only counters (FPS, ms) |
| `useGameStore()` whole-state subscription | Less code per component | Re-render storm at 20+ components (Pitfall 3) | Acceptable only in tiny demo / single root component |
| `new Howl(...)` per click | Quick to type | Memory leak (Pitfall 5) | Never |
| Skip tone bible | Faster v1 | Drift into harmful content over iterations (Pitfall 12) | Never for politically-themed satire |
| Hardcoded `/asset.png` paths | "Works locally" | Breaks on GH Pages and itch.io (Pitfall 9) | Never — always Vite imports |
| Inline `as any` to silence Zustand types | Compiles now | Loses type safety across the store (Pitfall 14) | Never; the curried `create<T>()` form costs 2 chars |
| One giant Zustand store | Easy mental model | Re-renders, hard to test slices | OK for v1 if state is small (<10 fields); split when adding upgrades |
| Save on every `setState` (default `persist`) | Zero config | Main-thread jank (Pitfall 4) | Never past v0; throttle to 2s + visibility events |
| Single hardcoded SFX file | Ships faster | Players mute the tab from ear fatigue | Acceptable for v0 prototype only |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `break_infinity.js` + JSON | Store Decimal instances directly, lose methods after parse | `Decimal.toString()` on save, `new Decimal(str)` on load, single rehydration boundary |
| Zustand `persist` | Default storage, no version, no partialize, no migrate | Set all four: `name`, `version`, `migrate`, `partialize`, `storage: createJSONStorage(...)` |
| Zustand + middleware types | Non-curried `create(...)` loses inference | Always `create<T>()(persist(devtools(...)))` curried form |
| Howler | New Howl per play | Cache one Howl per SFX module-level, increase `pool` for overlap |
| Framer Motion | `<motion.div>` per click for particles | Pool of N reusable slots, OR pure CSS keyframes |
| Tailwind 4 in Vite | `@tailwind` directives + `tailwindcss` PostCSS plugin (v3 style) | `@import "tailwindcss"` + `@tailwindcss/vite` plugin |
| Tailwind 4 design tokens | Edit `tailwind.config.js` for custom colors | `@theme { --color-…: …; }` in CSS |
| Vite + GH Pages | `base: '/'`, hardcoded asset paths | `base: '/rkn-tycoon/'` for GH Pages, `'./'` for itch.io; assets via `import` |
| Vite + itch.io zip | Zip the `dist/` folder | `cd dist && zip -r ../itch.zip .` (contents only) |
| localStorage | Assume cross-origin survival | Document save is per-origin; ship export/import if sharing preview URL |
| TypeScript strict + Zustand `partialize` | Return arbitrary subset, lose types | Type `partialize` return as `Pick<GameState, 'points' \| 'upgrades' \| ...>` |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Whole-tree re-render per tick | DevTools flame chart full of React work even when idle | Granular selectors with `useShallow`; imperative big-number display | At ~20+ subscribed components / 10Hz tick |
| Synchronous localStorage write per tick | Recurring 50–200ms `setItem` blocks in Performance tab | Throttle persist to 2s + visibility events | Immediately at 10Hz tick; worse as save grows |
| Howl-per-click leak | Tab memory grows unbounded with click count | One cached Howl per SFX; `pool: 20` for overlap | After ~1000 clicks (~1 min rapid play) |
| Framer Motion particle spam | FPS drops during click spam; detached motion DOM nodes | CSS keyframes or pooled motion slots for click FX | At ~10 clicks/sec sustained |
| Stringify of growing state | Save time grows linearly; eventual quota errors | `partialize` to keep save lean; cap event log; don't persist UI state | Approaching 1 MB save (warning), 5 MB (hard) |
| Reading `Decimal` via `.toNumber()` for display | Sudden `Infinity` past 1e308 in UI | Use a dedicated `formatDecimal(d): string` (K/M/B/aa/ab) — never `.toNumber()` for display | At exponent ≥ 309 |
| `setInterval` drift | Tick miscounts over long sessions; offline-progress wrong | Use `performance.now()` deltas inside tick; compute elapsed, don't count ticks | After 1+ hour sessions / when adding offline progress |
| Animation frame loop AND setInterval | Two loops fighting | One game-loop authority (rAF or setInterval), the other is for visuals only | Any time both exist simultaneously |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Trusting localStorage as anti-cheat | Players edit numbers, post "fake" scores | Don't compete on shared leaderboards in v1 (out of scope per PROJECT.md). If added later, server-side validation. For v1, accept that solo idle game saves are inherently mutable — it's their save file. Optional: simple checksum to discourage casual edits, but don't pretend it's security. |
| Unsanitized save import (if shipped) | Pasted JSON could include unexpected fields → XSS via rendered text or prototype pollution | Validate imported save against schema (zod); reject extra fields; never `dangerouslySetInnerHTML` from save data |
| Reflecting save data in DOM unsafely | If save fields are rendered raw, a mutated save with `<script>` content could execute on import | React's default escaping is fine; never bypass with `dangerouslySetInnerHTML` for any user-mutable data |
| Hosting analytics from outside the bundle | itch.io / GH Pages CSP may block; user privacy expectations | Skip analytics in v1; use itch.io's built-in metrics |
| Mixing dev-only debug commands into prod | Players find `window.__cheat = true` and grief themselves | Wrap debug exposures in `if (import.meta.env.DEV)` |
| Storing anything personal in localStorage | None really at this scale, but be aware | Only game state, no names/emails/anything identifying — already aligned with no-account design |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Click feels dead (no sound/animation/popup) | Player bounces in 30s | All 5 feedback channels within 50ms of pointerdown (Pitfall 15) |
| Number too big to read (`1.234567e89`) | Player loses sense of progress | Format as `1.23 aa` / `1.23 KK` with proper engineering notation; show exponent only past ~aa-zz scale |
| Russian copy but no Russian-friendly font fallback | Cyrillic renders in browser default sans, breaks the terminal aesthetic | Self-host JetBrains Mono / IBM Plex Mono with Cyrillic subset; fallback chain ends in `monospace` |
| Mobile: button too small or behind keyboard | Mobile players can't engage | Min 56×56px hit target; viewport meta tag; `touch-action: manipulation` |
| No offline-progress message | Player returns after a day, sees nothing happened | On focus after >30s away, calculate elapsed × cps, show "Пока тебя не было: +X блокировок" toast |
| Prestige confirm with no preview | Players nuke themselves accidentally | Two-step modal: preview reward + costs, explicit confirm |
| All upgrade names in same register | Comedy fatigue | Mix tone: bureaucratic absurdity / pseudo-official / parodic acronyms. Vary length and rhythm. |
| No tutorial / first-five-minutes guidance | Players don't discover auto-buy, prestige, achievements | Light onboarding: pulsing arrow on first available upgrade; explanation only when first relevant |
| Save-wipe button hidden / scary / non-existent | Confused players who can't reset to try again | Settings → "Полный сброс" with double-confirm; reachable but not accidental |
| Audio defaults to on at full volume | Player opens in office, panics | Mute toggle visible top-right; persist volume; respect `prefers-reduced-motion` for FX too |
| Numbers update so fast they're unreadable | Big counter blurs into illegibility past 1k/sec | Smooth-display: animate counter toward target value rather than jumping per tick; cap visible decimals; truncate trailing zeros |

---

## "Looks Done But Isn't" Checklist

- [ ] **Save load:** Reload the tab — does the game come back exactly as left? Test 3× in a row.
- [ ] **Save migration:** Hand-edit `localStorage` to a previous version's shape — does the migration run, or does the game crash?
- [ ] **Decimal serialization:** Open save in DevTools — are big numbers stored as strings (`"1.23e45"`), not as plain objects?
- [ ] **Click feedback:** Throttle CPU 4× in DevTools — does click still feel under 50ms responsive?
- [ ] **Autosave cadence:** Watch Network/Storage panel for 30s — saves should fire every ~2s, not every tick.
- [ ] **Howl reuse:** Click 100× rapidly — does memory in Task Manager stay flat (±5MB)?
- [ ] **Re-render scope:** Open React DevTools Highlight — clicking should highlight only the counter + popup pool, not the whole tree.
- [ ] **Offline progress:** Close tab for 5 min, reopen — does the game grant proportional offline income and show a "while you were away" message?
- [ ] **Prestige preview:** Hover prestige before pressing — is the reward clearly stated *before* clicking?
- [ ] **GH Pages deploy:** Build for GH Pages base path, open in incognito — does it load, or is there a 404 storm?
- [ ] **itch.io zip:** Unzip the build — is `index.html` at the zip root (not inside a `dist/` folder)?
- [ ] **Mobile portrait:** Resize browser to 360×640 — is the click button reachable with a thumb? No horizontal scroll?
- [ ] **No-audio first paint:** Disable audio in OS — does the game load without console errors and still feel responsive (visual feedback alone is enough)?
- [ ] **Russian text everywhere:** grep the build for hardcoded English UI strings that leaked in.
- [ ] **Tone audit:** Re-read all upgrade/achievement copy in one sitting — does any line punch *down* instead of *up*?
- [ ] **TypeScript strict:** No `any`, no `as any`, no `@ts-ignore` in economy/save code.
- [ ] **Number formatting:** Force `state.points = new Decimal('1e500')` in console — does UI display gracefully (e.g. `1.00 aaa`) or break?
- [ ] **Reset flow:** Hard reset from settings — does it return to truly first-launch state, not a half-reset?
- [ ] **Save export/import (if shipped):** Export → clear storage → import — exact same state restored?

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Decimal not rehydrating (saves already in the wild) | MEDIUM | Ship migration that detects plain-object form (`obj.mantissa !== undefined`) and rebuilds via `new Decimal(obj)`. Add unit test. Bump version. |
| Save versioning never existed | MEDIUM-HIGH | Treat existing save as `version: 0`. Write `migrateV0toV1` that maps current fields → new shape with sensible defaults. Test against real saves from playtesters. |
| Re-render storm discovered late | LOW-MEDIUM | Profile, identify top offender, convert that one component to a granular selector. Iterate. Often 2–3 components are responsible for 90% of work. |
| localStorage already bloated | LOW | Add `partialize` excluding bloat fields, deploy. Existing saves shrink on next save. Maybe drop event log. |
| Howl leak in production | LOW | Refactor to cached Howl factory; verify with memory snapshot. Player tabs already running won't leak after refresh. |
| Wrong Vite base on deployed build | LOW | Rebuild with correct `base`, redeploy. Players who bookmarked the broken page → cache-bust or wait. |
| itch.io zip rejected | LOW | Re-zip with `cd dist && zip ...`; re-upload. |
| Cross-origin save loss between GH Pages and itch.io | HIGH | No technical recovery — saves are gone. Ship export/import before the move, OR accept that GH Pages preview audience starts over on itch.io. Communicate clearly. |
| Tone content too harsh, already published | MEDIUM | Patch text; if itch.io complained, follow their remediation; do a tone-bible re-audit; reduce risk of recurrence. |
| Tailwind 4 migration mid-project | LOW-MEDIUM | Mostly mechanical: replace `@tailwind` lines with `@import`; move `theme.extend` colors to `@theme` block; swap PostCSS plugin for `@tailwindcss/vite`. ~1 hour for a small project. |
| Prestige tuned wrong (too punitive) | LOW | Hot-patch the multiplier curve; bump save version with a migration that grants legacy players a one-time bonus to compensate. |
| Balance broken late-game (player stuck) | MEDIUM | Spreadsheet-model the curve, ship a balance patch with migration that re-grants currency proportional to current progress; communicate as "balance update." |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. Decimal lost across JSON | Phase 1 (persistence) | Unit test: serialize→deserialize→`.add()` works |
| 2. Save versioning missing | Phase 1 (persistence) | Save file contains `version`; migration runs on legacy shape |
| 3. Per-tick whole-tree re-render | Phase 1 (loop) + Phase 2 (upgrades) | React DevTools highlight scoped to counter only |
| 4. localStorage write per tick | Phase 1 (persistence) | Perf trace shows `setItem` at 2s interval, not per tick |
| 5. Howl-per-click leak | Phase 1 (click feel) | Memory flat after 100 rapid clicks |
| 6. Framer Motion on hot path | Phase 1 (click feel) | 60fps sustained at 20 clicks/sec |
| 7. Cost/income divergence | Phase 2 (economy) | Sim spreadsheet shows interesting decisions at t=1m/10m/1h |
| 8. Mixed Decimal/number in economy | Phase 1 (currency) | Grep: no `+`/`-` operators on economy fields |
| 9. Vite base path wrong | Phase 4 (deploy), planned Phase 1 | GH Pages preview loads without 404s |
| 10. itch.io zip wrong | Phase 4 (deploy) | `unzip -l` shows `index.html` at root |
| 11. Cross-origin save loss | Phase 4 (deploy planning) | Either don't share GH Pages URL, or export/import shipped |
| 12. Tone crossing into harmful | Phase 1 (tone bible), each milestone | Tone audit at every transition |
| 13. Tailwind 4 v3 idioms | Phase 0/1 (bootstrap) | `@import "tailwindcss"` present; no `tailwind.config.js` unless needed |
| 14. Zustand types as `any` | Phase 1 (store) | `create<GameState>()(...)` curried; no `any` on actions |
| 15. Click feels dead | Phase 1 (click feel) | Playtest: "feels responsive" unprompted |
| 16. Auto-income invisible | Phase 2 (auto-income) | Each owned source has visible per-tick activity |
| 17. Prestige punitive | Phase 3 (prestige) | Playtester clicks prestige; reaches old peak within 5 min post-reset |

---

## Sources

- Zustand persist middleware docs & v5 migration notes — official GitHub README and `docs/guides/typescript.md`
- Tailwind CSS 4.0 release notes (Jan 2025) — `tailwindcss.com/blog/tailwindcss-v4`, `tailwindcss.com/docs/installation/using-vite`
- Vite 5 deploy guide — `vitejs.dev/guide/static-deploy.html#github-pages`
- break_infinity.js README (Patashu) — `github.com/Patashu/break_infinity.js`
- Howler.js docs on pooling and Web Audio — `github.com/goldfire/howler.js`
- itch.io HTML5 game upload requirements — `itch.io/docs/creators/html5`
- Cookie Clicker design retrospectives & GDC talks on idle-game feedback loops
- Game-dev community post-mortems on idle-clicker balance (r/incremental_games)
- Personal/known issues from React+TS+Zustand strict-mode integration (Zustand issue tracker)
- Framer Motion performance guidance — `motion.dev/docs/performance`

---
*Pitfalls research for: 2D idle-clicker (RKN Tycoon) — React 18 + TS + Vite 5 + Tailwind 4 + Zustand + Framer Motion + break_infinity + Howler + localStorage*
*Researched: 2026-05-15*
