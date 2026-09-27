/**
 * @file
 * @brief Exercises mission balance with deterministic scripted playthroughs.
 */
import { describe, expect, it } from 'vitest'
import type { Loadout, MissionState } from '../../types/game'
import {
  advanceDay,
  checkLoadout,
  createMissionState,
  gameContent as content,
  getMission,
  optionAvailability,
  repairBuilding,
  resolveDecision,
  toLoadout,
} from '../index'

type Policy = ((s: MissionState) => string) & { repairs?: boolean }

/** @brief Selects the first available option in the configured preference order. */
function prefer(order: Record<string, string[]>): Policy {
  return (s) => {
    const def = content.events[s.pendingEvent!.eventId]
    const prefs = order[def.id] ?? []
    const options = [...prefs.map((id) => def.options.find((o) => o.id === id)!), ...def.options].filter(Boolean)
    return options.find((o) => optionAvailability(content, s, o).available)!.id
  }
}

const careful: Policy = prefer({
  solar_storm: ['shelter', 'water_wall', 'safe_mode'],
  power_failure: ['eva_clean'],
  water_leak: ['spare_fix', 'isolate'],
  equipment_failure: ['spare', 'improvise'],
  crop_failure: ['treat'],
})
careful.repairs = true
const reckless = prefer({
  solar_storm: ['continue'],
  power_failure: ['ignore'],
  water_leak: ['monitor'],
  equipment_failure: ['later'],
  crop_failure: ['shutdown'],
})

function play(missionId: string, loadout: Loadout, seed: number, policy: Policy): MissionState {
  let s = createMissionState(content, missionId, loadout, seed)
  for (let guard = 0; guard < 200 && (s.status === 'running' || s.status === 'awaiting-decision'); guard++) {
    if (s.status === 'awaiting-decision') {
      s = resolveDecision(content, s, policy(s))
      continue
    }
    if (policy.repairs) for (const b of s.buildings) if (b.status === 'failed') s = repairBuilding(content, s, b.uid)
    s = advanceDay(content, s)
  }
  return s
}

function stats(missionId: string, loadout: Loadout, policy: Policy, runs = 300) {
  const causes: Record<string, number> = {}
  let wins = 0
  let dose = 0
  for (let seed = 1; seed <= runs; seed++) {
    const s = play(missionId, loadout, seed, policy)
    if (s.status === 'success') wins++
    else causes[s.failure!.cause] = (causes[s.failure!.cause] ?? 0) + 1
    dose += s.crewDoseMsv
  }
  return { winRate: wins / runs, causes, meanDose: dose / runs }
}

const report = (label: string, r: ReturnType<typeof stats>) =>
  console.log(`${label.padEnd(44)} win ${(r.winRate * 100).toFixed(0).padStart(3)}%  dose ${r.meanDose.toFixed(0).padStart(4)} mSv  failures ${JSON.stringify(r.causes)}`)

describe('balance: First Light at Shackleton (Cadet)', () => {
  const id = 'shackleton-first-light'
  const recommended = toLoadout(getMission(content, id).recommendedLoadout)

  it('recommended loadout fits the lander', () => {
    expect(checkLoadout(content, getMission(content, id), recommended).valid).toBe(true)
  })

  it('careful play with the recommended loadout nearly always wins', () => {
    const r = stats(id, recommended, careful)
    report('cadet / recommended / careful', r)
    expect(r.winRate).toBeGreaterThan(0.9)
  })

  it('reckless play still often survives but takes a big dose', () => {
    const r = stats(id, recommended, reckless)
    report('cadet / recommended / reckless', r)
    expect(r.meanDose).toBeGreaterThan(100)
  })

  it('skipping batteries fails in the terrain shadow', () => {
    const r = stats(id, toLoadout({ ...recommended, battery: 0 }), careful)
    report('cadet / no batteries / careful', r)
    expect(r.winRate).toBeLessThan(0.2)
  })
})

describe('balance: Artemis Base Camp (Commander)', () => {
  const id = 'artemis-base-camp'
  const mission = getMission(content, id)
  const recommended = toLoadout(mission.recommendedLoadout)

  it('recommended loadout fits the lander', () => {
    expect(checkLoadout(content, mission, recommended).valid).toBe(true)
  })

  it('careful play with the recommended loadout usually wins', () => {
    const r = stats(id, recommended, careful)
    report('commander / recommended / careful', r)
    expect(r.winRate).toBeGreaterThan(0.75)
  })

  it('reckless play loses to the severe storm', () => {
    const r = stats(id, recommended, reckless)
    report('commander / recommended / reckless', r)
    expect(r.winRate).toBeLessThan(0.1)
  })

  it('an open-loop loadout (storage only) cannot last 28 days', () => {
    const openLoop = toLoadout({ solar_array: 2, battery: 3, radiation_shelter: 1, water_crate: 2, oxygen_tank: 3, food_crate: 4, spare_parts: 1 })
    expect(checkLoadout(content, mission, openLoop).valid).toBe(true)
    const r = stats(id, openLoop, careful)
    report('commander / open loop / careful', r)
    expect(r.winRate).toBeLessThan(0.05)
  })

  it('no shelter but a water wall is a risky yet viable strategy', () => {
    const noShelter = toLoadout({ ...recommended, radiation_shelter: 0, water_crate: 2, battery: 4 })
    const r = stats(id, noShelter, careful)
    report('commander / no shelter (water wall) / careful', r)
    expect(r.winRate).toBeGreaterThan(0.2)
  })
})
