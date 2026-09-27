// Loads the JSON configuration into typed game content.
// All tunable numbers live in src/data — the engine only reads them from here.
import moon from '../data/moon.json'
import buildingsData from '../data/buildings.json'
import eventsData from '../data/events.json'
import scienceData from '../data/science.json'
import type {
  BuildingDef,
  BuildingId,
  CargoDef,
  CargoId,
  EnvironmentDef,
  EventDef,
  GameContent,
  MissionDef,
  ScienceData,
} from '../types/game'

export const gameContent: GameContent = {
  environment: moon.environment as EnvironmentDef,
  missions: moon.missions as unknown as MissionDef[],
  buildings: buildingsData.buildings as unknown as Record<BuildingId, BuildingDef>,
  cargo: buildingsData.cargo as unknown as Record<CargoId, CargoDef>,
  events: eventsData.events as unknown as Record<string, EventDef>,
  science: scienceData as unknown as ScienceData,
}

export function getMission(content: GameContent, missionId: string): MissionDef {
  const mission = content.missions.find((m) => m.id === missionId)
  if (!mission) throw new Error(`Unknown mission: ${missionId}`)
  return mission
}
