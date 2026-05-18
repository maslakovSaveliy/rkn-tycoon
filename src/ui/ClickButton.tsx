'use client'

import { useCallback, type PointerEvent, type RefObject } from 'react'
import { playClick } from '@/lib/audio'
import { formatNumber } from '@/lib/numbers'
import { useGameStore } from '@/state/gameStore'
import { useSettingsStore } from '@/state/settingsStore'
import type { PopupController } from './PlusPopup'

interface Props {
  popupRef: RefObject<PopupController | null>
}

export function ClickButton({ popupRef }: Props) {
  const click = useGameStore((s) => s.click)

  const handlePointerDown = useCallback(
    (e: PointerEvent<HTMLButtonElement>) => {
      const { clickValue, prestigeMult } = useGameStore.getState()
      const gain = clickValue.mul(prestigeMult)
      click()
      if (useSettingsStore.getState().soundEnabled) {
        playClick()
      }
      // Spawn above the button so the popup never overlaps the hover fill.
      const rect = e.currentTarget.getBoundingClientRect()
      const spawnY = rect.top - 8
      popupRef.current?.spawn(`+${formatNumber(gain)}`, e.clientX, spawnY)
    },
    [click, popupRef],
  )

  return (
    <button
      type="button"
      onPointerDown={handlePointerDown}
      aria-label="Заблокировать"
      className="border-2 border-rkn-fg text-rkn-fg text-glow px-12 py-8 text-2xl uppercase font-mono tracking-widest hover:bg-rkn-fg hover:text-rkn-bg hover:[text-shadow:none] active:scale-95 transition-transform duration-75 select-none min-w-[280px] min-h-[80px] cursor-pointer"
    >
      ЗАБЛОКИРОВАТЬ
    </button>
  )
}
