/**
 * @file
 * @brief Moving the crew into the radiation shelter (and out again) during a solar storm.
 *
 * The protection comes from the shelter's own data: `stormDoseFactor` (the
 * share of storm dose that gets through its regolith walls) and
 * `occupiedPowerKwhPerDay` (its life support while people are inside). The
 * same values drive the "Move crew into the radiation shelter" storm option,
 * so taking shelter from the console or from the decision is the same thing.
 */
import type { GameContent, Message, MissionState, Modifier } from '../../types/game'
import { msg, round } from '../messages'
import { unmetRequirement } from '../events/requirements'

/** Days left of the solar storm now reaching the base (0 when there is none). */
export function stormDaysLeft(state: MissionState): number {
  return state.modifiers.filter((m) => m.kind === 'storm_dose' && m.remainingDays > 0).reduce((acc, m) => Math.max(acc, m.remainingDays), 0)
}

/** The crew is behind the shelter walls (protection active). */
export function crewInShelter(state: MissionState): boolean {
  return state.modifiers.some((m) => m.tag === 'crew_sheltered' && m.kind === 'dose_factor' && m.remainingDays > 0)
}

/** Share of storm dose the shelter blocks, from its data (0.9 for 90%). */
export function shelterProtection(content: GameContent): number {
  return 1 - (content.buildings.radiation_shelter.stormDoseFactor ?? 1)
}

export interface ShelterCheck {
  canEnter: boolean
  canLeave: boolean
  inside: boolean
  reason?: Message
}

export function shelterStatus(_content: GameContent, state: MissionState): ShelterCheck {
  const inside = crewInShelter(state)
  const running = state.status === 'running'
  if (inside) return { canEnter: false, canLeave: running, inside }
  // The crew may already be there for another reason (evacuated during an air leak).
  const evacuated = state.modifiers.some((m) => m.tag === 'crew_sheltered' && m.remainingDays > 0)
  if (evacuated) return { canEnter: false, canLeave: false, inside: false, reason: msg('sim.shelter.evacuated') }
  const missing = unmetRequirement(state, { building: 'radiation_shelter' })
  if (missing) return { canEnter: false, canLeave: false, inside, reason: missing }
  if (stormDaysLeft(state) === 0) return { canEnter: false, canLeave: false, inside, reason: msg('sim.shelter.noStorm') }
  return { canEnter: running, canLeave: false, inside }
}

/** @brief Moves the crew into the shelter until the storm is over. */
export function takeShelter(content: GameContent, state: MissionState): MissionState {
  if (!shelterStatus(content, state).canEnter) return state
  const s = structuredClone(state)
  const def = content.buildings.radiation_shelter
  const days = stormDaysLeft(s)
  const percent = round(shelterProtection(content) * 100)
  const add = (m: Omit<Modifier, 'id' | 'remainingDays' | 'source' | 'tag'>) =>
    s.modifiers.push({ ...m, id: `m${s.nextUid++}`, remainingDays: days, source: 'player', tag: 'crew_sheltered' })
  add({ kind: 'dose_factor', value: def.stormDoseFactor ?? 1, label: msg('sim.shelter.doseLabel', { percent }) })
  add({ kind: 'extra_power', value: def.occupiedPowerKwhPerDay ?? 0, label: msg('sim.shelter.powerLabel', { kwh: def.occupiedPowerKwhPerDay ?? 0 }) })
  // Nobody tends the greenhouse while the crew is in the shelter (as in the storm decision).
  add({ kind: 'building_output', target: 'greenhouse', value: 0.5, label: msg('sim.shelter.greenhouseLabel', { percent: 50 }) })
  s.log.push({ day: s.day, kind: 'success', msg: msg('sim.crewSheltered', { percent }) })
  return s
}

/** @brief The crew leaves the shelter: the storm dose reaches them in full again. */
export function leaveShelter(content: GameContent, state: MissionState): MissionState {
  if (!shelterStatus(content, state).canLeave) return state
  const s = structuredClone(state)
  s.modifiers = s.modifiers.filter((m) => m.tag !== 'crew_sheltered')
  s.log.push({ day: s.day, kind: stormDaysLeft(s) > 0 ? 'danger' : 'info', msg: msg(stormDaysLeft(s) > 0 ? 'sim.crewLeftShelterStorm' : 'sim.crewLeftShelter') })
  return s
}
