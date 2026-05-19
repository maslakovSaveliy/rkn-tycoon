import 'server-only'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from '@better-auth/prisma-adapter'
import { anonymous } from 'better-auth/plugins'
import { db } from '@/lib/db'

export const auth = betterAuth({
  baseURL: process.env['BETTER_AUTH_URL'] ?? process.env['NEXT_PUBLIC_BETTER_AUTH_URL'],
  secret: process.env['BETTER_AUTH_SECRET'],
  database: prismaAdapter(db, { provider: 'postgresql' }),
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
        const anonSave = await db.save.findUnique({
          where: { userId: anonymousUser.user.id },
        })
        if (!anonSave) return

        const existing = await db.save.findUnique({
          where: { userId: newUser.user.id },
        })

        // Server-side conflict resolution: newer updatedAt wins.
        if (existing && existing.updatedAt > anonSave.updatedAt) {
          await db.save.delete({ where: { userId: anonymousUser.user.id } })
          return
        }

        await db.save.upsert({
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
        await db.save.delete({ where: { userId: anonymousUser.user.id } })
      },
    }),
  ],
})

export type Session = typeof auth.$Infer.Session
