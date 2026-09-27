/**
 * @file
 * @brief Defines the render-only model consumed by the Three.js scene.
 */
import type { BuildingId, GameContent, MissionState } from '../../types/game'
import { isGreenhouseProductive, stateBatteryCapacity } from '../../game'

export type VisualStatus = 'running' | 'off' | 'unpowered' | 'failed' | 'passive'

export interface SceneBuilding {
  uid: string
  defId: BuildingId
  status: VisualStatus
  growth: number
}

export interface SceneModel {
  buildings: SceneBuilding[]
  illumination: number
  stormActive: boolean
  habitatUnpowered: boolean
  selectedUid: string | null
  day: number
  batteryFraction: number
}

export function toSceneModel(content: GameContent, state: MissionState, selectedUid: string | null): SceneModel {
  const growthDays = content.buildings.greenhouse.growthDays ?? 1
  return {
    buildings: state.buildings.map((b) => {
      const passive = content.buildings[b.defId].powerDemandKwhPerDay === 0
      let status: VisualStatus
      if (b.status === 'failed') status = 'failed'
      else if (!b.enabled) status = 'off'
      else if (passive) status = 'passive'
      else if (!b.powered && state.day > 0) status = 'unpowered'
      else status = 'running'
      return {
        uid: b.uid,
        defId: b.defId,
        status,
        growth: isGreenhouseProductive(content, b) ? 1 : Math.min(1, b.growth / growthDays),
      }
    }),
    illumination: state.history.at(-1)?.illumination ?? 1,
    stormActive: state.modifiers.some((m) => m.kind === 'storm_dose'),
    habitatUnpowered: state.lastReport?.habitatUnpowered ?? false,
    selectedUid,
    day: state.day,
    batteryFraction: state.stocks.energy / Math.max(1, stateBatteryCapacity(content, state)),
  }
}
