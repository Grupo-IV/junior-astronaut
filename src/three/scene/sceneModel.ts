/**
 * @file
 * @brief Defines the render-only model consumed by the Three.js scene.
 */
import type { BuildingId, GameContent, MissionState } from '../../types/game'
import { crewInShelter, getMission, isGreenhouseProductive, stateBatteryCapacity } from '../../game'
import { alertLevel, hasTag, leakState, STATION_BUILDINGS, type LeakState } from '../../immersive/staging'
import { STATION_ORDER, type AlertLevel, type HabitatStationId } from '../../immersive/types'

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
  interior: InteriorModel
}

/** Status light of a console inside the habitat. */
export type ConsoleStatus = 'ok' | 'warn' | 'fault' | 'idle'

/** What the crew sees inside the habitat: every value comes from the mission state. */
export interface InteriorModel {
  alert: AlertLevel
  leak: LeakState
  baySealed: boolean
  crewSheltered: boolean
  habitatPowered: boolean
  spareParts: number
  /** Stored amount as a fraction of habitat storage (what the shelves show). */
  supplies: { oxygen: number; water: number; food: number }
  stations: Record<HabitatStationId, ConsoleStatus>
  readouts: InteriorReadouts
  shelter: ShelterModel
}

/** The radiation shelter as the crew sees it: its walls, its lights, its dosimeter. */
export interface ShelterModel {
  exists: boolean
  /** Working (not broken, not switched off). */
  operational: boolean
  /** The crew is behind its walls and protected. */
  crewInside: boolean
  storm: boolean
  /** Storm dose rate outside the shelter (mSv/day). */
  outsideRate: number
  /** Storm dose rate behind the shelter walls (mSv/day): outside × the shelter's dose factor. */
  insideRate: number
}

/** Numbers shown on the console screens. */
export interface InteriorReadouts {
  day: number
  days: number
  oxygenKg: number
  batteryPercent: number
  sunPercent: number
  /** Greenhouse growth 0..1, or null when none was launched. */
  greenhouseGrowth: number | null
  doseMsv: number
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
    interior: toInteriorModel(content, state),
  }
}

export function toInteriorModel(content: GameContent, state: MissionState): InteriorModel {
  const mission = getMission(content, state.missionId)
  const capacity = mission.storageCapacity
  const battery = state.stocks.energy / Math.max(1, stateBatteryCapacity(content, state))
  const habitatPowered = !(state.lastReport?.habitatUnpowered ?? false)
  const leak = leakState(state)
  const baySealed = hasTag(state, 'bay_sealed')
  const supplies = {
    oxygen: state.stocks.oxygen / capacity.oxygen,
    water: state.stocks.water / capacity.water,
    food: state.stocks.food / capacity.food,
  }

  const fromBuildings = (station: HabitatStationId): ConsoleStatus => {
    const mine = state.buildings.filter((b) => STATION_BUILDINGS[station].includes(b.defId))
    if (mine.length === 0) return 'idle'
    if (mine.some((b) => b.status === 'failed')) return 'fault'
    const active = mine.filter((b) => content.buildings[b.defId].powerDemandKwhPerDay > 0)
    if (active.some((b) => !b.enabled || (!b.powered && state.day > 0))) return 'warn'
    return 'ok'
  }
  const stations = Object.fromEntries(STATION_ORDER.map((id) => [id, fromBuildings(id)])) as Record<HabitatStationId, ConsoleStatus>
  if (leak === 'active') stations.lifeSupport = 'fault'
  else if (leak === 'slow' || baySealed) stations.lifeSupport = stations.lifeSupport === 'fault' ? 'fault' : 'warn'
  if (!habitatPowered || battery < 0.1) stations.power = 'fault'
  else if (battery < 0.3 && stations.power !== 'fault') stations.power = 'warn'
  if (alertLevel(state) === 'storm') stations.command = 'warn'
  const lowest = Math.min(supplies.oxygen, supplies.water, supplies.food)
  stations.storage = lowest <= 0.02 ? 'fault' : lowest < 0.12 ? 'warn' : 'ok'

  return {
    alert: alertLevel(state),
    leak,
    baySealed,
    crewSheltered: hasTag(state, 'crew_sheltered'),
    habitatPowered,
    spareParts: state.spareParts,
    supplies,
    stations,
    readouts: {
      day: state.day,
      days: mission.durationDays,
      oxygenKg: state.stocks.oxygen,
      batteryPercent: battery * 100,
      sunPercent: (state.history.at(-1)?.illumination ?? 1) * 100,
      greenhouseGrowth: (() => {
        const g = state.buildings.find((b) => b.defId === 'greenhouse')
        return g ? Math.min(1, g.growth / (content.buildings.greenhouse.growthDays ?? 1)) : null
      })(),
      doseMsv: state.crewDoseMsv,
    },
    shelter: (() => {
      const building = state.buildings.find((b) => b.defId === 'radiation_shelter')
      const outsideRate = state.modifiers.filter((m) => m.kind === 'storm_dose' && m.remainingDays > 0).reduce((acc, m) => acc + m.value, 0)
      return {
        exists: !!building,
        operational: !!building && building.status === 'ok' && building.enabled,
        crewInside: crewInShelter(state),
        storm: outsideRate > 0,
        outsideRate,
        insideRate: outsideRate * (content.buildings.radiation_shelter.stormDoseFactor ?? 1),
      }
    })(),
  }
}
