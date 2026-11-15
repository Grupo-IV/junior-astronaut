import { describe, expect, it } from 'vitest'
import { appReducer, initialAppState, type AppState } from '../app/state/appState'
import { advanceDay, createMissionState, gameContent, toLoadout } from './index'
import { contentForRank, RANK_IDS, RANKS, recommendedRank } from './ranks'

describe('ranks (difficulty modes)', () => {
  it('the mission specialist plays the missions exactly as designed', () => {
    expect(contentForRank(gameContent, 'specialist')).toBe(gameContent)
  })

  it('never changes the physics: environment, structures, cargo and events are shared', () => {
    for (const rank of RANK_IDS) {
      const ranked = contentForRank(gameContent, rank)
      expect(ranked.environment).toBe(gameContent.environment)
      expect(ranked.buildings).toBe(gameContent.buildings)
      expect(ranked.cargo).toBe(gameContent.cargo)
      expect(ranked.events).toBe(gameContent.events)
      ranked.missions.forEach((m, i) => {
        const base = gameContent.missions[i]
        expect(m.durationDays).toBe(base.durationDays)
        expect(m.crew).toBe(base.crew)
        expect(m.illumination).toBe(base.illumination)
        expect(m.scheduledEvents).toBe(base.scheduledEvents)
      })
    }
  })

  it('gets harder going up the ranks: less cargo, more surprises, less help', () => {
    for (const [i, m] of gameContent.missions.entries()) {
      const budgets = RANK_IDS.map((r) => contentForRank(gameContent, r).missions[i].launchMassBudgetKg)
      const chances = RANK_IDS.map((r) => contentForRank(gameContent, r).missions[i].randomEventChancePerDay)
      for (let k = 1; k < RANK_IDS.length; k++) {
        expect(budgets[k], m.id).toBeLessThanOrEqual(budgets[k - 1])
        expect(chances[k], m.id).toBeGreaterThanOrEqual(chances[k - 1])
      }
    }
    const help = { full: 2, summary: 1, none: 0 }
    const levels = RANK_IDS.map((r) => help[RANKS[r].forecast])
    expect([...levels].sort((a, b) => b - a)).toEqual(levels)
  })

  it('recommends the rank each mission was designed for', () => {
    expect(gameContent.missions.map(recommendedRank)).toEqual(['cadet', 'commander'])
  })

  it('a launched mission keeps its rank and is played with its rules', () => {
    let state: AppState = { ...initialAppState(), rank: 'commander', loadout: toLoadout(gameContent.missions[0].recommendedLoadout) }
    state = appReducer(state, { type: 'launch' })
    expect(state.mission!.rank).toBe('commander')
    // Changing the rank afterwards does not touch the running mission.
    state = appReducer(state, { type: 'setRank', rank: 'cadet' })
    expect(state.mission!.rank).toBe('commander')
    const next = appReducer(state, { type: 'advanceDay' })
    const expected = advanceDay(contentForRank(gameContent, 'commander'), state.mission!)
    expect({ ...next.mission!, rng: 0 }).toEqual({ ...expected, rng: 0 })
  })

  it('missions created without a rank are specialist missions', () => {
    expect(createMissionState(gameContent, gameContent.missions[0].id, toLoadout({}), 1).rank).toBe('specialist')
  })
})
