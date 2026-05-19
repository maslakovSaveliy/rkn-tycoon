'use client'

import { useCallback, useState } from 'react'
import { signOut, useSession } from '@/lib/authClient'
import { AuthModal } from './AuthModal'

export function AuthButton() {
  const { data: session, isPending } = useSession()
  const [open, setOpen] = useState(false)

  const handleSignOut = useCallback(async () => {
    await signOut()
  }, [])

  if (isPending) {
    return (
      <span className="border border-current px-3 py-1 text-xs uppercase font-mono opacity-40">
        …
      </span>
    )
  }

  const isAnonymous =
    session?.user.isAnonymous === true ||
    (typeof session?.user.email === 'string' &&
      session.user.email.endsWith('@anonymous.rkn-tycoon.local'))

  if (!session || isAnonymous) {
    return (
      <>
        <button
          type="button"
          onClick={() => {
            setOpen(true)
          }}
          className="border border-current px-3 py-1 text-xs uppercase font-mono hover:bg-rkn-fg hover:text-rkn-bg cursor-pointer transition-colors"
        >
          войти
        </button>
        {open && (
          <AuthModal
            onClose={() => {
              setOpen(false)
            }}
          />
        )}
      </>
    )
  }

  const label = session.user.email ?? 'аккаунт'
  return (
    <span className="flex items-center gap-1 text-xs uppercase font-mono">
      <span
        className="border border-rkn-fg/60 px-2 py-1 max-w-[14ch] truncate"
        title={label}
      >
        {label}
      </span>
      <button
        type="button"
        onClick={() => {
          void handleSignOut()
        }}
        className="border border-current px-2 py-1 hover:bg-rkn-fg hover:text-rkn-bg cursor-pointer transition-colors"
        aria-label="Выйти из аккаунта"
      >
        выйти
      </button>
    </span>
  )
}
