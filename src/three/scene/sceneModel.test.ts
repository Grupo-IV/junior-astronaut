/** The habitat interior shows the mission as it is: these values drive the 3D cabin. */
import { describe, expect, it } from 'vitest'
import { advanceDay, createMissionState, gameContent, resolveDecision, toLoadout } from '../../game'
import type { GameContent } from '../../types/game'
import { toInteriorModel } from './sceneModel'

const CADET = 'shackleton-first-light'
const withLeak: GameContent = {
  ...gameContent,
  missions: gameContent.missions.map((m) => (m.id === CADET ? { ...m, scheduledEvents: [{ day: 2, eventId: 'oxygen_leak' }] } : m)),
}
const LOADOUT = toLoadout({ solar_array: 2, battery: 2, oxygen_generator: 1, oxygen_tank: 3, water_crate: 2, food_crate: 3, spare_parts: 2 })

describe('interior model', () => {
  it('the shelves and the kit rack show what is really stored', () => {
    const s = createMissionState(gameContent, CADET, LOADOUT, 1)
    const m = toInteriorModel(gameContent, s)
    const capacity = gameContent.missions[0].storageCapacity
    expect(m.spareParts).toBe(2)
    expect(m.supplies.oxygen).toBeCloseTo(s.stocks.oxygen / capacity.oxygen)
    expect(m.supplies.water).toBeCloseTo(s.stocks.water / capacity.water)
    expect(m.readouts.oxygenKg).toBe(s.stocks.oxygen)
    expect(m.readouts.days).toBe(12)
    expect(m.readouts.greenhouseGrowth).toBeNull()
  })

  it('during a leak the life-support console is red and the bay is open; sealing it closes the hatch', () => {
    const leaking = advanceDay(withLeak, createMissionState(withLeak, CADET, LOADOUT, 1))
    const open = toInteriorModel(withLeak, leaking)
    expect(open).toMatchObject({ alert: 'emergency', leak: 'active', baySealed: false })
    expect(open.stations.lifeSupport).toBe('fault')

    const sealed = toInteriorModel(withLeak, resolveDecision(withLeak, leaking, 'isolate'))
    expect(sealed).toMatchObject({ alert: 'none', leak: 'none', baySealed: true })
    expect(sealed.stations.lifeSupport).toBe('warn')
  })

  it('a broken machine lights its station in red, a switched-off one in amber', () => {
    const s = createMissionState(gameContent, CADET, LOADOUT, 1)
    const broken = structuredClone(s)
    broken.buildings.find((b) => b.defId === 'oxygen_generator')!.status = 'failed'
    expect(toInteriorModel(gameContent, broken).stations.lifeSupport).toBe('fault')
    const off = structuredClone(s)
    off.buildings.find((b) => b.defId === 'oxygen_generator')!.enabled = false
    expect(toInteriorModel(gameContent, off).stations.lifeSupport).toBe('warn')
    expect(toInteriorModel(gameContent, s).stations.agro).toBe('idle')
  })
})
