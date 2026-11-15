/**
 * @file
 * @brief Each decision as a short story: what it promised, what it changed at once,
 * and what the next days showed. Read from the mission's own records.
 */
import type { DecisionRecord, GameContent, MissionState } from '../../types/game'
import { getMission } from '../content'
import { crewNeeds, SUPPLY_STOCKS, type SupplyStock } from '../resources/loadout'

export interface DecisionStory {
  record: DecisionRecord
  /** Days the decision kept acting (as far as the mission went). */
  from: number
  to: number
  /** Dose the crew received over those days (radiation decisions), mSv. */
  dose: number | null
  /** For each supply the decision put at risk: the fewest days of it left over those days. */
  lowest: { stock: SupplyStock; days: number }[]
  /** The other options of that event. */
  alternatives: string[]
}

export function decisionTimeline(content: GameContent, state: MissionState): DecisionStory[] {
  const mission = getMission(content, state.missionId)
  const needs = crewNeeds(content, mission)
  const byDay = new Map(state.history.map((h) => [h.day, h]))
  const lastDay = state.history.at(-1)?.day ?? state.day
  return state.decisions.map((record) => {
    const from = record.day
    const to = Math.min(lastDay, record.day + (record.window ?? 1) - 1)
    const started = byDay.get(from - 1)
    const ended = byDay.get(to)
    const radiation = record.risks.includes('radiation') || record.eventId === 'solar_storm'
    const dose = radiation && started && ended && to >= from ? Math.max(0, ended.dose - started.dose) : null
    const lowest: DecisionStory['lowest'] = []
    for (const stock of SUPPLY_STOCKS) {
      if (!record.risks.includes(stock)) continue
      let min = Infinity
      for (let d = from; d <= to; d++) {
        const snap = byDay.get(d)
        if (snap) min = Math.min(min, snap[stock] / needs[stock])
      }
      if (Number.isFinite(min)) lowest.push({ stock, days: min })
    }
    const alternatives = content.events[record.eventId].options.map((o) => o.id).filter((id) => id !== record.optionId)
    return { record, from, to, dose, lowest, alternatives }
  })
}
