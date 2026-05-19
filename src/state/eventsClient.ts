const MAX_QUEUE = 20
const FLUSH_INTERVAL_MS = 60_000

interface QueuedEvent {
  eventType: string
  payload?: unknown
  clientCreatedAt: number
}

let queue: QueuedEvent[] = []
let timer: ReturnType<typeof setTimeout> | null = null
let sessionId: string | null = null
let listenersInstalled = false

function getSessionId(): string {
  if (sessionId) return sessionId
  if (typeof window === 'undefined') return ''
  const stored = window.sessionStorage.getItem('rkn-session-id')
  if (stored) {
    sessionId = stored
    return stored
  }
  const fresh =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 24)
      : Math.random().toString(36).slice(2, 26)
  window.sessionStorage.setItem('rkn-session-id', fresh)
  sessionId = fresh
  return fresh
}

async function flush(): Promise<void> {
  if (queue.length === 0) return
  const batch = queue.splice(0, queue.length)
  try {
    await fetch('/api/events', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId: getSessionId(), events: batch }),
      keepalive: true,
    })
  } catch {
    // Drop on failure — events are best-effort, not critical.
  }
}

function scheduleFlush(): void {
  if (timer) return
  timer = setTimeout(() => {
    timer = null
    void flush()
  }, FLUSH_INTERVAL_MS)
}

function installPageListeners(): void {
  if (listenersInstalled) return
  if (typeof document === 'undefined') return
  listenersInstalled = true
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') void flush()
  }
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('beforeunload', () => {
    void flush()
  })
}

export function enqueueEvent(eventType: string, payload?: unknown): void {
  if (typeof window === 'undefined') return
  installPageListeners()
  queue.push({ eventType, payload, clientCreatedAt: Date.now() })
  if (queue.length >= MAX_QUEUE) {
    void flush()
    return
  }
  scheduleFlush()
}

export function _resetEventsClientForTests(): void {
  queue = []
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  sessionId = null
  listenersInstalled = false
}
