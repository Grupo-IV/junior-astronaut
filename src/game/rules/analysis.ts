// Mission analysis: turns the mission record into an explanation —
// what happened, why, which decisions contributed, and what could change.
import type { DecisionRecord, GameContent, Lesson, MissionState } from '../../types/game'
import { getMission } from '../content'
import { batteryCapacityKwh } from '../buildings/buildings'
import { loadoutMass } from '../resources/loadout'

export interface MissionAnalysis {
  lesson: Lesson
  contributingDecisions: DecisionRecord[]
  insights: string[]
}

export function analyzeMission(content: GameContent, state: MissionState): MissionAnalysis {
  const mission = getMission(content, state.missionId)
  const cause = state.failure?.cause
  const lesson = cause ? content.science.lessons[cause] : content.science.successLesson
  const contributingDecisions = cause ? state.decisions.filter((d) => d.risks.includes(cause)) : []
  const insights: string[] = []
  const { stats, loadout } = state

  const mass = loadoutMass(content, loadout)
  insights.push(`You launched ${mass.toLocaleString('en-US')} kg of the ${mission.launchMassBudgetKg.toLocaleString('en-US')} kg the lander could carry.`)

  const dose = state.crewDoseMsv
  const stormShare = dose > 0 ? Math.round((stats.doseStorm / dose) * 100) : 0
  insights.push(
    `Radiation: ${dose.toFixed(0)} mSv total — ${stats.doseBackground.toFixed(0)} from cosmic rays, ${stats.doseStorm.toFixed(0)} from solar storms (${stormShare}%)${stats.doseEva > 0 ? `, ${stats.doseEva.toFixed(1)} from spacewalks` : ''}.`,
  )
  if (stats.doseBlocked > 0) insights.push(`Shielding blocked ${stats.doseBlocked.toFixed(0)} mSv of storm radiation.`)
  else if (stats.doseStorm > 0) insights.push('No shielding was used during solar storms — every storm particle reached the crew.')

  if (stats.daysWithShedding > 0) {
    insights.push(
      `Power was short on ${stats.daysWithShedding} day(s). Your ${loadout.battery} battery module(s) plus the habitat battery stored ${batteryCapacityKwh(content, loadout.battery)} kWh.`,
    )
  }
  if (stats.energyWastedKwh > 50) {
    insights.push(`${stats.energyWastedKwh.toFixed(0)} kWh of solar energy was wasted because the batteries were already full.`)
  }
  if (stats.recycledWater > 0) insights.push(`The water recycler recovered ${stats.recycledWater.toFixed(0)} kg of water — ${Math.ceil(stats.recycledWater / 100)} water tank(s) you didn't have to launch.`)
  else if (loadout.water_recycler === 0) insights.push('No water recycler: every drop the crew used was lost.')
  if (stats.producedOxygen > 0) insights.push(`Your base produced ${stats.producedOxygen.toFixed(0)} kg of oxygen on the Moon.`)
  if (stats.producedFood > 0) insights.push(`The greenhouse harvested ${stats.producedFood.toFixed(1)} kg of fresh food.`)

  return { lesson, contributingDecisions, insights }
}
