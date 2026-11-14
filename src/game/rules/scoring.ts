/**
 * @file
 * @brief Calculates the mission rating from survival and resource performance.
 */
import type { GameContent, Message, MissionState } from '../../types/game'
import { msg, round } from '../messages'
import { getMission } from '../content'
import { crewNeeds, SUPPLY_STOCKS } from '../resources/loadout'

export type BadgeId = 'complete' | 'radiation' | 'margins'

export interface Badge {
  id: BadgeId
  earned: boolean
  detail: Message
}

export interface MissionScore {
  success: boolean
  stars: number
  badges: Badge[]
  worstReserveDays: number
}

export const SAFE_DOSE_MSV = 100
export const HEALTHY_RESERVE_DAYS = 2

export function scoreMission(content: GameContent, state: MissionState): MissionScore {
  const mission = getMission(content, state.missionId)
  const needs = crewNeeds(content, mission)
  const success = state.status === 'success'

  const worstReserveDays = state.history.slice(1).reduce((worst, snap) => {
    const days = Math.min(...SUPPLY_STOCKS.map((s) => snap[s] / needs[s]))
    return Math.min(worst, days)
  }, Infinity)
  const reserve = Number.isFinite(worstReserveDays) ? worstReserveDays : 0

  const badges: Badge[] = [
    {
      id: 'complete',
      earned: success,
      detail: success
        ? msg('badge.complete.success', { days: mission.durationDays })
        : msg('badge.complete.failure', { day: state.failure?.day ?? state.day }),
    },
    {
      id: 'radiation',
      earned: success && state.crewDoseMsv < SAFE_DOSE_MSV,
      detail: msg('badge.radiation.detail', { dose: round(state.crewDoseMsv), goal: SAFE_DOSE_MSV }),
    },
    {
      id: 'margins',
      earned: success && reserve >= HEALTHY_RESERVE_DAYS && state.stats.daysWithShedding === 0,
      detail: msg('badge.margins.detail', { reserve: round(reserve, 1), count: state.stats.daysWithShedding, goal: HEALTHY_RESERVE_DAYS }),
    },
  ]
  return { success, stars: badges.filter((b) => b.earned).length, badges, worstReserveDays: reserve }
}
