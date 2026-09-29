/**
 * @file
 * @brief Provides deterministic pseudo-random numbers for mission replayability.
 */
import type { MissionState } from '../../types/game'

/** @brief Returns a number in [0, 1) and advances the draft RNG state. */
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
