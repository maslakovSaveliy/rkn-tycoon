import type { NextConfig } from 'next'
import path from 'node:path'

const isDev = process.env.NODE_ENV !== 'production'

/**
 * Security headers applied to every response.
 *
 * - `script-src 'unsafe-inline'` is required for Next 15's inline hydration
 *   bootstrap (`$RT=...`, `$RC=...` flush handlers). A nonce middleware would
 *   be stricter but requires touching every layout — out of scope for now.
 * - `'unsafe-eval'` is added ONLY in dev: Next's HMR runtime uses `eval()`
 *   to inject updates, and CSP blocking that silently breaks React hydration
 *   (the page stays at the SSR snapshot, no errors logged).
 * - `connect-src 'self' ws: wss:` in dev so the HMR WebSocket works.
 * - HSTS overrides Vercel's default (which omits includeSubDomains/preload).
 */
const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  : "script-src 'self' 'unsafe-inline'"

const connectSrc = isDev
  ? "connect-src 'self' ws: wss:"
  : "connect-src 'self'"

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      connectSrc,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
]

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    reactCompiler: false,
  },
  outputFileTracingRoot: path.resolve(import.meta.dirname ?? '.'),
  // Keep Prisma + its driver adapter as external runtime deps so Next
  // doesn't bundle them. Loaded from node_modules at runtime — avoids
  // the pnpm-symlink trap that breaks Vercel's deployment packager.
  serverExternalPackages: ['@prisma/client', '@prisma/adapter-pg'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

export default config
