import { describe, expect, it } from 'vitest'
import { advanceDay, createMissionState, gameContent, toLoadout } from '../../game'
import { appReducer, initialAppState, type AppState } from './appState'

const MISSION = gameContent.missions[0]

function withLeak(): AppState {
  const content = { ...gameContent, missions: gameContent.missions.map((m) => ({ ...m, scheduledEvents: [{ day: 2, eventId: 'oxygen_leak' }] })) }
  const mission = advanceDay(content, createMissionState(content, MISSION.id, toLoadout(MISSION.recommendedLoadout), 3, 'specialist'))
  return { ...initialAppState(), screen: 'outpost', mission }
}

describe('app state: first-person view', () => {
  it('starts in the management view and switches both ways without touching the mission', () => {
    const s0 = withLeak()
    expect(s0.view).toBe('orbit')
    const inside = appReducer(s0, { type: 'setView', view: 'firstPerson' })
    expect(inside.view).toBe('firstPerson')
    expect(inside.mission).toBe(s0.mission)
    expect(appReducer(inside, { type: 'setView', view: 'orbit' }).view).toBe('orbit')
  })

  it('a decision taken in first person goes through the engine like any other', () => {
    const s0 = withLeak()
    const s1 = appReducer(s0, { type: 'decide', optionId: 'isolate' })
    expect(s1.mission!.status).toBe('running')
    expect(s1.mission!.decisions.at(-1)).toMatchObject({ eventId: 'oxygen_leak', optionId: 'isolate' })
    expect(s1.consequenceIndex).toBe(s1.mission!.decisions.length - 1)
  })

  it('running out of time applies the fallback and records it', () => {
    const s1 = appReducer(withLeak(), { type: 'decide', optionId: 'repair', timedOut: true })
    expect(s1.mission!.decisions.at(-1)).toMatchObject({ optionId: 'isolate', timedOut: true })
  })
})
