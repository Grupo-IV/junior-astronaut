// Mission rating: success is binary, stars reward *how well* the crew was kept safe.
import type { GameContent, MissionState } from '../../types/game'
import { getMission } from '../content'
import { crewNeeds, SUPPLY_STOCKS } from '../resources/loadout'

export interface Badge {
  label: string
  earned: boolean
  detail: string
}

export interface MissionScore {
  success: boolean
  stars: number
  badges: Badge[]
  /** Lowest number of days of supply held at the end of any day. */
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
      label: 'Mission complete',
      earned: success,
      detail: success ? `All ${mission.durationDays} days survived.` : `Mission ended on day ${state.failure?.day ?? state.day}.`,
    },
    {
      label: 'Radiation safe',
      earned: success && state.crewDoseMsv < SAFE_DOSE_MSV,
      detail: `Crew dose ${state.crewDoseMsv.toFixed(0)} mSv (goal: under ${SAFE_DOSE_MSV}).`,
    },
    {
      label: 'Healthy margins',
      earned: success && reserve >= HEALTHY_RESERVE_DAYS && state.stats.daysWithShedding === 0,
      detail: `Lowest reserve: ${reserve.toFixed(1)} days of supply; ${state.stats.daysWithShedding} day(s) with power cuts (goal: ≥ ${HEALTHY_RESERVE_DAYS} days, no cuts).`,
    },
  ]
  return { success, stars: badges.filter((b) => b.earned).length, badges, worstReserveDays: reserve }
}
