import Decimal from 'break_infinity.js'

export interface ClickUpgradeDef {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly cost: Decimal
  readonly multiplier: number
}

export const CLICK_UPGRADES: readonly ClickUpgradeDef[] = [
  {
    id: 'rubber-stamp',
    name: 'Резиновая печать',
    description:
      'Согласно регламенту, все заявления требуют оттиска синего цвета. Ручной труд удваивается.',
    cost: new Decimal(100),
    multiplier: 2,
  },
  {
    id: 'blacklist-v1',
    name: 'Чёрный список 1.0',
    description:
      'Реестр в табличном виде. Ведётся ответственным лицом. Скорость рассмотрения возрастает кратно.',
    cost: new Decimal(500),
    multiplier: 2,
  },
  {
    id: 'block-regulation',
    name: 'Регламент блокировки',
    description:
      'Унифицированная процедура. Согласована с тремя ведомствами и одной комиссией. Решение принимается без обсуждения.',
    cost: new Decimal(2_500),
    multiplier: 2,
  },
  {
    id: 'yarovaya-act',
    name: 'Закон Яровой',
    description:
      'Профильный пакет норм. Расширяет полномочия по хранению и обработке. Эффект — троекратный.',
    cost: new Decimal(15_000),
    multiplier: 3,
  },
  {
    id: 'dpi-equipment',
    name: 'DPI-оборудование',
    description:
      'Аппаратные средства глубокой инспекции. Поставка осуществлена по линии операторов. Производительность утроена.',
    cost: new Decimal(100_000),
    multiplier: 3,
  },
  {
    id: 'unified-registry',
    name: 'Единый реестр запрещённых сайтов',
    description:
      'Централизованный учёт. Доступ по защищённому каналу. Решения тиражируются автоматически — эффективность вчетверо выше.',
    cost: new Decimal(750_000),
    multiplier: 4,
  },
  {
    id: 'revizor',
    name: 'Автоматизированная система «Ревизор»',
    description:
      'Программно-аппаратный комплекс мониторинга. Работает круглосуточно. Производительность пятикратная.',
    cost: new Decimal(5_000_000),
    multiplier: 5,
  },
  {
    id: 'ai-classifier',
    name: 'AI-классификатор контента',
    description:
      'Машинное обучение по корпусу прецедентов. Снимает с уполномоченного бремя анализа. Скорость возрастает кратно пятикратно.',
    cost: new Decimal(40_000_000),
    multiplier: 5,
  },
  {
    id: 'quantum-censor',
    name: 'Квантовый цензор',
    description:
      'Согласно поручению, развёрнут перспективный комплекс. Применяет принципы суперпозиции к экспертизе материалов. Эффект — семикратный.',
    cost: new Decimal(300_000_000),
    multiplier: 7,
  },
  {
    id: 'decree-451',
    name: 'Указ Президента №451',
    description:
      'Подписан в установленном порядке. Не подлежит обжалованию. Производительность увеличивается десятикратно.',
    cost: new Decimal('2.5e9'),
    multiplier: 10,
  },
]

export const CLICK_UPGRADES_BY_ID: Readonly<Record<string, ClickUpgradeDef>> =
  Object.freeze(
    Object.fromEntries(CLICK_UPGRADES.map((u) => [u.id, u])),
  )
