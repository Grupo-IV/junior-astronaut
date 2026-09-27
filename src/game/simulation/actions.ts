/**
 * @file
 * @brief Applies player actions during daily operations.
 */
import type { GameContent, MissionState } from '../../types/game'
import { random } from './rng'

export function toggleBuilding(content: GameContent, state: MissionState, uid: string): MissionState {
  if (state.status !== 'running') return state
  const s = structuredClone(state)
  const b = s.buildings.find((x) => x.uid === uid)
  if (!b) return state
  const def = content.buildings[b.defId]
  if (def.powerDemandKwhPerDay === 0) return state
  b.enabled = !b.enabled
  if (!b.enabled && b.defId === 'greenhouse' && b.growth > 0) {
    b.growth = 0
    s.log.push({ day: s.day, kind: 'warning', text: '🥀 Greenhouse switched off — the plants will not survive. Growth restarts from zero.' })
  }
  s.log.push({ day: s.day, kind: 'info', text: `${def.icon} ${def.name} switched ${b.enabled ? 'ON' : 'OFF'}.` })
  return s
}

export const IMPROVISED_REPAIR_CHANCE = 0.5

export function canRepair(state: MissionState, uid: string): { possible: boolean; withSpare: boolean; reason?: string } {
  const b = state.buildings.find((x) => x.uid === uid)
  if (!b || b.status !== 'failed' || state.status !== 'running') return { possible: false, withSpare: false }
  if (state.spareParts > 0) return { possible: true, withSpare: true }
  if (state.counters.lastRepairDay === state.day) {
    return { possible: false, withSpare: false, reason: 'The crew already tried a repair today.' }
  }
  return { possible: true, withSpare: false }
}

/** @brief Repairs a failed building using a spare kit or improvisation. */
export function repairBuilding(content: GameContent, state: MissionState, uid: string): MissionState {
  const check = canRepair(state, uid)
  if (!check.possible) return state
  const s = structuredClone(state)
  const b = s.buildings.find((x) => x.uid === uid)!
  const name = content.buildings[b.defId].name
  if (check.withSpare) {
    s.spareParts -= 1
    b.status = 'ok'
    s.log.push({ day: s.day, kind: 'success', text: `🧰 ${name} repaired with a spare parts kit.` })
    return s
  }
  s.counters.lastRepairDay = s.day
  if (random(s) < IMPROVISED_REPAIR_CHANCE) {
    b.status = 'ok'
    s.log.push({ day: s.day, kind: 'success', text: `🔧 Improvised repair worked — ${name} is back online.` })
  } else {
    s.log.push({ day: s.day, kind: 'warning', text: `🔧 Improvised repair of the ${name} failed. Try again tomorrow.` })
  }
  return s
}
