'use client'

import { useEffect } from 'react'
import { formatNumber } from '@/lib/numbers'
import { useGameStore } from '@/state/gameStore'

const BASE_TITLE = 'RKN Tycoon'

export function useTabTitle(): void {
  const blocks = useGameStore((s) => s.blocks)

  useEffect(() => {
    document.title = `${BASE_TITLE} — ${formatNumber(blocks)} блокировок`
    return () => {
      document.title = BASE_TITLE
    }
  }, [blocks])
}
