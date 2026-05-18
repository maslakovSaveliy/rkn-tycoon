import type { AchievementCheckState, AchievementDef } from '@/data/achievements'

export function findNewlyUnlocked(
  achievements: readonly AchievementDef[],
  state: AchievementCheckState,
  alreadyUnlocked: readonly string[],
): string[] {
  const owned = new Set(alreadyUnlocked)
  const out: string[] = []
  for (const a of achievements) {
    if (owned.has(a.id)) continue
    if (a.check(state)) out.push(a.id)
  }
  return out
}
