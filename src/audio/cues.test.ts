import { describe, expect, it } from 'vitest'
import { createMissionState, gameContent as content, toLoadout } from '../game'
import type { MissionState, Modifier } from '../types/game'
import { airLeakLevel, habitatHumLevel, missionCue, radiationClickRate, stormDoseRate } from './cues'

const CADET = 'shackleton-first-light'

function base(): MissionState {
  return createMissionState(content, CADET, toLoadout({ solar_array: 2, oxygen_tank: 2, water_crate: 1, food_crate: 1 }), 1)
}

function nextDay(prev: MissionState, patch: (s: MissionState) => void = () => {}): MissionState {
  const s = structuredClone(prev)
  s.day += 1
  s.lastReport = { ...(s.lastReport ?? emptyReport(s.day)), day: s.day, habitatUnpowered: false, shed: [] }
  patch(s)
  return s
}

function emptyReport(day: number): NonNullable<MissionState['lastReport']> {
  const flow = { produced: 0, consumed: 0 }
  return {
    day,
    illumination: 1,
    generationKwh: 0,
    demandKwh: 0,
    servedKwh: 0,
    shed: [],
    habitatUnpowered: false,
    flows: { oxygen: flow, water: flow, food: flow },
    doseMsv: 0,
    unshieldedDoseMsv: 0,
  }
}

function modifier(kind: Modifier['kind'], value: number): Modifier {
  return { id: kind, kind, value, remainingDays: 2, label: { key: kind }, source: 'test' }
}

describe('missionCue', () => {
  it('stays silent on the first render and on re-renders of the same state', () => {
    const s = base()
    expect(missionCue(content, null, s)).toBeNull()
    expect(missionCue(content, s, s)).toBeNull()
  })

  it('stays silent on a calm day', () => {
    const s0 = base()
    expect(missionCue(content, s0, nextDay(s0))).toBeNull()
  })

  it('gives solar storms their own sound, distinct from alarms', () => {
    const s0 = base()
    const storm = nextDay(s0, (s) => {
      s.status = 'awaiting-decision'
      s.pendingEvent = { eventId: 'solar_storm', variant: 'severe', day: s.day }
    })
    const leak = nextDay(s0, (s) => {
      s.status = 'awaiting-decision'
      s.pendingEvent = { eventId: 'water_leak', day: s.day }
    })
    expect(missionCue(content, s0, storm)).toBe('storm')
    expect(missionCue(content, s0, leak)).toBe('caution')
  })

  it('does not repeat the event sound while the same event is still pending', () => {
    const s0 = base()
    const s1 = nextDay(s0, (s) => {
      s.pendingEvent = { eventId: 'water_leak', day: s.day }
    })
    const rerender = structuredClone(s1)
    expect(missionCue(content, s1, rerender)).toBeNull()
  })

  it('sounds a warning every day the habitat has no power', () => {
    const s0 = base()
    const s1 = nextDay(s0, (s) => {
      s.lastReport!.habitatUnpowered = true
    })
    expect(missionCue(content, s0, s1)).toBe('warning')
  })

  it('sounds a warning when crew dose crosses the warning threshold', () => {
    const s0 = base()
    s0.crewDoseMsv = content.environment.doseWarningMsv - 1
    const s1 = nextDay(s0, (s) => {
      s.crewDoseMsv = content.environment.doseWarningMsv + 5
    })
    expect(missionCue(content, s0, s1)).toBe('warning')
  })

  it('plays only the most important sound when several things happen at once', () => {
    const s0 = base()
    const s1 = nextDay(s0, (s) => {
      s.lastReport!.habitatUnpowered = true
      s.status = 'failure'
      s.failure = { cause: 'power', day: s.day }
    })
    expect(missionCue(content, s0, s1)).toBe('failure')
  })

  it('stays silent when a new mission replaces the old one', () => {
    const s0 = nextDay(nextDay(base()))
    const fresh = createMissionState(content, CADET, s0.loadout, 2)
    expect(missionCue(content, s0, fresh)).toBeNull()
  })
})

describe('radiation clicks', () => {
  it('is silent without a storm', () => {
    expect(radiationClickRate(base())).toBe(0)
  })

  it('makes shielding audible: the shelter slows the dosimeter down', () => {
    const open = base()
    open.modifiers = [modifier('storm_dose', 110)]
    const sheltered = structuredClone(open)
    sheltered.modifiers.push(modifier('dose_factor', 0.1))

    expect(stormDoseRate(open)).toBe(110)
    expect(stormDoseRate(sheltered)).toBeCloseTo(11)
    expect(radiationClickRate(open)).toBeGreaterThan(radiationClickRate(sheltered) * 5)
    expect(radiationClickRate(sheltered)).toBeGreaterThan(0)
  })

  it('stops when the mission is over', () => {
    const s = base()
    s.modifiers = [modifier('storm_dose', 60)]
    s.status = 'failure'
    expect(radiationClickRate(s)).toBe(0)
  })
})

describe('habitat hum', () => {
  it('fans slow down when power is shed and stop when the habitat loses power', () => {
    const s = nextDay(base())
    expect(habitatHumLevel(s)).toBe(1)
    s.lastReport!.shed = ['greenhouse']
    expect(habitatHumLevel(s)).toBeLessThan(1)
    s.lastReport!.habitatUnpowered = true
    expect(habitatHumLevel(s)).toBe(0)
  })
})

describe('cabin air leak', () => {
  it('sounds the emergency alarm, above every other alarm except the end of the mission', () => {
    const s0 = base()
    const leak = nextDay(s0, (s) => {
      s.status = 'awaiting-decision'
      s.pendingEvent = { eventId: 'oxygen_leak', day: s.day }
      s.lastReport!.habitatUnpowered = true
    })
    expect(missionCue(content, s0, leak)).toBe('emergency')
  })

  it('hisses loudly while open to the cabin, faintly while it seeps, and stops when fixed', () => {
    const s0 = base()
    expect(airLeakLevel(s0)).toBe(0)
    const open = { ...s0, status: 'awaiting-decision' as const, pendingEvent: { eventId: 'oxygen_leak', day: 2 } }
    expect(airLeakLevel(open)).toBe(1)
    const seeping = { ...s0, modifiers: [modifier('oxygen_loss', 0.05)] }
    expect(airLeakLevel(seeping)).toBeGreaterThan(0)
    expect(airLeakLevel(seeping)).toBeLessThan(1)
    expect(airLeakLevel({ ...seeping, status: 'failure' as const })).toBe(0)
  })
})
