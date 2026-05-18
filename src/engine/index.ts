export { encode, decode, replacer, reviver } from './codec'
export {
  migrate,
  safeRehydrate,
  safeRehydrateFromString,
  MigrationError,
} from './migrations'
export {
  applyTick,
  applyClick,
  effectiveCps,
  effectiveClickValue,
} from './economy'
export {
  startTickLoop,
  runAccumulator,
  TICK_STEP_MS,
} from './tick'
export type { TickHandle, AccumulatorResult } from './tick'
export { findNewlyUnlocked } from './achievements'
export {
  PRESTIGE_THRESHOLD,
  PRESTIGE_MULT_PER_STAR,
  computePrestigeMult,
  pendingStarGain,
  projectedStars,
} from './prestige'
