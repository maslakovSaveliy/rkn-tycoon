'use client'

import { useEffect } from 'react'
import { ACHIEVEMENTS_BY_ID } from '@/data/achievements'
import { useGameStore } from '@/state/gameStore'

const TOAST_DURATION_MS = 4500

export function AchievementToastStack() {
  const queue = useGameStore((s) => s.achievementToastQueue)
  const dismiss = useGameStore((s) => s.dismissAchievementToast)

  useEffect(() => {
    if (queue.length === 0) return
    const oldest = queue[0]
    if (!oldest) return
    const dueIn = Math.max(0, oldest.shownAt + TOAST_DURATION_MS - Date.now())
    const id = setTimeout(() => {
      dismiss(oldest.id)
    }, dueIn)
    return () => {
      clearTimeout(id)
    }
  }, [queue, dismiss])

  if (queue.length === 0) return null

  const visible = queue.slice(-3)

  return (
    <div className="fixed bottom-4 right-4 z-[90] flex flex-col gap-2 pointer-events-none">
      {visible.map((t) => {
        const def = ACHIEVEMENTS_BY_ID[t.id]
        if (!def) return null
        return (
          <div
            key={`${t.id}-${String(t.shownAt)}`}
            className="border-2 border-rkn-fg bg-rkn-bg/95 backdrop-blur p-3 max-w-xs font-mono pointer-events-auto animate-toast-in"
          >
            <div className="text-[10px] uppercase tracking-widest opacity-60">
              Награда вручена
            </div>
            <div className="text-sm font-bold mt-1">{def.name}</div>
            <div className="text-[11px] opacity-70 leading-snug mt-1">
              {def.description}
            </div>
          </div>
        )
      })}
    </div>
  )
}
