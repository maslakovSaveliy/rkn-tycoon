import type Decimal from 'break_infinity.js'
import type { GameState } from '@/types/save'

export type EventEffect =
  | { kind: 'click-mult-timed'; value: number; durationMs: number }
  | { kind: 'cps-mult-timed'; value: number; durationMs: number }
  | { kind: 'cps-instant-lump'; seconds: number }
  | { kind: 'click-mult-counter'; value: number; clicks: number }
  | { kind: 'random-fork'; branches: EventEffect[] }

export interface EventDef {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly weight: number
  readonly negative: boolean
  readonly glyph: string
  readonly effect: EventEffect
}

export const EVENTS: readonly EventDef[] = [
  {
    id: 'vpn-leak',
    name: 'VPN-утечка',
    description:
      'Сообщение зафиксировано в установленном порядке. Активируется режим повышенной готовности.',
    weight: 40,
    negative: false,
    glyph: '⚡',
    effect: { kind: 'click-mult-timed', value: 7, durationMs: 30_000 },
  },
  {
    id: 'free-internet',
    name: 'Свободный интернет!',
    description:
      'Внеплановая раздача доступа. Подведомственный аппарат работает в усиленном режиме.',
    weight: 30,
    negative: false,
    glyph: '✦',
    // 13× CPS for 1 second ≈ a lump bonus. Implemented as a brief timed mult.
    effect: { kind: 'cps-mult-timed', value: 13, durationMs: 1_000 },
  },
  {
    id: 'unplanned-inspection',
    name: 'Внеплановая проверка',
    description:
      'Ревизионная комиссия прибыла без предупреждения. На время проверки — повышенное внимание к каждому делу.',
    weight: 15,
    negative: false,
    glyph: '◈',
    effect: { kind: 'click-mult-counter', value: 77, clicks: 77 },
  },
  {
    id: 'telegram-leak',
    name: 'Утечка в Telegram',
    description:
      'Неконтролируемое распространение сведений. Подлежит локализации в кратчайшие сроки.',
    weight: 10,
    negative: true,
    glyph: '▼',
    effect: { kind: 'cps-mult-timed', value: 0.95, durationMs: 30_000 },
  },
  {
    id: 'state-order',
    name: 'Государственный заказ',
    description:
      'Поступило поручение свыше. Внеплановый объём работы — единоразово.',
    weight: 4,
    negative: false,
    glyph: '✪',
    effect: { kind: 'cps-instant-lump', seconds: 60 },
  },
  {
    id: 'black-swan',
    name: 'Чёрный лебедь',
    description:
      'Непредвиденное обстоятельство. Исход непредсказуем — может пойти и так, и так.',
    weight: 1,
    negative: false,
    glyph: '✶',
    // Branch 1 is a marker — resolveEffect adds prestigeStarsDelta when
    // the random pick lands on it.
    effect: {
      kind: 'random-fork',
      branches: [
        { kind: 'cps-instant-lump', seconds: 15 * 60 },
        { kind: 'cps-instant-lump', seconds: 0 },
      ],
    },
  },
]

export const EVENTS_BY_ID: Readonly<Record<string, EventDef>> = Object.freeze(
  Object.fromEntries(EVENTS.map((e) => [e.id, e])),
)

export const TOTAL_EVENT_WEIGHT = EVENTS.reduce((sum, e) => sum + e.weight, 0)

export function pickRandomEvent(rng: () => number = Math.random): EventDef {
  const r = rng() * TOTAL_EVENT_WEIGHT
  let acc = 0
  for (const e of EVENTS) {
    acc += e.weight
    if (r < acc) return e
  }
  const last = EVENTS[EVENTS.length - 1]
  if (!last) throw new Error('EVENTS list must not be empty')
  return last
}

export interface EffectApplyResult {
  pushMultipliers?: GameState['activeMultipliers']
  pushClickBoosts?: GameState['clickBoosts']
  addBlocks?: Decimal
  prestigeStarsDelta?: number
}

export function resolveEffect(
  effect: EventEffect,
  ctx: {
    eventId: string
    now: number
    cps: Decimal
    prestigeMult: number
    rng?: () => number
  },
): EffectApplyResult {
  switch (effect.kind) {
    case 'click-mult-timed':
      return {
        pushMultipliers: [
          {
            id: ctx.eventId,
            kind: 'click',
            value: effect.value,
            expiresAt: ctx.now + effect.durationMs,
          },
        ],
      }
    case 'cps-mult-timed':
      return {
        pushMultipliers: [
          {
            id: ctx.eventId,
            kind: 'cps',
            value: effect.value,
            expiresAt: ctx.now + effect.durationMs,
          },
        ],
      }
    case 'cps-instant-lump': {
      if (effect.seconds === 0) return {}
      const addBlocks = ctx.cps.mul(effect.seconds).mul(ctx.prestigeMult)
      return { addBlocks }
    }
    case 'click-mult-counter':
      return {
        pushClickBoosts: [
          {
            id: ctx.eventId,
            value: effect.value,
            clicksRemaining: effect.clicks,
          },
        ],
      }
    case 'random-fork': {
      const rng = ctx.rng ?? Math.random
      const idx = Math.floor(rng() * effect.branches.length)
      const chosen = effect.branches[idx]
      if (!chosen) return {}
      const result = resolveEffect(chosen, ctx)
      if (ctx.eventId === 'black-swan' && idx === 1) {
        result.prestigeStarsDelta = (result.prestigeStarsDelta ?? 0) + 1
      }
      return result
    }
    default: {
      const _exhaust: never = effect
      void _exhaust
      return {}
    }
  }
}
