import type { NextConfig } from 'next'
import path from 'node:path'

const config: NextConfig = {
  reactStrictMode: true,
  experimental: {
    reactCompiler: false,
  },
  outputFileTracingRoot: path.resolve(import.meta.dirname ?? '.'),
  outputFileTracingIncludes: {
    '/**/*': [
      './node_modules/.prisma/client/**/*',
      './node_modules/@prisma/client/**/*',
      './node_modules/@prisma/engines/**/*',
    ],
  },
}

export default config
