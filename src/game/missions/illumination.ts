import type { IlluminationPeriod, MissionDef } from '../../types/game'

export function illuminationPeriod(mission: MissionDef, day: number): IlluminationPeriod {
  return (
    mission.illumination.find((p) => day >= p.fromDay && day <= p.toDay) ??
    mission.illumination[mission.illumination.length - 1]
  )
}

/** Fraction (0–1) of full solar output available on a given mission day. */
export function illuminationFor(mission: MissionDef, day: number): number {
  return illuminationPeriod(mission, day).factor
}
