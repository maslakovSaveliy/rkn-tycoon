import type { Metadata } from 'next'
import { JetBrains_Mono } from 'next/font/google'
import type { ReactNode } from 'react'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-mono',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://rkn-tycoon.ru'),
  title: {
    default: 'RKN Tycoon — идл-кликер про интернет-цензуру',
    template: '%s — RKN Tycoon',
  },
  description:
    'Идл-кликер про интернет-цензуру. Кликайте «Заблокировать», копите блокировки, нанимайте цензоров и стройте цензурную империю. Сатира, играть бесплатно в браузере.',
  applicationName: 'RKN Tycoon',
  alternates: { canonical: '/' },
  keywords: [
    'идл кликер',
    'кликер игра',
    'роскомнадзор игра',
    'РКН',
    'цензура игра',
    'RKN tycoon',
    'браузерная idle игра',
    'сатира роскомнадзор',
    'игра про блокировки',
    'idle clicker',
  ],
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    siteName: 'RKN Tycoon',
    title: 'RKN Tycoon — идл-кликер про интернет-цензуру',
    description:
      'Сатирический идл-кликер. Кликайте, копите блокировки, стройте цензурную империю.',
    url: '/',
    // Image is picked up automatically from src/app/opengraph-image.tsx
    // (Next 15 file-based metadata convention) — a PNG via next/og.
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RKN Tycoon — идл-кликер про интернет-цензуру',
    description: 'Сатирический идл-кликер про цензуру.',
    // Same: src/app/opengraph-image.tsx serves the twitter image too unless
    // we add a dedicated twitter-image.tsx.
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" className={jetbrainsMono.variable}>
      <body>
        {/* Keyboard-only skip link — only visible when focused. Lets users
            bypass the header/nav and jump straight to the main content. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:bg-rkn-bg focus:text-rkn-fg focus:border focus:border-rkn-fg focus:px-3 focus:py-2 focus:text-xs focus:uppercase focus:tracking-wider"
        >
          К основному содержимому
        </a>
        {children}
        <Analytics />
        <div className="crt-overlay" aria-hidden />
      </body>
    </html>
  )
}
