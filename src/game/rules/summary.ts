/**
 * @file
 * @brief A short record of one try, so a replay with the same seed can be compared with it.
 *
 * With the same seed, rank and cargo, and the same decisions, the mission
 * plays out exactly the same. Change one thing and compare.
 */
import type { FailureCause, GameContent, Loadout, LoadoutItemId, MissionState } from '../../types/game'
import type { RankId } from '../ranks'
import { scoreMission } from './scoring'

export interface RunSummary {
  seed: number
  missionId: string
  rank: RankId
  loadout: Loadout
  success: boolean
  failure: { cause: FailureCause; day: number } | null
  dose: number
  stars: number
  worstReserveDays: number
  samples: number
  decisions: { day: number; eventId: string; optionId: string }[]
}

export function summarizeRun(content: GameContent, state: MissionState): RunSummary {
  const score = scoreMission(content, state)
  return {
    seed: state.seed,
    missionId: state.missionId,
    rank: state.rank,
    loadout: { ...state.loadout },
    success: state.status === 'success',
    failure: state.failure,
    dose: state.crewDoseMsv,
    stars: score.stars,
    worstReserveDays: score.worstReserveDays,
    samples: state.science?.samples ?? 0,
    decisions: state.decisions.map((d) => ({ day: d.day, eventId: d.eventId, optionId: d.optionId })),
  }
}

export interface RunComparison {
  sameStart: boolean
  cargo: { item: LoadoutItemId; before: number; now: number }[]
  /** Decisions taken differently on the same event and day, and events that only happened in one try. */
  decisions: { day: number; eventId: string; before: string | null; now: string | null }[]
}

export function compareRuns(before: RunSummary, now: RunSummary): RunComparison {
  const cargo = (Object.keys(now.loadout) as LoadoutItemId[])
    .filter((item) => before.loadout[item] !== now.loadout[item])
    .map((item) => ({ item, before: before.loadout[item], now: now.loadout[item] }))
  const key = (d: { day: number; eventId: string }) => `${d.day}:${d.eventId}`
  const was = new Map(before.decisions.map((d) => [key(d), d.optionId]))
  const is = new Map(now.decisions.map((d) => [key(d), d.optionId]))
  const decisions: RunComparison['decisions'] = []
  for (const k of new Set([...was.keys(), ...is.keys()])) {
    const b = was.get(k) ?? null
    const n = is.get(k) ?? null
    if (b === n) continue
    const [day, eventId] = [Number(k.split(':')[0]), k.split(':').slice(1).join(':')]
    decisions.push({ day, eventId, before: b, now: n })
  }
  decisions.sort((a, b) => a.day - b.day)
  return { sameStart: before.seed === now.seed && before.missionId === now.missionId && before.rank === now.rank, cargo, decisions }
}
