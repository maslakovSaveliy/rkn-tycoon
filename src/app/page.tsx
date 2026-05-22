import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="h-[100dvh] overflow-hidden flex flex-col items-center justify-center gap-8 p-6 text-center">
      <h1 className="text-4xl font-mono">RKN Tycoon</h1>
      <p className="max-w-md font-mono text-sm opacity-80">
        Идл-кликер про интернет-цензуру. Сатира. Кликайте «Заблокировать»,
        копите блокировки, нанимайте цензоров.
      </p>
      <Link
        href="/play"
        className="border border-current px-6 py-2 font-mono uppercase hover:opacity-80"
      >
        Играть →
      </Link>
    </main>
  )
}
