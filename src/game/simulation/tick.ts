/**
 * @file
 * @brief Advances the mission by one Earth day.
 */
import type {
  BuildingId,
  BuildingInstance,
  DayReport,
  GameContent,
  MissionState,
  ModifierKind,
} from '../../types/game'
import { getMission } from '../content'
import { isGreenhouseProductive, stateBatteryCapacity, wantsToRun } from '../buildings/buildings'
import { rollEvents } from '../events/events'
import { illuminationFor, illuminationPeriod } from '../missions/illumination'
import { crewNeeds, SUPPLY_STOCKS } from '../resources/loadout'
import { checkFailure } from '../rules/failure'

export interface TickOptions {
  events?: boolean
}

function product(state: MissionState, kind: ModifierKind, target?: BuildingId): number {
  return state.modifiers
    .filter((m) => m.kind === kind && m.remainingDays > 0 && (target === undefined || m.target === target))
    .reduce((acc, m) => acc * m.value, 1)
}

function sum(state: MissionState, kind: ModifierKind): number {
  return state.modifiers
    .filter((m) => m.kind === kind && m.remainingDays > 0)
    .reduce((acc, m) => acc + m.value, 0)
}

export function advanceDay(content: GameContent, state: MissionState, options: TickOptions = {}): MissionState {
  if (state.status !== 'running') return state
  const s = structuredClone(state)
  const mission = getMission(content, s.missionId)
  const env = content.environment
  const defs = content.buildings
  s.day += 1
  const day = s.day
  const log = (kind: MissionState['log'][number]['kind'], text: string) => s.log.push({ day, kind, text })

  const period = illuminationPeriod(mission, day)
  if (period.fromDay === day && day > 1) log('science', `☀️ ${period.label} — solar input at ${Math.round(period.factor * 100)}%.`)

  const illumination = illuminationFor(mission, day)
  const solarFactor = product(s, 'solar_output')
  const running = s.buildings.filter((b) => wantsToRun(s, b))
  const generation = running
    .filter((b) => b.defId === 'solar_array')
    .reduce((acc, b) => acc + (defs[b.defId].powerOutputKwhPerDay ?? 0) * illumination * solarFactor, 0)

  const criticalDemand = env.habitat.powerDemandKwhPerDay + sum(s, 'extra_power')
  const consumers = running
    .filter((b) => defs[b.defId].powerDemandKwhPerDay > 0)
    .sort((a, b) => defs[b.defId].shedPriority - defs[a.defId].shedPriority)
  const available = s.stocks.energy + generation
  const shed: BuildingInstance[] = []
  let consumerDemand = consumers.reduce((acc, b) => acc + defs[b.defId].powerDemandKwhPerDay, 0)
  const totalDemand = criticalDemand + consumerDemand
  while (consumers.length > 0 && criticalDemand + consumerDemand > available) {
    const dropped = consumers.pop()!
    consumerDemand -= defs[dropped.defId].powerDemandKwhPerDay
    shed.push(dropped)
  }
  const habitatUnpowered = criticalDemand > available
  const served = habitatUnpowered ? available : criticalDemand + consumerDemand
  const capacity = stateBatteryCapacity(content, s)
  const energyAfter = available - served
  s.stats.energyWastedKwh += Math.max(0, energyAfter - capacity)
  s.stocks.energy = Math.max(0, Math.min(capacity, energyAfter))

  const poweredSet = new Set(running.filter((b) => !shed.includes(b)).map((b) => b.uid))
  for (const b of s.buildings) b.powered = habitatUnpowered ? false : poweredSet.has(b.uid)
  const isOn = (b: BuildingInstance) => b.powered && b.status === 'ok'

  if (shed.length > 0) {
    s.stats.daysWithShedding += 1
    log('warning', `⚡ Not enough power — automatically switched off: ${shed.map((b) => defs[b.defId].name).join(', ')}.`)
  }
  if (habitatUnpowered) log('danger', '⚡ POWER EMERGENCY: batteries empty, habitat life support is failing!')

  const needs = crewNeeds(content, mission)
  const flows: DayReport['flows'] = {
    oxygen: { produced: 0, consumed: needs.oxygen },
    water: { produced: 0, consumed: needs.water },
    food: { produced: 0, consumed: needs.food },
  }

  for (const b of s.buildings.filter(isOn)) {
    const def = defs[b.defId]
    const output = product(s, 'building_output', b.defId)
    if (b.defId === 'water_recycler') {
      const recovered = needs.water * (def.waterRecoveryRate ?? 0) * output
      flows.water.produced += recovered
      s.stats.recycledWater += recovered
    }
    if (b.defId === 'greenhouse') {
      if (isGreenhouseProductive(content, b) && output > 0) {
        const food = (def.foodOutputKgPerDay ?? 0) * output
        const oxygen = (def.oxygenBonusKgPerDay ?? 0) * output
        flows.food.produced += food
        flows.oxygen.produced += oxygen
        flows.water.consumed += def.waterUseKgPerDay ?? 0
        s.stats.producedFood += food
        s.stats.producedOxygen += oxygen
      }
      const wasProductive = isGreenhouseProductive(content, b)
      b.growth += 1
      if (!wasProductive && isGreenhouseProductive(content, b)) log('success', '🌱 The greenhouse is ready — first harvest tomorrow!')
    }
  }

  for (const b of s.buildings.filter((x) => isOn(x) && x.defId === 'oxygen_generator')) {
    const def = defs[b.defId]
    const waterPerKg = def.waterPerKgOxygen ?? 1
    const oxygenNow = s.stocks.oxygen + flows.oxygen.produced - flows.oxygen.consumed
    const setpoint = Math.min(mission.storageCapacity.oxygen, needs.oxygen * (def.oxygenSetpointDays ?? Infinity))
    const room = setpoint - oxygenNow
    const waterNow = s.stocks.water + flows.water.produced - flows.water.consumed
    const made = Math.max(
      0,
      Math.min((def.oxygenOutputKgPerDay ?? 0) * product(s, 'building_output', b.defId), room, waterNow / waterPerKg),
    )
    flows.oxygen.produced += made
    flows.water.consumed += made * waterPerKg
    s.stats.producedOxygen += made
  }

  const raw: Record<(typeof SUPPLY_STOCKS)[number], number> = { oxygen: 0, water: 0, food: 0 }
  for (const stock of SUPPLY_STOCKS) {
    raw[stock] = s.stocks[stock] + flows[stock].produced - flows[stock].consumed
    s.stocks[stock] = Math.max(0, Math.min(mission.storageCapacity[stock], raw[stock]))
  }

  const waterLoss = sum(s, 'water_loss')
  if (waterLoss > 0) {
    const lost = s.stocks.water * Math.min(1, waterLoss)
    s.stocks.water -= lost
    flows.water.consumed += lost
    log('warning', `💦 Leak: lost ${lost.toFixed(1)} kg of water today.`)
  }

  const background = env.gcrDoseMsvPerDay * env.habitatGcrFactor
  const storm = sum(s, 'storm_dose')
  const stormReceived = storm * product(s, 'dose_factor')
  const dose = background + stormReceived
  s.crewDoseMsv += dose
  s.stats.doseBackground += background
  s.stats.doseStorm += stormReceived
  s.stats.doseBlocked += storm - stormReceived
  if (storm > 0) {
    const blocked = storm - stormReceived
    log(
      blocked > 0 ? 'science' : 'danger',
      blocked > 0
        ? `☢️ Storm dose today: ${stormReceived.toFixed(1)} mSv. Shielding blocked ${blocked.toFixed(1)} mSv.`
        : `☢️ Storm dose today: ${stormReceived.toFixed(1)} mSv — the crew had no extra shielding.`,
    )
  }
  const previousDose = s.crewDoseMsv - dose
  if (previousDose < env.doseWarningMsv && s.crewDoseMsv >= env.doseWarningMsv) {
    log('danger', `☢️ Crew dose passed ${env.doseWarningMsv} mSv — getting close to the ${env.doseLimitMsv} mSv limit!`)
  }

  s.lastReport = {
    day,
    illumination: illumination * solarFactor,
    generationKwh: generation,
    demandKwh: totalDemand,
    servedKwh: served,
    shed: shed.map((b) => b.defId),
    habitatUnpowered,
    flows,
    doseMsv: dose,
    unshieldedDoseMsv: background + storm,
  }
  s.history.push({
    day,
    water: s.stocks.water,
    oxygen: s.stocks.oxygen,
    food: s.stocks.food,
    energy: s.stocks.energy,
    dose: s.crewDoseMsv,
    generationKwh: generation,
    demandKwh: totalDemand,
    illumination: illumination * solarFactor,
  })

  for (const m of s.modifiers) m.remainingDays -= 1
  s.modifiers = s.modifiers.filter((m) => m.remainingDays > 0)

  const failure = checkFailure(content, s, raw, habitatUnpowered)
  if (failure) {
    s.status = 'failure'
    s.failure = { cause: failure, day }
    log('danger', `❌ MISSION FAILED: ${content.science.lessons[failure].title}.`)
    return s
  }

  for (const stock of SUPPLY_STOCKS) {
    const net = flows[stock].consumed - flows[stock].produced
    if (net > 0 && s.stocks[stock] / net < 3 && s.stocks[stock] > 0) {
      log('warning', `⚠️ Only about ${Math.max(1, Math.floor(s.stocks[stock] / net))} day(s) of ${stock} left at this rate.`)
    }
  }

  if (day >= mission.durationDays) {
    s.status = 'success'
    log('success', '🏁 Mission complete! The crew return vehicle is on its way.')
    return s
  }

  if (options.events !== false) rollEvents(content, s)
  return s
}
