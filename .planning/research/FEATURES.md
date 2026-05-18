# Feature Research

**Domain:** 2D idle-clicker web game (Cookie-Clicker-style), Russian-language, RKN/Roskomnadzor censorship satire
**Researched:** 2026-05-15
**Confidence:** HIGH (genre conventions are stable and well-documented; content list is opinionated creative output)

## Executive Summary

Idle-clickers are a mature genre with a tight set of conventions. Players coming from Cookie Clicker, AdVenture Capitalist, Trimps, NGU Idle, and Universal Paperclips expect a very specific loop: click → see counter explode → buy upgrade → watch idle income tick → buy generator → wait → prestige reset → watch numbers go *bigger*. Deviating from this loop without a strong narrative hook (Universal Paperclips is the rare exception) is the #1 reason indie idle-games bounce.

For RKN Tycoon, the genre-fit work is already done — the differentiator is **theme, voice, and content density of the satire**, not novel mechanics. v1 should ship Cookie-Clicker-grade mechanics with bureaucratic/security-state flavor cranked to 11. The content lists below (8+ click upgrades, 8 auto-censors, 12 achievements, 6 events, 1 prestige) are designed to be ship-ready: each item has a Russian name, English gloss, a satirical hook tied to real RKN-era artifacts (TSPU/ТСПУ, Yarovaya law, sovereign internet, blacklist registry), cost/income formulas, and a tone note.

The progression curve uses the genre-standard 1.15× cost scaling and ~7× income scaling per tier, with a single prestige currency ("Звёзды Цензора") unlocking at ~1e9 blocks and granting +2% income per star. This produces the classic "30 min → first prestige → 2 hours back to where you were but faster" pacing that Cookie Clicker fans recognize.

**Tone discipline:** Satire targets institutions, laws, and absurdities of the bureaucratic apparatus — never ethnic groups, individuals by full real name, or specific living dissidents. The humor punches at the *system* (Закон Яровой, ТСПУ, реестр запрещённых сайтов), which is fair-game satirical material with a long tradition in Russian-language internet culture.

## Genre Conventions (Reference Analysis)

### Reference Games — What They Teach

| Game | Key Lesson for RKN Tycoon |
|------|---------------------------|
| **Cookie Clicker** | The gold standard. Click button + buildings (10+) + upgrades (100s) + golden cookies + ascension. Density of flavor text matters as much as numbers. |
| **AdVenture Capitalist** | UI plotting — many parallel generators, "buy 10/100/max" buttons, angel investors prestige. Number scaling via suffixes (K/M/B/T/aa/ab...). |
| **Universal Paperclips** | Narrative-driven phases — content gates progression. RKN Tycoon could borrow micro-narrative beats (e.g., "Указ №№№: новая статья УК активирована"). |
| **Trimps** | Heroic-zones depth + meta-currencies. Too complex for v1, but the "log of events" UI is worth borrowing. |
| **NGU Idle** | Multiple parallel resources, sprawling mid-game. Cautionary tale: don't ship v1 with too many resources — one currency only. |

### Standard Progression Math (Genre Convention)

These formulas are battle-tested across the genre and what players viscerally expect:

| Parameter | Standard Formula | Notes |
|-----------|------------------|-------|
| Generator cost growth | `cost_n = base * 1.15^n` | Cookie Clicker uses 1.15 exactly. AdVenture Capitalist 1.07. 1.15 is sweet spot for "feel fast." |
| Generator income tier scaling | `next_tier_income ≈ 7-10× previous` | Cookie Clicker uses ~10×, scaled by upgrades. |
| Click value scaling | Click upgrades typically 2× or +X% per tier | Click should stay relevant ~10-30 min, then auto-income dominates. |
| Click value floor (mid-game) | `click ≈ 1% of CPS` after first few generators | Genre standard. Pure-clicker dies fast; clicker that converts to idle is the loop. |
| Prestige unlock threshold | First prestige at `~1e9` (1B) total blocks | Cookie Clicker: 1 trillion → 1 heavenly chip. We scale down (1e9) for faster v1 validation. |
| Prestige currency formula | `stars = floor((total_blocks / 1e9)^0.5)` | Square-root growth. Each star = +2% global income permanent. |
| Save tick | Every 5-10 seconds + on visibility-change | localStorage write throttled. Offline progress capped at 24h. |
| Idle tick rate | 100ms-1000ms game loop | 250ms is good balance for smooth counter without burning CPU. |

## Feature Landscape

### Table Stakes (Users Expect These — Missing = Game Feels Broken)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Big satisfying click button with juice | Genre core; first-30-seconds make-or-break | LOW | Animation (scale 1.0→0.95→1.0), floating "+N" numbers, click SFX, screen-shake at thresholds |
| Single currency counter with smart formatting | Counter is the dopamine | LOW | break_infinity.js + suffixes K/M/B/T/aa/ab. Always visible, top of screen |
| Click upgrades (multiplicative tiers) | Make clicking matter early | LOW | 8-12 items; cost ramp 2-5× per tier; auto-unlocks on hitting threshold |
| Auto-generators (idle income) | "Idle" in idle-clicker | LOW | 6-10 items; cost 1.15^n; income computed per-second; visible CPS per generator |
| "Buy 1 / 10 / Max" buttons | AdVenture Capitalist made this standard | LOW | Compute max-affordable in closed form; show next-cost |
| Cost growth (exponential 1.15×) | Players viscerally expect it | LOW | Single line of math; same for all generators |
| localStorage autosave | Losing progress = uninstall | LOW | Throttled write every 10s + on visibilitychange; serialize Zustand state to JSON |
| Offline progress on reload | Modern genre standard since ~2015 | MEDIUM | Compute `time_delta * total_cps`; cap at 24h; show "While you were away..." modal |
| Achievements with milestone popups | Cookie Clicker made these mandatory | LOW | 12+ at launch; toast notification + persistent list panel |
| Random clickable events ("golden cookie") | Keeps active play rewarding | LOW | Spawn every 60-180s random; 13s window to click; 4-6 effect types |
| Prestige reset with permanent multiplier | Endgame of v1; defines re-engagement | MEDIUM | Single currency; confirm modal; cleanly wipes generators + click upgrades; preserves achievements + prestige stars |
| Number formatting (К/М/Б/Т/аа/аб) | Russian-language abbreviations | LOW | Localize suffixes: K→К, M→М, B→Б, T→Т; or keep Latin for genre familiarity |
| Sound on/off toggle | Players play in public/at work | LOW | Single icon, persist in localStorage. Default ON for first click then respect setting. |
| Tab title with live counter | Encourages tab-park / idle play | LOW | `document.title = formatBlocks(state.blocks) + ' блокировок'` |

### Differentiators (What Makes This RKN Tycoon, Not "Generic Clicker #4912")

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Bureaucratic flavor text on every entity | Theme density = memorable game; Cookie Clicker won on flavor text | LOW | Every upgrade, censor, achievement has 1-2 sentence "официальное описание" in bureaucratic-Soviet register |
| Russian-language pseudo-decrees as event log | Universal Paperclips proved narrative beats lift retention | LOW | Bottom log: "[ВНИМАНИЕ] Указ №451: разблокирован цензор «Эшелон ТСПУ»". Pure flavor, no mechanics |
| ASCII/terminal aesthetic (monospace, glow, borders) | Visually unique vs cookie-pile / cash-pile clones; matches "spy agency terminal" theme | MEDIUM | Tailwind + custom font stack (JetBrains Mono / IBM Plex Mono); CSS box-drawing borders; subtle green/amber CRT glow |
| "Реестр запрещённых сайтов" visual counter | Theme-specific currency visualization beyond a number | LOW | Side panel: scrolling list of fake-blocked domains (`vpn-***.com`, `freedom-***.org`, `telegram-***.net`) — pure cosmetic |
| Real-event-referenced achievements | Insider satire jokes that resonate with target audience | LOW | "Закон Яровой принят" (buy first surveillance upgrade), "Великий китайский файрвол младший" (own 100 ТСПУ) |
| Click button visual = stamping rubber stamp | Theme-perfect click metaphor vs abstract cookie | LOW | "ЗАБЛОКИРОВАТЬ" stamp imprint animation on click; can ship as CSS/SVG, no asset pipeline |
| "Утечка в Telegram" - inverse event (penalty) | Most idle-clickers only have positive events; downside event adds tension | LOW | Rare event (5% of spawns): if clicked, lose 5% income for 30s. Adds risk/reward to event clicking |
| Press-release-style prestige flavor | Makes the reset feel like a *promotion* not a loss | LOW | Prestige modal: "Указом Президента вы повышены в звании. Старая структура расформирована. Новые «Звёзды Цензора»: +N" |

### Anti-Features (Common Idle-Clicker Traps to Explicitly Avoid)

| Feature | Why Tempting | Why Problematic | Alternative |
|---------|--------------|-----------------|-------------|
| Multiple resources in v1 (e.g., "блоки" + "штрафы" + "лояльность") | Adds depth, mirrors NGU Idle | Splits player attention; v1 loop validation needs single currency clarity | One currency in v1. Second resource in v2 only if loop validates |
| Multi-tier prestige (rebirth → ascension → transcendence) | Late-game endgame | Confuses new players; doubles testing surface; v1 hasn't proven prestige #1 is fun yet | Ship 1 prestige tier. Add tier #2 only after telemetry shows players prestiging 3+ times |
| Active combat / boss fights (Trimps-style) | Adds engagement | Changes the genre contract; combat in idle-clickers fragments audience | Random events serve the "engagement spike" role; no combat in v1 |
| Skill tree / branching upgrades | Feels like depth | Doubles content load (need balanced branches); paralysis-of-choice for new players | Linear upgrade tracks. Branching is v2+ |
| Daily login bonuses / login streaks | F2P-mobile pattern, "boosts retention" | Punishes casual play; web/itch.io audience hates dark patterns; not aligned with project values | Offline-progress already rewards returning. No streak mechanic. |
| Real-money microtransactions / energy meters | Monetization "potential" | Out of scope — game is free on itch.io. Adds infra (payments, auth). Hurts review scores | itch.io optional pay-what-you-want only. No IAP, no energy meter |
| Achievements that require luck / 0.01% drops | "Hardcore" content | Encourages save-scumming; rage-quit risk; achievement-hunter audience hates it | All achievements are deterministic milestones. Lucky events stay flavor |
| Lore-dump tutorial walls | "Tell the story upfront" | Players skip; idle-clickers teach by tooltip + first-click feedback | Zero-text tutorial. First click reveals counter. First 25 blocks unlock first upgrade. Tooltips on hover only |
| Push notifications / browser notifications | "Increase retention" | Web audience considers it spam; itch.io doesn't support it well | Tab-title live counter is sufficient ambient signal |
| Cloud save / accounts | "Cross-device" | Requires backend, auth, GDPR; kills the "zero-server" architecture | localStorage + JSON export/import string (one button, pasteable). v2 |
| Animated character mascots ("Игорь-цензор") | "Personality!" | Asset pipeline (illustration, animation) blocks shipping; ASCII art is the project's answer | ASCII-art portraits if any, generated at build-time. No animated mascots |
| Real names of living officials / dissidents | "Sharper satire" | Defamation risk; itch.io content policy; ages poorly; alienates players who disagree with naming individuals | Target institutions, laws, acronyms, abstract titles ("Начальник Управления"). Never individuals by full name. |

## Concrete Content List — v1 Ship-Ready

### Click Upgrades (10 items)

Tone: bureaucratic escalation, each upgrade is "officially authorized" tool. Cost ramp ≈ 5× per tier. Effect: multiplies click value.

| # | Russian name | English gloss | Effect | Cost (blocks) | Unlock |
|---|--------------|---------------|--------|---------------|--------|
| 1 | Резиновая печать | Rubber stamp | Click ×2 | 100 | Start |
| 2 | Чёрный список 1.0 | Blacklist v1.0 | Click ×2 | 500 | After #1 |
| 3 | Регламент блокировки | Blocking regulation | Click ×2 | 2 500 | After #2 |
| 4 | Закон Яровой | Yarovaya Law | Click ×3 | 15 000 | After #3 |
| 5 | DPI-оборудование | DPI hardware | Click ×3 | 100 000 | After #4 |
| 6 | Единый реестр запрещённых сайтов | Unified registry of banned sites | Click ×4 | 750 000 | After #5 |
| 7 | Автоматизированная система «Ревизор» | "Revizor" automated system | Click ×5 | 5e6 | After #6 |
| 8 | AI-классификатор контента | AI content classifier | Click ×5 | 4e7 | After #7 |
| 9 | Квантовый цензор | Quantum censor | Click ×7 | 3e8 | After #8 |
| 10 | Указ Президента №451 | Presidential decree №451 | Click ×10 | 2.5e9 | After #9 |

**Cost formula:** `cost_n = 100 * (5..7)^(n-1)` — geometric, gives ~10 hours to reach #10 in pure click-mode, ~2-3 hours with auto-income.

### Auto-Censors (Idle Generators, 8 items)

Tone: organizational escalation — from intern to nation-state-scale infrastructure. Cost growth 1.15× per copy (genre standard).

| # | Russian name | English gloss | Base CPS | Base cost | Flavor |
|---|--------------|---------------|----------|-----------|--------|
| 1 | Стажёр-цензор | Censor intern | 0.5 | 15 | "Молод, неопытен, но полон рвения" |
| 2 | Районный эксперт | District expert | 5 | 100 | "Знает все запрещённые слова наизусть" |
| 3 | Региональное управление | Regional directorate | 47 | 1 100 | "С печатью и бланками установленного образца" |
| 4 | Отдел мониторинга СМИ | Media monitoring department | 260 | 12 000 | "24/7 смотрит, чтобы вы спали спокойно" |
| 5 | Эшелон ТСПУ | TSPU Echelon | 1 400 | 130 000 | "Технические средства противодействия угрозам. Установлены у всех операторов." |
| 6 | Нейросеть-классификатор | Neural-net classifier | 7 800 | 1.4e6 | "Не спит, не ест, не просит индексации зарплаты" |
| 7 | Министерство правды | Ministry of Truth | 44 000 | 2e7 | "Орвелл предупреждал. Никто не послушал." |
| 8 | Суверенный интернет | Sovereign internet | 260 000 | 3.3e8 | "Автономный сегмент Сети. Связь с миром — по специальному разрешению." |

**Income formula per generator type:** `total_cps_type = base_cps * count * (1 + 0.01 * upgrade_count) * prestige_multiplier`. Generator-specific upgrades unlock at 10/25/50/100/150/200/250 owned (genre standard).

**Suggested generator-tier scaling rationale:** each tier ~7× CPS for ~10× cost — slight pay-off curve means newer generators are always best buy when affordable, but old ones still contribute meaningfully. Matches Cookie Clicker feel.

### Achievements (12 items)

Mix of: milestone (blocks counter), behavioral (player actions), narrative (satirical references). All deterministic — no RNG-locked achievements.

| # | Russian name | English gloss | Trigger | Type |
|---|--------------|---------------|---------|------|
| 1 | Первая жалоба рассмотрена | First complaint reviewed | First click | Behavioral |
| 2 | Реестр пополнен | Registry expanded | Reach 1 000 blocks | Milestone |
| 3 | Бюрократ среднего звена | Mid-level bureaucrat | Reach 1e6 (1М) blocks | Milestone |
| 4 | Великий цензор | Grand Censor | Reach 1e9 (1Б) blocks | Milestone |
| 5 | Архитектор тишины | Architect of silence | Reach 1e12 (1Т) blocks | Milestone |
| 6 | Указ подписан | Decree signed | Buy first click upgrade | Behavioral |
| 7 | Штатное расписание | Staffing roster | Own 50 of one generator type | Behavioral |
| 8 | Закон Яровой принят | Yarovaya Law passed | Buy click upgrade #4 | Narrative |
| 9 | Великий китайский файрвол младший | Little Great Firewall | Own 100 ТСПУ Echelons | Narrative |
| 10 | Орден на грудь | Medal on chest | First prestige | Behavioral |
| 11 | Ветеран службы | Service veteran | 5 prestiges | Behavioral |
| 12 | VPN? Не слышал | "VPN? Never heard of it" | Click 10 «Утечка в Telegram» events without missing | Skill |

### Random Clickable Events (6 items, "golden cookie" equivalents)

Spawn timer: random between 90s-300s. On-screen for 13s. Click to trigger effect. One event = one effect (mutually exclusive).

| # | Russian name | English gloss | Effect | Rarity | Visual |
|---|--------------|---------------|--------|--------|--------|
| 1 | VPN-утечка | VPN leak | +30 sec income multiplied ×7 ("frenzy" mode) | Common (40%) | Pulsating red icon |
| 2 | Свободный интернет! | Free internet! | Instant: +13× current CPS in blocks | Common (30%) | Pulsating cyan icon (positive = ironic in-theme) |
| 3 | Внеплановая проверка | Unscheduled inspection | ×77 click value for next 77 clicks | Uncommon (15%) | Yellow stamp icon |
| 4 | Утечка в Telegram | Telegram leak | NEGATIVE: -5% income for 30s (rare) — but clicking it consciously gives the «VPN? Не слышал» achievement | Uncommon (10%) | Dark icon, looks tempting |
| 5 | Государственный заказ | State order | +1 minute of CPS as instant lump sum | Rare (4%) | Golden eagle icon |
| 6 | «Чёрный лебедь» | Black swan | Massive: +15 minutes of CPS, OR 1 free prestige star (50/50 random outcome on click) | Very rare (1%) | Black silhouette icon |

**Anti-feature note:** Event #4 (negative) is deliberately marked visually different but still tempting. Achievement #12 rewards skill (avoiding it). This adds active-play depth without punishing AFK players (the worst case is -5% for 30s, recoverable).

### Prestige Mechanic

**Name:** **«Звёзды Цензора»** (Censor's Stars).

**Rationale for name choice:** "Орден ФСБ" was considered but rejected — names a specific real agency and skews humor toward conspiracy register. "Звезда Героя цензуры" was considered but the singular "hero" framing doesn't scale (you collect *many* stars). "Звёзды Цензора" is generic-bureaucratic, pluralizable (1 звезда → 47 звёзд → 1 200 звёзд reads fine), and visually maps to military epaulet/medal iconography — perfect for ASCII rendering as `★` or `✦`.

**Mechanic:**
- **Unlock threshold:** 1e9 (1 billion) total lifetime blocks
- **Formula:** `stars_gained = floor((total_blocks / 1e9) ^ 0.5)` (square-root growth, genre standard)
- **Effect:** Each star = +2% global income multiplier, permanent across resets
- **Reset wipes:** current blocks, all generators, all click upgrades
- **Reset preserves:** stars, achievements, total-lifetime-blocks counter, settings
- **UI:** confirmation modal styled as a "пресс-релиз" — "Указом Президента вы повышены в звании. Старая структура расформирована. Личный состав распущен. Звёзды Цензора: +N. Подтвердить?"
- **Visual reward:** epaulet UI element showing current star count, animated star-appear on prestige

**Why not multi-tier in v1:** as documented in anti-features, validating that *one* prestige loop is fun must precede adding a second tier. NGU Idle players accept layered prestige; new idle players bounce.

## Feature Dependencies

```
[Big Click Button] (foundation)
    └──requires──> [Currency Counter (break_infinity)]
                       └──requires──> [Zustand Store + Game Loop Tick]

[Click Upgrades]
    └──requires──> [Currency Counter]

[Auto-Censors]
    └──requires──> [Game Loop Tick]
    └──requires──> [Currency Counter]

[Prestige]
    └──requires──> [Click Upgrades] AND [Auto-Censors] (needs something to reset)
    └──requires──> [Confirmation Modal]
    └──requires──> [Global Multiplier in income formula]

[Offline Progress]
    └──requires──> [localStorage Save]
    └──requires──> [Auto-Censors] (no point without idle income)

[Random Events]
    └──requires──> [Game Loop Tick]
    └──requires──> [Currency Counter]

[Achievements]
    └──requires──> [Currency Counter] AND [Event Bus from game actions]
    └──enhances──> [Prestige, Click, Events] (achievements reference all systems)

[ASCII Aesthetic / Реестр сайтов visual]
    ──enhances──> [All UI]
    ──independent of──> [Game Logic] (cosmetic layer)

[Click-SFX]
    ──enhances──> [Big Click Button]

[Tab Title Counter]
    ──requires──> [Currency Counter]
    ──enhances──> [Offline Progress] (encourages tab-park)
```

### Critical Dependency Notes

- **Save MUST come before everything else:** if save isn't bulletproof from day-1, all player progress is at risk and every later feature compounds the bug surface. Save serialization is the spine.
- **Currency formatting (break_infinity + suffixes) must land in same phase as Currency Counter:** retrofitting big-number math after numbers overflow is genre-deadly. Already a key decision in PROJECT.md.
- **Prestige requires the income formula to multiply by `prestige_multiplier` from day 1**, even if multiplier is hardcoded to 1.0 pre-prestige. Otherwise prestige requires refactoring every generator's income calculation.
- **Events conflict with nothing but require a "global multiplier window" concept** (frenzy = temporary ×7). Bake the timed-multiplier system in from the auto-censors phase, not bolted on later.
- **Achievements are read-only consumers** of all game state — they can be added last with minimal risk.

## MVP Definition

### Launch With (v1) — Already aligned with PROJECT.md Active list

- [ ] Click button with juice (animation + SFX + floating +N) — core loop
- [ ] Single currency «блокировки» with break_infinity.js + suffix formatting — table-stakes math
- [ ] 8-10 click upgrades (linear track) — gives early-game purchase decisions
- [ ] 6-8 auto-censors with 1.15× cost ramp — defines the idle-income curve
- [ ] Buy 1 / 10 / Max buttons — UX table-stakes
- [ ] localStorage autosave every 10s + on tab-blur — no data loss
- [ ] Offline progress on reload (24h cap) with "while you were away" modal — modern table-stakes
- [ ] 1 prestige tier («Звёзды Цензора») with confirm modal — endgame for v1
- [ ] 4-6 random clickable events — active-play retention
- [ ] 10-12 achievements with toast popups + persistent panel — completion drive
- [ ] Tab title live counter — ambient retention
- [ ] Sound on/off toggle — accessibility table-stakes
- [ ] ASCII/terminal aesthetic + bureaucratic flavor text on every entity — the differentiator

### Add After Validation (v1.x)

- [ ] Generator-specific upgrades unlocked at 10/25/50/100 owned (Cookie Clicker style) — adds mid-game decisions; trigger: telemetry shows players plateau at one generator count
- [ ] Реестр запрещённых сайтов visual side panel — pure cosmetic, defer until core ships
- [ ] Press-release-style decree log at bottom of screen — pure flavor, defer
- [ ] JSON export/import save string — power-user feature; trigger: player request
- [ ] Background music (toggleable, default off) — trigger: player request after SFX feels insufficient
- [ ] Statistics screen (clicks/sec, total clicks, time played) — completionists love these
- [ ] More click upgrades / generators (extend lists to 15/12) — content depth

### Future Consideration (v2+)

- [ ] Multi-tier prestige (second resource above stars) — only if v1 telemetry shows players prestige 5+ times
- [ ] Mini-game challenges (Cookie Clicker dungeons) — content load is heavy
- [ ] Cross-tab sync via BroadcastChannel — niche
- [ ] PWA install + offline page — only if itch.io audience requests
- [ ] CrazyGames SDK port — separate distribution effort, out of scope per PROJECT.md
- [ ] Steam version (Electron wrap) — only after itch.io validates audience

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Click button + counter + click SFX | HIGH | LOW | P1 |
| break_infinity + number formatting | HIGH | LOW | P1 |
| Click upgrades (8-10 items) | HIGH | LOW | P1 |
| Auto-censors (6-8 items) | HIGH | LOW | P1 |
| Buy 1/10/Max | HIGH | LOW | P1 |
| localStorage save + offline progress | HIGH | MEDIUM | P1 |
| Prestige (1 tier) | HIGH | MEDIUM | P1 |
| Random events (4-6) | HIGH | LOW | P1 |
| Achievements (10-12) | MEDIUM | LOW | P1 |
| ASCII aesthetic + flavor text | HIGH | MEDIUM | P1 |
| Tab title counter | MEDIUM | LOW | P1 |
| Sound toggle | MEDIUM | LOW | P1 |
| Generator-specific upgrades (10/25/50) | MEDIUM | MEDIUM | P2 |
| Реестр-сайтов cosmetic panel | LOW | LOW | P2 |
| Decree log at bottom | LOW | LOW | P2 |
| JSON save export/import | LOW | LOW | P2 |
| Statistics screen | LOW | LOW | P2 |
| Background music | LOW | MEDIUM | P3 |
| Multi-tier prestige | LOW (v1) | HIGH | P3 |
| Mini-game challenges | LOW | HIGH | P3 |

## Competitor Feature Analysis

| Feature | Cookie Clicker | AdVenture Capitalist | Universal Paperclips | Our Approach |
|---------|----------------|----------------------|----------------------|--------------|
| Click button as primary loop | Yes — central cookie | Tap-to-earn but fades fast | Yes — paperclip button | Yes — large «ЗАБЛОКИРОВАТЬ» stamp, animation + SFX |
| Number of generator types | ~20 | ~10 | N/A (narrative phases) | 8 (v1), 12 (v1.x) — middle ground |
| Cost growth rate | 1.15× | 1.07× | Variable | 1.15× (Cookie Clicker feel — faster gratification) |
| Prestige system | Heavenly chips (deep) | Angel investors | Trust → Yomi (multi-tier) | Single tier «Звёзды Цензора» (v1) |
| Random events | Golden cookies + wrath cookies | None | None | 6 events including 1 negative (Telegram-утечка) |
| Theme/narrative density | High (flavor on every upgrade) | Low (generic cash) | Very high (drives progression) | High — bureaucratic flavor text on every entity |
| Number formatting | Suffix M/B/T then "million", "billion" | Suffix aa/ab/ac after T | Plain numbers (small-scale game) | Suffix K/М/Б/Т then aa/ab via break_infinity |
| Offline progress | Yes (since v2) | Yes (capped 24h) | N/A | Yes, 24h cap, "while you were away" modal |
| Achievements | 600+ (deep collection drive) | ~100 | ~10 narrative beats | 12 at launch (v1), expand in v1.x |
| Save system | localStorage + JSON export | Cloud account | localStorage | localStorage + JSON export in v1.x |
| Monetization | Free, ad-supported on mobile | F2P with IAP boosts | Free | Free (itch.io PWYW optional) |

## Tone & Content Guidelines (Critical for Reviewers)

Satirical material in RKN Tycoon should follow these guardrails — they're both ethical and practical (itch.io content policy, audience retention):

**Safe / encouraged targets (institutional satire):**
- Laws and decrees as abstract objects ("Закон Яровой", "Указ №451")
- Acronyms and bureaucratic structures (ТСПУ, ФЗ-149, "Региональное управление")
- Absurdity of process (рубрика "официальное описание" written in deadpan bureaucratic register)
- Internet-culture artifacts (VPN, Telegram, "реестр запрещённых сайтов")
- Real technical infrastructure terms (DPI, "Ревизор", "Суверенный интернет")
- Self-referential meta-jokes (the game itself "blocking" things, achievement "VPN? Не слышал")

**Avoid (defamation + content-policy + tonal):**
- Real names of living officials, politicians, agency heads
- Real names of specific dissidents, journalists, activists (even sympathetically — they didn't consent to being game content)
- Ethnic, religious, or regional groups as targets
- Specific real criminal cases or sentences
- Anything that reads as endorsement of repression rather than satire of it (the joke should always punch at the absurdity of the system, not celebrate its targets)
- War, military operations, current geopolitical events (ages badly, polarizes audience)

**Tonal register:**
- Deadpan bureaucratic Soviet/post-Soviet officialese ("В соответствии с пунктом 2.3 регламента...")
- Mock-officious press-release language for prestige & events
- No memes/slang in official-flavor text (memes age fast; officialese is timeless-funny)
- Dark humor OK; cruelty toward real people not OK
- The player is *the bureaucrat* — the joke is "you, dear player, are building the censorship state, isn't it absurd how easy it is" — that's the satirical contract

## Sources

- Cookie Clicker mechanics: https://cookieclicker.fandom.com/wiki/Building (building cost formula 1.15×, prestige math)
- AdVenture Capitalist mechanics: https://adventure-capitalist.fandom.com/wiki/Businesses (1.07× cost growth, manager/angel-investor system)
- Universal Paperclips: https://en.wikipedia.org/wiki/Universal_Paperclips (narrative-gated idle progression)
- break_infinity.js: https://github.com/Patashu/break_infinity.js (Decimal API, K/M/B/T/aa/ab formatting)
- Idle-game design conventions surveyed across the genre (Cookie Clicker, AdVenture Capitalist, Trimps, NGU Idle, Universal Paperclips, Realm Grinder, Antimatter Dimensions) — formulas and patterns are consistent and well-known to the genre's player base
- RKN/Roskomnadzor satirical references drawn from public-domain Russian-language internet culture (ТСПУ, реестр запрещённых сайтов, ФЗ-149, Яровая package — all publicly documented legislative/technical artifacts)

**Confidence notes:**
- HIGH confidence on genre mechanics, formulas, table-stakes feature list — this is well-established designer knowledge from a mature genre with 15+ years of iteration
- HIGH confidence on tone guidelines (standard satirical-content best practices)
- MEDIUM confidence on specific content names — these are creative proposals; the user (Russian-speaking, target-audience-native) should review and tune voice. Names are designed to be drop-in but each can be swapped without affecting mechanics
- HIGH confidence on prioritization (P1/P2/P3) — derived directly from PROJECT.md Active list + genre conventions

---
*Feature research for: 2D idle-clicker (Cookie-Clicker-genre), Russian-language, RKN/Roskomnadzor satire*
*Researched: 2026-05-15*
