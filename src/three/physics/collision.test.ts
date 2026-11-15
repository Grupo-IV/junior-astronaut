import { describe, expect, it } from 'vitest'
import { addRoomWalls, CollisionWorld, NavGrid } from './collision'

const R = 0.3

/** A 4 × 3 m room with a 0.9 m doorway on the east wall into a 1 × 0.9 m closet, and a door leaf in it. */
function room(open = true) {
  const w = new CollisionWorld()
  addRoomWalls(w, -2, 2, -1.5, 1.5, [{ side: '+x', from: -0.45, to: 0.45 }])
  addRoomWalls(w, 2, 3, -0.45, 0.45, [{ side: '-x', from: -0.45, to: 0.45 }])
  w.addObstacle({ kind: 'box', x: -1, z: 1.2, hx: 0.5, hz: 0.3, id: 'desk' })
  w.addObstacle({ kind: 'circle', x: 0.5, z: -0.5, r: 0.2 })
  w.addObstacle({ kind: 'box', x: 2, z: 0, hx: 0.04, hz: 0.45, id: 'door' })
  w.setEnabled('door', !open)
  return w
}

describe('collision world', () => {
  it('stops a body at a wall and lets it slide along it', () => {
    const w = room()
    const p = w.move(0, 0, 0, 5, R)
    expect(p.z).toBeCloseTo(1.5 - R, 3)
    const slid = w.move(0, 1.1, 1, 1, R)
    expect(slid.x).toBeGreaterThan(0.9)
    expect(slid.z).toBeCloseTo(1.5 - R, 3)
  })

  it('never tunnels through a wall, even moving very fast', () => {
    const w = room()
    const p = w.move(0, 0, 0, -50, R)
    expect(p.z).toBeGreaterThanOrEqual(-1.5 + R - 1e-3)
  })

  it('stays out of furniture, also in a corner', () => {
    const w = room()
    for (const [dx, dz] of [[-3, 3], [-0.5, 3], [0, -3]]) {
      const p = w.move(0, 0, dx, dz, R)
      expect(w.blocked(p.x, p.z, R - 1e-3), `${dx},${dz}`).toBe(false)
    }
    const corner = w.move(1, 1, 5, 5, R)
    expect(corner.x).toBeCloseTo(2 - R, 2)
    expect(w.blocked(corner.x, corner.z, R - 1e-3)).toBe(false)
    expect(corner.z).toBeCloseTo(1.5 - R, 2)
  })

  it('lets a body through an open door, and not through a closed one', () => {
    const through = room(true).move(1, 0, 1.6, 0, R)
    expect(through.x).toBeGreaterThan(2.3)
    const shut = room(false).move(1, 0, 1.6, 0, R)
    expect(shut.x).toBeCloseTo(2 - 0.04 - R, 3)
  })

  it('slides into a doorway when slightly off-centre (no invisible snag)', () => {
    const w = room()
    const p = w.move(1, 0.1, 1.6, 0, R)
    expect(p.x).toBeGreaterThan(2.3)
    expect(Math.abs(p.z)).toBeLessThan(0.45 - R + 1e-3)
  })
})

describe('navigation grid', () => {
  it('finds a way round an obstacle that is clear of it all along', () => {
    const w = new CollisionWorld().addObstacle({ kind: 'box', x: 0, z: 0, hx: 3, hz: 1 })
    const grid = new NavGrid(w, -8, -8, 8, 8, 0.5, 0.35)
    const path = grid.path({ x: 0, z: -4 }, { x: 0, z: 4 })
    expect(path.length).toBeGreaterThan(1)
    let from = { x: 0, z: -4 }
    for (const p of path) {
      expect(w.clearPath(from, p, 0.3)).toBe(true)
      from = p
    }
    expect(from).toEqual({ x: 0, z: 4 })
  })

  it('walks straight when nothing is in the way', () => {
    const grid = new NavGrid(new CollisionWorld(), -5, -5, 5, 5, 0.5, 0.3)
    expect(grid.path({ x: -2, z: 0 }, { x: 2, z: 1 })).toEqual([{ x: 2, z: 1 }])
  })
})

describe('room walls', () => {
  it('do not narrow a doorway: a 0.92 m opening fits a 0.56 m body', () => {
    const w = new CollisionWorld()
    addRoomWalls(w, -3.85, 3.85, -1.4, 1.4, [{ side: '-x', from: -0.46, to: 0.46 }])
    addRoomWalls(w, -4.85, -3.85, -0.46, 0.46, [{ side: '+x', from: -0.46, to: 0.46 }])
    // Walking straight at the doorway from a little off-centre ends up deep in the bay.
    const p = w.move(-2.3, -0.25, -3, 0, 0.28)
    expect(p.x).toBeLessThan(-4.4)
    expect(w.blocked(p.x, p.z, 0.279)).toBe(false)
  })
})
