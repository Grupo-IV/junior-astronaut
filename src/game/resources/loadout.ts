// Launch loadout: what the lander carries. Mass and storage volume are the
// first trade-off of the mission — every kilogram spent on one system is not
// available for another.
import type {
  BuildingId,
  CargoId,
  GameContent,
  Loadout,
  LoadoutItemId,
  MissionDef,
  StockId,
  Stocks,
} from '../../types/game'
import { batteryCapacityKwh } from '../buildings/buildings'

export const BUILDING_IDS: BuildingId[] = [
  'solar_array',
  'battery',
  'water_recycler',
  'oxygen_generator',
  'greenhouse',
  'radiation_shelter',
]

export const CARGO_IDS: CargoId[] = ['water_crate', 'oxygen_tank', 'food_crate', 'spare_parts']

export type SupplyStock = Exclude<StockId, 'energy'>
export const SUPPLY_STOCKS: SupplyStock[] = ['oxygen', 'water', 'food']

export function emptyLoadout(): Loadout {
  return Object.fromEntries([...BUILDING_IDS, ...CARGO_IDS].map((id) => [id, 0])) as Loadout
}

export function toLoadout(partial: Partial<Loadout>): Loadout {
  return { ...emptyLoadout(), ...partial }
}

export function itemMass(content: GameContent, id: LoadoutItemId): number {
  return id in content.buildings
    ? content.buildings[id as BuildingId].massKg
    : content.cargo[id as CargoId].massKg
}

export function itemMaxCount(content: GameContent, id: LoadoutItemId): number {
  return id in content.buildings
    ? content.buildings[id as BuildingId].maxCount
    : content.cargo[id as CargoId].maxCount
}

export function loadoutMass(content: GameContent, loadout: Loadout): number {
  return (Object.keys(loadout) as LoadoutItemId[]).reduce(
    (sum, id) => sum + itemMass(content, id) * loadout[id],
    0,
  )
}

/** Supplies stored at launch: the mission's starting kit plus the crates. */
export function launchSupplies(content: GameContent, mission: MissionDef, loadout: Loadout): Record<SupplyStock, number> {
  const supplies = { ...mission.initialStocks }
  for (const id of CARGO_IDS) {
    const def = content.cargo[id]
    if (def.stock && def.contentKg) supplies[def.stock] += def.contentKg * loadout[id]
  }
  return supplies
}

export function initialStocks(content: GameContent, mission: MissionDef, loadout: Loadout): Stocks {
  const supplies = launchSupplies(content, mission, loadout)
  const capped = Object.fromEntries(
    SUPPLY_STOCKS.map((s) => [s, Math.min(supplies[s], mission.storageCapacity[s])]),
  ) as Record<SupplyStock, number>
  return { ...capped, energy: batteryCapacityKwh(content, loadout.battery) }
}

export interface LoadoutCheck {
  massKg: number
  budgetKg: number
  overBudget: boolean
  storage: Record<SupplyStock, { amount: number; capacity: number; over: boolean }>
  valid: boolean
}

export function checkLoadout(content: GameContent, mission: MissionDef, loadout: Loadout): LoadoutCheck {
  const massKg = loadoutMass(content, loadout)
  const supplies = launchSupplies(content, mission, loadout)
  const storage = Object.fromEntries(
    SUPPLY_STOCKS.map((s) => {
      const capacity = mission.storageCapacity[s]
      return [s, { amount: supplies[s], capacity, over: supplies[s] > capacity }]
    }),
  ) as LoadoutCheck['storage']
  const overBudget = massKg > mission.launchMassBudgetKg
  return {
    massKg,
    budgetKg: mission.launchMassBudgetKg,
    overBudget,
    storage,
    valid: !overBudget && SUPPLY_STOCKS.every((s) => !storage[s].over),
  }
}

/** Daily crew needs for a mission. */
export function crewNeeds(content: GameContent, mission: MissionDef): Record<SupplyStock, number> {
  const per = content.environment.crewPerPersonPerDay
  return {
    oxygen: per.oxygenKg * mission.crew,
    water: per.waterKg * mission.crew,
    food: per.foodKg * mission.crew,
  }
}
