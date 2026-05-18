export const TICK_STEP_MS = 100
const MAX_STEPS_PER_FRAME = 600

export interface TickHandle {
  stop(): void
}

export function startTickLoop(onSteps: (steps: number) => void): TickHandle {
  let acc = 0
  let last = performance.now()
  let rafId = 0
  let stopped = false

  const frame = (now: number) => {
    if (stopped) return
    acc += now - last
    last = now

    let steps = 0
    while (acc >= TICK_STEP_MS) {
      acc -= TICK_STEP_MS
      steps++
      if (steps >= MAX_STEPS_PER_FRAME) {
        acc = 0
        break
      }
    }
    if (steps > 0) onSteps(steps)

    rafId = requestAnimationFrame(frame)
  }

  rafId = requestAnimationFrame(frame)

  return {
    stop() {
      stopped = true
      cancelAnimationFrame(rafId)
    },
  }
}

export interface AccumulatorResult {
  steps: number
  remainder: number
}

export function runAccumulator(
  deltaMs: number,
  accumulatorMs: number,
  stepMs: number = TICK_STEP_MS,
): AccumulatorResult {
  let acc = accumulatorMs + deltaMs
  let steps = 0
  while (acc >= stepMs) {
    acc -= stepMs
    steps++
    if (steps >= MAX_STEPS_PER_FRAME) {
      acc = 0
      break
    }
  }
  return { steps, remainder: acc }
}
