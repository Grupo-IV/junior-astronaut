import { describe, expect, it } from 'vitest'
import type { MissionState } from '../../types/game'
import {
  advanceDay,
  createMissionState,
  gameContent as content,
  projectLoadout,
  repairBuilding,
  resolveDecision,
  toLoadout,
  toggleBuilding,
} from '../index'

const CADET = 'shackleton-first-light'

function runCalm(state: MissionState, days: number): MissionState {
  let s = state
  for (let i = 0; i < days; i++) s = advanceDay(content, s, { events: false })
  return s
}

describe('life support flows', () => {
  it('consumes BVAD crew rates each day', () => {
    const s0 = createMissionState(content, CADET, toLoadout({ solar_array: 2, oxygen_tank: 2, water_crate: 1, food_crate: 1 }), 1)
    const s1 = runCalm(s0, 1)
    expect(s0.stocks.oxygen - s1.stocks.oxygen).toBeCloseTo(4 * 0.84)
    expect(s0.stocks.water - s1.stocks.water).toBeCloseTo(4 * 3.5)
    expect(s0.stocks.food - s1.stocks.food).toBeCloseTo(4 * 1.8)
  })

  it('recycler recovers 93% of crew water use', () => {
    const s0 = createMissionState(content, CADET, toLoadout({ solar_array: 2, water_recycler: 1, oxygen_tank: 2, water_crate: 1, food_crate: 1 }), 1)
    const s1 = runCalm(s0, 1)
    expect(s0.stocks.water - s1.stocks.water).toBeCloseTo(14 * 0.07)
  })

  it('oxygen generator uses 1.125 kg of water per kg of O2', () => {
    const s0 = createMissionState(content, CADET, toLoadout({ solar_array: 2, oxygen_generator: 1, water_crate: 2, food_crate: 1 }), 1)
    const s1 = runCalm(s0, 1)
    const made = s1.lastReport!.flows.oxygen.produced
    expect(made).toBeGreaterThan(0)
    expect(s1.lastReport!.flows.water.consumed - 14).toBeCloseTo(made * 1.125)
  })

  it('greenhouse only produces after its growth period', () => {
    const s0 = createMissionState(content, CADET, toLoadout({ solar_array: 3, battery: 2, greenhouse: 1, oxygen_tank: 3, water_crate: 2, food_crate: 2 }), 1)
    const s7 = runCalm(s0, 7)
    expect(s7.stats.producedFood).toBe(0)
    const s8 = runCalm(s7, 1)
    expect(s8.stats.producedFood).toBeCloseTo(2)
  })
})

describe('power', () => {
  it('sheds the greenhouse first when power is short', () => {
    // One array in terrain shadow (day 8+) cannot run everything.
    const s0 = createMissionState(content, CADET, toLoadout({ solar_array: 1, greenhouse: 1, water_recycler: 1, oxygen_tank: 5, water_crate: 3, food_crate: 3 }), 1)
    const s = runCalm(s0, 9)
    expect(s.lastReport!.shed[0]).toBe('greenhouse')
  })

  it('fails the mission after two days without habitat power', () => {
    const s0 = createMissionState(content, CADET, toLoadout({ oxygen_tank: 3, water_crate: 2, food_crate: 3 }), 1)
    const s = runCalm(s0, 5)
    expect(s.status).toBe('failure')
    expect(s.failure?.cause).toBe('power')
  })

  it('switching the greenhouse off kills the crop', () => {
    const s0 = createMissionState(content, CADET, toLoadout({ solar_array: 3, greenhouse: 1, oxygen_tank: 3, water_crate: 2, food_crate: 2 }), 1)
    const s3 = runCalm(s0, 3)
    const gh = s3.buildings.find((b) => b.defId === 'greenhouse')!
    expect(gh.growth).toBe(3)
    const off = toggleBuilding(content, s3, gh.uid)
    expect(off.buildings.find((b) => b.uid === gh.uid)!.growth).toBe(0)
  })
})

describe('oxygen failure', () => {
  it('fails when oxygen runs out', () => {
    const s0 = createMissionState(content, CADET, toLoadout({ solar_array: 2, water_crate: 2, food_crate: 2 }), 1)
    const s = runCalm(s0, 5)
    expect(s.status).toBe('failure')
    expect(s.failure?.cause).toBe('oxygen')
  })
})

describe('solar storm decisions', () => {
  function toStorm(loadout: Parameters<typeof toLoadout>[0]) {
    let s = createMissionState(content, CADET, toLoadout(loadout), 42)
    while (!(s.pendingEvent?.eventId === 'solar_storm')) {
      if (s.status === 'awaiting-decision') {
        const first = content.events[s.pendingEvent!.eventId].options.at(-1)!.id
        s = resolveDecision(content, s, first)
      } else s = advanceDay(content, s)
    }
    return s
  }
  const full = { solar_array: 2, battery: 2, radiation_shelter: 1, oxygen_tank: 3, water_crate: 2, food_crate: 3 }

  it('the shelter blocks 90% of the storm dose', () => {
    const storm = toStorm(full)
    const sheltered = advanceDay(content, resolveDecision(content, storm, 'shelter'))
    const exposed = advanceDay(content, resolveDecision(content, storm, 'continue'))
    const bg = content.environment.gcrDoseMsvPerDay * content.environment.habitatGcrFactor
    expect(sheltered.lastReport!.doseMsv).toBeCloseTo(bg + 6)
    expect(exposed.lastReport!.doseMsv).toBeCloseTo(bg + 60)
  })

  it('shelter option is unavailable without a shelter', () => {
    const storm = toStorm({ ...full, radiation_shelter: 0 })
    expect(resolveDecision(content, storm, 'shelter')).toBe(storm)
  })

  it('is deterministic for a given seed and decisions', () => {
    const a = advanceDay(content, resolveDecision(content, toStorm(full), 'safe_mode'))
    const b = advanceDay(content, resolveDecision(content, toStorm(full), 'safe_mode'))
    expect(a).toEqual(b)
  })
})

describe('repairs', () => {
  it('uses a spare kit to repair a failed building', () => {
    let s = createMissionState(content, CADET, toLoadout({ solar_array: 2, water_recycler: 1, spare_parts: 1, oxygen_tank: 3, water_crate: 2, food_crate: 3 }), 1)
    s = structuredClone(s)
    s.buildings.find((b) => b.defId === 'water_recycler')!.status = 'failed'
    const fixed = repairBuilding(content, s, 'water_recycler-1')
    expect(fixed.buildings.find((b) => b.defId === 'water_recycler')!.status).toBe('ok')
    expect(fixed.spareParts).toBe(0)
  })
})

describe('projection', () => {
  it('recommended cadet loadout survives a calm mission', () => {
    const mission = content.missions[0]
    const p = projectLoadout(content, mission.id, toLoadout(mission.recommendedLoadout))
    expect(p.survivesCalmMission).toBe(true)
  })
})
