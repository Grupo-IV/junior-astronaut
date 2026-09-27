// Application (navigation) state. Kept separate from the simulation engine:
// this reducer only decides *which screen* is shown and forwards player
// actions to pure engine functions.
import type { Loadout, MissionState } from '../../types/game'
import {
  advanceDay,
  createMissionState,
  gameContent,
  getMission,
  newSeed,
  repairBuilding,
  resolveDecision,
  toLoadout,
  toggleBuilding,
} from '../../game'

export type Screen = 'menu' | 'select' | 'briefing' | 'setup' | 'outpost' | 'result'

export interface AppState {
  screen: Screen
  missionId: string
  loadout: Loadout
  mission: MissionState | null
  /** Index into mission.decisions of a decision whose consequences are being shown. */
  consequenceIndex: number | null
}

export type AppAction =
  | { type: 'navigate'; screen: Screen }
  | { type: 'chooseMission'; missionId: string }
  | { type: 'setLoadout'; loadout: Loadout }
  | { type: 'launch' }
  | { type: 'advanceDay' }
  | { type: 'decide'; optionId: string }
  | { type: 'dismissConsequence' }
  | { type: 'toggleBuilding'; uid: string }
  | { type: 'repairBuilding'; uid: string }
  | { type: 'retry' }

export function initialAppState(): AppState {
  const first = gameContent.missions[0]
  return { screen: 'menu', missionId: first.id, loadout: toLoadout(first.recommendedLoadout), mission: null, consequenceIndex: null }
}

function finished(m: MissionState) {
  return m.status === 'success' || m.status === 'failure'
}

export function appReducer(state: AppState, action: AppAction): AppState {
  const content = gameContent
  switch (action.type) {
    case 'navigate':
      return { ...state, screen: action.screen }
    case 'chooseMission': {
      const mission = getMission(content, action.missionId)
      return { ...state, missionId: mission.id, loadout: toLoadout({}), screen: 'briefing' }
    }
    case 'setLoadout':
      return { ...state, loadout: action.loadout }
    case 'launch':
      return {
        ...state,
        mission: createMissionState(content, state.missionId, state.loadout, newSeed()),
        consequenceIndex: null,
        screen: 'outpost',
      }
    case 'retry':
      return { ...state, mission: null, consequenceIndex: null, screen: 'setup' }
    case 'advanceDay': {
      if (!state.mission || state.consequenceIndex !== null) return state
      const mission = advanceDay(content, state.mission)
      return { ...state, mission }
    }
    case 'decide': {
      if (!state.mission) return state
      const mission = resolveDecision(content, state.mission, action.optionId)
      if (mission === state.mission) return state
      return { ...state, mission, consequenceIndex: mission.decisions.length - 1 }
    }
    case 'dismissConsequence':
      return { ...state, consequenceIndex: null }
    case 'toggleBuilding':
      return state.mission ? { ...state, mission: toggleBuilding(content, state.mission, action.uid) } : state
    case 'repairBuilding':
      return state.mission ? { ...state, mission: repairBuilding(content, state.mission, action.uid) } : state
  }
}

export function missionFinished(state: AppState): boolean {
  return !!state.mission && finished(state.mission)
}
