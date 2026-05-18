import Decimal from 'break_infinity.js'

export interface CensorDef {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly baseCost: Decimal
  readonly baseCps: Decimal
}

export const CENSOR_COST_RATIO = 1.15

export const CENSORS: readonly CensorDef[] = [
  {
    id: 'intern',
    name: 'Стажёр-цензор',
    description:
      'Молодой специалист по итогам отбора. Зарплата символическая, отчётность бумажная. Работает по 0,5 блокировки в секунду.',
    baseCost: new Decimal(15),
    baseCps: new Decimal(0.5),
  },
  {
    id: 'district-expert',
    name: 'Районный эксперт',
    description:
      'Сотрудник отдела с командировочным удостоверением. Профильное образование. Производительность — 5 блокировок в секунду.',
    baseCost: new Decimal(100),
    baseCps: new Decimal(5),
  },
  {
    id: 'regional-admin',
    name: 'Региональное управление',
    description:
      'Подразделение в субъекте федерации. Штатное расписание утверждено. Отчёты сдаются вовремя.',
    baseCost: new Decimal(1_100),
    baseCps: new Decimal(47),
  },
  {
    id: 'smi-monitoring',
    name: 'Отдел мониторинга СМИ',
    description:
      'Круглосуточный пост наблюдения. Анализирует ленты в реальном времени. Производит 260 блокировок в секунду.',
    baseCost: new Decimal(12_000),
    baseCps: new Decimal(260),
  },
  {
    id: 'tspu-echelon',
    name: 'Эшелон ТСПУ',
    description:
      'Технические средства противодействия угрозам. Развёрнуты на узлах операторов. Безотказное действие на тысячи цели.',
    baseCost: new Decimal(130_000),
    baseCps: new Decimal(1_400),
  },
  {
    id: 'neural-classifier',
    name: 'Нейросеть-классификатор',
    description:
      'Обученный комплекс. Снимает рутину с экспертизы. Производит блокировки в промышленном объёме — 7 800 в секунду.',
    baseCost: new Decimal(1_400_000),
    baseCps: new Decimal(7_800),
  },
  {
    id: 'ministry-of-truth',
    name: 'Министерство правды',
    description:
      'Главное управление по делам информации. Решения принимаются коллегиально и единогласно. Выработка — 44 000 блокировок в секунду.',
    baseCost: new Decimal(20_000_000),
    baseCps: new Decimal(44_000),
  },
  {
    id: 'sovereign-internet',
    name: 'Суверенный интернет',
    description:
      'Замкнутый периметр национального сегмента. Реализован в установленные сроки. Производит 260 000 блокировок в секунду.',
    baseCost: new Decimal(330_000_000),
    baseCps: new Decimal(260_000),
  },
]

export const CENSORS_BY_ID: Readonly<Record<string, CensorDef>> = Object.freeze(
  Object.fromEntries(CENSORS.map((c) => [c.id, c])),
)
