'use client'

import { useCallback, useEffect, useState } from 'react'
import { useGameStore } from '@/state/gameStore'

interface Props {
  gain: number
  onClose: () => void
}

export function PrestigeModal({ gain, onClose }: Props) {
  const prestigeStars = useGameStore((s) => s.prestigeStars)
  const performPrestige = useGameStore((s) => s.performPrestige)
  const [step, setStep] = useState<1 | 2>(1)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const handleBackdrop = useCallback(() => {
    // Step 2 ignores backdrop click — explicit action only.
    if (step === 1) onClose()
  }, [step, onClose])

  const handleConfirm = useCallback(() => {
    performPrestige()
    onClose()
  }, [performPrestige, onClose])

  const projectedTotal = prestigeStars + gain

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="prestige-modal-title"
      onClick={handleBackdrop}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm font-mono p-4"
    >
      <div
        onClick={(e) => {
          e.stopPropagation()
        }}
        className="border-2 border-rkn-fg bg-rkn-bg text-rkn-fg max-w-lg w-full p-6 flex flex-col gap-4"
      >
        <header
          id="prestige-modal-title"
          className="text-xs uppercase tracking-[0.3em] opacity-70 border-b border-rkn-fg/40 pb-2"
        >
          {step === 1 ? 'Представление к награде' : 'Указ Президента'}
        </header>

        {step === 1 ? (
          <>
            <p className="text-sm leading-relaxed">
              Подведомственному кадру разъясняется: при принятии награды (
              <strong>{String(gain)} ★</strong>) текущие блокировки и
              развёрнутый аппарат подлежат списанию. Лицевой счёт
              обнуляется.
            </p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <dt className="opacity-60">Списанию подлежат:</dt>
              <dd>блокировки, цензоры, указы</dd>
              <dt className="opacity-60">Сохраняются:</dt>
              <dd>звания, награды, послужной список</dd>
              <dt className="opacity-60">Итог:</dt>
              <dd className="tabular-nums">
                {String(prestigeStars)} → {String(projectedTotal)} ★ (+
                {String((2 * gain).toFixed(0))}% к доходу)
              </dd>
            </dl>
            <p className="text-xs opacity-60 leading-relaxed">
              Прошу принять решение в установленном порядке.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="border border-rkn-fg px-4 py-2 text-xs uppercase tracking-widest hover:opacity-70 cursor-pointer"
              >
                Отказаться
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep(2)
                }}
                autoFocus
                className="border border-rkn-fg px-4 py-2 text-xs uppercase tracking-widest hover:bg-rkn-fg hover:text-rkn-bg cursor-pointer transition-colors"
              >
                Далее →
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm leading-relaxed">
              Указом Президента подведомственный кадр повышается в звании.
              Прежние заслуги списаны в архив, аппарат — переформирован.
            </p>
            <p className="text-base tabular-nums text-center py-2">
              Звёзды Цензора:{' '}
              <strong>
                {String(prestigeStars)} → {String(projectedTotal)} ★
              </strong>
            </p>
            <p className="text-xs opacity-60 leading-relaxed">
              Подтверждение влечёт необратимое списание текущих ресурсов.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setStep(1)
                }}
                className="border border-rkn-fg px-4 py-2 text-xs uppercase tracking-widest hover:opacity-70 cursor-pointer"
              >
                ← Назад
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                autoFocus
                className="border border-rkn-fg px-4 py-2 text-xs uppercase tracking-widest hover:bg-rkn-fg hover:text-rkn-bg cursor-pointer transition-colors"
              >
                Подтвердить
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
