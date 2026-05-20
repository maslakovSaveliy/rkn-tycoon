'use client'

// Snapshot of the animated AsciiLogo at rotation=0 (one frame straight from
// three.js + AsciiEffect output). Used as the loading fallback so the
// placeholder occupies the same footprint and reads as the same brand mark.
const ART = [
  '                                                                             ',
  '                                                                             ',
  '                                                                             ',
  '                                                                             ',
  '                                                                             ',
  '     ######?.  ##$  $##+,###  ###            x####:  ,####### +##$ :###      ',
  '     ###+ ?##? ##$ x### ,###$ ###           ### :###    ##$   +### x###      ',
  '     ###+ .##? ##$,##$  .##$#-###           ####,       ##$   +##$##?##      ',
  '     #######?  ######$  .##.##,##            ,$####*    ##$   +##*##*##      ',
  '     ###*x##?  ### *##+ .##.:####           ##:  ###    ##$   +##   $##      ',
  '     ###* ###+ ###  $##*.##. ####           x######. :#####$# *##   $$#      ',
  '                                                                             ',
  '                                                                             ',
  '                                                                             ',
  '                                                                             ',
  '                                                                             ',
  '                                                                             ',
  '                                                                             ',
  '                                                                             ',
].join('\n')

const ROWS = 19

interface Props {
  width: number
  height: number
}

export function StaticAsciiLogo({ width, height }: Props) {
  // AsciiEffect sizes the font so the row count fits the container height.
  // Mirror that so the static fallback aligns with the animated swap.
  const fontSize = height / ROWS

  return (
    <div
      role="img"
      aria-label="РКН СИМУЛЯТОР"
      style={{
        width,
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <pre
        aria-hidden="true"
        style={{
          margin: 0,
          color: '#c0d000',
          fontFamily: '"courier new", ui-monospace, Menlo, Consolas, monospace',
          fontWeight: 700,
          fontSize,
          lineHeight: 1,
          letterSpacing: '-1px',
          textShadow: '0 0 8px rgba(192,208,0,0.45)',
          whiteSpace: 'pre',
        }}
      >
        {ART}
      </pre>
    </div>
  )
}

