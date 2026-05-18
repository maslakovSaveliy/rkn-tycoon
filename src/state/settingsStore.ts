import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

const SETTINGS_STORAGE_KEY = 'rkn-tycoon-settings@v1'
const SETTINGS_VERSION = 1

export interface SettingsState {
  soundEnabled: boolean
  setSoundEnabled: (v: boolean) => void
  toggleSound: () => void
}

const ssrSafeStorage = {
  getItem: (name: string): string | null => {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem(name)
  },
  setItem: (name: string, value: string): void => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(name, value)
  },
  removeItem: (name: string): void => {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(name)
  },
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      soundEnabled: true,
      setSoundEnabled: (v) => {
        set({ soundEnabled: v })
      },
      toggleSound: () => {
        set({ soundEnabled: !get().soundEnabled })
      },
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      version: SETTINGS_VERSION,
      storage: createJSONStorage(() => ssrSafeStorage),
      partialize: (s) => ({ soundEnabled: s.soundEnabled }),
    },
  ),
)
