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
 * Inline SVG <filter> for barrel-distortion via feDisplacementMap.
 *
 * The displacement map is composed inside the filter pipeline from two
 * single-axis SVG gradients (X = red 0→255, Y = green 0→255) blended
 * additively via feComposite operator="arithmetic". Avoids CSS
 * mix-blend-mode inside a data-URI SVG, which several browsers ignore
 * when the SVG is consumed as an image source.
 *
 * Resulting map: centre is (R=128, G=128) → no displacement; corners
 * diverge to (0/255, 0/255) → pixels are pulled outward, faking the
 * convex bulge of an old picture tube.
 */
function CrtFilterDefs() {
  const xMapSvg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='0'><stop offset='0' stop-color='%23000000'/><stop offset='1' stop-color='%23ff0000'/></linearGradient></defs><rect width='100' height='100' fill='url(%23g)'/></svg>`
  const yMapSvg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'><defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='%23000000'/><stop offset='1' stop-color='%2300ff00'/></linearGradient></defs><rect width='100' height='100' fill='url(%23g)'/></svg>`
  const xHref = `data:image/svg+xml;utf8,${xMapSvg}`
  const yHref = `data:image/svg+xml;utf8,${yMapSvg}`

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
            href={xHref}
            preserveAspectRatio="none"
            x="0"
            y="0"
            width="100%"
            height="100%"
            result="xmap"
          />
          <feImage
            href={yHref}
            preserveAspectRatio="none"
            x="0"
            y="0"
            width="100%"
            height="100%"
            result="ymap"
          />
          <feComposite
            in="xmap"
            in2="ymap"
            operator="arithmetic"
            k1="0"
            k2="1"
            k3="1"
            k4="0"
            result="map"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="map"
            scale="25"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  )
}
