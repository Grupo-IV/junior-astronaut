/**
 * The oxygen leak is the first fully immersive emergency. These tests check
 * that every decision changes the real mission state (stocks, spares,
 * modifiers, log), not just the text on screen.
 */
import { describe, expect, it } from 'vitest'
import type { Effect, GameContent, MissionState } from '../../types/game'
import { advanceDay, createMissionState, decisionTimeLimit, gameContent, optionAvailability, resolveDecision, toLoadout } from '../index'

const CADET = 'shackleton-first-light'

/** The cadet mission with an oxygen leak scheduled for day 2. */
const content: GameContent = {
  ...gameContent,
  missions: gameContent.missions.map((m) => (m.id === CADET ? { ...m, scheduledEvents: [{ day: 2, eventId: 'oxygen_leak' }] } : m)),
}

const BASE = { solar_array: 2, battery: 2, oxygen_generator: 1, oxygen_tank: 3, water_crate: 2, food_crate: 3 }

function atLeak(loadout: Record<string, number> = {}, seed = 1): MissionState {
  const s = advanceDay(content, createMissionState(content, CADET, toLoadout({ ...BASE, ...loadout }), seed))
  expect(s.status).toBe('awaiting-decision')
  expect(s.pendingEvent?.eventId).toBe('oxygen_leak')
  return s
}

const leaking = (s: MissionState) => s.modifiers.filter((m) => m.kind === 'oxygen_loss')

describe('oxygen leak: the event', () => {
  it('costs oxygen the moment it is detected and pauses the mission', () => {
    const before = advanceDay(content, createMissionState(content, CADET, toLoadout(BASE), 1), { events: false })
    const s = atLeak()
    expect(before.stocks.oxygen - s.stocks.oxygen).toBeCloseTo(4)
    expect(s.log.at(-1)).toMatchObject({ kind: 'danger', msg: { key: 'sim.event' } })
  })

  it('an ongoing leak drains a share of the stored oxygen every day, and says so in the log', () => {
    const s = atLeak()
    s.status = 'running'
    s.pendingEvent = null
    s.modifiers.push({ id: 'x', kind: 'oxygen_loss', value: 0.1, remainingDays: 2, label: { key: 'x' }, source: 'test' })
    const next = advanceDay(content, s, { events: false })
    const calm = advanceDay(content, { ...structuredClone(s), modifiers: [] }, { events: false })
    expect(calm.stocks.oxygen - next.stocks.oxygen).toBeCloseTo(calm.stocks.oxygen * 0.1, 5)
    expect(next.log.some((l) => l.msg.key === 'sim.oxygenLeak')).toBe(true)
  })
})

describe('oxygen leak: repair', () => {
  it('with a spare kit: uses the kit, and nearly always stops the leak', () => {
    let fixed = 0
    for (let seed = 1; seed <= 200; seed++) {
      const s = atLeak({ spare_parts: 1 }, seed)
      const after = resolveDecision(content, s, 'repair')
      expect(after.spareParts).toBe(s.spareParts - 1)
      expect(s.stocks.oxygen - after.stocks.oxygen).toBeCloseTo(1)
      expect(after.status).toBe('running')
      if (leaking(after).length === 0) fixed++
      expect(after.decisions.at(-1)!.notes.length).toBe(1)
    }
    expect(fixed / 200).toBeGreaterThan(0.8)
  })

  it('without a spare kit: no kit is used, and the leak often gets worse', () => {
    let worse = 0
    for (let seed = 1; seed <= 200; seed++) {
      const s = atLeak({}, seed)
      const after = resolveDecision(content, s, 'repair')
      expect(after.spareParts).toBe(0)
      const leak = leaking(after)
      if (leak.length > 0) {
        expect(leak[0].value).toBeCloseTo(0.1)
        expect(leak[0].remainingDays).toBe(3)
        worse++
      }
    }
    expect(worse / 200).toBeGreaterThan(0.4)
    expect(worse / 200).toBeLessThan(0.7)
  })
})

describe('oxygen leak: isolate the bay', () => {
  it('with power: traps 15% of the oxygen, seals the bay for sure and halves the oxygen generator for 3 days', () => {
    const s = atLeak()
    const after = resolveDecision(content, s, 'isolate')
    expect(after.stocks.oxygen).toBeCloseTo(s.stocks.oxygen * 0.85)
    expect(leaking(after)).toEqual([])
    const sealed = after.modifiers.find((m) => m.tag === 'bay_sealed')!
    expect(sealed).toMatchObject({ kind: 'building_output', target: 'oxygen_generator', value: 0.5, remainingDays: 3 })
    expect(after.log.some((l) => l.msg.key === 'sim.decision')).toBe(true)
  })

  it('the sealed bay really slows the oxygen generator', () => {
    const lowOxygen = (s: MissionState) => ({ ...s, stocks: { ...s.stocks, oxygen: 10 } })
    const isolated = lowOxygen(resolveDecision(content, atLeak(), 'isolate'))
    const reopened = { ...isolated, modifiers: isolated.modifiers.filter((m) => m.tag !== 'bay_sealed') }
    const sealed = advanceDay(content, isolated, { events: false })
    const open = advanceDay(content, reopened, { events: false })
    expect(open.stats.producedOxygen - isolated.stats.producedOxygen).toBeCloseTo(4)
    expect(sealed.stats.producedOxygen - isolated.stats.producedOxygen).toBeCloseTo(2)
  })

  it('with empty batteries the hatch is cranked shut by hand and may not be airtight', () => {
    let leaks = 0
    for (let seed = 1; seed <= 200; seed++) {
      const s = atLeak({}, seed)
      s.stocks.energy = 0
      const after = resolveDecision(content, s, 'isolate')
      expect(after.decisions.at(-1)!.notes.length).toBe(1)
      if (leaking(after).length > 0) leaks++
    }
    expect(leaks / 200).toBeGreaterThan(0.25)
    expect(leaks / 200).toBeLessThan(0.55)
  })
})

describe('oxygen leak: move the crew to the shelter', () => {
  it('needs a working shelter', () => {
    const s = atLeak()
    const option = content.events.oxygen_leak.options.find((o) => o.id === 'shelter')!
    expect(optionAvailability(content, s, option).available).toBe(false)
    expect(resolveDecision(content, s, 'shelter')).toBe(s)
  })

  it('fixes the leak for sure, at the cost of refilling the habitat and powering the shelter', () => {
    const s = atLeak({ radiation_shelter: 1 })
    const after = resolveDecision(content, s, 'shelter')
    expect(s.stocks.oxygen - after.stocks.oxygen).toBeCloseTo(6)
    expect(leaking(after)).toEqual([])
    expect(after.modifiers.find((m) => m.tag === 'crew_sheltered')).toMatchObject({ kind: 'extra_power', value: 10, remainingDays: 1 })
  })
})

describe('oxygen leak: diagnostics first', () => {
  it('costs time and air, then asks a second, better-informed decision', () => {
    const s = atLeak({ spare_parts: 1 })
    const scanned = resolveDecision(content, s, 'diagnose')
    expect(s.stocks.oxygen - scanned.stocks.oxygen).toBeCloseTo(2)
    expect(scanned.status).toBe('awaiting-decision')
    expect(scanned.pendingEvent).toMatchObject({ eventId: 'oxygen_leak_located', day: s.pendingEvent!.day })
    expect(scanned.decisions.map((d) => d.optionId)).toEqual(['diagnose'])

    const fixed = resolveDecision(content, scanned, 'repair')
    expect(fixed.status).toBe('running')
    expect(fixed.spareParts).toBe(0)
    expect(leaking(fixed)).toEqual([])
    expect(fixed.decisions.map((d) => `${d.eventId}:${d.optionId}`)).toEqual(['oxygen_leak:diagnose', 'oxygen_leak_located:repair'])
  })

  it('makes an improvised repair much more likely to work', () => {
    let fixed = 0
    for (let seed = 1; seed <= 200; seed++) {
      const after = resolveDecision(content, resolveDecision(content, atLeak({}, seed), 'diagnose'), 'repair')
      if (leaking(after).length === 0) fixed++
    }
    expect(fixed / 200).toBeGreaterThan(0.65)
  })
})

describe('urgent decisions', () => {
  it('when time runs out: the delay costs oxygen, the fallback runs, and the log says nobody decided', () => {
    const s = atLeak()
    const after = resolveDecision(content, s, 'repair', { timedOut: true })
    const record = after.decisions.at(-1)!
    expect(record).toMatchObject({ optionId: 'isolate', timedOut: true })
    expect(record.notes[0].key).toBe('@events.oxygen_leak.urgency.note')
    expect(after.stocks.oxygen).toBeCloseTo((s.stocks.oxygen - 2) * 0.85)
    expect(after.modifiers.some((m) => m.tag === 'bay_sealed')).toBe(true)
    expect(after.log.some((l) => l.msg.key === 'sim.decisionTimeout')).toBe(true)
  })

  it('every urgent event falls back to an option that is always available', () => {
    for (const def of Object.values(gameContent.events)) {
      if (!def.urgency) continue
      const fallback = def.options.find((o) => o.id === def.urgency!.fallback)
      expect(fallback, def.id).toBeDefined()
      expect(fallback!.requires, def.id).toBeUndefined()
    }
  })

  it('higher ranks get less time to decide; calm events have no clock', () => {
    const cadet = decisionTimeLimit(gameContent, 'oxygen_leak', 'cadet')!
    const commander = decisionTimeLimit(gameContent, 'oxygen_leak', 'commander')!
    expect(cadet).toBeGreaterThan(commander)
    expect(commander).toBeGreaterThanOrEqual(15)
    expect(decisionTimeLimit(gameContent, 'crop_failure', 'cadet')).toBeNull()
  })

  it('every follow-up points at a real event that is never rolled at random', () => {
    const followUps = (effects: Effect[]): string[] =>
      effects.flatMap((e) =>
        e.type === 'followUp' ? [e.eventId] : e.type === 'branch' ? [...followUps(e.then), ...followUps(e.else ?? [])] : e.type === 'chance' ? [...followUps(e.effects), ...followUps(e.otherwise ?? [])] : [],
      )
    const pools = gameContent.missions.flatMap((m) => m.randomEventPool)
    for (const def of Object.values(gameContent.events)) {
      for (const id of def.options.flatMap((o) => followUps(o.effects))) {
        expect(gameContent.events[id], id).toBeDefined()
        expect(pools).not.toContain(id)
      }
    }
  })
})
