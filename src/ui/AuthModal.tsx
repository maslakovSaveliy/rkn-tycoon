'use client'

import { useEffect, useState } from 'react'
import { signIn, signUp } from '@/lib/authClient'

type Mode = 'signin' | 'signup'

interface Props {
  onClose: () => void
}

export function AuthModal({ onClose }: Props) {
  const [mode, setMode] = useState<Mode>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (mode === 'signup') {
        // Use the explicit nickname if provided; otherwise leave name empty —
        // leaderboardRepo.pickDisplayName falls back to an anonymized 'игрок_XXXXXX'
        // so the email local-part is never published as a public display name.
        const trimmedNick = nickname.trim().slice(0, 24)
        const res = await signUp.email({ email, password, name: trimmedNick })
        if (res.error) {
          setError(res.error.message ?? 'не удалось зарегистрироваться')
          return
        }
      } else {
        const res = await signIn.email({ email, password })
        if (res.error) {
          setError(res.error.message ?? 'не удалось войти')
          return
        }
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'сервер не отвечает')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm font-mono p-4"
    >
      <form
        onClick={(e) => {
          e.stopPropagation()
        }}
        onSubmit={(e) => {
          void submit(e)
        }}
        className="border-2 border-rkn-fg bg-rkn-bg text-rkn-fg w-full max-w-sm p-6 flex flex-col gap-4"
      >
        <header className="flex items-center justify-between border-b border-rkn-fg/40 pb-2">
          <span id="auth-modal-title" className="text-xs uppercase tracking-[0.3em] opacity-70">
            {mode === 'signup' ? 'Регистрация' : 'Вход'}
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

        <label className="flex flex-col gap-1 text-xs uppercase tracking-wider">
          email
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
            }}
            className="border border-rkn-fg/60 bg-transparent text-rkn-fg px-2 py-2 font-mono text-sm focus:border-rkn-fg focus:outline-none"
          />
        </label>

        {mode === 'signup' && (
          <label className="flex flex-col gap-1 text-xs uppercase tracking-wider">
            ник (опционально)
            <input
              type="text"
              autoComplete="nickname"
              maxLength={24}
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value)
              }}
              placeholder="как показывать в лидерборде"
              className="border border-rkn-fg/60 bg-transparent text-rkn-fg px-2 py-2 font-mono text-sm focus:border-rkn-fg focus:outline-none placeholder:text-rkn-fg/30 normal-case tracking-normal"
            />
            <span className="text-[10px] opacity-50 normal-case tracking-normal">
              пусто — анонимный «игрок_XXXXXX»
            </span>
          </label>
        )}

        <label className="flex flex-col gap-1 text-xs uppercase tracking-wider">
          пароль
          <input
            type="password"
            required
            minLength={8}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
            }}
            className="border border-rkn-fg/60 bg-transparent text-rkn-fg px-2 py-2 font-mono text-sm focus:border-rkn-fg focus:outline-none"
          />
          <span className="text-[10px] opacity-50 normal-case tracking-normal">
            минимум 8 символов
          </span>
        </label>

        {error !== null && (
          <p className="text-xs text-rkn-warning border border-rkn-warning/60 px-2 py-1">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="border border-rkn-fg px-4 py-2 text-xs uppercase tracking-widest hover:bg-rkn-fg hover:text-rkn-bg cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting
            ? '…'
            : mode === 'signup'
              ? 'зарегистрироваться'
              : 'войти'}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'signup' ? 'signin' : 'signup')
            setError(null)
          }}
          className="text-[11px] opacity-70 hover:opacity-100 cursor-pointer"
        >
          {mode === 'signup'
            ? 'уже есть аккаунт? войти'
            : 'нет аккаунта? зарегистрироваться'}
        </button>

        <p className="text-[10px] opacity-40 leading-snug">
          Регистрация без подтверждения email. Прогресс сохранится на сервере
          и подтянется на любом устройстве.
        </p>
      </form>
    </div>
  )
}
