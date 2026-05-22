import { ImageResponse } from 'next/og'

/** Default Open Graph card. Rendered as a 1200×630 PNG via next/og — every
 * major social crawler (FB, VK, Telegram, Twitter/X, LinkedIn, Discord)
 * accepts PNG; SVG OG cards are silently dropped or rendered broken on
 * several of them. */
export const alt = 'RKN Tycoon — идл-кликер про интернет-цензуру'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0a',
          color: '#c0d000',
          fontFamily: 'ui-monospace, monospace',
          padding: 80,
          gap: 24,
          backgroundImage:
            'repeating-linear-gradient(to bottom, transparent 0, transparent 2px, rgba(0,0,0,0.22) 2px, rgba(0,0,0,0.22) 3px)',
        }}
      >
        <div
          style={{
            fontSize: 36,
            letterSpacing: 12,
            opacity: 0.6,
            textTransform: 'uppercase',
          }}
        >
          ████ RKN.SIM ████
        </div>
        <div
          style={{
            fontSize: 156,
            fontWeight: 900,
            letterSpacing: -2,
            textShadow: '0 0 24px #c0d000',
            lineHeight: 1,
          }}
        >
          RKN Tycoon
        </div>
        <div
          style={{
            fontSize: 32,
            opacity: 0.85,
            textAlign: 'center',
            maxWidth: 900,
            lineHeight: 1.4,
          }}
        >
          Идл-кликер про интернет-цензуру. Сатира.
          Кликай «Заблокировать» — стройте цензурную империю.
        </div>
        <div
          style={{
            display: 'flex',
            gap: 32,
            marginTop: 24,
            fontSize: 28,
            color: '#5a6a30',
          }}
        >
          <span>rkn-tycoon.ru</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span>играть бесплатно</span>
        </div>
      </div>
    ),
    { ...size },
  )
}
