'use client'

import { CENSORS } from '@/data/censors'
import { CensorCard } from './CensorCard'

interface Props {
  chrome?: 'standalone' | 'bare'
}

export function CensorPanel({ chrome = 'standalone' }: Props) {
  return (
    <div className="w-full flex flex-col gap-2">
      {chrome === 'standalone' && (
        <header className="text-xs uppercase tracking-widest opacity-60 sticky top-0 bg-rkn-bg py-1">
          Аппарат цензуры
        </header>
      )}
      {CENSORS.map((c) => (
        <CensorCard key={c.id} censor={c} />
      ))}
    </div>
  )
}
