import { decode, encode } from '@/engine'
import type { GameState } from '@/types/save'

export interface ServerSave {
  state: GameState
  version: number
  updatedAt: number
}

export interface ServerSavePayload {
  gameState: unknown
  version: number
  updatedAt: number
}

export async function fetchServerSave(): Promise<ServerSave | null> {
  const res = await fetch('/api/save', { credentials: 'include' })
  if (!res.ok) return null
  const data = (await res.json()) as { save: ServerSavePayload | null }
  if (!data.save) return null
  return {
    state: hydrateGameState(data.save.gameState),
    version: data.save.version,
    updatedAt: data.save.updatedAt,
  }
}

export interface PushSaveInput {
  state: GameState
  version: number
  updatedAt: number
}

export interface PushSaveResult {
  saved: boolean
  current: ServerSave
}

export async function pushServerSave(input: PushSaveInput): Promise<PushSaveResult | null> {
  const body = {
    gameState: JSON.parse(encode(input.state)) as unknown,
    version: input.version,
    updatedAt: input.updatedAt,
  }
  const res = await fetch('/api/save', {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) return null
  const data = (await res.json()) as { saved: boolean; current: ServerSavePayload }
  return {
    saved: data.saved,
    current: {
      state: hydrateGameState(data.current.gameState),
      version: data.current.version,
      updatedAt: data.current.updatedAt,
    },
  }
}

function hydrateGameState(json: unknown): GameState {
  // Pass through the engine codec reviver so __D markers become real Decimals.
  const raw = JSON.stringify(json)
  return decode<GameState>(raw)
}
