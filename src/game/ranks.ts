/**
 * @file
 * @brief Difficulty modes named after crew roles, from trainee to mission commander.
 *
 * The roles follow how space agencies describe a crew: a trainee (cadet), a
 * mission specialist who runs experiments and systems, a flight engineer who
 * keeps the vehicle working, and the commander who is responsible for the
 * whole mission.
 *
 * A rank never changes the physics (consumption, radiation, power). It changes
 * the operational margins a crew gets: how much the lander can carry, how often
 * surprises happen, and how much help mission control gives.
 */
import type { GameContent, MissionDef } from '../types/game'

export type RankId = 'cadet' | 'specialist' | 'engineer' | 'commander'

export const RANK_IDS: RankId[] = ['cadet', 'specialist', 'engineer', 'commander']

export interface RankDef {
  id: RankId
  /** Multiplies the lander mass budget. */
  massBudgetFactor: number
  /** Multiplies the daily chance of a random event. */
  eventChanceFactor: number
  /** Added to the minimum number of days between events. */
  eventGapDelta: number
  /** Added to the first day random events can happen. */
  firstEventDelta: number
  /** How much of the calm-mission forecast is shown while packing the lander. */
  forecast: 'full' | 'summary' | 'none'
  /** Planning warnings ("No spare parts…") while packing. */
  hints: boolean
}

export const RANKS: Record<RankId, RankDef> = {
  cadet: { id: 'cadet', massBudgetFactor: 1.15, eventChanceFactor: 0.5, eventGapDelta: 1, firstEventDelta: 1, forecast: 'full', hints: true },
  specialist: { id: 'specialist', massBudgetFactor: 1, eventChanceFactor: 1, eventGapDelta: 0, firstEventDelta: 0, forecast: 'full', hints: true },
  engineer: { id: 'engineer', massBudgetFactor: 0.95, eventChanceFactor: 1.3, eventGapDelta: 0, firstEventDelta: 0, forecast: 'summary', hints: false },
  commander: { id: 'commander', massBudgetFactor: 0.9, eventChanceFactor: 1.6, eventGapDelta: -1, firstEventDelta: -1, forecast: 'none', hints: false },
}

export const DEFAULT_RANK: RankId = 'cadet'

export function isRankId(v: unknown): v is RankId {
  return typeof v === 'string' && (RANK_IDS as string[]).includes(v)
}

/** The rank each mission was designed for (its original difficulty). */
export function recommendedRank(mission: MissionDef): RankId {
  return mission.difficulty === 'Commander' ? 'commander' : 'cadet'
}

function applyToMission(m: MissionDef, r: RankDef): MissionDef {
  if (r.id === 'specialist') return m
  return {
    ...m,
    launchMassBudgetKg: Math.round((m.launchMassBudgetKg * r.massBudgetFactor) / 10) * 10,
    randomEventChancePerDay: Math.min(0.95, m.randomEventChancePerDay * r.eventChanceFactor),
    minDaysBetweenEvents: Math.max(1, m.minDaysBetweenEvents + r.eventGapDelta),
    firstRandomEventDay: Math.max(2, m.firstRandomEventDay + r.firstEventDelta),
  }
}

const cache = new WeakMap<GameContent, Map<RankId, GameContent>>()

/**
 * Game content with the rank's mission margins applied. The specialist rank is
 * the reference: it returns the content unchanged.
 */
export function contentForRank(content: GameContent, rank: RankId): GameContent {
  if (rank === 'specialist') return content
  let byRank = cache.get(content)
  if (!byRank) cache.set(content, (byRank = new Map()))
  let ranked = byRank.get(rank)
  if (!ranked) {
    ranked = { ...content, missions: content.missions.map((m) => applyToMission(m, RANKS[rank])) }
    byRank.set(rank, ranked)
  }
  return ranked
}
