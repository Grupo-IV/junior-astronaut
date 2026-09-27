// Deterministic pseudo-random numbers (mulberry32).
// The generator state lives inside MissionState, so the same seed and the same
// decisions always replay the same mission — useful for tests and balancing.
import type { MissionState } from '../../types/game'

/** Returns a number in [0, 1) and advances `state.rng`. Mutates the draft state. */
export function random(state: MissionState): number {
  const t = (state.rng + 0x6d2b79f5) | 0
  state.rng = t
  let r = Math.imul(t ^ (t >>> 15), 1 | t)
  r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
  return ((r ^ (r >>> 14)) >>> 0) / 4294967296
}

export function pick<T>(state: MissionState, items: T[]): T | undefined {
  if (items.length === 0) return undefined
  return items[Math.floor(random(state) * items.length)]
}

export function newSeed(): number {
  return Math.floor(Math.random() * 2 ** 31)
}
