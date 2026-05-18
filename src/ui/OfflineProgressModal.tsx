'use client'

import { useCallback, useEffect } from 'react'
import { formatNumber } from '@/lib/numbers'
import { formatDuration } from '@/lib/time'
import { useGameStore } from '@/state/gameStore'

export function OfflineProgressModal() {
  const offlineEarnings = useGameStore((s) => s.offlineEarnings)
  const dismiss = useGameStore((s) => s.dismissOfflineEarnings)

  const handleDismiss = useCallback(() => {
    dismiss()
  }, [dismiss])

  useEffect(() => {
    if (!offlineEarnings) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleDismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
    }
  }, [offlineEarnings, handleDismiss])

  if (!offlineEarnings) return null

  const { durationMs, earned } = offlineEarnings

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="offline-modal-title"
      onClick={handleDismiss}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm font-mono"
    >
      <div
        onClick={(e) => {
          e.stopPropagation()
        }}
        className="border-2 border-rkn-fg bg-rkn-bg text-rkn-fg max-w-md w-[90%] p-6 flex flex-col gap-4"
      >
        <header
          id="offline-modal-title"
          className="text-xs uppercase tracking-[0.3em] opacity-70 border-b border-rkn-fg/40 pb-2"
        >
          Уведомление
        </header>
        <p className="text-sm leading-relaxed">
          За время вашего отсутствия (<strong>{formatDuration(durationMs)}</strong>){' '}
          подведомственный аппарат произвёл{' '}
          <strong className="text-base tabular-nums">
            {formatNumber(earned)}
          </strong>{' '}
          блокировок в установленном порядке.
        </p>
        <p className="text-xs opacity-60 leading-relaxed">
          Прошу принять к сведению. Дальнейшие распоряжения — за вами.
        </p>
        <button
          type="button"
          onClick={handleDismiss}
          autoFocus
          className="self-end border border-rkn-fg px-6 py-2 text-xs uppercase tracking-widest hover:bg-rkn-fg hover:text-rkn-bg cursor-pointer transition-colors"
        >
          Ознакомлен
        </button>
      </div>
    </div>
  )
}
