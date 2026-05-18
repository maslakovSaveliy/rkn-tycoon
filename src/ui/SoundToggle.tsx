'use client'

import { unlockAudio } from '@/lib/audio'
import { useSettingsStore } from '@/state/settingsStore'

export function SoundToggle() {
  const soundEnabled = useSettingsStore((s) => s.soundEnabled)
  const toggleSound = useSettingsStore((s) => s.toggleSound)

  return (
    <button
      type="button"
      onClick={() => {
        toggleSound()
        if (!soundEnabled) {
          unlockAudio()
        }
      }}
      className="border border-current px-3 py-1 text-xs uppercase font-mono hover:opacity-80"
      aria-pressed={soundEnabled}
    >
      звук: {soundEnabled ? 'вкл' : 'выкл'}
    </button>
  )
}
