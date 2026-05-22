import Link from 'next/link'

export const metadata = {
  title: 'Страница не найдена',
  robots: { index: false, follow: true },
}

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-6 text-center font-mono text-rkn-fg">
      <pre className="text-rkn-fg text-glow text-[10px] sm:text-xs leading-tight select-none">
{`╔══════════════════════════════╗
║                              ║
║       4 0 4 · ОТКАЗАНО       ║
║                              ║
╚══════════════════════════════╝`}
      </pre>

      <div className="flex flex-col gap-2 max-w-md">
        <p className="text-sm uppercase tracking-wider opacity-80">
          Запрашиваемая страница в реестре не значится
        </p>
        <p className="text-xs opacity-50 leading-relaxed">
          Согласно действующему регламенту, ресурс по указанному адресу не
          обнаружен. Возможно, он был удалён по решению комиссии либо никогда
          и не существовал.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap justify-center">
        <Link
          href="/play"
          className="border border-current px-4 py-2 text-xs uppercase tracking-widest hover:bg-rkn-fg hover:text-rkn-bg transition-colors"
        >
          в игру
        </Link>
        <Link
          href="/"
          className="border border-rkn-fg/40 px-4 py-2 text-xs uppercase tracking-widest hover:border-rkn-fg/80 transition-colors"
        >
          на главную
        </Link>
        <Link
          href="/leaderboard"
          className="border border-rkn-fg/40 px-4 py-2 text-xs uppercase tracking-widest hover:border-rkn-fg/80 transition-colors"
        >
          лидерборд
        </Link>
      </div>

      <footer className="text-[10px] opacity-30 mt-4 tracking-widest">
        ERR-404 · ROUTE NOT INDEXED
      </footer>
    </main>
  )
}
