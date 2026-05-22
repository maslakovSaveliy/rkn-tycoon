import { Suspense } from 'react'
import Link from 'next/link'
import { formatMantissaExponent } from '@/lib/formatBigDecimal'
import { getTop, type LeaderboardSort } from '@/server/leaderboardRepo'

export const revalidate = 60

export const metadata = {
  title: 'Лидерборд',
  description:
    'Топ игроков RKN Tycoon — лидеры по блокировкам и звёздам престижа. Идл-кликер про интернет-цензуру.',
  alternates: { canonical: '/leaderboard' },
}

interface PageProps {
  searchParams: Promise<{ by?: string }>
}

export default async function LeaderboardPage({ searchParams }: PageProps) {
  const { by } = await searchParams
  const sort: LeaderboardSort = by === 'stars' ? 'stars' : 'blocks'

  return (
    <main className="min-h-screen p-4 sm:p-6 font-mono text-rkn-fg flex flex-col gap-4 max-w-3xl mx-auto">
      <header className="flex items-center justify-between border-b border-rkn-fg/40 pb-2">
        <h1 className="text-lg uppercase tracking-[0.3em]">
          Лидерборд RKN Tycoon
        </h1>
        <Link
          href="/play"
          className="border border-current px-3 py-1 text-xs uppercase hover:bg-rkn-fg hover:text-rkn-bg transition-colors"
        >
          ← в игру
        </Link>
      </header>

      <nav className="flex gap-2 text-xs uppercase">
        <TabLink href="/leaderboard?by=blocks" active={sort === 'blocks'}>
          по блокировкам
        </TabLink>
        <TabLink href="/leaderboard?by=stars" active={sort === 'stars'}>
          по звёздам
        </TabLink>
      </nav>

      <Suspense key={sort} fallback={<LeaderboardSkeleton />}>
        <LeaderboardRows sort={sort} />
      </Suspense>

      <footer className="text-[10px] opacity-40 mt-4">
        обновляется раз в минуту · только зарегистрированные игроки
      </footer>
    </main>
  )
}

async function LeaderboardRows({ sort }: { sort: LeaderboardSort }) {
  let rows: Awaited<ReturnType<typeof getTop>>
  try {
    rows = await getTop(sort, 100)
  } catch (err) {
    console.error('[leaderboard] getTop failed', {
      sort,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    })
    throw err
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm opacity-60">
        (пока никто не зарегистрировался — будь первым)
      </p>
    )
  }

  return (
    <ol className="flex flex-col gap-1 text-sm">
      {rows.map((r, i) => (
        <li
          key={r.userId}
          className="grid grid-cols-[2.5rem_1fr_auto] gap-3 items-baseline border border-rkn-fg/20 px-3 py-2 hover:border-rkn-fg/60 transition-colors"
        >
          <span className="text-rkn-dim tabular-nums text-xs">
            #{String(i + 1).padStart(3, '0')}
          </span>
          <span className="truncate" title={r.name}>
            {r.name}
          </span>
          <span className="tabular-nums whitespace-nowrap">
            {sort === 'blocks'
              ? formatMantissaExponent(
                  r.totalBlocks.mantissa,
                  r.totalBlocks.exponent,
                )
              : `${String(r.prestigeStars)} ★`}
          </span>
        </li>
      ))}
    </ol>
  )
}

function LeaderboardSkeleton() {
  return (
    <ol
      aria-busy="true"
      aria-label="Загружаем лидерборд"
      className="flex flex-col gap-1 text-sm"
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <li
          key={i}
          className="grid grid-cols-[2.5rem_1fr_auto] gap-3 items-baseline border border-rkn-fg/15 px-3 py-2 animate-pulse"
        >
          <span className="text-rkn-dim/60 tabular-nums text-xs">
            #{String(i + 1).padStart(3, '0')}
          </span>
          <span className="h-3 bg-rkn-fg/15 rounded-sm w-2/3" />
          <span className="h-3 bg-rkn-fg/15 rounded-sm w-16" />
        </li>
      ))}
    </ol>
  )
}

function TabLink({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={`px-3 py-1 tracking-wider transition-colors ${
        active
          ? 'bg-rkn-fg text-rkn-bg'
          : 'border border-rkn-fg/50 hover:border-rkn-fg'
      }`}
    >
      {children}
    </Link>
  )
}
