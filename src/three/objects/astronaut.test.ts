/** A spacewalk is a real walk: its progress comes from the distance covered, and it ends back at the door. */
import { describe, expect, it } from 'vitest'
import { NavGrid } from '../physics/collision'
import { entrances, outpostWorld, SAMPLE_SITES, WALK_BOUNDS } from '../physics/outpostColliders'
import { Astronaut, type EvaProgress } from './astronaut'

describe('crewmate spacewalk', () => {
  it('walks out round the structures, collects, walks back, and reports it in order', () => {
    const world = outpostWorld([{ defId: 'radiation_shelter', x: 0, z: 11.5 }])
    const { minX, minZ, maxX, maxZ } = WALK_BOUNDS
    const crew = new Astronaut()
    crew.setNavigation(world, new NavGrid(world, minX, minZ, maxX, maxZ, 0.5, 0.4))
    const reports: EvaProgress[] = []
    let collected = false
    let done: boolean | null = null
    crew.startEva(entrances([]).habitat, SAMPLE_SITES[0], {
      onProgress: (p) => reports.push(p),
      onCollected: () => (collected = true),
      onDone: (ok) => (done = ok),
    })
    for (let i = 0; i < 60 * 120 && done === null; i++) {
      crew.update(1 / 60)
      const p = crew.group.position
      expect(world.blocked(p.x, p.z, 0.3)).toBe(false)
    }
    expect(done).toBe(true)
    expect(collected).toBe(true)
    const steps = reports.map((r) => r.step)
    expect(steps).toEqual([...steps].sort((a, b) => a - b))
    expect(reports.at(-1)).toMatchObject({ step: 4, progress: 1 })
    const progress = reports.map((r) => r.progress)
    expect(progress.every((p, i) => i === 0 || p >= progress[i - 1] - 1e-9)).toBe(true)
  })

  it('a storm calls the spacewalk off', () => {
    const crew = new Astronaut()
    let done: boolean | null = null
    crew.startEva({ x: 0, z: 6 }, SAMPLE_SITES[1], { onProgress: () => {}, onCollected: () => {}, onDone: (ok) => (done = ok) })
    for (let i = 0; i < 30; i++) crew.update(1 / 60)
    crew.setRefuge({ x: 0, z: 6 })
    expect(done).toBe(false)
  })
})
