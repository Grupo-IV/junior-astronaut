/**
 * Staging only decides how the first-person view *shows* a situation. These
 * tests check it covers every event and option, and that what the cabin shows
 * (alarms, the leak, the sealed hatch, the numbers on the outcome card) is read
 * from the real mission state.
 */
import { describe, expect, it } from 'vitest'
import { advanceDay, createMissionState, gameContent, resolveDecision, toLoadout } from '../game'
import type { GameContent, MissionState } from '../types/game'
import { alertLevel, decisionDeltas, EVENT_STAGING, hasTag, leakState, optionHands, stagingFor, STATION_BUILDINGS } from './staging'
import { STATION_ORDER, type HandAction } from './types'

const ACTIONS: HandAction[] = ['press', 'point', 'grab', 'repair', 'seal', 'startle', 'wrist', 'beckon', 'relax']
const CADET = 'shackleton-first-light'

const withLeak: GameContent = {
  ...gameContent,
  missions: gameContent.missions.map((m) => (m.id === CADET ? { ...m, scheduledEvents: [{ day: 2, eventId: 'oxygen_leak' }] } : m)),
}

function atLeak(loadout: Record<string, number> = {}, seed = 1): MissionState {
  return advanceDay(withLeak, createMissionState(withLeak, CADET, toLoadout({ solar_array: 2, battery: 2, oxygen_tank: 3, water_crate: 2, food_crate: 3, ...loadout }), seed))
}

describe('staging covers the whole game', () => {
  it('every event has a place in the habitat and things worth showing', () => {
    for (const id of Object.keys(gameContent.events)) {
      expect(EVENT_STAGING[id], id).toBeDefined()
      expect(STATION_ORDER).toContain(EVENT_STAGING[id].station)
      expect(EVENT_STAGING[id].context.length, id).toBeGreaterThan(0)
    }
  })

  it('every option of every event has a gesture, at a real station', () => {
    const s = createMissionState(gameContent, CADET, toLoadout({ spare_parts: 1 }), 1)
    for (const def of Object.values(gameContent.events)) {
      for (const option of def.options) {
        const hands = optionHands(def.id, option, s)
        expect(ACTIONS, `${def.id}.${option.id}`).toContain(hands.action)
        expect(STATION_ORDER, `${def.id}.${option.id}`).toContain(hands.station)
      }
    }
  })

  it('every structure is operated from exactly one station', () => {
    const all = Object.values(STATION_BUILDINGS).flat()
    for (const id of Object.keys(gameContent.buildings)) expect(all.filter((b) => b === id), id).toHaveLength(1)
  })

  it('a repair takes a kit from the rack only when the option really uses one and one is left', () => {
    const repair = gameContent.events.oxygen_leak.options.find((o) => o.id === 'repair')!
    const withSpare = createMissionState(gameContent, CADET, toLoadout({ spare_parts: 1 }), 1)
    const without = createMissionState(gameContent, CADET, toLoadout({}), 1)
    expect(optionHands('oxygen_leak', repair, withSpare)).toMatchObject({ action: 'repair', station: 'lifeSupport', focus: 'leak', withKit: true })
    expect(optionHands('oxygen_leak', repair, without)).toMatchObject({ action: 'repair', withKit: false })
    const isolate = gameContent.events.oxygen_leak.options.find((o) => o.id === 'isolate')!
    expect(optionHands('oxygen_leak', isolate, withSpare)).toMatchObject({ action: 'seal', station: 'lifeSupport', focus: 'hatch' })
  })
})

describe('the cabin reflects the mission', () => {
  it('an oxygen leak is an emergency until it is dealt with', () => {
    const s = atLeak()
    expect(stagingFor('oxygen_leak').alert).toBe('emergency')
    expect(alertLevel(s)).toBe('emergency')
    expect(leakState(s)).toBe('active')
    const sealed = resolveDecision(withLeak, s, 'isolate')
    expect(leakState(sealed)).toBe('none')
    expect(hasTag(sealed, 'bay_sealed')).toBe(true)
    expect(alertLevel(sealed)).toBe('none')
  })

  it('a repair that does not hold leaves a slow leak, shown as a caution', () => {
    for (let seed = 1; seed < 50; seed++) {
      const after = resolveDecision(withLeak, atLeak({}, seed), 'repair')
      if (leakState(after) === 'slow') {
        expect(alertLevel(after)).toBe('caution')
        return
      }
    }
    throw new Error('no failed patch in 50 seeds')
  })

  it('a solar storm turns the cabin to storm alert, a broken machine to caution', () => {
    const s = createMissionState(gameContent, CADET, toLoadout({ solar_array: 2, oxygen_generator: 1, oxygen_tank: 2 }), 1)
    expect(alertLevel(s)).toBe('none')
    const storm = structuredClone(s)
    storm.modifiers.push({ id: 'm', kind: 'storm_dose', value: 60, remainingDays: 2, label: { key: 'x' }, source: 'solar_storm' })
    expect(alertLevel(storm)).toBe('storm')
    const broken = structuredClone(s)
    broken.buildings.find((b) => b.defId === 'oxygen_generator')!.status = 'failed'
    expect(alertLevel(broken)).toBe('caution')
  })

  it('the outcome card shows exactly what changed in the stores', () => {
    const s = atLeak({ spare_parts: 1 })
    const after = resolveDecision(withLeak, s, 'repair')
    const deltas = decisionDeltas(s, after)
    expect(deltas.find((d) => d.kind === 'oxygen')!.value).toBeCloseTo(-1)
    expect(deltas.find((d) => d.kind === 'spares')!.value).toBe(-1)
    expect(deltas.some((d) => d.kind === 'water' || d.kind === 'food')).toBe(false)
  })
})
