'use client'

import { useCallback, useEffect, useState } from 'react'
import { useGameStore } from '@/state/gameStore'
import { CensorPanel } from './CensorPanel'
import { UpgradePanel } from './UpgradePanel'

type Tab = 'upgrades' | 'censors'

export function UpgradesMenu({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('upgrades')

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
      aria-label="Меню улучшений"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm font-mono"
    >
      <div
        onClick={(e) => {
          e.stopPropagation()
        }}
        className="border-2 border-rkn-fg bg-rkn-bg text-rkn-fg w-full sm:max-w-2xl h-[85vh] sm:h-[80vh] flex flex-col"
      >
        <header className="flex items-center justify-between border-b border-rkn-fg/40 px-4 py-3 shrink-0">
          <div role="tablist" aria-label="Категории улучшений" className="flex gap-1">
            <TabButton active={tab === 'upgrades'} onClick={() => { setTab('upgrades') }}>
              Указы и акты
            </TabButton>
            <TabButton active={tab === 'censors'} onClick={() => { setTab('censors') }}>
              Аппарат цензуры
            </TabButton>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть меню"
            className="text-xs uppercase opacity-70 hover:opacity-100 cursor-pointer px-2 py-1"
          >
            закрыть<span className="hidden sm:inline"> [esc]</span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'upgrades' ? <UpgradePanel chrome="bare" /> : <CensorPanel chrome="bare" />}
        </div>
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`px-3 py-1 text-xs uppercase tracking-wider font-mono cursor-pointer transition-colors ${
        active
          ? 'bg-rkn-fg text-rkn-bg'
          : 'border border-rkn-fg/50 hover:border-rkn-fg'
      }`}
    >
      {children}
    </button>
  )
}

export function UpgradesMenuButton() {
  const [open, setOpen] = useState(false)
  const blocks = useGameStore((s) => s.blocks)
  const purchased = useGameStore((s) => s.purchasedClickUpgrades.length)

  // Pulse once the player has any meaningful spending power.
  const hasSignal = blocks.gte(100) && purchased < 10

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
        aria-label="Меню улучшений"
        className={`border border-rkn-fg px-3 py-1 text-xs uppercase font-mono hover:bg-rkn-fg hover:text-rkn-bg cursor-pointer transition-colors ${
          hasSignal ? 'animate-event-pulse' : ''
        }`}
      >
        улучшения
      </button>
      {open && <UpgradesMenu onClose={close} />}
    </>
  )
}
