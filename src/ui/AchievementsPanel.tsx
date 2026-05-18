'use client'

import { useCallback, useEffect, useState } from 'react'
import { ACHIEVEMENTS } from '@/data/achievements'
import { useGameStore } from '@/state/gameStore'

export function AchievementsPanel({ onClose }: { onClose: () => void }) {
  const unlocked = useGameStore((s) => s.unlockedAchievements)
  const owned = new Set(unlocked)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="achievements-title"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm font-mono p-4"
    >
      <div
        onClick={(e) => {
          e.stopPropagation()
        }}
        className="border-2 border-rkn-fg bg-rkn-bg text-rkn-fg w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-4"
      >
        <header
          id="achievements-title"
          className="flex items-baseline justify-between border-b border-rkn-fg/40 pb-2"
        >
          <span className="text-xs uppercase tracking-[0.3em] opacity-70">
            Награды ({String(unlocked.length)}/12)
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="text-xs opacity-70 hover:opacity-100 cursor-pointer"
          >
            закрыть<span className="hidden sm:inline"> [esc]</span>
          </button>
        </header>

        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {ACHIEVEMENTS.map((a) => {
            const isOwned = owned.has(a.id)
            return (
              <li
                key={a.id}
                className={`border p-3 ${
                  isOwned ? 'border-rkn-fg' : 'border-rkn-fg/30 opacity-60'
                }`}
              >
                <div className="text-sm font-bold">
                  {isOwned ? a.name : '???'}
                </div>
                <div className="text-[11px] opacity-70 leading-snug mt-1">
                  {isOwned ? a.description : 'не разблокировано'}
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

export function AchievementsButton() {
  const [open, setOpen] = useState(false)
  const unlockedCount = useGameStore((s) => s.unlockedAchievements.length)
  const close = useCallback(() => {
    setOpen(false)
  }, [])

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true)
        }}
        className="border border-current px-3 py-1 text-xs uppercase font-mono hover:opacity-80 cursor-pointer"
        aria-label="Открыть награды"
      >
        награды: {String(unlockedCount)}/12
      </button>
      {open && <AchievementsPanel onClose={close} />}
    </>
  )
}
