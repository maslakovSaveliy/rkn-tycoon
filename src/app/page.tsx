import Link from 'next/link'

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'VideoGame',
  name: 'RKN Tycoon',
  description:
    'Сатирический идл-кликер про интернет-цензуру. Кликай «Заблокировать», копи блокировки, нанимай цензоров и стройте цензурную империю.',
  url: 'https://rkn-tycoon.ru/',
  inLanguage: 'ru',
  genre: ['Idle', 'Clicker', 'Satire', 'Browser'],
  gamePlatform: 'Web browser',
  applicationCategory: 'Game',
  operatingSystem: 'Any',
  author: { '@type': 'Person', name: 'maslakovSaveliy' },
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'RUB' },
}

export default function HomePage() {
  return (
    <main
      id="main"
      className="h-[100dvh] overflow-y-auto flex flex-col items-center font-mono"
    >
      <script
        type="application/ld+json"
        // Safe: object is local + JSON.stringified at build time
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="flex flex-col items-center justify-center gap-8 p-6 text-center min-h-[100dvh] w-full max-w-2xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-bold">RKN Tycoon</h1>
        <p className="max-w-md text-sm opacity-80 leading-relaxed">
          Идл-кликер про интернет-цензуру. Сатира на Роскомнадзор. Кликайте
          «Заблокировать», копите блокировки, нанимайте цензоров — и стройте
          цензурную империю в браузере.
        </p>
        <Link
          href="/play"
          className="border border-current px-6 py-2 uppercase hover:opacity-80 transition-opacity"
        >
          Играть →
        </Link>

        <p className="text-[10px] opacity-40 max-w-sm leading-snug mt-6">
          Сатирическое произведение. Не аффилировано с Роскомнадзором,
          госорганами и реальными лицами. Все совпадения случайны.
        </p>
      </section>

      <section className="w-full max-w-2xl mx-auto px-6 pb-16 flex flex-col gap-10">
        <article>
          <h2 className="text-xl uppercase tracking-widest mb-3 text-rkn-fg">
            Как играть в идл-кликер про Роскомнадзор
          </h2>
          <ol className="text-sm opacity-80 space-y-2 leading-relaxed list-decimal pl-5">
            <li>
              Кликайте по большой кнопке «Заблокировать» — каждый клик
              добавляет блокировки на ваш счёт.
            </li>
            <li>
              Покупайте улучшения кликов: бо́льший выход с каждого клика,
              автоматизация рутины.
            </li>
            <li>
              Нанимайте автоматических цензоров — от стажёра до министерства
              правды — чтобы они работали за вас офлайн.
            </li>
            <li>
              Сбрасывайте прогресс в престиже за звёзды и множители.
            </li>
          </ol>
        </article>

        <article>
          <h2 className="text-xl uppercase tracking-widest mb-3 text-rkn-fg">
            Что внутри игры
          </h2>
          <ul className="text-sm opacity-80 space-y-2 leading-relaxed list-disc pl-5">
            <li>
              Восемь типов цензоров с растущей производительностью — от
              стажёра до суверенного интернета.
            </li>
            <li>
              Случайные события: VPN-утечки, утечки в Telegram, внеплановые
              проверки, чёрные лебеди.
            </li>
            <li>
              Достижения — 12 наград за освоение бюрократической карьеры.
            </li>
            <li>
              Лидерборд по блокировкам и по звёздам престижа.
            </li>
            <li>
              Сохранение в браузере. С регистрацией — синхронизация между
              устройствами.
            </li>
          </ul>
        </article>

        <article>
          <h2 className="text-xl uppercase tracking-widest mb-3 text-rkn-fg">
            Часто задаваемые вопросы
          </h2>
          <dl className="text-sm opacity-80 space-y-3 leading-relaxed">
            <div>
              <dt className="font-bold uppercase text-xs tracking-wider opacity-100">
                Это правда про Роскомнадзор?
              </dt>
              <dd>
                Нет. RKN Tycoon — это сатирический проект, художественная
                карикатура. Все совпадения с реальностью — случайны.
              </dd>
            </div>
            <div>
              <dt className="font-bold uppercase text-xs tracking-wider opacity-100">
                Нужна ли регистрация?
              </dt>
              <dd>
                Нет. Прогресс сохраняется локально в вашем браузере. Регистрация
                нужна только для лидерборда и переноса прогресса между
                устройствами.
              </dd>
            </div>
            <div>
              <dt className="font-bold uppercase text-xs tracking-wider opacity-100">
                Игра бесплатная?
              </dt>
              <dd>
                Полностью. Никакой монетизации, рекламы или донатов — это
                небольшой open-source хобби-проект.
              </dd>
            </div>
          </dl>
        </article>

        <Link
          href="/play"
          className="self-center border border-current px-6 py-2 uppercase hover:opacity-80 transition-opacity"
        >
          Играть →
        </Link>
      </section>
    </main>
  )
}
