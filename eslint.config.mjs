import { FlatCompat } from '@eslint/eslintrc'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import tseslint from 'typescript-eslint'
import importPlugin from 'eslint-plugin-import'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

export default tseslint.config(
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    plugins: { import: importPlugin },
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.mjs', '*.js'],
        },
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            { target: './src/engine', from: './src/ui', message: 'engine must stay pure (no UI imports)' },
            { target: './src/engine', from: './src/state', message: 'engine must not depend on state' },
            { target: './src/engine', from: './src/app', message: 'engine must not import from app/' },
            { target: './src/engine', from: './src/server', message: 'engine must not import from server/' },

            { target: './src/state', from: './src/ui', message: 'state must not import UI' },
            { target: './src/state', from: './src/app', message: 'state must not import from app/' },
            { target: './src/state', from: './src/server', message: 'state must not import from server/' },

            { target: './src/lib', from: './src/ui', message: 'lib must stay UI-agnostic' },
            { target: './src/lib', from: './src/state', message: 'lib must not import state' },
            { target: './src/lib', from: './src/app', message: 'lib must not import from app/' },

            { target: './src/data', from: './src/ui', message: 'data must not import UI' },
            { target: './src/data', from: './src/state', message: 'data must not import state' },
            { target: './src/data', from: './src/server', message: 'data must not import from server/' },
            { target: './src/data', from: './src/app', message: 'data must not import from app/' },
          ],
        },
      ],
    },
  },
  {
    files: ['src/engine/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react/*', 'next', 'next/*'],
              message: 'engine/ must stay framework-pure (no React/Next imports)',
            },
            {
              group: ['motion', 'motion/*', 'framer-motion', 'howler', 'lucide-react'],
              message: 'engine/ must not import UI/audio/icon libraries',
            },
            {
              group: ['@prisma/client', 'better-auth', 'better-auth/*', 'server-only'],
              message: 'engine/ must not import server-side libraries',
            },
          ],
        },
      ],
      'no-restricted-globals': ['error', 'document', 'localStorage', 'sessionStorage'],
    },
  },
  {
    files: ['src/data/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react/*', 'next', 'next/*'],
              message: 'data/ must stay framework-pure',
            },
            {
              group: ['@prisma/client', 'better-auth', 'better-auth/*', 'server-only'],
              message: 'data/ must not import server-side libraries',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/state/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react/*'],
              message: 'state/ uses vanilla Zustand — React hooks belong in ui/',
            },
            {
              group: ['next', 'next/*'],
              message: 'state/ must not import next',
            },
            {
              group: ['@prisma/client', 'better-auth', 'better-auth/*', 'server-only'],
              message: 'state/ must not import server-side libraries',
            },
          ],
        },
      ],
    },
  },
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      '.data/**',
      'coverage/**',
      'next-env.d.ts',
    ],
  },
)
