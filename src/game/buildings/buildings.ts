/**
 * @file
 * @brief Queries and state transitions for base infrastructure.
 */
import type { BuildingDef, BuildingId, BuildingInstance, GameContent, MissionState, Modifier } from '../../types/game'

export function buildingDef(content: GameContent, id: BuildingId): BuildingDef {
  return content.buildings[id]
}

export function hasOperational(state: MissionState, id: BuildingId): boolean {
  return state.buildings.some((b) => b.defId === id && b.status === 'ok')
}

export function isOfflineByModifier(modifiers: Modifier[], id: BuildingId): boolean {
  return modifiers.some((m) => m.kind === 'building_offline' && m.target === id && m.remainingDays > 0)
}

/** Would this building try to run today (before power allocation)? */
export function wantsToRun(state: MissionState, b: BuildingInstance): boolean {
  return b.status === 'ok' && b.enabled && !isOfflineByModifier(state.modifiers, b.defId)
}

export function batteryCapacityKwh(content: GameContent, batteries: number): number {
  return content.environment.habitat.internalBatteryKwh + batteries * (content.buildings.battery.storageKwh ?? 0)
}

export function stateBatteryCapacity(content: GameContent, state: MissionState): number {
  const working = state.buildings.filter((b) => b.defId === 'battery' && b.status === 'ok').length
  return batteryCapacityKwh(content, working)
}

export function isGreenhouseProductive(content: GameContent, b: BuildingInstance): boolean {
  return b.defId === 'greenhouse' && b.growth >= (content.buildings.greenhouse.growthDays ?? 0)
}
