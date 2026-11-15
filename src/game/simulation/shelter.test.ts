/** Taking shelter is a real action: the storm dose that reaches the crew follows the shelter's data. */
import { describe, expect, it } from 'vitest'
import type { MissionState } from '../../types/game'
import { advanceDay, createMissionState, crewInShelter, gameContent as content, leaveShelter, resolveDecision, shelterStatus, takeShelter, toLoadout } from '../index'

const CADET = 'shackleton-first-light'
const LOADOUT = { solar_array: 2, battery: 2, oxygen_tank: 3, water_crate: 2, food_crate: 3 }

/** Cadet mission on day 5, storm active (the crew carried on with normal operations). */
function inStorm(withShelter = true): MissionState {
  let s = createMissionState(content, CADET, toLoadout({ ...LOADOUT, radiation_shelter: withShelter ? 1 : 0 }), 1)
  for (let i = 0; i < 20 && s.pendingEvent?.eventId !== 'solar_storm'; i++) {
    s = s.status === 'awaiting-decision' ? resolveDecision(content, s, content.events[s.pendingEvent!.eventId].options.at(-1)!.id) : advanceDay(content, s, {})
  }
  return resolveDecision(content, s, 'continue')
}

const stormToday = (s: MissionState) => advanceDay(content, s, { events: false }).stats.doseStorm - s.stats.doseStorm

describe('radiation shelter', () => {
  it('cannot be used when there is no storm, or no shelter', () => {
    const calm = createMissionState(content, CADET, toLoadout({ ...LOADOUT, radiation_shelter: 1 }), 1)
    expect(shelterStatus(content, calm)).toMatchObject({ canEnter: false, reason: { key: 'sim.shelter.noStorm' } })
    expect(takeShelter(content, calm)).toBe(calm)
    expect(shelterStatus(content, inStorm(false))).toMatchObject({ canEnter: false, reason: { key: 'sim.req.notLaunched' } })
  })

  it('blocks the share of storm dose given by the shelter data, until the storm ends', () => {
    const exposed = inStorm()
    expect(shelterStatus(content, exposed).canEnter).toBe(true)
    const sheltered = takeShelter(content, exposed)
    expect(crewInShelter(sheltered)).toBe(true)
    const factor = content.buildings.radiation_shelter.stormDoseFactor!
    expect(stormToday(sheltered)).toBeCloseTo(stormToday(exposed) * factor)
    const storm = exposed.modifiers.find((m) => m.kind === 'storm_dose')!
    for (const m of sheltered.modifiers.filter((x) => x.tag === 'crew_sheltered')) expect(m.remainingDays).toBe(storm.remainingDays)
    expect(sheltered.modifiers.find((m) => m.kind === 'extra_power' && m.tag === 'crew_sheltered')!.value).toBe(content.buildings.radiation_shelter.occupiedPowerKwhPerDay)
    expect(sheltered.log.at(-1)!.msg.key).toBe('sim.crewSheltered')
    expect(takeShelter(content, sheltered)).toBe(sheltered)
  })

  it('leaving during the storm brings the full dose back', () => {
    const exposed = inStorm()
    const out = leaveShelter(content, takeShelter(content, exposed))
    expect(crewInShelter(out)).toBe(false)
    expect(stormToday(out)).toBeCloseTo(stormToday(exposed))
    expect(out.log.at(-1)!.msg.key).toBe('sim.crewLeftShelterStorm')
  })

  it('the storm decision and the console action use the same shelter values', () => {
    const option = content.events.solar_storm.options.find((o) => o.id === 'shelter')!
    const dose = option.effects.find((e) => e.type === 'modifier' && e.kind === 'dose_factor')
    const power = option.effects.find((e) => e.type === 'modifier' && e.kind === 'extra_power')
    expect(dose).toMatchObject({ value: content.buildings.radiation_shelter.stormDoseFactor, tag: 'crew_sheltered' })
    expect(power).toMatchObject({ value: content.buildings.radiation_shelter.occupiedPowerKwhPerDay, tag: 'crew_sheltered' })
  })
})
