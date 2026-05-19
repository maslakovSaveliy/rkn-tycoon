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
      <body>
        <CrtFilterDefs />
        <div className="crt-screen">{children}</div>
        <div className="crt-frame" aria-hidden />
        <div className="crt-overlay" aria-hidden />
      </body>
    </html>
  )
}

/**
 * SVG <filter> that warps page content via a pre-rendered radial
 * displacement map (public/crt-barrel-map.png). The map encodes a true
 * barrel curve: dx = u * r^2.1 * strength (and likewise for dy), so
 * displacement grows quadratically with distance from centre — text near
 * the middle is untouched, only the corners pull outward.
 */
function CrtFilterDefs() {
  return (
    <svg
      width="0"
      height="0"
      aria-hidden
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
    >
      <defs>
        <filter
          id="crt-barrel"
          x="-5%"
          y="-5%"
          width="110%"
          height="110%"
          colorInterpolationFilters="sRGB"
        >
          <feImage
            href="/crt-barrel-map.png"
            preserveAspectRatio="none"
            x="0"
            y="0"
            width="100%"
            height="100%"
            result="map"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="map"
            scale="44"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  )
}
