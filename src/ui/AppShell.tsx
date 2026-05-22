'use client'

import { useEffect, useRef } from 'react'
import { startTickLoop, TICK_STEP_MS, type TickHandle } from '@/engine'
import { useGameStore } from '@/state/gameStore'
import { flushPendingSave } from '@/state/persistStorage'
import { AchievementToastStack } from './AchievementToast'
import { AchievementsButton } from './AchievementsPanel'
import { AuthButton } from './AuthButton'
import { AuthorCredit } from './AuthorCredit'
import { BlocksCounter } from './BlocksCounter'
import { BoostsPanel } from './BoostsPanel'
import { ClickButton } from './ClickButton'
import { EpauletIndicator } from './EpauletIndicator'
import { EventOverlay } from './EventOverlay'
import { LeaderboardButton } from './LeaderboardButton'
import { LogoBanner } from './LogoBanner'
import { OfflineProgressModal } from './OfflineProgressModal'
import { PlusPopup, type PopupController } from './PlusPopup'
import { PrestigeButton } from './PrestigeButton'
import { RepoLink } from './RepoLink'
import { RussiaMapBg } from './RussiaMapBg'
import { SettingsMenuButton } from './SettingsMenu'
import { SoundToggle } from './SoundToggle'
import { UpgradesMenuButton } from './UpgradesMenu'
import { useAuthSync } from './useAuthSync'
import { useTabTitle } from './useTabTitle'

export function AppShell() {
  const hydrated = useGameStore((s) => s.hydrated)
  const tick = useGameStore((s) => s.tick)
  const handleRef = useRef<TickHandle | null>(null)
  const popupRef = useRef<PopupController | null>(null)

  useTabTitle()
  useAuthSync()

  useEffect(() => {
    if (!hydrated) return
    handleRef.current = startTickLoop((steps) => {
      tick(steps * TICK_STEP_MS)
    })
    return () => {
      handleRef.current?.stop()
    }
  }, [hydrated, tick])

  useEffect(() => {
    const flush = () => {
      flushPendingSave()
    }
    document.addEventListener('visibilitychange', flush)
    window.addEventListener('beforeunload', flush)
    return () => {
      document.removeEventListener('visibilitychange', flush)
      window.removeEventListener('beforeunload', flush)
    }
  }, [])

  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prevHtmlOverflow = html.style.overflow
    const prevBodyOverflow = body.style.overflow
    const prevOverscroll = body.style.overscrollBehavior
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    body.style.overscrollBehavior = 'none'
    return () => {
      html.style.overflow = prevHtmlOverflow
      body.style.overflow = prevBodyOverflow
      body.style.overscrollBehavior = prevOverscroll
    }
  }, [])

  if (!hydrated) {
    return (
      <main className="min-h-screen flex items-center justify-center font-mono opacity-70">
        загрузка сейва…
      </main>
    )
  }

  return (
    <main className="lock-scroll h-[100dvh] overflow-hidden flex flex-col">
      <RussiaMapBg />
      <header className="w-full flex items-center justify-between gap-2 px-3 py-2 border-b border-rkn-dim/40">
        <div className="flex items-center gap-2 min-w-0">
          <UpgradesMenuButton />
          <EpauletIndicator />
        </div>
        <div className="flex items-center gap-2 justify-end">
          <PrestigeButton />
          <div className="hidden sm:flex items-center gap-2 flex-wrap justify-end">
            <LeaderboardButton />
            <AchievementsButton />
            <SoundToggle />
            <AuthButton />
          </div>
          <div className="sm:hidden">
            <SettingsMenuButton />
          </div>
        </div>
      </header>

      <div className="px-3 pt-5 pb-2 shrink-0">
        <LogoBanner />
      </div>

      <section className="flex-1 flex flex-col items-center justify-center gap-6 px-3 py-6 min-h-0">
        <BlocksCounter />
        <ClickButton popupRef={popupRef} />
      </section>

      <BoostsPanel />
      <PlusPopup controllerRef={popupRef} />
      <OfflineProgressModal />
      <AchievementToastStack />
      <EventOverlay />
      <RepoLink />
      <AuthorCredit />
    </main>
  )
}
