/**
 * @file
 * @brief What needs the player's attention right now, most urgent first.
 *
 * Alerts replace always-on indicators: when everything is fine, nothing is
 * shown. Each alert says what is wrong in a few words and, when there is one,
 * what to do (e.g. go to the shelter during a storm).
 */
import { gameContent, getMission, illuminationPeriod, shelterProtection, shelterStatus, stateBatteryCapacity, SUPPLY_STOCKS, type SupplyStock } from '../../game'
import { leakState } from '../../immersive/staging'
import type { BuildingId, MissionState } from '../../types/game'
import { stormDoseRate } from '../../audio/cues'
import type { IconName } from '../ui/Icon'
import type { Level } from '../ui/ui'
import { supplyStatus } from '../resources/stockMeta'

export type AlertId = 'power' | 'leak' | 'storm' | 'sheltered' | 'low' | 'shed' | 'broken' | 'dose' | 'shadow'

export interface MissionAlert {
  id: AlertId
  level: Exclude<Level, 'good' | 'neutral'> | 'good'
  icon: IconName
  /** UI message key and its arguments. */
  key: string
  args?: Record<string, string | number>
  /** Extra ids for the text: which supply, which structure. */
  stock?: SupplyStock
  building?: BuildingId
  /** An action that fixes it, if the player can take it from here. */
  action?: 'takeShelter'
}

const ORDER: Record<MissionAlert['level'], number> = { critical: 0, warn: 1, good: 2 }

export function missionAlerts(state: MissionState): MissionAlert[] {
  if (state.status === 'success' || state.status === 'failure') return []
  const out: MissionAlert[] = []
  const env = gameContent.environment
  const report = state.lastReport

  if (report?.habitatUnpowered) out.push({ id: 'power', level: 'critical', icon: 'bolt', key: 'alert.power' })
  if (leakState(state) !== 'none') out.push({ id: 'leak', level: leakState(state) === 'active' ? 'critical' : 'warn', icon: 'airLeak', key: 'alert.leak' })

  const storm = state.modifiers.some((m) => m.kind === 'storm_dose' && m.remainingDays > 0)
  if (storm) {
    const shelter = shelterStatus(gameContent, state)
    const rate = stormDoseRate(state)
    if (shelter.inside) out.push({ id: 'sheltered', level: 'good', icon: 'shield', key: 'alert.sheltered', args: { rate: rate.toFixed(1), percent: Math.round(shelterProtection(gameContent) * 100) } })
    else out.push({ id: 'storm', level: 'critical', icon: 'radiation', key: 'alert.storm', args: { rate: rate.toFixed(0) }, action: shelter.canEnter ? 'takeShelter' : undefined })
  }

  for (const stock of SUPPLY_STOCKS) {
    const s = supplyStatus(state, stock)
    if (s.level !== 'good' && Number.isFinite(s.daysLeft)) {
      out.push({ id: 'low', level: s.level === 'critical' ? 'critical' : 'warn', icon: stock === 'oxygen' ? 'oxygen' : stock === 'water' ? 'water' : 'food', key: 'alert.low', args: { count: Math.max(0, Math.floor(s.daysLeft)) }, stock })
    }
  }

  if (!report?.habitatUnpowered && (report?.shed.length ?? 0) > 0) out.push({ id: 'shed', level: 'warn', icon: 'battery', key: 'alert.shed' })
  const broken = state.buildings.find((b) => b.status === 'failed')
  if (broken) out.push({ id: 'broken', level: 'warn', icon: 'wrench', key: 'alert.broken', building: broken.defId })
  if (state.crewDoseMsv >= env.doseWarningMsv) out.push({ id: 'dose', level: 'critical', icon: 'radiation', key: 'alert.dose', args: { dose: Math.round(state.crewDoseMsv), limit: env.doseLimitMsv } })

  // A shadow coming tomorrow, while the batteries are not full: plan ahead.
  const mission = getMission(gameContent, state.missionId)
  const today = illuminationPeriod(mission, Math.max(1, state.day))
  const tomorrow = illuminationPeriod(mission, Math.min(mission.durationDays, state.day + 1))
  const battery = state.stocks.energy / Math.max(1, stateBatteryCapacity(gameContent, state))
  if (tomorrow.factor < 0.5 && tomorrow.factor < today.factor && battery < 0.95) {
    out.push({ id: 'shadow', level: 'warn', icon: 'sun', key: 'alert.shadow', args: { percent: Math.round(tomorrow.factor * 100) } })
  }

  return out.sort((a, b) => ORDER[a.level] - ORDER[b.level])
}
