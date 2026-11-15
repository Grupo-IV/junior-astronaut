/**
 * @file
 * @brief How mission situations are staged in the first-person view.
 *
 * Pure presentation rules: where in the habitat an event plays out, how
 * alarmed the cabin looks, and what the hands do for each option. Nothing here
 * changes the mission; the decision itself always goes through the engine
 * (`resolveDecision`).
 */
import type { BuildingId, DecisionOption, MissionState } from '../types/game'
import type { AlertLevel, FocusPoint, HandAction, HandRequest, StationId } from './types'

export const STATION_BUILDINGS: Record<StationId, BuildingId[]> = {
  lifeSupport: ['oxygen_generator', 'water_recycler'],
  agro: ['greenhouse'],
  command: [],
  power: ['solar_array', 'battery'],
  storage: [],
  shelter: ['radiation_shelter'],
}

export function stationForBuilding(id: BuildingId): StationId {
  return (Object.keys(STATION_BUILDINGS) as StationId[]).find((s) => STATION_BUILDINGS[s].includes(id)) ?? 'command'
}

/** Facts about the base worth showing next to a decision. */
export type ContextFact = 'oxygen' | 'water' | 'food' | 'power' | 'dose' | 'spares' | 'affected'

export interface EventStaging {
  station: StationId
  focus: FocusPoint
  alert: AlertLevel
  /** First reaction of the hands when the alarm goes off. */
  reaction: HandAction
  context: ContextFact[]
}

export const EVENT_STAGING: Record<string, EventStaging> = {
  oxygen_leak: { station: 'lifeSupport', focus: 'leak', alert: 'emergency', reaction: 'startle', context: ['oxygen', 'spares', 'power'] },
  oxygen_leak_located: { station: 'lifeSupport', focus: 'leak', alert: 'emergency', reaction: 'point', context: ['oxygen', 'spares', 'power'] },
  water_leak: { station: 'storage', focus: 'shelf', alert: 'caution', reaction: 'point', context: ['water', 'spares'] },
  equipment_failure: { station: 'lifeSupport', focus: 'console', alert: 'caution', reaction: 'point', context: ['affected', 'oxygen', 'water', 'spares'] },
  power_failure: { station: 'power', focus: 'window', alert: 'caution', reaction: 'point', context: ['power'] },
  solar_storm: { station: 'command', focus: 'console', alert: 'storm', reaction: 'startle', context: ['dose', 'power'] },
  crop_failure: { station: 'agro', focus: 'plants', alert: 'caution', reaction: 'point', context: ['food', 'water', 'power'] },
}

const DEFAULT_STAGING: EventStaging = { station: 'command', focus: 'console', alert: 'caution', reaction: 'point', context: ['oxygen', 'power'] }

export function stagingFor(eventId: string): EventStaging {
  return EVENT_STAGING[eventId] ?? DEFAULT_STAGING
}

/** Default gesture for an option, by its icon (what the option physically involves). */
const ICON_HANDS: Record<string, Omit<HandRequest, 'withKit'>> = {
  toolbox: { action: 'repair' },
  wrench: { action: 'repair' },
  bandage: { action: 'repair' },
  valve: { action: 'seal' },
  shield: { action: 'beckon', station: 'command', focus: 'airlock' },
  crew: { action: 'beckon', station: 'command', focus: 'airlock' },
  astronaut: { action: 'beckon', station: 'command', focus: 'airlock' },
  science: { action: 'wrist' },
  water: { action: 'grab', station: 'storage', focus: 'shelf' },
  sprout: { action: 'grab', station: 'agro', focus: 'plants' },
  plug: { action: 'press', focus: 'console' },
  play: { action: 'press', focus: 'console' },
  robot: { action: 'press', focus: 'console' },
  pill: { action: 'press', focus: 'console' },
  stop: { action: 'press', focus: 'console' },
  eye: { action: 'point' },
  skip: { action: 'relax' },
  pause: { action: 'relax' },
}

/** Where a gesture lands when the option does not say. */
const ACTION_FOCUS: Partial<Record<HandAction, FocusPoint>> = { seal: 'hatch', repair: 'console', press: 'console' }

/**
 * What the hands do when the player picks `option` for `eventId`. Leaks are
 * worked on at the leak itself; repairs take a spare kit from the rack when
 * the option really uses one.
 */
export function optionHands(eventId: string, option: Pick<DecisionOption, 'id' | 'icon' | 'effects'>, state: MissionState): HandRequest {
  const staging = stagingFor(eventId)
  const base = ICON_HANDS[option.icon] ?? { action: 'press' as HandAction }
  const request: HandRequest = {
    action: base.action,
    station: base.station ?? staging.station,
    focus: base.focus ?? (base.action === 'repair' || base.action === 'point' ? staging.focus : ACTION_FOCUS[base.action] ?? staging.focus),
  }
  if (base.action === 'repair') request.withKit = usesSpare(option.effects, state)
  if (base.action === 'seal' && request.station === 'lifeSupport') request.focus = 'hatch'
  return request
}

/** Would these effects take a spare kit from the rack right now? */
function usesSpare(effects: DecisionOption['effects'], state: MissionState): boolean {
  return effects.some((e) => {
    if (e.type === 'useSpare') return state.spareParts > 0
    if (e.type === 'branch') return usesSpare(e.if.spareParts && state.spareParts >= e.if.spareParts ? e.then : (e.else ?? []), state)
    return false
  })
}

export type LeakState = 'none' | 'active' | 'slow'

const LEAK_EVENTS = new Set(['oxygen_leak', 'oxygen_leak_located'])

/** The cabin air leak as the crew would see it. */
export function leakState(state: MissionState): LeakState {
  if (state.pendingEvent && LEAK_EVENTS.has(state.pendingEvent.eventId)) return 'active'
  if (state.modifiers.some((m) => m.kind === 'oxygen_loss' && m.remainingDays > 0)) return 'slow'
  return 'none'
}

export function hasTag(state: MissionState, tag: 'bay_sealed' | 'crew_sheltered'): boolean {
  return state.modifiers.some((m) => m.tag === tag && m.remainingDays > 0)
}

/** How alarmed the cabin is. Follows the ISS idea: emergency > warning (storm) > caution. */
export function alertLevel(state: MissionState): AlertLevel {
  if (state.status === 'failure') return 'emergency'
  if (state.pendingEvent) return stagingFor(state.pendingEvent.eventId).alert
  if (state.lastReport?.habitatUnpowered) return 'emergency'
  if (state.modifiers.some((m) => m.kind === 'storm_dose' && m.remainingDays > 0)) return 'storm'
  if (leakState(state) !== 'none') return 'caution'
  if (state.modifiers.some((m) => m.kind === 'water_loss' && m.remainingDays > 0)) return 'caution'
  if (state.buildings.some((b) => b.status === 'failed')) return 'caution'
  return 'none'
}

export type DeltaKind = 'oxygen' | 'water' | 'food' | 'energy' | 'spares' | 'dose'

export interface Delta {
  kind: DeltaKind
  value: number
}

/** What a decision changed in the stores, read from the mission before and after it. */
export function decisionDeltas(before: MissionState, after: MissionState): Delta[] {
  const out: Delta[] = []
  for (const kind of ['oxygen', 'water', 'food', 'energy'] as const) {
    const value = after.stocks[kind] - before.stocks[kind]
    if (Math.abs(value) >= 0.05) out.push({ kind, value })
  }
  if (after.spareParts !== before.spareParts) out.push({ kind: 'spares', value: after.spareParts - before.spareParts })
  const dose = after.crewDoseMsv - before.crewDoseMsv
  if (Math.abs(dose) >= 0.05) out.push({ kind: 'dose', value: dose })
  return out
}
