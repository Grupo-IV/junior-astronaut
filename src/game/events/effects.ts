/**
 * @file
 * @brief Applies declarative event effects to mission state.
 */
import type { BuildingInstance, Effect, GameContent, MissionState, PendingEvent } from '../../types/game'
import { getMission } from '../content'
import { pick, random } from '../simulation/rng'
import { stateBatteryCapacity } from '../buildings/buildings'

export interface EffectContext {
  pending: PendingEvent | null
  notes: string[]
}

const LIFE_SUPPORT = new Set(['oxygen_generator', 'water_recycler'])

function capacityOf(content: GameContent, state: MissionState, stock: keyof MissionState['stocks']): number {
  if (stock === 'energy') return stateBatteryCapacity(content, state)
  return getMission(content, state.missionId).storageCapacity[stock]
}

function clampStock(content: GameContent, state: MissionState, stock: keyof MissionState['stocks'], value: number) {
  state.stocks[stock] = Math.max(0, Math.min(capacityOf(content, state, stock), value))
}

function failBuilding(content: GameContent, b: BuildingInstance, ctx: EffectContext) {
  b.status = 'failed'
  b.powered = false
  if (ctx.pending) ctx.pending.targetUid = b.uid
  ctx.notes.push(`${content.buildings[b.defId].name} is now OFFLINE.`)
}

export function applyEffects(content: GameContent, state: MissionState, effects: Effect[], ctx: EffectContext) {
  for (const effect of effects) {
    switch (effect.type) {
      case 'addStock':
        clampStock(content, state, effect.stock, state.stocks[effect.stock] + effect.amount)
        break
      case 'scaleStock':
        clampStock(content, state, effect.stock, state.stocks[effect.stock] * effect.factor)
        break
      case 'addDose':
        state.crewDoseMsv += effect.msv
        state.stats.doseEva += effect.msv
        break
      case 'modifier':
        state.modifiers.push({
          id: `m${state.nextUid++}`,
          kind: effect.kind,
          value: effect.value,
          remainingDays: effect.days,
          target: effect.target,
          label: effect.label,
          source: ctx.pending?.eventId ?? 'player',
        })
        break
      case 'failBuilding': {
        let candidates: BuildingInstance[]
        if (effect.target === 'random-active') {
          candidates = state.buildings.filter(
            (b) => b.status === 'ok' && b.enabled && b.defId !== 'battery' && b.defId !== 'radiation_shelter',
          )
        } else if (effect.target === 'random-life-support') {
          candidates = state.buildings.filter((b) => b.status === 'ok' && LIFE_SUPPORT.has(b.defId))
        } else if (effect.target === 'event-target') {
          candidates = state.buildings.filter((b) => b.uid === ctx.pending?.targetUid)
        } else {
          candidates = state.buildings.filter((b) => b.status === 'ok' && b.defId === effect.target)
        }
        const target = pick(state, candidates)
        if (target) failBuilding(content, target, ctx)
        break
      }
      case 'repairBuilding': {
        const target =
          effect.target === 'event-target'
            ? state.buildings.find((b) => b.uid === ctx.pending?.targetUid)
            : state.buildings.find((b) => b.status === 'failed' && b.defId === effect.target)
        if (target && target.status === 'failed') {
          target.status = 'ok'
          ctx.notes.push(`${content.buildings[target.defId].name} is back ONLINE.`)
        }
        break
      }
      case 'disableBuilding':
        for (const b of state.buildings) if (b.defId === effect.target) b.enabled = false
        ctx.notes.push(`${content.buildings[effect.target].name} switched off.`)
        break
      case 'resetGrowth':
        for (const b of state.buildings) if (b.defId === 'greenhouse') b.growth = 0
        break
      case 'useSpare':
        state.spareParts = Math.max(0, state.spareParts - effect.amount)
        break
      case 'chance':
        if (random(state) < effect.probability) {
          ctx.notes.push(effect.note)
          applyEffects(content, state, effect.effects, ctx)
        } else {
          if (effect.otherwiseNote) ctx.notes.push(effect.otherwiseNote)
          if (effect.otherwise) applyEffects(content, state, effect.otherwise, ctx)
        }
        break
    }
  }
}
