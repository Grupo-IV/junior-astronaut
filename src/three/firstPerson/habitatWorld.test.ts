/** Walking inside the habitat module: walls, the life-support bay hatch, the racks. */
import { describe, expect, it } from 'vitest'
import { END_X, habitatWorld, STATIONS } from './interior'

const R = 0.28

function walk(open: boolean, from: { x: number; z: number }, dx: number, dz: number) {
  const w = habitatWorld()
  w.setEnabled('bayHatchShut', !open)
  w.setEnabled('bayHatchOpen', open)
  return { w, p: w.move(from.x, from.z, dx, dz, R) }
}

describe('habitat floor plan', () => {
  it('every station can be stood at', () => {
    const w = habitatWorld()
    for (const s of Object.values(STATIONS)) expect(w.blocked(s.stand.x, s.stand.z, R), s.id).toBe(false)
  })

  it('with the hatch open, you step through the doorway into the bay (its tank fills the back)', () => {
    const { w, p } = walk(true, { x: 0, z: -0.25 }, -8, 0)
    expect(p.x).toBeLessThan(-END_X)
    expect(w.blocked(p.x, p.z, R - 1e-3)).toBe(false)
    // Leaning in to the breach, the eyes (10 cm) get right up to it.
    const eye = w.move(p.x, p.z, -1, 0.15, 0.1)
    expect(eye.x).toBeLessThan(-END_X - 0.25)
  })

  it('with the hatch shut, the body stops in front of it', () => {
    const { p } = walk(false, { x: 0, z: 0 }, -8, 0)
    expect(p.x).toBeGreaterThan(-END_X + 0.2)
  })

  it('the side walls and the end walls hold, in every direction', () => {
    for (const [dx, dz] of [[0, 5], [0, -5], [8, 0], [6, 6], [-6, -6], [6, -6]]) {
      const { w, p } = walk(true, { x: 0, z: 0 }, dx, dz)
      expect(Math.abs(p.z)).toBeLessThanOrEqual(1.4 - R + 1e-3)
      expect(p.x).toBeLessThanOrEqual(END_X - R + 1e-3)
      expect(w.blocked(p.x, p.z, R - 1e-3)).toBe(false)
    }
  })

  it('the spare kit rack and the storage rack cannot be walked into', () => {
    const toKits = walk(true, { x: -2.3, z: 0.98 }, -3, 0)
    expect(toKits.p.x).toBeGreaterThan(-END_X + 0.26 + R - 1e-3)
    const toStorage = walk(true, { x: 2.4, z: 0.1 }, 3, 0)
    expect(toStorage.p.x).toBeLessThan(END_X - 0.52 - R + 1e-3)
  })
})
