/**
 * @file
 * @brief The floor plan of the outpost: what a crewmate walking outside must go around,
 * and the doors they use to go in.
 *
 * Footprints follow the 3D models (habitat hull and airlock porch, each
 * structure's base, the lander and the rover) with a few centimetres of
 * margin. Hoses lie flat on the ground and can be stepped over.
 */
import type { BuildingId } from '../../types/game'
import { CollisionWorld, type Obstacle, type Point } from './collision'

export const LANDER_AT: [number, number] = [-19, 11]
export const ROVER_AT: [number, number] = [16, 12]
/** Where the crew walks around the base (the flattened landing zone). */
export const WALK_BOUNDS = { minX: -25, maxX: 25, minZ: -21, maxZ: 22 }

export interface PlacedBuilding {
  defId: BuildingId
  x: number
  z: number
}

/** Footprint of each structure, around its centre. */
function footprint(b: PlacedBuilding): Obstacle[] {
  const at = (o: Obstacle): Obstacle => ({ ...o, x: o.x + b.x, z: o.z + b.z })
  switch (b.defId) {
    case 'solar_array':
      return [at({ kind: 'circle', x: 0, z: 0, r: 1.15 })]
    case 'battery':
      return [at({ kind: 'box', x: 0, z: 0, hx: 1.12, hz: 0.82 })]
    case 'water_recycler':
      return [at({ kind: 'box', x: 0, z: 0, hx: 1.85, hz: 1.25 })]
    case 'oxygen_generator':
      return [at({ kind: 'box', x: 0, z: 0, hx: 1.45, hz: 1.05 })]
    case 'greenhouse':
      return [at({ kind: 'circle', x: 0, z: 0, r: 3.5 })]
    case 'radiation_shelter':
      return [
        at({ kind: 'circle', x: 0, z: 0, r: 4.05 }),
        at({ kind: 'box', x: 3.45, z: 0, hx: 0.92, hz: 1.0 }), // pressurised vestibule
        at({ kind: 'circle', x: 3.0, z: -2.6, r: 0.15 }), // dosimeter mast
      ]
  }
}

export function outpostWorld(buildings: PlacedBuilding[]): CollisionWorld {
  const w = new CollisionWorld()
  // Habitat: hull with its end caps and docking port, then the airlock and its porch.
  w.addObstacle({ kind: 'box', x: -0.2, z: 0, hx: 5.55, hz: 2.4 })
  w.addObstacle({ kind: 'box', x: 0, z: 3.75, hx: 1.25, hz: 1.5 })
  for (const [x, z] of [[1.6, 5.2], [-4.6, 2.6], [4.6, 2.6]]) w.addObstacle({ kind: 'circle', x, z, r: 0.2 })
  w.addObstacle({ kind: 'circle', x: LANDER_AT[0], z: LANDER_AT[1], r: 3.4 })
  w.addObstacle({ kind: 'box', x: ROVER_AT[0], z: ROVER_AT[1], hx: 1.25, hz: 1.85, rot: 2.2 })
  for (const b of buildings) for (const o of footprint(b)) w.addObstacle(o)
  // The edge of the landing zone.
  const { minX, maxX, minZ, maxZ } = WALK_BOUNDS
  w.addArea({ kind: 'rect', minX, maxX, minZ, maxZ })
  return w
}

/** Where spacewalks collect samples: open ground around the landing zone, one after the other. */
export const SAMPLE_SITES: Point[] = [
  { x: -17, z: -7 },
  { x: 18, z: -6 },
  { x: -9, z: 19 },
  { x: 21, z: 3 },
  { x: -21, z: -1 },
  { x: 9, z: -19 },
]

/** Where to stand to go in: at the foot of the habitat porch, or in front of the shelter hatch. */
export function entrances(buildings: PlacedBuilding[]): { habitat: Point; shelter: Point | null } {
  const shelter = buildings.find((b) => b.defId === 'radiation_shelter')
  return { habitat: { x: 0, z: 6.0 }, shelter: shelter ? { x: shelter.x + 5.0, z: shelter.z } : null }
}
