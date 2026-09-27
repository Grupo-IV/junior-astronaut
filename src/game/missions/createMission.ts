import type { BuildingInstance, GameContent, Loadout, MissionState } from '../../types/game'
import { getMission } from '../content'
import { BUILDING_IDS, initialStocks } from '../resources/loadout'
import { illuminationPeriod } from './illumination'

export function createMissionState(
  content: GameContent,
  missionId: string,
  loadout: Loadout,
  seed: number,
): MissionState {
  const mission = getMission(content, missionId)
  const buildings: BuildingInstance[] = []
  for (const id of BUILDING_IDS) {
    for (let i = 0; i < loadout[id]; i++) {
      buildings.push({ uid: `${id}-${i + 1}`, defId: id, enabled: true, status: 'ok', powered: true, growth: 0 })
    }
  }

  const stocks = initialStocks(content, mission, loadout)
  return {
    missionId,
    seed,
    rng: seed,
    day: 0,
    status: 'running',
    loadout: { ...loadout },
    stocks,
    crewDoseMsv: 0,
    buildings,
    spareParts: loadout.spare_parts,
    modifiers: [],
    pendingEvent: null,
    decisions: [],
    log: [
      { day: 0, kind: 'info', text: `Touchdown at ${mission.location}. Crew of ${mission.crew}, mission length ${mission.durationDays} days.` },
      { day: 0, kind: 'science', text: `Day 1 forecast: ${illuminationPeriod(mission, 1).label.toLowerCase()}.` },
    ],
    history: [
      {
        day: 0,
        water: stocks.water,
        oxygen: stocks.oxygen,
        food: stocks.food,
        energy: stocks.energy,
        dose: 0,
        generationKwh: 0,
        demandKwh: 0,
        illumination: illuminationPeriod(mission, 1).factor,
      },
    ],
    lastReport: null,
    counters: { foodEmptyDays: 0, powerCrisisDays: 0, lastEventDay: -99, lastRepairDay: -1 },
    stats: {
      doseBackground: 0,
      doseStorm: 0,
      doseEva: 0,
      doseBlocked: 0,
      daysWithShedding: 0,
      energyWastedKwh: 0,
      producedOxygen: 0,
      producedFood: 0,
      recycledWater: 0,
    },
    failure: null,
    nextUid: 1,
  }
}
