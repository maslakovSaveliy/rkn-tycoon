'use client'

import { useEffect, useRef } from 'react'
import { useSession } from '@/lib/authClient'
import { useGameStore } from '@/state/gameStore'
import { fetchServerSave, pushServerSave } from '@/state/serverSync'
import { CURRENT_SAVE_VERSION } from '@/types/save'

const PUSH_THROTTLE_MS = 30_000

/**
 * Two-tier sync between localStorage save and Supabase Save row.
 *
 * 1. On session resolve (user signed in / anon ready): merge local vs server
 *    by `updatedAt`; newer wins. If server is newer → applyServerSave +
 *    overwrite localStorage. If local is newer → push to server.
 * 2. While signed in: throttled (30 s) push of current state to server +
 *    flush on `visibilitychange` / `beforeunload`.
 *
 * Anonymous users follow the same flow — server save is also tied to
 * `anonymousUser.id`, and the `onLinkAccount` callback migrates it to the
 * real user on signup.
 */
export function useAuthSync(): void {
  const { data: session, isPending } = useSession()
  const hydrated = useGameStore((s) => s.hydrated)
  const applyServerSave = useGameStore((s) => s.applyServerSave)

  const lastUserIdRef = useRef<string | null>(null)
  const lastPushAtRef = useRef(0)
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (isPending || !hydrated) return
    if (!session) {
      lastUserIdRef.current = null
      return
    }
    const userId = session.user.id
    if (lastUserIdRef.current === userId) return
    lastUserIdRef.current = userId

    void (async () => {
      const remote = await fetchServerSave()
      const local = useGameStore.getState()
      const localUpdatedAt = local.lastTick

      if (!remote) {
        await pushServerSave({
          state: snapshotPersistable(local),
          version: CURRENT_SAVE_VERSION,
          updatedAt: localUpdatedAt,
        })
        return
      }

      if (remote.updatedAt > localUpdatedAt) {
        applyServerSave(remote.state)
      } else if (localUpdatedAt > remote.updatedAt) {
        await pushServerSave({
          state: snapshotPersistable(local),
          version: CURRENT_SAVE_VERSION,
          updatedAt: localUpdatedAt,
        })
      }
    })()
  }, [session, isPending, hydrated, applyServerSave])

  useEffect(() => {
    if (!session || !hydrated) return

    const pushNow = () => {
      lastPushAtRef.current = Date.now()
      const snap = snapshotPersistable(useGameStore.getState())
      void pushServerSave({
        state: snap,
        version: CURRENT_SAVE_VERSION,
        updatedAt: Date.now(),
      })
    }

    const schedule = () => {
      if (pushTimerRef.current) return
      const elapsed = Date.now() - lastPushAtRef.current
      const delay = Math.max(0, PUSH_THROTTLE_MS - elapsed)
      pushTimerRef.current = setTimeout(() => {
        pushTimerRef.current = null
        pushNow()
      }, delay)
    }

    const unsubscribe = useGameStore.subscribe(schedule)

    const flush = () => {
      if (pushTimerRef.current) {
        clearTimeout(pushTimerRef.current)
        pushTimerRef.current = null
      }
      pushNow()
    }
    document.addEventListener('visibilitychange', flush)
    window.addEventListener('beforeunload', flush)

    return () => {
      unsubscribe()
      document.removeEventListener('visibilitychange', flush)
      window.removeEventListener('beforeunload', flush)
      if (pushTimerRef.current) {
        clearTimeout(pushTimerRef.current)
        pushTimerRef.current = null
      }
    }
  }, [session, hydrated])
}

function snapshotPersistable(s: ReturnType<typeof useGameStore.getState>) {
  return {
    blocks: s.blocks,
    totalBlocksEver: s.totalBlocksEver,
    clickValue: s.clickValue,
    cps: s.cps,
    prestigeMult: s.prestigeMult,
    lastTick: s.lastTick,
    tickCount: s.tickCount,
    uptimeStartMs: s.uptimeStartMs,
    purchasedClickUpgrades: s.purchasedClickUpgrades,
    censorCounts: s.censorCounts,
    offlineEarnings: null,
    unlockedAchievements: s.unlockedAchievements,
    achievementToastQueue: [],
    telegramLeakStreak: s.telegramLeakStreak,
    prestigeStars: s.prestigeStars,
    activeMultipliers: [],
    clickBoosts: [],
    activeEvent: null,
    nextEventSpawnAt: 0,
  }
}
