import { createAuthClient } from 'better-auth/react'
import { anonymousClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  baseURL:
    typeof window === 'undefined'
      ? process.env['NEXT_PUBLIC_BETTER_AUTH_URL']
      : window.location.origin,
  plugins: [anonymousClient()],
})

export const { useSession, signIn, signUp, signOut } = authClient
