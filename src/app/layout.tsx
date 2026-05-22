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
    'Сатирический идл-кликер. Кликайте «Заблокировать», копите блокировки, нанимайте цензоров, стройте цензурную империю.',
  applicationName: 'RKN Tycoon',
  keywords: [
    'idle game',
    'idle clicker',
    'игра',
    'цензура',
    'сатира',
    'кликер',
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
        {children}
        <Analytics />
        <div className="crt-overlay" aria-hidden />
      </body>
    </html>
  )
}
