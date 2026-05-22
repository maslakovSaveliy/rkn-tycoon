import 'server-only'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from '@better-auth/prisma-adapter'
import { anonymous } from 'better-auth/plugins'
import { dbAuth } from '@/lib/dbAuth'

const isProd = process.env.NODE_ENV === 'production'
const authSecret =
  process.env['BETTER_AUTH_SECRET'] ?? process.env['BETTER_AUTH_SECRET']
const authUrl =
  process.env['BETTER_AUTH_URL'] ?? process.env['NEXT_PUBLIC_BETTER_AUTH_URL']

// Fail-fast in production: BetterAuth silently degrades signing if the secret
// is missing, which is a CSRF window. Crash early so the deploy is rejected.
if (isProd) {
  if (!authSecret) {
    throw new Error(
      '[auth] BETTER_AUTH_SECRET is required in production. Aborting boot.',
    )
  }
  if (!authUrl) {
    throw new Error(
      '[auth] BETTER_AUTH_URL is required in production. Aborting boot.',
    )
  }
}

/** Origins allowed to make authenticated requests. BetterAuth uses these to
 * validate the Origin header on state-changing POSTs (sign-up, sign-in, etc.).
 * Without this list, a misconfigured BETTER_AUTH_URL silently weakens CSRF
 * protection. */
const trustedOrigins = [
  'https://rkn-tycoon.ru',
  'https://www.rkn-tycoon.ru',
  ...(authUrl ? [authUrl] : []),
  // Local dev hosts — harmless to include since `isProd` deploys never see them.
  ...(isProd ? [] : ['http://localhost:3000', 'http://localhost:3001']),
]

export const auth = betterAuth({
  baseURL: authUrl,
  secret: authSecret,
  trustedOrigins,
  database: prismaAdapter(dbAuth, { provider: 'postgresql' }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  rateLimit: {
    window: 60,
    max: 10,
  },
  plugins: [
    anonymous({
      emailDomainName: 'anonymous.rkn-tycoon.local',
      onLinkAccount: async ({ anonymousUser, newUser }) => {
        // Anon → registered save migration. Uses dbAuth (BYPASSRLS) because
        // we're touching two different users' rows in a single operation
        // (anonymousUser AND newUser) — withRls would scope us to one user
        // at a time. This is a service-layer hand-off, not a user action.
        const anonSave = await dbAuth.save.findUnique({
          where: { userId: anonymousUser.user.id },
        })
        if (!anonSave) return

        const existing = await dbAuth.save.findUnique({
          where: { userId: newUser.user.id },
        })

        // Server-side conflict resolution: newer updatedAt wins.
        if (existing && existing.updatedAt > anonSave.updatedAt) {
          await dbAuth.save.delete({
            where: { userId: anonymousUser.user.id },
          })
          return
        }

        await dbAuth.save.upsert({
          where: { userId: newUser.user.id },
          create: {
            userId: newUser.user.id,
            gameState: anonSave.gameState as object,
            version: anonSave.version,
            updatedAt: anonSave.updatedAt,
          },
          update: {
            gameState: anonSave.gameState as object,
            version: anonSave.version,
            updatedAt: anonSave.updatedAt,
          },
        })
        await dbAuth.save.delete({ where: { userId: anonymousUser.user.id } })
      },
    }),
  ],
})

export type Session = typeof auth.$Infer.Session
