/** Walking in a sixth of Earth's gravity: ballistic hops and gentle traction. */
import { describe, expect, it } from 'vitest'
import { hopApex, hopFlightTime, LunarGait, maxTraction, MOON_GRAVITY, OUTDOOR_LOPE } from './locomotion'

function run(gait: LunarGait, seconds: number, wx: number, wz: number, dt = 1 / 120) {
  const frames = []
  for (let t = 0; t < seconds; t += dt) frames.push(gait.step(dt, wx, wz))
  return frames
}

describe('lunar gait', () => {
  it('hops follow the ballistics of lunar gravity', () => {
    expect(hopApex(0.7)).toBeCloseTo((0.7 * 0.7) / (2 * MOON_GRAVITY))
    expect(hopFlightTime(0.7)).toBeCloseTo((2 * 0.7) / MOON_GRAVITY)
    const gait = new LunarGait(OUTDOOR_LOPE)
    const frames = run(gait, 6, OUTDOOR_LOPE.maxSpeed, 0)
    const top = Math.max(...frames.slice(-400).map((f) => f.height))
    // At top speed the take-off lift is bounce × speed (0.5 × 1.4 = 0.7 m/s): apex 0.7² / (2 × 1.62) ≈ 15 cm.
    expect(top).toBeCloseTo(hopApex(OUTDOOR_LOPE.bounce * OUTDOOR_LOPE.maxSpeed), 2)
  })

  it('cannot speed up faster than the ground lets it (and needs room to stop)', () => {
    const gait = new LunarGait(OUTDOOR_LOPE)
    const frames = run(gait, 0.5, 10, 0)
    // Even pushing on every frame, half a second gains at most traction × time (both feet).
    expect(frames.at(-1)!.vx).toBeLessThanOrEqual(maxTraction(OUTDOOR_LOPE) * 2.2 * 0.5 + 1e-6)
    run(gait, 4, 10, 0)
    expect(gait.speed).toBeCloseTo(OUTDOOR_LOPE.maxSpeed, 1)
    const stopping = run(gait, 0.3, 0, 0)
    expect(stopping.at(-1)!.vx).toBeGreaterThan(0.3)
    run(gait, 5, 0, 0)
    expect(gait.speed).toBeLessThan(0.01)
  })

  it('cannot steer in mid-air: velocity only changes with a foot on the ground', () => {
    const gait = new LunarGait(OUTDOOR_LOPE)
    run(gait, 3, 1.4, 0)
    let frame = gait.step(1 / 120, 1.4, 0)
    while (!frame.airborne) frame = gait.step(1 / 120, 1.4, 0)
    const before = gait.vz
    for (let i = 0; i < 10; i++) frame = gait.step(1 / 120, 0, 1.4)
    if (frame.airborne) expect(gait.vz).toBe(before)
  })

  it('reports each landing, for dust and footsteps', () => {
    const frames = run(new LunarGait(OUTDOOR_LOPE), 6, 1.4, 0)
    expect(frames.filter((f) => f.landed).length).toBeGreaterThan(3)
  })
})
