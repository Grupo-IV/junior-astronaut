import type { SupplyStock } from '../../game'

/**
 * Display identity for each supply. Colours are the validated series palette.
 * Names and explanations are translated: `stock.<id>` and `stock.<id>.why`.
 */
export const STOCK_META: Record<SupplyStock, { icon: string; color: string }> = {
  oxygen: { icon: '🫁', color: 'var(--color-oxygen)' },
  water: { icon: '💧', color: 'var(--color-water)' },
  food: { icon: '🥫', color: 'var(--color-food)' },
}
