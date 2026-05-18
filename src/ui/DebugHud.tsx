'use client'

import { useEffect, useState } from 'react'
import { useGameStore } from '@/state/gameStore'
import { storageSizeBytes } from '@/state/persistStorage'

interface Props {
  fps: number
}

export function DebugHud({ fps }: Props) {
  const blocks = useGameStore((s) => s.blocks)
  const cps = useGameStore((s) => s.cps)
  const prestigeMult = useGameStore((s) => s.prestigeMult)
  const tickCount = useGameStore((s) => s.tickCount)

  const [uptimeMs, setUptimeMs] = useState(0)
  const [storage, setStorage] = useState(0)
  const [startedAt] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => {
      setUptimeMs(Date.now() - startedAt)
      setStorage(storageSizeBytes())
    }, 250)
    return () => {
      clearInterval(id)
    }
  }, [startedAt])

  const effective = cps.mul(prestigeMult)

  return (
    <pre
      className="font-mono text-sm leading-tight border border-current p-3 inline-block"
      role="status"
      aria-live="polite"
    >
      {`blocks:   ${blocks.toString()}
BPS:      ${effective.toString()}
tick:     #${String(tickCount)}
FPS:      ${String(fps)}
save v:   1
storage:  ${(storage / 1024).toFixed(2)} KB
uptime:   ${formatUptime(uptimeMs)}`}
    </pre>
  )
}

function formatUptime(ms: number): string {
  const sec = Math.floor(ms / 1000)
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}
