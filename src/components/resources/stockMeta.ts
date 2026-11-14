import { crewNeeds, gameContent, getMission, type SupplyStock } from '../../game'
import type { MissionState } from '../../types/game'
import type { IconName } from '../ui/Icon'
import type { Level } from '../ui/ui'

/**
 * Display identity for each supply. Colours are the validated series palette.
 * Names and explanations are translated: `stock.<id>` and `stock.<id>.why`.
 */
export const STOCK_META: Record<SupplyStock, { icon: IconName; color: string }> = {
  oxygen: { icon: 'oxygen', color: 'var(--color-oxygen)' },
  water: { icon: 'water', color: 'var(--color-water)' },
  food: { icon: 'food', color: 'var(--color-food)' },
}

/** How much of a supply is stored and how many days it lasts at the latest daily balance. */
export function supplyStatus(mission: MissionState, stock: SupplyStock) {
  const def = getMission(gameContent, mission.missionId)
  const report = mission.lastReport
  const net = report
    ? report.flows[stock].consumed - report.flows[stock].produced
    : crewNeeds(gameContent, def)[stock]
  const amount = mission.stocks[stock]
  const daysLeft = net > 0.01 ? amount / net : Infinity
  const level: Level = daysLeft < 2 ? 'critical' : daysLeft < 4 ? 'warn' : 'good'
  return { amount, capacity: def.storageCapacity[stock], net, daysLeft, level }
}
