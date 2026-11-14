/**
 * @file
 * @brief Application navigation state and actions forwarded to the simulation engine.
 */
import type { GameContent, Loadout, MissionState } from '../../types/game'
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
import { contentForRank, DEFAULT_RANK, isRankId, type RankId } from '../../game/ranks'

export type Screen = 'menu' | 'select' | 'briefing' | 'setup' | 'outpost' | 'result'

export interface AppState {
  screen: Screen
  /** Rank chosen for the next mission. A running mission keeps the rank it was launched with. */
  rank: RankId
  missionId: string
  loadout: Loadout
  mission: MissionState | null
  consequenceIndex: number | null
}

export type AppAction =
  | { type: 'navigate'; screen: Screen }
  | { type: 'setRank'; rank: RankId }
  | { type: 'chooseMission'; missionId: string }
  | { type: 'setLoadout'; loadout: Loadout }
  | { type: 'launch' }
  | { type: 'advanceDay' }
  | { type: 'decide'; optionId: string }
  | { type: 'dismissConsequence' }
  | { type: 'toggleBuilding'; uid: string }
  | { type: 'repairBuilding'; uid: string }
  | { type: 'retry' }

const RANK_KEY = 'junior-astronaut:rank'

function savedRank(): RankId {
  try {
    const v = globalThis.localStorage?.getItem(RANK_KEY)
    if (isRankId(v)) return v
  } catch {
    // Storage blocked: start as a cadet.
  }
  return DEFAULT_RANK
}

function saveRank(rank: RankId) {
  try {
    globalThis.localStorage?.setItem(RANK_KEY, rank)
  } catch {
    // The choice still applies for this session.
  }
}

export function initialAppState(): AppState {
  const first = gameContent.missions[0]
  return { screen: 'menu', rank: savedRank(), missionId: first.id, loadout: toLoadout(first.recommendedLoadout), mission: null, consequenceIndex: null }
}

/** Rules for planning the next mission (the rank currently selected). */
export function planRules(state: Pick<AppState, 'rank'>): GameContent {
  return contentForRank(gameContent, state.rank)
}

/** Rules a launched mission runs with (the rank it was launched with). */
export function missionRules(mission: Pick<MissionState, 'rank'>): GameContent {
  return contentForRank(gameContent, mission.rank)
}

function finished(m: MissionState) {
  return m.status === 'success' || m.status === 'failure'
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'navigate':
      return { ...state, screen: action.screen }
    case 'setRank':
      saveRank(action.rank)
      return { ...state, rank: action.rank }
    case 'chooseMission': {
      const mission = getMission(gameContent, action.missionId)
      return { ...state, missionId: mission.id, loadout: toLoadout({}), screen: 'briefing' }
    }
    case 'setLoadout':
      return { ...state, loadout: action.loadout }
    case 'launch':
      return {
        ...state,
        mission: createMissionState(planRules(state), state.missionId, state.loadout, newSeed(), state.rank),
        consequenceIndex: null,
        screen: 'outpost',
      }
    case 'retry':
      return { ...state, mission: null, consequenceIndex: null, screen: 'setup' }
    case 'advanceDay': {
      if (!state.mission || state.consequenceIndex !== null) return state
      return { ...state, mission: advanceDay(missionRules(state.mission), state.mission) }
    }
    case 'decide': {
      if (!state.mission) return state
      const mission = resolveDecision(missionRules(state.mission), state.mission, action.optionId)
      if (mission === state.mission) return state
      return { ...state, mission, consequenceIndex: mission.decisions.length - 1 }
    }
    case 'dismissConsequence':
      return { ...state, consequenceIndex: null }
    case 'toggleBuilding':
      return state.mission ? { ...state, mission: toggleBuilding(missionRules(state.mission), state.mission, action.uid) } : state
    case 'repairBuilding':
      return state.mission ? { ...state, mission: repairBuilding(missionRules(state.mission), state.mission, action.uid) } : state
  }
}

export function missionFinished(state: AppState): boolean {
  return !!state.mission && finished(state.mission)
}
