import type { SupplyStock } from '../../game'
import type { IconName } from '../ui/Icon'

/**
 * Display identity for each supply. Colours are the validated series palette.
 * Names and explanations are translated: `stock.<id>` and `stock.<id>.why`.
 */
export const STOCK_META: Record<SupplyStock, { icon: IconName; color: string }> = {
  oxygen: { icon: 'oxygen', color: 'var(--color-oxygen)' },
  water: { icon: 'water', color: 'var(--color-water)' },
  food: { icon: 'food', color: 'var(--color-food)' },
}
