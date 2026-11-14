/** The crewmate outside walks round the base, never through it, and can reach the doors. */
import { describe, expect, it } from 'vitest'
import { NavGrid } from './collision'
import { entrances, outpostWorld, WALK_BOUNDS, type PlacedBuilding } from './outpostColliders'

/** The Artemis loadout, at the layout's slots. */
const BUILDINGS: PlacedBuilding[] = [
  { defId: 'solar_array', x: -9, z: -14 },
  { defId: 'solar_array', x: -3, z: -14 },
  { defId: 'solar_array', x: 3, z: -14 },
  { defId: 'battery', x: -5, z: -7 },
  { defId: 'battery', x: -2.5, z: -7 },
  { defId: 'battery', x: 0, z: -7 },
  { defId: 'water_recycler', x: 8, z: 0 },
  { defId: 'oxygen_generator', x: 8, z: 5 },
  { defId: 'greenhouse', x: -10, z: 3 },
  { defId: 'radiation_shelter', x: 0, z: 11.5 },
]

const world = outpostWorld(BUILDINGS)
const { minX, minZ, maxX, maxZ } = WALK_BOUNDS
const grid = new NavGrid(world, minX, minZ, maxX, maxZ, 0.5, 0.4)

describe('outpost floor plan', () => {
  it('blocks every structure, the habitat and the vehicles', () => {
    for (const b of BUILDINGS) expect(world.blocked(b.x, b.z, 0.35), b.defId).toBe(true)
    expect(world.blocked(0, 0, 0.35)).toBe(true) // habitat
    expect(world.blocked(-19, 11, 0.35)).toBe(true) // lander
    expect(world.blocked(16, 12, 0.35)).toBe(true) // rover
  })

  it('routes across the base go round everything', () => {
    const trips: [number, number, number, number][] = [
      [0, -20, 0, 20],
      [-20, 0, 20, 0],
      [-15, -18, 15, 15],
      [12, -10, -16, 12],
    ]
    for (const [ax, az, bx, bz] of trips) {
      const path = grid.path({ x: ax, z: az }, { x: bx, z: bz })
      expect(path.length, `${ax},${az} → ${bx},${bz}`).toBeGreaterThan(0)
      let from = grid.nearestFree({ x: ax, z: az })!
      for (const p of path) {
        expect(world.clearPath(from, p, 0.35)).toBe(true)
        from = p
      }
    }
  })

  it('the habitat airlock and the shelter hatch can be reached from anywhere', () => {
    const doors = entrances(BUILDINGS)
    for (const door of [doors.habitat, doors.shelter!]) {
      expect(world.blocked(door.x, door.z, 0.35)).toBe(false)
      expect(grid.path({ x: -20, z: -18 }, door).at(-1)).toEqual(door)
    }
  })

  it('plans quickly enough to never stall a frame', () => {
    const t0 = performance.now()
    for (let i = 0; i < 20; i++) grid.path({ x: -22, z: -18 + i }, { x: 22, z: 18 - i })
    expect((performance.now() - t0) / 20).toBeLessThan(15)
  })
})
