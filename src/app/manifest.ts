import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'RKN Tycoon — идл-кликер про интернет-цензуру',
    short_name: 'RKN Tycoon',
    description:
      'Сатирический идл-кликер. Кликайте «Заблокировать», копите блокировки, нанимайте цензоров.',
    start_url: '/play',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0a0a0a',
    theme_color: '#c0d000',
    lang: 'ru',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    categories: ['games', 'entertainment'],
  }
}
