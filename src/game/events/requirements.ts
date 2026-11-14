/**
 * @file
 * @brief Checks whether the base currently meets a requirement (a working
 * building, spare kits, a minimum stock). Shared by option availability and by
 * `branch` effects, so both read the mission the same way.
 */
import type { Message, MissionState, OptionRequirement } from '../../types/game'
import { hasOperational } from '../buildings/buildings'
import { msg, ref } from '../messages'

/** Null when the requirement is met, otherwise the reason it is not. */
export function unmetRequirement(state: MissionState, req: OptionRequirement): Message | null {
  if (req.building && !hasOperational(state, req.building)) {
    const brought = state.buildings.some((b) => b.defId === req.building)
    return msg(brought ? 'sim.req.broken' : 'sim.req.notLaunched', { building: ref.building(req.building) })
  }
  if (req.spareParts && state.spareParts < req.spareParts) return msg('sim.req.noSpares')
  if (req.minStock && state.stocks[req.minStock.stock] < req.minStock.amount) {
    return msg('sim.req.minStock', {
      amount: req.minStock.amount,
      stock: ref.stock(req.minStock.stock),
      have: Math.floor(state.stocks[req.minStock.stock]),
    })
  }
  return null
}

export function meetsRequirement(state: MissionState, req: OptionRequirement): boolean {
  return unmetRequirement(state, req) === null
}
