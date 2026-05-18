import Decimal from 'break_infinity.js'
import { CENSORS_BY_ID } from './censors'
import { CLICK_UPGRADES_BY_ID } from './clickUpgrades'

export interface AchievementDef {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly check: (s: AchievementCheckState) => boolean
}

export interface AchievementCheckState {
  readonly blocks: Decimal
  readonly totalBlocksEver: Decimal
  readonly tickCount: number
  readonly purchasedClickUpgrades: string[]
  readonly censorCounts: Readonly<Record<string, number>>
  readonly prestigeStars: number
  readonly telegramLeakStreak: number
}

const e = (n: string) => new Decimal(n)

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  {
    id: 'first-complaint',
    name: 'Первая жалоба рассмотрена',
    description:
      'Регистрационный номер присвоен. Дело движется в установленном порядке.',
    check: (s) => s.totalBlocksEver.gte(1),
  },
  {
    id: 'registry-filled',
    name: 'Реестр пополнен',
    description: 'Отметка о включении внесена. Контроль продолжается.',
    check: (s) => s.totalBlocksEver.gte(1_000),
  },
  {
    id: 'mid-level-bureaucrat',
    name: 'Бюрократ среднего звена',
    description:
      'Профессиональный рост констатирован. Премиальная часть оклада — по итогам квартала.',
    check: (s) => s.totalBlocksEver.gte(e('1e6')),
  },
  {
    id: 'great-censor',
    name: 'Великий цензор',
    description:
      'Установленный порог пройден. Подразделение представлено к награде.',
    check: (s) => s.totalBlocksEver.gte(e('1e9')),
  },
  {
    id: 'architect-of-silence',
    name: 'Архитектор тишины',
    description:
      'Тишина — это не отсутствие звука, а отсутствие неугодных сигналов. Установлено.',
    check: (s) => s.totalBlocksEver.gte(e('1e12')),
  },
  {
    id: 'first-decree-signed',
    name: 'Указ подписан',
    description: 'Первый акт нормативного характера. Подлежит исполнению.',
    check: (s) => s.purchasedClickUpgrades.length >= 1,
  },
  {
    id: 'staffing-table',
    name: 'Штатное расписание',
    description:
      'Полсотни сотрудников одной должности. Профсоюз уведомлён.',
    check: (s) => {
      for (const id of Object.keys(s.censorCounts)) {
        if ((s.censorCounts[id] ?? 0) >= 50) return true
      }
      return false
    },
  },
  {
    id: 'yarovaya-passed',
    name: 'Закон Яровой принят',
    description:
      'Профильный пакет норм действует. Меморандумы согласованы по линии.',
    check: (s) => {
      const def = CLICK_UPGRADES_BY_ID['yarovaya-act']
      if (!def) return false
      return s.purchasedClickUpgrades.includes(def.id)
    },
  },
  {
    id: 'great-firewall-junior',
    name: 'Великий китайский файрвол младший',
    description:
      'Зарубежный опыт изучен и адаптирован. 100 единиц инфраструктуры в строю.',
    check: (s) => {
      const def = CENSORS_BY_ID['tspu-echelon']
      if (!def) return false
      return (s.censorCounts[def.id] ?? 0) >= 100
    },
  },
  {
    id: 'first-medal',
    name: 'Орден на грудь',
    description:
      'Высочайшим повелением представлены к награде. Церемония — в установленные сроки.',
    check: (s) => s.prestigeStars >= 1,
  },
  {
    id: 'service-veteran',
    name: 'Ветеран службы',
    description:
      'Многократное прохождение испытаний. Пять знаков отличия — основание для пенсии.',
    check: (s) => s.prestigeStars >= 5,
  },
  {
    id: 'vpn-what-thats',
    name: 'VPN? Не слышал',
    description:
      'Десять утечек подряд отработаны без потерь. Сообразительность зафиксирована.',
    check: (s) => s.telegramLeakStreak >= 10,
  },
]

export const ACHIEVEMENTS_BY_ID: Readonly<Record<string, AchievementDef>> =
  Object.freeze(
    Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a])),
  )
