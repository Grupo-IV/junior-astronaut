/**
 * @brief Evaluates whether the mission has reached a terminal state.
 * @file
 * @brief Evaluates mission failure and success conditions.
 */
import type { FailureCause, GameContent, MissionState } from '../../types/game'

/**
 * Checks failure conditions at the end of a day. `raw` holds the supply
 * balances before clamping at zero, so a negative value means the crew ran
 * out during the day. Mutates the counters of the draft state.
 */
export function checkFailure(
  content: GameContent,
  state: MissionState,
  raw: { oxygen: number; water: number; food: number },
  habitatUnpowered: boolean,
): FailureCause | null {
  const env = content.environment

  state.counters.powerCrisisDays = habitatUnpowered ? state.counters.powerCrisisDays + 1 : 0
  state.counters.foodEmptyDays = raw.food < 0 ? state.counters.foodEmptyDays + 1 : 0

  if (raw.oxygen < 0) return 'oxygen'
  if (raw.water < 0) return 'water'
  if (state.counters.powerCrisisDays >= env.powerCrisisGraceDays) return 'power'
  if (state.crewDoseMsv >= env.doseLimitMsv) return 'radiation'
  if (state.counters.foodEmptyDays >= env.foodGraceDays) return 'food'
  return null
}
