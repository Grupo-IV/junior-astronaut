// Public API of the simulation engine. The UI and the 3D layer import from here.
export { gameContent, getMission } from './content'
export { createMissionState } from './missions/createMission'
export { illuminationFor, illuminationPeriod } from './missions/illumination'
export { advanceDay } from './simulation/tick'
export { toggleBuilding, repairBuilding, canRepair } from './simulation/actions'
export { projectLoadout, type LoadoutProjection } from './simulation/projection'
export { newSeed } from './simulation/rng'
export { resolveDecision, optionAvailability, eventDef } from './events/events'
export { scoreMission, type MissionScore } from './rules/scoring'
export { analyzeMission, type MissionAnalysis } from './rules/analysis'
export {
  BUILDING_IDS,
  CARGO_IDS,
  SUPPLY_STOCKS,
  checkLoadout,
  crewNeeds,
  emptyLoadout,
  itemMass,
  itemMaxCount,
  loadoutMass,
  toLoadout,
  type LoadoutCheck,
  type SupplyStock,
} from './resources/loadout'
export { stateBatteryCapacity, wantsToRun, isGreenhouseProductive } from './buildings/buildings'
