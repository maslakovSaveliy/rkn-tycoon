# Auth Library Comparison: BetterAuth vs Auth.js v5

**Researched:** 2026-05-16
**Decision:** **`better-auth@1.6.11`** (latest stable, published 2026-05-12)
**Used in:** Phase 9 (Auth + Save Sync)

---

## TL;DR

Use **better-auth**. Decisive factors for this project:

1. **Native `anonymous` plugin** with `onLinkAccount` hook — directly solves our guest→registered save-migration requirement (AUTH-03/04). With Auth.js we'd roll this ourselves (shadow user + merge rows).
2. **Email+password without verification** is one boolean toggle (`requireEmailVerification: false`). With Auth.js Credentials we write the user table + hashing + verification logic by hand.
3. **Cookie + DB sessions** by default (server-revocable). Auth.js v5 forces JWT-only sessions for Credentials provider — a known v5 limitation.
4. **True stable v1.6**. Auth.js v5 has been in beta since Oct 2023 (`5.0.0-beta.31` as of 2026-04-14, 2.5 years in beta).
5. **Built-in IP rate-limiting** on auth endpoints (AUTH-06 requirement). Auth.js leaves rate-limiting to us.

---

## Comparison Table

| Dimension | `better-auth@1.6.11` (2026-05-12) | Auth.js / `next-auth@5.0.0-beta.31` (2026-04-14; stable `4.24.14`) |
|---|---|---|
| **Latest stable** | 1.6.11 — true stable, semver-major-1 | v5 still **beta** for ~2.5 years; v4 is stable but legacy |
| **GitHub** | ~28.3k stars, 695 open issues, pushed 2026-05-15 (active) | ~28.2k stars, 585 open issues, last push 2026-04-14 (slower cadence) |
| **Email+pwd no verification** | `emailAndPassword: { enabled: true }` — verification off by default; ~5 lines | Manual: write `Credentials({ authorize })`, hash/verify, manage user table yourself |
| **Password hashing** | scrypt built-in (non-blocking since 1.6.0); pluggable `password.hash/verify` for bcrypt/argon2 | None — you implement it |
| **Prisma integration** | Official `@better-auth/prisma-adapter`; schema generated via CLI (`user`, `session`, `account`, `verification`) | Official `@auth/prisma-adapter`; canonical schema in docs |
| **Session strategy** | **Cookie + DB session** is default; signed cookies, server-side revocable | Default `jwt` for Credentials provider; `database` only works with non-Credentials providers in v5 (known limitation) |
| **App Router DX** | `auth.api.getSession({ headers })` in RSC/route handlers/server actions; typed end-to-end via `auth.$Infer` | `auth()` helper from your `auth.ts` works in RSC, middleware, server actions; session type augmented via module declaration |
| **Anonymous → registered** | **Native** `anonymous()` plugin + `authClient.anonymous.linkAccount(...)` + `onLinkAccount({ anonymousUser, newUser })` callback for save migration | None — roll your own (create shadow user, merge rows on signup) |
| **OAuth extensibility** | Built-in Google; `genericOAuth` plugin for arbitrary OIDC/OAuth2 incl. `getUserInfo` hook | ~80 prebuilt providers; custom provider via standard `Provider` object |
| **Telegram Login Widget** | No prebuilt; implementable as a custom credentials-like sign-in route validating Telegram's HMAC `hash` (it's not OAuth2) | Same — no prebuilt; community examples exist as a Credentials provider that verifies the HMAC |
| **Self-hosting (Docker)** | No Vercel assumptions; pure Node; no Edge-only requirement | Works, but the v5 `auth.config.ts` / Edge split exists specifically because Prisma isn't Edge-compatible — extra ceremony even when you don't deploy to Edge |
| **TS ergonomics** | Full inference incl. plugin-extended session shape via `auth.$Infer.Session` | Good once you augment `Session`/`JWT` module types; less automatic |
| **Security defaults** | Signed/secure cookies, **built-in IP-based rate limiting**, session rotation, secret-rotation w/ multi-key, optional OAuth-token encryption | Secure cookies, CSRF on built-in endpoints; **no rate limiting** (your responsibility) |
| **Client bundle** | Tree-shaken `better-auth/client`; nanostores-based; small | next-auth client also small; both negligible vs game assets |
| **Known footguns** | Younger project — schema changes between minors; CLI migrations need attention; Telegram still custom | v5 perpetual-beta; recurring open bugs around session inconsistency on first login, subdomains, redirect URLs; Credentials provider locked to JWT sessions |

---

## Decision Triggers (when Auth.js would actually win)

- Need the **largest provider catalog** (≈80 built-ins) and don't need anonymous→registered linking — **N/A** for us, we explicitly need anonymous.
- Standardizing on Auth.js across multiple existing org apps — **N/A**, solo project.
- Explicitly **prefer JWT-only sessions** (stateless, multi-region) and don't plan server-side revocation — **N/A**, we want revocable sessions for account-management UX.
- Need a more battle-tested library and willing to use v4 (deprecated) — **N/A**, v1.6.11 better-auth is stable enough and actively maintained.

---

## Open Risks With better-auth (Accepted)

1. **Project is younger; minor releases have shipped schema/behavior tweaks** (e.g., session-fresh-age recalculation in 1.6.0). Mitigation: pin exact version `1.6.11` in `package.json`, review CHANGELOG before bumping.
2. **Telegram Login Widget** still requires custom code (HMAC-SHA256 over the bot token). Not a v1 blocker — email+password is enough.
3. **`anonymous` plugin creates real `user` rows** — plan for periodic cleanup of unlinked anonymous users (AUTH-07: cron task deletes unlinked anonymous users >30d old).
4. **Default scrypt parameters are sane but not tuned**. If we later import users from another system using bcrypt, we override `password.hash/verify`.
5. **No first-party Yandex OAuth provider** — use `genericOAuth` (Yandex exposes OIDC discovery). Not a v1 blocker.

---

## Implementation Plan (Phase 9)

### Dependencies
```bash
pnpm add better-auth@1.6.11 @better-auth/prisma-adapter
```
(exact pin — no caret/tilde for `better-auth`)

### Files to create
- `src/server/auth.ts` — `betterAuth({...})` config with:
  - `database: prismaAdapter(db, { provider: 'postgresql' })`
  - `emailAndPassword: { enabled: true, requireEmailVerification: false }`
  - `plugins: [anonymous({ onLinkAccount: async ({ anonymousUser, newUser }) => { /* save migration */ } })]`
  - `rateLimit: { window: 60, max: 10 }` for AUTH-06
- `src/app/api/auth/[...all]/route.ts` — catch-all route handler exposing BetterAuth API
- Client: `authClient = createAuthClient({ baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL })`

### Prisma schema additions (run `better-auth generate` then manually adjust)
Standard BetterAuth schema: `User`, `Session`, `Account`, `Verification`, plus our domain models (`Save`, `LeaderboardEntry`, `Event`, `Purchase`, `Entitlement`) added in subsequent phases.

### Save migration flow
1. Guest opens `/play` for first time → `anonymous` plugin creates anonymous user → BetterAuth issues a session cookie.
2. localStorage save key tied to anonymous-user-id.
3. Guest clicks "Зарегистрироваться" → email+password form → `authClient.signUp.email({...})`.
4. BetterAuth links the anonymous user account to the new authenticated user → `onLinkAccount` fires.
5. In `onLinkAccount`: read the localStorage save payload sent by the client in the signup request body, write it to `Save` table with `userId: newUser.id`, mark the anonymous user as deletable.

---

## Sources

- `context7:/better-auth/better-auth` — official docs (email+password, Prisma adapter, anonymous plugin, generic OAuth, security/scrypt, CHANGELOG 1.6.0, secret rotation)
- `context7:/websites/authjs_dev` — Auth.js docs (Credentials provider, session strategy, App Router `auth()`, v5 migration, middleware wrapping)
- https://registry.npmjs.org/better-auth — `1.6.11` published 2026-05-12; peers `prisma ^5||^6||^7`, `next ^14||^15||^16`, `react ^18||^19`
- https://registry.npmjs.org/next-auth — `latest 4.24.14`, `beta 5.0.0-beta.31` (2026-04-14); first v5 beta 2023-10-24
- https://api.github.com/repos/better-auth/better-auth — 28,307 stars, 695 open issues, pushed 2026-05-15
- https://api.github.com/repos/nextauthjs/next-auth — 28,244 stars, 585 open issues, pushed 2026-04-14
- GitHub issue search `repo:nextauthjs/next-auth is:open is:issue v5` — recurring session/redirect/subdomain bug reports against beta

---

*Auth research performed via sub-agent with context7 and direct npm registry queries on 2026-05-16. This document is the canonical reference for the Phase 9 plan.*
