/** Alerts appear only when something needs attention, most urgent first. */
import { describe, expect, it } from 'vitest'
import { advanceDay, createMissionState, gameContent, resolveDecision, takeShelter, toLoadout } from '../../game'
import type { MissionState } from '../../types/game'
import { missionAlerts } from './alerts'

const CADET = 'shackleton-first-light'
const LOADOUT = { solar_array: 2, battery: 2, radiation_shelter: 1, oxygen_tank: 3, water_crate: 2, food_crate: 3, spare_parts: 1 }

function inStorm(): MissionState {
  let s = createMissionState(gameContent, CADET, toLoadout(LOADOUT), 1)
  for (let i = 0; i < 20 && s.pendingEvent?.eventId !== 'solar_storm'; i++) {
    s = s.status === 'awaiting-decision' ? resolveDecision(gameContent, s, gameContent.events[s.pendingEvent!.eventId].options.at(-1)!.id) : advanceDay(gameContent, s)
  }
  return resolveDecision(gameContent, s, 'continue')
}

describe('mission alerts', () => {
  it('say nothing on a calm day', () => {
    expect(missionAlerts(createMissionState(gameContent, CADET, toLoadout(LOADOUT), 1))).toEqual([])
  })

  it('a storm is a critical alert that offers the shelter; once inside, it says the crew is protected', () => {
    const s = inStorm()
    const storm = missionAlerts(s).find((a) => a.id === 'storm')!
    expect(storm).toMatchObject({ level: 'critical', action: 'takeShelter' })
    const inside = missionAlerts(takeShelter(gameContent, s))
    expect(inside.find((a) => a.id === 'storm')).toBeUndefined()
    expect(inside.find((a) => a.id === 'sheltered')).toMatchObject({ level: 'good', args: { percent: 90 } })
  })

  it('warn about supplies running out and broken machines, critical first', () => {
    const s = advanceDay(gameContent, createMissionState(gameContent, CADET, toLoadout({ ...LOADOUT, oxygen_generator: 1 }), 1), { events: false })
    s.stocks.oxygen = 3
    s.buildings.find((b) => b.defId === 'oxygen_generator')!.status = 'failed'
    const alerts = missionAlerts(s)
    expect(alerts.map((a) => a.id)).toEqual(expect.arrayContaining(['low', 'broken']))
    expect(alerts.find((a) => a.id === 'low')).toMatchObject({ stock: 'oxygen', level: 'critical' })
    expect(alerts[0].level).toBe('critical')
  })
})
