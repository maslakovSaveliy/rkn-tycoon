import { ImageResponse } from 'next/og'

/** iOS home-screen icon. Generated server-side at build time via Next's
 * ImageResponse → a PNG, which is what iOS requires (SVG home-screen icons
 * are unreliable). 180×180 is the modern Safari touch-icon size. */
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0a',
          color: '#c0d000',
          fontFamily: 'ui-monospace, monospace',
          fontWeight: 900,
          fontSize: 80,
          letterSpacing: 2,
          border: '6px solid #c0d000',
          borderRadius: 32,
        }}
      >
        РКН
      </div>
    ),
    { ...size },
  )
}
