import type { NextConfig } from 'next'
import path from 'node:path'

/**
 * Security headers applied to every response.
 * - CSP keeps things tight; 'unsafe-inline' on script-src is required for Next 15
 *   inline hydration handlers (switch to nonce middleware later if we want stricter).
 * - HSTS overrides Vercel's default (which omits includeSubDomains/preload).
 */
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
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
