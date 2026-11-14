/**
 * @file
 * @brief Builders for language-neutral engine messages (translated by the UI).
 */
import type { BuildingId, Message, MessageArg, StockId } from '../types/game'

export function msg(key: string, args?: Record<string, MessageArg>): Message {
  return args ? { key, args } : { key }
}

/** A text from the game content, by path (e.g. `events.solar_storm.title`). */
export function contentText(path: string): Message {
  return { key: `@${path}` }
}

export const ref = {
  content: (path: string): MessageArg => ({ ref: 'content', path }),
  building: (id: BuildingId): MessageArg => ({ ref: 'building', id }),
  buildings: (ids: BuildingId[]): MessageArg => ({ ref: 'buildings', ids }),
  stock: (id: StockId): MessageArg => ({ ref: 'stock', id }),
}

/** Rounds for display without fixing the decimal separator (the UI formats per language). */
export function round(n: number, digits = 0): number {
  const f = 10 ** digits
  return Math.round(n * f) / f
}
