import type { NextConfig } from 'next'
import path from 'node:path'

const config: NextConfig = {
  reactStrictMode: true,
  experimental: {
    reactCompiler: false,
  },
  outputFileTracingRoot: path.resolve(import.meta.dirname ?? '.'),
}

export default config
