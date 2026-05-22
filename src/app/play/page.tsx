import type { Metadata } from 'next'
import { AppShell } from '@/ui/AppShell'

export const metadata: Metadata = {
  title: 'Играть',
  description:
    'Запустите RKN Tycoon в браузере — идл-кликер про интернет-цензуру. Без регистрации, прогресс сохраняется в браузере.',
  alternates: { canonical: '/play' },
}

export default function PlayPage() {
  return (
    <>
      {/* Visually-hidden landmark heading for screen readers and crawlers —
          AppShell hydrates client-side, so SSR HTML has nothing semantic
          without this. */}
      <h1 className="sr-only">RKN Tycoon — игровое поле</h1>
      <noscript>
        <div className="p-6 font-mono text-rkn-fg">
          <p className="text-lg uppercase tracking-widest mb-2">
            Включите JavaScript
          </p>
          <p className="text-sm opacity-70">
            RKN Tycoon — браузерная игра, требующая JavaScript.{' '}
            {/* next/link needs JS to function — plain anchor is correct
                fallback when JS is disabled. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" className="underline">
              На главную
            </a>
            .
          </p>
        </div>
      </noscript>
      <AppShell />
    </>
  )
}
