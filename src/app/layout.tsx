import type { Metadata } from 'next'
import { JetBrains_Mono } from 'next/font/google'
import type { ReactNode } from 'react'
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
    images: [
      {
        url: '/og-default.svg',
        width: 1200,
        height: 630,
        alt: 'RKN Tycoon',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RKN Tycoon — идл-кликер про интернет-цензуру',
    description: 'Сатирический идл-кликер про цензуру.',
    images: ['/og-default.svg'],
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" className={jetbrainsMono.variable}>
      <body>{children}</body>
    </html>
  )
}
