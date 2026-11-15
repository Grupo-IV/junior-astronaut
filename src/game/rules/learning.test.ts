/**
 * The learning loop and the science objective: every number shown in the
 * report comes from the mission, a replay with the same seed is exactly
 * repeatable, and spacewalks follow the game's existing rules.
 */
import { describe, expect, it } from 'vitest'
import { appReducer, initialAppState, type AppState } from '../../app/state/appState'
import type { GameContent, MissionState } from '../../types/game'
import {
  advanceDay,
  compareRuns,
  createMissionState,
  decisionTimeline,
  evaStatus,
  gameContent,
  goOnEva,
  optionAvailability,
  resolveDecision,
  summarizeRun,
  toLoadout,
} from '../index'

const CADET = 'shackleton-first-light'
const LOADOUT = toLoadout(gameContent.missions[0].recommendedLoadout)

/** Plays a whole mission, choosing with `pick` at every event. */
function play(seed: number, pick: (s: MissionState, ids: string[]) => string, loadout = LOADOUT, content: GameContent = gameContent): MissionState {
  let s = createMissionState(content, CADET, loadout, seed)
  for (let i = 0; i < 200 && (s.status === 'running' || s.status === 'awaiting-decision'); i++) {
    if (s.status === 'awaiting-decision') {
      const ids = content.events[s.pendingEvent!.eventId].options.filter((o) => optionAvailability(content, s, o).available).map((o) => o.id)
      s = resolveDecision(content, s, pick(s, ids))
    } else s = advanceDay(content, s)
  }
  return s
}

describe('spacewalks for samples', () => {
  const start = () => advanceDay(gameContent, createMissionState(gameContent, CADET, LOADOUT, 1), { events: false })

  it('adds the EVA dose from the environment data, half a day of greenhouse care, and one sample', () => {
    const s = start()
    const after = goOnEva(gameContent, s)
    expect(after.crewDoseMsv - s.crewDoseMsv).toBeCloseTo(gameContent.environment.evaDoseMsv)
    expect(after.stats.doseEva).toBeCloseTo(gameContent.environment.evaDoseMsv)
    expect(after.science.samples).toBe(1)
    expect(after.modifiers.at(-1)).toMatchObject({ kind: 'building_output', target: 'greenhouse', value: 0.5, remainingDays: 1 })
    expect(after.log.at(-1)!.msg.key).toBe('sim.eva.sample')
  })

  it('only once a day, never during a storm, and not beyond the goal', () => {
    const once = goOnEva(gameContent, start())
    expect(evaStatus(gameContent, once)).toMatchObject({ possible: false, reason: { key: 'sim.eva.today' } })
    const storm = structuredClone(start())
    storm.modifiers.push({ id: 'x', kind: 'storm_dose', value: 60, remainingDays: 2, label: { key: 'x' }, source: 'solar_storm' })
    expect(evaStatus(gameContent, storm)).toMatchObject({ possible: false, reason: { key: 'sim.eva.storm' } })
    let s = start()
    const goal = gameContent.missions[0].scienceGoal!
    for (let i = 0; i < goal + 2; i++) {
      s = advanceDay(gameContent, goOnEva(gameContent, s), { events: false })
    }
    expect(s.science.samples).toBe(goal)
    expect(evaStatus(gameContent, s).reason?.key).toBe('sim.eva.done')
  })
})

describe('what each decision did', () => {
  it('records the immediate change and how long its effects last', () => {
    const content: GameContent = { ...gameContent, missions: gameContent.missions.map((m) => ({ ...m, scheduledEvents: [{ day: 2, eventId: 'oxygen_leak' }] })) }
    const s = advanceDay(content, createMissionState(content, CADET, toLoadout({ ...gameContent.missions[0].recommendedLoadout, spare_parts: 1 }), 1))
    const after = resolveDecision(content, s, 'isolate')
    const record = after.decisions.at(-1)!
    expect(record.effect!.oxygen).toBeCloseTo(-s.stocks.oxygen * 0.15, 1)
    expect(record.window).toBe(3)
  })

  it('a storm decision reports the dose received while it lasted, read from the mission history', () => {
    const s = play(3, (state, ids) => (state.pendingEvent!.eventId === 'solar_storm' ? 'continue' : ids[0]))
    const story = decisionTimeline(gameContent, s).find((d) => d.record.eventId === 'solar_storm')!
    const before = s.history.find((h) => h.day === story.from - 1)!
    const end = s.history.find((h) => h.day === story.to)!
    expect(story.dose).toBeCloseTo(end.dose - before.dose)
    expect(story.dose!).toBeGreaterThan(50)
    expect(story.alternatives).toEqual(['shelter', 'water_wall', 'safe_mode'])
  })
})

describe('replay with the same seed', () => {
  const first = (_state: MissionState, ids: string[]) => ids[0]
  const last = (_state: MissionState, ids: string[]) => ids.at(-1)!

  it('same seed, cargo and decisions: exactly the same mission', () => {
    expect(play(11, first)).toEqual(play(11, first))
    const a = summarizeRun(gameContent, play(11, first))
    expect(compareRuns(a, a)).toEqual({ sameStart: true, cargo: [], decisions: [] })
  })

  it('a different choice shows up in the comparison, and so does a different cargo', () => {
    const a = summarizeRun(gameContent, play(11, first))
    const b = summarizeRun(gameContent, play(11, last, toLoadout({ ...gameContent.missions[0].recommendedLoadout, battery: 3 })))
    const diff = compareRuns(a, b)
    expect(diff.sameStart).toBe(true)
    expect(diff.decisions.length).toBeGreaterThan(0)
    expect(diff.cargo).toContainEqual({ item: 'battery', before: 2, now: 3 })
  })

  it('the app relaunches a replay with the same seed and rank, and keeps the previous try to compare', () => {
    const finished = play(5, first)
    let app: AppState = { ...initialAppState(), screen: 'result', mission: finished }
    app = appReducer(app, { type: 'replay' })
    expect(app.screen).toBe('setup')
    expect(app.replay).toMatchObject({ seed: finished.seed, rank: finished.rank })
    app = appReducer(app, { type: 'launch' })
    expect(app.mission!.seed).toBe(finished.seed)
    expect(app.compareWith?.seed).toBe(finished.seed)
    expect(app.replay).toBeNull()
  })
})

describe('science transparency', () => {
  it('every parameter says what kind of value it is, and every real-world value cites a source', () => {
    for (const p of gameContent.science.parameters) {
      expect(['physics', 'measured', 'engineering', 'game'], p.id).toContain(p.kind)
      if (p.kind !== 'game') expect(gameContent.science.sources[p.source!], p.id).toBeDefined()
    }
  })

  it('storm doses, the dose limit and the light calendars are flagged as game choices or estimates', () => {
    const kind = (id: string) => gameContent.science.parameters.find((p) => p.id === id)!.kind
    for (const id of ['stormStrong', 'stormSevere', 'doseLimit', 'shelter', 'illumination']) expect(kind(id), id).toBe('game')
    const stormLabels = Object.values(gameContent.events.solar_storm.variants!).map((v) => (v.onTrigger[0] as { label: string }).label)
    for (const label of stormLabels) expect(label).toMatch(/estimate/)
    expect(gameContent.science.lessons.radiation.what).not.toMatch(/NASA/)
  })
})
