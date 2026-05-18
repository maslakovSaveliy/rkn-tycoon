# Phase 7: ASCII Polish + Flavor Copy + Layout Metadata

**Goal:** Игра выглядит «зашипленной». ASCII/terminal эстетика консистентна, Cyrillic monospace везде, бюрократический копирайт re-audited, mobile-friendly. `app/layout.tsx` Metadata API даёт базовый SEO до Phase 8.

**Requirements:** UI-01, UI-02, UI-03, UI-04, WEB-05.

## Decisions

### D-70 — Self-hosted шрифт через `next/font/google`
JetBrains Mono с Cyrillic subset через `next/font/google`. Next 15 скачивает шрифт на build-time, бандлит и serves локально — технически self-hosted (без runtime fetch'а). Если позже потеряем Google Fonts CDN — переезд на manual .woff2 — Phase 13 task.

### D-71 — Palette: 5 цветов в `@theme {}` блоке
```
--color-rkn-bg: #0a0a0a       dark
--color-rkn-fg: #c0d000       amber primary
--color-rkn-dim: #5a6a30      dim amber (borders, secondary text)
--color-rkn-warning: #ff5a3a  negative events / errors
--color-rkn-accent: #d4d4d4   off-white для редких подсветок
```
Drop unused tailwind colors (text-red-400 → text-rkn-warning).

### D-72 — ASCII frame utility class
Глобальный CSS-класс `.ascii-frame` накладывает box-drawing corner glyphs (╔╗╚╝) через `::before`/`::after` + double-border style. Применяется на: BlocksCounter container, ClickButton, modals, panels, cards. Не на toast (нужно остаться лёгкими).

### D-73 — CRT glow только на ключевых элементах
`text-shadow: 0 0 6px currentColor` применяется на: BlocksCounter большое число, EpauletIndicator, ClickButton текст, modal headers. Не на body-text/карточки (читаемость > эффект).

### D-74 — Layout metadata API (WEB-05)
`src/app/layout.tsx` экспортит:
```ts
export const metadata: Metadata = {
  metadataBase: new URL('https://rkn-tycoon.ru'),
  title: { default: 'RKN Tycoon', template: '%s — RKN Tycoon' },
  description: 'Идл-кликер о добровольной цензуре. Сатира.',
  openGraph: { ..., images: [{ url: '/og-default.png', width: 1200, height: 630 }] },
  twitter: { card: 'summary_large_image', ... },
  robots: { index: true, follow: true },
}
```
`/og-default.png` — placeholder. Dynamic OG (Phase 8) заменит динамической генерацией.

### D-75 — Mobile layout audit
- Min viewport: 360px. Проверить horizontal scroll = нет.
- ClickButton: уже `min-w-[280px] min-h-[80px]` — на 360px это ~78% ширины, ok.
- Header стэкается через `flex-wrap` — уже есть.
- 3-col grid `lg:grid-cols-[18rem_1fr_18rem]` ломается ниже `lg` (1024px) на 1 колонку — уже есть.
- Panels (Upgrade/Censor) на mobile растягиваются на полную ширину. Проверить max-h overflow.
- Modal: max-w-md уже, на 360px — w-[90%] fallback. Уже есть.

### D-76 — Static OG placeholder
Создать минимальный `public/og-default.png` (1200×630) с заголовком и тагом. Можно нарисовать через SVG-to-PNG offline, или просто SVG в public/og-default.svg + metadata указывает на него. Простейший вариант — однотонный PNG amber-on-black с надписью «RKN Tycoon — идл-кликер про цензуру». Сгенерируем через node/canvas или просто текст в SVG.

**Решение:** SVG-файл в public/og-default.svg. Open Graph parsers едят SVG OK для большинства scrapers (TG ест PNG лучше — Phase 8 решит окончательно через next/og dynamic generation).

### D-77 — Tone re-audit (TONE-03)
Грепнуть data/{clickUpgrades,censors,events,achievements}.ts + проверить каждую описание против TONE.md raw audit checklist (раздел 5):
1. Нет real names живых лиц
2. Punch at институции/законы/процедуры, не people
3. Бюрократический register (служебные глаголы, штампы)
4. Юмор сатирический, не злой
5. Нет приглашений к действию (call to violence/protest)
6. Нет ethnic/religious targeting
7. Тон гордый-нейтральный, не саркастический (саркастический читается как aggressive)

Lemma: всё уже было написано против TONE.md в Phase 3/5. Re-audit = quick read-through, отметить в Phase 7 review.

## Tasks

1. `src/app/layout.tsx`:
   - Import JetBrains Mono via next/font/google (cyrillic subset).
   - Apply font as CSS variable, body uses it.
   - Export full Metadata object.
2. `src/app/globals.css`:
   - Add 5-color palette to `@theme {}`.
   - Add `.ascii-frame` utility with corner pseudo-elements.
   - Add `.text-glow` utility (CRT shadow).
3. Apply `.ascii-frame` to: BlocksCounter wrapper, ClickButton, UpgradeCard, CensorCard, OfflineProgressModal, PrestigeModal, AchievementsPanel.
4. Apply `.text-glow` to: BlocksCounter number, EpauletIndicator, ClickButton text.
5. Replace `text-red-400 border-red-400` → `text-rkn-warning border-rkn-warning` in EventOverlay.
6. Create `public/og-default.svg` (1200×630, amber-on-black, title + tag).
7. Mobile audit — check at 360px width via curl-rendered HTML (или CSS only — overflow-x:hidden on body).
8. Tone re-audit pass — read all data files, note compliance.
9. Verify + smoke.

## Critical files

**New:** `public/og-default.svg`

**Modified:** `src/app/layout.tsx`, `src/app/globals.css`, multiple `src/ui/*.tsx` (className adjustments)

## Commits

1. `chore(font): self-host JetBrains Mono via next/font/google (cyrillic)`
2. `feat(ui): ASCII frame utility + 5-color palette + CRT glow`
3. `feat(ui): apply ascii-frame + text-glow across panels/cards/modals`
4. `feat(seo): Metadata API on root layout + OG placeholder SVG`
5. `chore(audit): tone re-audit pass on data files (no copy changes)`
6. `docs(roadmap): mark Phase 7 done`

## Out of Scope
- Dynamic OG generation via next/og — Phase 8
- robots.txt / sitemap.xml — Phase 8
- True landing page (hero, screenshots) — Phase 8
- Background music / additional SFX — Phase 9+
