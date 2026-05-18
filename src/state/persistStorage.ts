import { createJSONStorage, type StateStorage } from 'zustand/middleware'
import { replacer, reviver } from '@/engine'

export const PERSIST_STORAGE_KEY = 'rkn-tycoon@v1'

const SAVE_THROTTLE_MS = 10_000

interface PendingSave {
  name: string
  value: string
}
let pending: PendingSave | null = null
let timer: ReturnType<typeof setTimeout> | null = null

export function flushPendingSave(): void {
  if (typeof window === 'undefined') return
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  if (pending) {
    window.localStorage.setItem(pending.name, pending.value)
    pending = null
  }
}

const throttledLocalStorage: StateStorage = {
  getItem: (name) => {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem(name)
  },
  setItem: (name, value) => {
    if (typeof window === 'undefined') return
    pending = { name, value }
    if (timer) return
    timer = setTimeout(() => {
      timer = null
      flushPendingSave()
    }, SAVE_THROTTLE_MS)
  },
  removeItem: (name) => {
    if (typeof window === 'undefined') return
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    pending = null
    window.localStorage.removeItem(name)
  },
}

export const persistStorage = createJSONStorage(
  () => throttledLocalStorage,
  { replacer, reviver },
)

export function storageSizeBytes(): number {
  if (typeof window === 'undefined') return 0
  const raw = window.localStorage.getItem(PERSIST_STORAGE_KEY)
  return raw ? new Blob([raw]).size : 0
}

export function clearPersistedSave(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(PERSIST_STORAGE_KEY)
}
