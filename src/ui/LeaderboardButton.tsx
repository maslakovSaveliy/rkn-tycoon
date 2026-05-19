'use client'

import Link from 'next/link'

export function LeaderboardButton() {
  return (
    <Link
      href="/leaderboard"
      className="border border-current px-3 py-1 text-xs uppercase font-mono hover:bg-rkn-fg hover:text-rkn-bg transition-colors"
      aria-label="Лидерборд"
    >
      лидерборд
    </Link>
  )
}
