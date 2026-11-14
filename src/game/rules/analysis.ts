/**
 * @file
 * @brief Converts mission records into educational explanations and alternatives.
 */
import type { DecisionRecord, FailureCause, GameContent, Message, MissionState } from '../../types/game'
import { getMission } from '../content'
import { batteryCapacityKwh } from '../buildings/buildings'
import { msg, round } from '../messages'
import { loadoutMass } from '../resources/loadout'

export interface MissionAnalysis {
  /** Failure cause whose lesson applies, or null for the success lesson. */
  lessonCause: FailureCause | null
  contributingDecisions: DecisionRecord[]
  insights: Message[]
}

export function analyzeMission(content: GameContent, state: MissionState): MissionAnalysis {
  const mission = getMission(content, state.missionId)
  const cause = state.failure?.cause ?? null
  const contributingDecisions = cause ? state.decisions.filter((d) => d.risks.includes(cause)) : []
  const insights: Message[] = []
  const { stats, loadout } = state

  insights.push(msg('analysis.mass', { mass: loadoutMass(content, loadout), budget: mission.launchMassBudgetKg }))

  const dose = state.crewDoseMsv
  const stormShare = dose > 0 ? Math.round((stats.doseStorm / dose) * 100) : 0
  const doseArgs = { total: round(dose), background: round(stats.doseBackground), storm: round(stats.doseStorm), share: stormShare }
  insights.push(
    stats.doseEva > 0
      ? msg('analysis.doseWithEva', { ...doseArgs, eva: round(stats.doseEva, 1) })
      : msg('analysis.dose', doseArgs),
  )
  if (stats.doseBlocked > 0) insights.push(msg('analysis.blocked', { blocked: round(stats.doseBlocked) }))
  else if (stats.doseStorm > 0) insights.push(msg('analysis.noShielding'))

  if (stats.daysWithShedding > 0) {
    insights.push(
      msg('analysis.shedding', {
        count: stats.daysWithShedding,
        batteries: loadout.battery,
        capacity: batteryCapacityKwh(content, loadout.battery),
      }),
    )
  }
  if (stats.energyWastedKwh > 50) insights.push(msg('analysis.wasted', { kwh: round(stats.energyWastedKwh) }))
  if (stats.recycledWater > 0) {
    insights.push(msg('analysis.recycled', { kg: round(stats.recycledWater), tanks: Math.ceil(stats.recycledWater / 100) }))
  } else if (loadout.water_recycler === 0) insights.push(msg('analysis.noRecycler'))
  if (stats.producedOxygen > 0) insights.push(msg('analysis.oxygen', { kg: round(stats.producedOxygen) }))
  if (stats.producedFood > 0) insights.push(msg('analysis.food', { kg: round(stats.producedFood, 1) }))

  return { lessonCause: cause, contributingDecisions, insights }
}
