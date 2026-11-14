import { describe, expect, it } from 'vitest'
import outpost from '../hud/OutpostScreen.tsx?raw'
import tutorialSource from './OutpostTutorial.tsx?raw'
import stepsSource from './tutorialSteps.ts?raw'
import { LOCALES } from '../../i18n/locale'
import { translate } from '../../i18n/translate'
import { placeCard, TOUR_PHASES, TOUR_STEPS, type Rect } from './tutorialSteps'

const ctx = { crew: 4, days: 14 }

describe('tutorial steps', () => {
  it('points every step at a real element of the outpost screen', () => {
    for (const step of TOUR_STEPS) expect(outpost).toContain(`data-tour="${step.target}"`)
  })

  it('teaches the PLAN → OPERATE → DECIDE loop in order', () => {
    const phases = TOUR_STEPS.map((s) => s.phase).filter((p) => p !== null)
    expect([...new Set(phases)]).toEqual(TOUR_PHASES)
  })

  it('stays short in every language', () => {
    expect(TOUR_STEPS.length).toBeLessThanOrEqual(8)
    for (const { id } of LOCALES) {
      for (const step of TOUR_STEPS) expect(translate(id, `tour.${step.id}.body`, ctx).length).toBeLessThan(240)
    }
  })

  it('fills in the mission numbers', () => {
    expect(translate('en', 'tour.welcome.body', ctx)).toContain('4 astronauts alive for 14 days')
    expect(translate('pt', 'tour.welcome.body', ctx)).toContain('4 astronautas vivos durante 14 dias')
  })

  it('ends by showing how to reopen it', () => {
    expect(TOUR_STEPS.at(-1)!.target).toBe('help')
  })
})

describe('tutorial does not touch the simulation', () => {
  it('never reads or changes app state', () => {
    for (const src of [tutorialSource, stepsSource]) {
      expect(src).not.toMatch(/useApp\(|dispatch\(|app\/state|from '\.\.\/\.\.\/game'/)
    }
  })
})

describe('placeCard', () => {
  const viewport = { width: 1280, height: 800 }
  const card = { width: 352, height: 240 }
  const inside = (p: { top: number; left: number }) =>
    p.top >= 0 && p.left >= 0 && p.top + card.height <= viewport.height && p.left + card.width <= viewport.width
  const overlaps = (p: { top: number; left: number }, t: Rect) =>
    p.left < t.left + t.width && p.left + card.width > t.left && p.top < t.top + t.height && p.top + card.height > t.top

  it('puts the card below a target near the top', () => {
    const header = { top: 12, left: 12, width: 1256, height: 64 }
    const p = placeCard(header, card, viewport)
    expect(p.side).toBe('below')
    expect(inside(p) && !overlaps(p, header)).toBe(true)
  })

  it('puts the card above a target near the bottom', () => {
    const log = { top: 640, left: 300, width: 680, height: 150 }
    const p = placeCard(log, card, viewport)
    expect(p.side).toBe('above')
    expect(inside(p) && !overlaps(p, log)).toBe(true)
  })

  it('uses the side for a tall panel', () => {
    const panel = { top: 90, left: 12, width: 300, height: 680 }
    const p = placeCard(panel, card, viewport)
    expect(p.side).toBe('right')
    expect(inside(p) && !overlaps(p, panel)).toBe(true)
  })

  it('centres the card when the target fills the screen or is missing', () => {
    expect(placeCard({ top: 0, left: 0, ...viewport }, card, viewport).side).toBe('center')
    expect(placeCard(null, card, viewport).side).toBe('center')
  })

  it('stays on screen on a phone', () => {
    const phone = { width: 375, height: 667 }
    const small = { width: 343, height: 260 }
    const p = placeCard({ top: 300, left: 10, width: 355, height: 200 }, small, phone)
    expect(p.left).toBeGreaterThanOrEqual(16)
    expect(p.left + small.width).toBeLessThanOrEqual(phone.width - 16)
    expect(p.top + small.height).toBeLessThanOrEqual(phone.height)
  })
})
