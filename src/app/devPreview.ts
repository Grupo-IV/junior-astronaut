/**
 * @file
 * @brief Development-only shortcut: open the game on a given screen with `?preview=<screen>`.
 *
 * Useful to review visuals without clicking through the whole flow. Ignored in
 * production builds (see main.tsx). Examples:
 *   /?preview=outpost   /?preview=event   /?preview=result   /?preview=setup&rank=commander
 *   /?preview=event&event=oxygen_leak&view=fp&tour=0     (first person, deciding the oxygen leak)
 *   /?preview=outpost&event=oxygen_leak&view=fp&tour=0   (the leak happens on the next day: press Next day)
 */
import { advanceDay, createMissionState, gameContent, optionAvailability, resolveDecision, toLoadout } from '../game'
import type { GameContent, MissionState } from '../types/game'
import { initialAppState, type AppState } from './state/appState'

function play(stop: (s: MissionState) => boolean, missionId: string, content: GameContent = gameContent, seed = 7): MissionState {
  const mission = content.missions.find((m) => m.id === missionId) ?? content.missions[0]
  let s = createMissionState(content, mission.id, toLoadout(mission.recommendedLoadout), seed)
  for (let i = 0; i < 120 && !stop(s); i++) {
    if (s.status === 'awaiting-decision') {
      const option = content.events[s.pendingEvent!.eventId].options.find((o) => optionAvailability(content, s, o).available)!
      s = resolveDecision(content, s, option.id)
    } else s = advanceDay(content, s)
  }
  return s
}

/**
 * A mission on `day` whose next day brings `eventId` under the real rules
 * (found by trying seeds), so the whole scene can be played live.
 */
function beforeEvent(eventId: string, day: number, missionId: string): MissionState | undefined {
  for (let seed = 1; seed <= 3000; seed++) {
    const s = play((m) => m.day >= day && m.status === 'running', missionId, gameContent, seed)
    if (s.status !== 'running') continue
    if (advanceDay(gameContent, s).pendingEvent?.eventId === eventId) return s
  }
  return undefined
}

/** The same rules, with one event forced on a given day (to rehearse a scene). */
function withEvent(eventId: string, day: number): GameContent {
  return {
    ...gameContent,
    // Events with variants (solar storms) need one: the variant carries the storm itself.
    missions: gameContent.missions.map((m) => ({ ...m, scheduledEvents: [{ day, eventId, variant: Object.keys(gameContent.events[eventId].variants ?? {})[0] }], randomEventChancePerDay: 0 })),
  }
}

export function previewState(search: string): AppState | undefined {
  const params = new URLSearchParams(search)
  const screen = params.get('preview')
  if (!screen) return undefined
  if (params.get('tour') === '0') {
    try {
      localStorage.setItem('junior-astronaut:outpost-tutorial-seen', '1')
    } catch {
      // ignore
    }
  }
  const base = initialAppState()
  const missionId = params.get('mission') ?? base.missionId
  const day = Number(params.get('day') ?? 3)
  const forcedEvent = params.get('event')
  const content = forcedEvent && gameContent.events[forcedEvent] ? withEvent(forcedEvent, Math.max(2, day)) : gameContent
  const withRank = (s: AppState): AppState => {
    const rank = params.get('rank')
    const view = params.get('view') === 'fp' ? 'firstPerson' : params.get('view') === 'orbit' ? 'orbit' : s.view
    return rank ? ({ ...s, rank, view } as AppState) : { ...s, view }
  }
  switch (screen) {
    case 'select':
    case 'briefing':
    case 'setup':
      return withRank({ ...base, missionId, screen })
    case 'outpost':
      return withRank({
        ...base,
        missionId,
        screen: 'outpost',
        mission: (forcedEvent && beforeEvent(forcedEvent, day, missionId)) || play((s) => s.day >= day && s.status === 'running', missionId),
      })
    case 'event':
      return withRank({ ...base, missionId, screen: 'outpost', mission: play((s) => s.status === 'awaiting-decision', missionId, content) })
    case 'result':
      return withRank({ ...base, missionId, screen: 'result', mission: play((s) => s.status === 'success' || s.status === 'failure', missionId) })
    default:
      return undefined
  }
}
