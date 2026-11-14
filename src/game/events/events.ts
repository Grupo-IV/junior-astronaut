/**
 * @brief Resolves the selected decision and resumes the mission.
 * @file
 * @brief Triggers mission events and resolves player decisions.
 */
import type {
  Message,
  DecisionOption,
  EventDef,
  GameContent,
  MissionDef,
  MissionState,
} from '../../types/game'
import { getMission } from '../content'
import { hasOperational, isGreenhouseProductive } from '../buildings/buildings'
import { pick, random } from '../simulation/rng'
import { applyEffects } from './effects'
import { msg, ref } from '../messages'

export function eventDef(content: GameContent, id: string): EventDef {
  const def = content.events[id]
  if (!def) throw new Error(`Unknown event: ${id}`)
  return def
}

export function eventConditionsMet(content: GameContent, state: MissionState, def: EventDef): boolean {
  const c = def.conditions
  if (!c) return true
  if (c.building && !hasOperational(state, c.building)) return false
  if (c.anyBuilding && !c.anyBuilding.some((id) => hasOperational(state, id))) return false
  if (c.productiveGreenhouse) {
    const productive = state.buildings.some(
      (b) => b.status === 'ok' && b.enabled && isGreenhouseProductive(content, b),
    )
    if (!productive) return false
  }
  return true
}

export interface OptionAvailability {
  available: boolean
  reason?: Message
}

export function optionAvailability(
  _content: GameContent,
  state: MissionState,
  option: DecisionOption,
): OptionAvailability {
  const req = option.requires
  if (!req) return { available: true }
  if (req.building && !hasOperational(state, req.building)) {
    const brought = state.buildings.some((b) => b.defId === req.building)
    return { available: false, reason: msg(brought ? 'sim.req.broken' : 'sim.req.notLaunched', { building: ref.building(req.building) }) }
  }
  if (req.spareParts && state.spareParts < req.spareParts) {
    return { available: false, reason: msg('sim.req.noSpares') }
  }
  if (req.minStock && state.stocks[req.minStock.stock] < req.minStock.amount) {
    return {
      available: false,
      reason: msg('sim.req.minStock', {
        amount: req.minStock.amount,
        stock: ref.stock(req.minStock.stock),
        have: Math.floor(state.stocks[req.minStock.stock]),
      }),
    }
  }
  return { available: true }
}

function triggerEvent(content: GameContent, state: MissionState, eventId: string, day: number, variant?: string) {
  const def = eventDef(content, eventId)
  state.pendingEvent = { eventId, variant, day }
  state.status = 'awaiting-decision'
  state.counters.lastEventDay = day
  const ctx = { pending: state.pendingEvent, notes: [] as Message[] }
  applyEffects(content, state, def.onTrigger, ctx, `events.${eventId}.onTrigger`)
  const v = variant ? def.variants?.[variant] : undefined
  if (v) applyEffects(content, state, v.onTrigger, ctx, `events.${eventId}.variants.${variant}.onTrigger`)
  const title = ref.content(`events.${eventId}.title`)
  state.log.push({
    day: state.day,
    kind: 'danger',
    msg: v
      ? msg('sim.eventVariant', { icon: def.icon, title, variant: ref.content(`events.${eventId}.variants.${variant}.label`) })
      : msg('sim.event', { icon: def.icon, title }),
  })
  for (const note of ctx.notes) state.log.push({ day: state.day, kind: 'warning', msg: note })
}

function scheduledNear(mission: MissionDef, day: number, window: number): boolean {
  return mission.scheduledEvents.some((e) => Math.abs(e.day - day) < window)
}

/**
 * Called at the end of a day. Decides whether an event happens at the start of
 * the next day; if so the mission pauses for a decision.
 */
export function rollEvents(content: GameContent, state: MissionState) {
  const mission = getMission(content, state.missionId)
  const nextDay = state.day + 1

  for (const e of mission.scheduledEvents) {
    if (e.eventId === 'solar_storm' && e.day === nextDay + 1) {
      state.log.push({
        day: state.day,
        kind: 'science',
        msg: msg('sim.stormForecast', { day: e.day }),
      })
    }
  }

  const scheduled = mission.scheduledEvents.find((e) => e.day === nextDay)
  if (scheduled) {
    triggerEvent(content, state, scheduled.eventId, nextDay, scheduled.variant)
    return
  }

  const roll = random(state)
  if (
    nextDay < mission.firstRandomEventDay ||
    nextDay - state.counters.lastEventDay < mission.minDaysBetweenEvents ||
    scheduledNear(mission, nextDay, mission.minDaysBetweenEvents) ||
    roll >= mission.randomEventChancePerDay
  ) {
    return
  }
  const eligible = mission.randomEventPool.filter((id) => eventConditionsMet(content, state, eventDef(content, id)))
  const chosen = pick(state, eligible)
  if (chosen) triggerEvent(content, state, chosen, nextDay)
}

/** @brief Applies the chosen option and resumes the mission. */
export function resolveDecision(content: GameContent, state: MissionState, optionId: string): MissionState {
  if (state.status !== 'awaiting-decision' || !state.pendingEvent) return state
  const def = eventDef(content, state.pendingEvent.eventId)
  const option = def.options.find((o) => o.id === optionId)
  if (!option || !optionAvailability(content, state, option).available) return state

  const s = structuredClone(state)
  const pending = s.pendingEvent!
  const ctx = { pending, notes: [] as Message[] }
  applyEffects(content, s, option.effects, ctx, `events.${def.id}.options.${option.id}.effects`)

  s.decisions.push({
    day: pending.day,
    eventId: def.id,
    optionId: option.id,
    risks: option.risks,
    notes: ctx.notes,
  })
  s.log.push({ day: s.day, kind: 'info', msg: msg('sim.decision', { icon: option.icon, option: ref.content(`events.${def.id}.options.${option.id}.label`) }) })
  for (const note of ctx.notes) s.log.push({ day: s.day, kind: 'warning', msg: note })
  s.pendingEvent = null
  s.status = 'running'
  return s
}
