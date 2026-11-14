/**
 * @file
 * @brief Development-only shortcut: open the game on a given screen with `?preview=<screen>`.
 *
 * Useful to review visuals without clicking through the whole flow. Ignored in
 * production builds (see main.tsx). Examples:
 *   /?preview=outpost   /?preview=event   /?preview=result   /?preview=setup&rank=commander
 */
import { advanceDay, createMissionState, gameContent, optionAvailability, resolveDecision, toLoadout } from '../game'
import type { MissionState } from '../types/game'
import { initialAppState, type AppState } from './state/appState'

function play(stop: (s: MissionState) => boolean, missionId: string): MissionState {
  const mission = gameContent.missions.find((m) => m.id === missionId) ?? gameContent.missions[0]
  let s = createMissionState(gameContent, mission.id, toLoadout(mission.recommendedLoadout), 7)
  for (let i = 0; i < 120 && !stop(s); i++) {
    if (s.status === 'awaiting-decision') {
      const option = gameContent.events[s.pendingEvent!.eventId].options.find((o) => optionAvailability(gameContent, s, o).available)!
      s = resolveDecision(gameContent, s, option.id)
    } else s = advanceDay(gameContent, s)
  }
  return s
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
  const withRank = (s: AppState): AppState => {
    const rank = params.get('rank')
    return rank ? ({ ...s, rank } as AppState) : s
  }
  switch (screen) {
    case 'select':
    case 'briefing':
    case 'setup':
      return withRank({ ...base, missionId, screen })
    case 'outpost':
      return withRank({ ...base, missionId, screen: 'outpost', mission: play((s) => s.day >= day && s.status === 'running', missionId) })
    case 'event':
      return withRank({ ...base, missionId, screen: 'outpost', mission: play((s) => s.status === 'awaiting-decision', missionId) })
    case 'result':
      return withRank({ ...base, missionId, screen: 'result', mission: play((s) => s.status === 'success' || s.status === 'failure', missionId) })
    default:
      return undefined
  }
}
