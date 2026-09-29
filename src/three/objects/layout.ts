/**
 * @file
 * @brief Defines the positions of structures in the landing zone.
 */
import type { BuildingId } from '../../types/game'

const SLOTS: Record<BuildingId, [number, number][]> = {
  solar_array: [[-9, -14], [-3, -14], [3, -14], [9, -14]],
  battery: [[-5, -7], [-2.5, -7], [0, -7], [2.5, -7], [5, -7]],
  water_recycler: [[8, 0]],
  oxygen_generator: [[8, 5]],
  greenhouse: [[-10, 3]],
  radiation_shelter: [[0, 10]],
}

export function slotFor(defId: BuildingId, index: number): [number, number] {
  const slots = SLOTS[defId]
  return slots[Math.min(index, slots.length - 1)]
}
