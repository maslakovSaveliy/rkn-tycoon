import type {
  ActiveMultiplier,
  ClickBoost,
  MultKind,
} from '@/types/save'

export function pruneExpiredMultipliers(
  list: readonly ActiveMultiplier[],
  now: number,
): ActiveMultiplier[] {
  let allLive = true
  const out: ActiveMultiplier[] = []
  for (const m of list) {
    if (m.expiresAt > now) {
      out.push(m)
    } else {
      allLive = false
    }
  }
  return allLive ? (list as ActiveMultiplier[]) : out
}

export function aggregateActiveMultiplier(
  list: readonly ActiveMultiplier[],
  kind: MultKind,
  now: number,
): number {
  let product = 1
  for (const m of list) {
    if (m.kind !== kind) continue
    if (m.expiresAt <= now) continue
    product *= m.value
  }
  return product
}

export function aggregateClickBoosts(list: readonly ClickBoost[]): number {
  let product = 1
  for (const b of list) {
    if (b.clicksRemaining > 0) product *= b.value
  }
  return product
}

export function consumeClickBoosts(
  list: readonly ClickBoost[],
): ClickBoost[] {
  const out: ClickBoost[] = []
  for (const b of list) {
    const next = b.clicksRemaining - 1
    if (next > 0) out.push({ ...b, clicksRemaining: next })
  }
  return out
}
