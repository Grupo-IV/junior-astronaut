// Mission planning projection: runs the real engine on a "calm" mission
// (no storms, no failures) so the setup screen can show exactly what the
// chosen loadout does — not a separate, approximate formula.
import type { FailureCause, GameContent, Loadout } from '../../types/game'
import { getMission } from '../content'
import { batteryCapacityKwh } from '../buildings/buildings'
import { createMissionState } from '../missions/createMission'
import { crewNeeds, launchSupplies, SUPPLY_STOCKS, type SupplyStock } from '../resources/loadout'
import { advanceDay } from './tick'

export interface LoadoutProjection {
  survivesCalmMission: boolean
  failure: { cause: FailureCause; day: number } | null
  /** Day each supply first runs out in a calm mission (null = never). */
  runsOutDay: Record<SupplyStock, number | null>
  lowestEnergyKwh: number
  batteryCapacityKwh: number
  daysWithShedding: number
  fullSunGenerationKwh: number
  fullDemandKwh: number
  dailyNeeds: Record<SupplyStock, number>
  launchDaysOfSupply: Record<SupplyStock, number>
}

export function projectLoadout(content: GameContent, missionId: string, loadout: Loadout): LoadoutProjection {
  const mission = getMission(content, missionId)
  let state = createMissionState(content, missionId, loadout, 1)
  const runsOutDay: Record<SupplyStock, number | null> = { oxygen: null, water: null, food: null }
  let lowestEnergy = state.stocks.energy

  while (state.status === 'running') {
    state = advanceDay(content, state, { events: false })
    lowestEnergy = Math.min(lowestEnergy, state.stocks.energy)
    for (const s of SUPPLY_STOCKS) {
      if (runsOutDay[s] === null && state.stocks[s] <= 0.001) runsOutDay[s] = state.day
    }
  }
  if (state.failure && (state.failure.cause === 'oxygen' || state.failure.cause === 'water')) {
    runsOutDay[state.failure.cause] ??= state.failure.day
  }

  const needs = crewNeeds(content, mission)
  const supplies = launchSupplies(content, mission, loadout)
  const b = content.buildings
  const consumers = (['water_recycler', 'oxygen_generator', 'greenhouse', 'radiation_shelter'] as const).reduce(
    (acc, id) => acc + b[id].powerDemandKwhPerDay * loadout[id],
    0,
  )

  return {
    survivesCalmMission: state.status === 'success',
    failure: state.failure,
    runsOutDay,
    lowestEnergyKwh: lowestEnergy,
    batteryCapacityKwh: batteryCapacityKwh(content, loadout.battery),
    daysWithShedding: state.stats.daysWithShedding,
    fullSunGenerationKwh: (b.solar_array.powerOutputKwhPerDay ?? 0) * loadout.solar_array,
    fullDemandKwh: content.environment.habitat.powerDemandKwhPerDay + consumers,
    dailyNeeds: needs,
    launchDaysOfSupply: Object.fromEntries(
      SUPPLY_STOCKS.map((s) => [s, Math.min(supplies[s], mission.storageCapacity[s]) / needs[s]]),
    ) as Record<SupplyStock, number>,
  }
}
