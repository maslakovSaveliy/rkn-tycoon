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
        <div className="crt-overlay" aria-hidden />
      </body>
    </html>
  )
}

/**
 * Inline SVG <filter> defining a barrel-distortion displacement map.
 * The map is two linear gradients overlaid: red channel goes 0→255 left
 * to right (controls X displacement), green channel goes 0→255 top to
 * bottom (controls Y displacement). At the centre R=G=128 → no
 * displacement. At the corners both channels diverge from 128 → pixels
 * shift outward, giving an "old picture tube bulge" feel.
 */
function CrtFilterDefs() {
  const mapSvg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'>
    <defs>
      <linearGradient id='lr' x1='0' y1='0' x2='1' y2='0'>
        <stop offset='0' stop-color='#000000'/>
        <stop offset='1' stop-color='#ff0000'/>
      </linearGradient>
      <linearGradient id='tb' x1='0' y1='0' x2='0' y2='1'>
        <stop offset='0' stop-color='#000000'/>
        <stop offset='1' stop-color='#00ff00'/>
      </linearGradient>
    </defs>
    <rect width='100' height='100' fill='url(#lr)'/>
    <rect width='100' height='100' fill='url(#tb)' style='mix-blend-mode:lighten'/>
  </svg>`
  const mapHref = `data:image/svg+xml;utf8,${encodeURIComponent(mapSvg)}`

  return (
    <svg
      width="0"
      height="0"
      aria-hidden
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
    >
      <defs>
        <filter id="crt-barrel" x="0%" y="0%" width="100%" height="100%">
          <feImage
            href={mapHref}
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
            scale="30"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  )
}
