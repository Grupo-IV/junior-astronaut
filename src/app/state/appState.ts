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
  takeShelter,
  leaveShelter,
  goOnEva,
  summarizeRun,
  type RunSummary,
  resolveDecision,
  toLoadout,
  toggleBuilding,
} from '../../game'
import { contentForRank, DEFAULT_RANK, isRankId, type RankId } from '../../game/ranks'
import type { ViewMode } from '../../immersive/types'

export type Screen = 'menu' | 'select' | 'briefing' | 'setup' | 'outpost' | 'result'

export interface AppState {
  screen: Screen
  /** Rank chosen for the next mission. A running mission keeps the rank it was launched with. */
  rank: RankId
  missionId: string
  loadout: Loadout
  mission: MissionState | null
  consequenceIndex: number | null
  /** How the outpost is shown: the management view from outside, or first person inside the habitat. */
  view: ViewMode
  /** Set when the player replays a try: the next launch uses its seed and rank. */
  replay: RunSummary | null
  /** The try a replayed mission is compared with on the result screen. */
  compareWith: RunSummary | null
}

export type AppAction =
  | { type: 'navigate'; screen: Screen }
  | { type: 'setRank'; rank: RankId }
  | { type: 'chooseMission'; missionId: string }
  | { type: 'setLoadout'; loadout: Loadout }
  | { type: 'launch' }
  | { type: 'advanceDay' }
  | { type: 'decide'; optionId: string; timedOut?: boolean }
  | { type: 'setView'; view: ViewMode }
  | { type: 'dismissConsequence' }
  | { type: 'toggleBuilding'; uid: string }
  | { type: 'repairBuilding'; uid: string }
  | { type: 'takeShelter' }
  | { type: 'leaveShelter' }
  | { type: 'goOnEva' }
  /** Replay the finished mission with the same seed and rank (cargo and decisions can change). */
  | { type: 'replay' }
  | { type: 'cancelReplay' }
  | { type: 'retry' }

const RANK_KEY = 'junior-astronaut:rank'
const VIEW_KEY = 'junior-astronaut:view'

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

function savedView(): ViewMode {
  try {
    if (globalThis.localStorage?.getItem(VIEW_KEY) === 'firstPerson') return 'firstPerson'
  } catch {
    // Storage blocked: start in the management view.
  }
  return 'orbit'
}

function saveView(view: ViewMode) {
  try {
    globalThis.localStorage?.setItem(VIEW_KEY, view)
  } catch {
    // The choice still applies for this session.
  }
}

export function initialAppState(): AppState {
  const first = gameContent.missions[0]
  return {
    screen: 'menu',
    rank: savedRank(),
    missionId: first.id,
    loadout: toLoadout(first.recommendedLoadout),
    mission: null,
    consequenceIndex: null,
    view: savedView(),
    replay: null,
    compareWith: null,
  }
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
      return { ...state, missionId: mission.id, loadout: toLoadout({}), screen: 'briefing', replay: null }
    }
    case 'setLoadout':
      return { ...state, loadout: action.loadout }
    case 'launch': {
      // A replay starts from the same seed and rank as the try it repeats.
      const rank = state.replay?.rank ?? state.rank
      const rules = planRules({ rank })
      return {
        ...state,
        mission: createMissionState(rules, state.missionId, state.loadout, state.replay?.seed ?? newSeed(), rank),
        consequenceIndex: null,
        screen: 'outpost',
        compareWith: state.replay,
        replay: null,
      }
    }
    case 'retry':
      return { ...state, mission: null, consequenceIndex: null, screen: 'setup', replay: null, compareWith: null }
    case 'replay': {
      if (!state.mission) return state
      const previous = summarizeRun(missionRules(state.mission), state.mission)
      return {
        ...state,
        missionId: previous.missionId,
        rank: previous.rank,
        loadout: { ...previous.loadout },
        mission: null,
        consequenceIndex: null,
        screen: 'setup',
        replay: previous,
      }
    }
    case 'cancelReplay':
      return { ...state, replay: null }
    case 'goOnEva':
      return state.mission ? { ...state, mission: goOnEva(missionRules(state.mission), state.mission) } : state
    case 'advanceDay': {
      if (!state.mission || state.consequenceIndex !== null) return state
      return { ...state, mission: advanceDay(missionRules(state.mission), state.mission) }
    }
    case 'decide': {
      if (!state.mission) return state
      const mission = resolveDecision(missionRules(state.mission), state.mission, action.optionId, { timedOut: action.timedOut })
      if (mission === state.mission) return state
      return { ...state, mission, consequenceIndex: mission.decisions.length - 1 }
    }
    case 'setView':
      saveView(action.view)
      return { ...state, view: action.view }
    case 'dismissConsequence':
      return { ...state, consequenceIndex: null }
    case 'toggleBuilding':
      return state.mission ? { ...state, mission: toggleBuilding(missionRules(state.mission), state.mission, action.uid) } : state
    case 'takeShelter':
      return state.mission ? { ...state, mission: takeShelter(missionRules(state.mission), state.mission) } : state
    case 'leaveShelter':
      return state.mission ? { ...state, mission: leaveShelter(missionRules(state.mission), state.mission) } : state
    case 'repairBuilding':
      return state.mission ? { ...state, mission: repairBuilding(missionRules(state.mission), state.mission, action.uid) } : state
  }
}

export function missionFinished(state: AppState): boolean {
  return !!state.mission && finished(state.mission)
}
