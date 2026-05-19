import type { NextConfig } from 'next'
import path from 'node:path'

const config: NextConfig = {
  reactStrictMode: true,
  experimental: {
    reactCompiler: false,
  },
  outputFileTracingRoot: path.resolve(import.meta.dirname ?? '.'),
  // Keep Prisma + its driver adapter as external runtime deps so Next
  // doesn't bundle them. Loaded from node_modules at runtime — avoids
  // the pnpm-symlink trap that breaks Vercel's deployment packager.
  serverExternalPackages: ['@prisma/client', '@prisma/adapter-pg'],
}

export default config
