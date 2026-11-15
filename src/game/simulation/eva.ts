/**
 * @file
 * @brief Spacewalks (EVA) to collect samples: the mission's science objective.
 *
 * A spacewalk uses the rules the game already has for going outside: the
 * extra EVA dose from the environment data, and a day with the greenhouse
 * half tended (the crew is busy outside), as in the dusty-arrays decision. It
 * is not allowed during a solar storm or without habitat power, and the crew
 * goes out at most once a day.
 */
import type { GameContent, Message, MissionState } from '../../types/game'
import { getMission } from '../content'
import { msg, ref, round } from '../messages'

export interface EvaCheck {
  possible: boolean
  reason?: Message
  samples: number
  goal: number
}

export function evaStatus(content: GameContent, state: MissionState): EvaCheck {
  const goal = getMission(content, state.missionId).scienceGoal ?? 0
  const samples = state.science?.samples ?? 0
  const no = (reason: Message): EvaCheck => ({ possible: false, reason, samples, goal })
  if (goal === 0) return no(msg('sim.eva.none'))
  if (samples >= goal) return no(msg('sim.eva.done'))
  if (state.status !== 'running') return no(msg('sim.eva.busy'))
  if (state.modifiers.some((m) => m.kind === 'storm_dose' && m.remainingDays > 0)) return no(msg('sim.eva.storm'))
  if (state.lastReport?.habitatUnpowered) return no(msg('sim.eva.noPower'))
  if (state.science.lastEvaDay === state.day) return no(msg('sim.eva.today'))
  return { possible: true, samples, goal }
}

/** @brief Two astronauts go outside and bring back a sample. */
export function goOnEva(content: GameContent, state: MissionState): MissionState {
  const check = evaStatus(content, state)
  if (!check.possible) return state
  const s = structuredClone(state)
  const dose = content.environment.evaDoseMsv
  s.crewDoseMsv += dose
  s.stats.doseEva += dose
  s.modifiers.push({
    id: `m${s.nextUid++}`,
    kind: 'building_output',
    target: 'greenhouse',
    value: 0.5,
    remainingDays: 1,
    label: msg('sim.eva.greenhouse', { percent: 50 }),
    source: 'eva',
  })
  const samples = content.science.samples
  const sample = samples[s.science.samples % samples.length]
  s.science.samples += 1
  s.science.lastEvaDay = s.day
  s.log.push({
    day: s.day,
    kind: 'success',
    msg: msg('sim.eva.sample', { sample: ref.content(`science.samples.${sample.id}.name`), count: s.science.samples, goal: check.goal, dose: round(dose, 1) }),
  })
  return s
}
