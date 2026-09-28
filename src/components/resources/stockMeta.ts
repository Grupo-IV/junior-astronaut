import type { SupplyStock } from '../../game'

/** Display identity for each supply. Colours are the validated series palette. */
export const STOCK_META: Record<SupplyStock, { label: string; icon: string; color: string; why: string }> = {
  oxygen: {
    label: 'Oxygen',
    icon: '🫁',
    color: 'var(--color-oxygen)',
    why: 'Each astronaut breathes about 0.84 kg of O₂ a day. Made by the oxygen generator (from water + power) and a little by plants.',
  },
  water: {
    label: 'Water',
    icon: '💧',
    color: 'var(--color-water)',
    why: 'About 3.5 kg per astronaut per day. The recycler recovers 93% of it; the oxygen generator and plants use some.',
  },
  food: {
    label: 'Food',
    icon: '🥫',
    color: 'var(--color-food)',
    why: 'About 1.8 kg of packaged food per astronaut per day. The greenhouse adds fresh food after a week of growth.',
  },
}
