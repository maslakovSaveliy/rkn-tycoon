'use client'

import { useCallback, useEffect, useState } from 'react'
import { AchievementsButton } from './AchievementsPanel'
import { AuthButton } from './AuthButton'
import { LeaderboardButton } from './LeaderboardButton'
import { SoundToggle } from './SoundToggle'

function SettingsPanel({ onClose }: { onClose: () => void }) {
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
      aria-labelledby="settings-title"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-start justify-end bg-black/70 backdrop-blur-sm font-mono p-3"
    >
      <div
        onClick={(e) => {
          e.stopPropagation()
        }}
        className="border-2 border-rkn-fg bg-rkn-bg text-rkn-fg w-full max-w-xs p-4 flex flex-col gap-3"
      >
        <header
          id="settings-title"
          className="flex items-baseline justify-between border-b border-rkn-fg/40 pb-2"
        >
          <span className="text-xs uppercase tracking-[0.3em] opacity-70">
            Настройки
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="text-xs opacity-70 hover:opacity-100 cursor-pointer"
          >
            закрыть
          </button>
        </header>

        <div className="flex flex-col gap-2 [&>*]:w-full [&_button]:w-full [&_a]:w-full [&_button]:text-center [&_a]:text-center">
          <LeaderboardButton />
          <AchievementsButton />
          <SoundToggle />
          <AuthButton />
        </div>
      </div>
    </div>
  )
}

export function SettingsMenuButton() {
  const [open, setOpen] = useState(false)
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
        aria-label="Настройки"
        className="border border-rkn-fg px-3 py-1 text-xs uppercase font-mono hover:bg-rkn-fg hover:text-rkn-bg cursor-pointer transition-colors"
      >
        настройки
      </button>
      {open && <SettingsPanel onClose={close} />}
    </>
  )
}
