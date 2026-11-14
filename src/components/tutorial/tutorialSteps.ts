/**
 * @file
 * @brief Content, placement and persistence for the first-use outpost tutorial.
 *
 * Each step points at a real element of the outpost screen through its
 * `data-tour` attribute. The tutorial never touches mission state.
 */

export type TourPhase = 'PLAN' | 'OPERATE' | 'DECIDE'

export const TOUR_PHASES: TourPhase[] = ['PLAN', 'OPERATE', 'DECIDE']

export type TourTarget = 'mission-clock' | 'resources' | 'systems' | 'viewport' | 'time-controls' | 'mission-log' | 'help'

export interface TourContext {
  crew: number
  days: number
}

export interface TourStep {
  target: TourTarget
  phase: TourPhase | null
  title: string
  body: string | ((ctx: TourContext) => string)
}

export const TOUR_STEPS: TourStep[] = [
  {
    target: 'mission-clock',
    phase: null,
    title: 'Welcome to your outpost',
    body: ({ crew, days }) =>
      `Keep ${crew} astronauts alive for ${days} days. Every day follows the same loop: PLAN your systems, OPERATE the base, DECIDE when something goes wrong.`,
  },
  {
    target: 'resources',
    phase: 'PLAN',
    title: 'Watch your resources',
    body: 'Water, oxygen, food and power. Each shows how many days are left at today’s rate. LOW and CRITICAL tags tell you where to act first.',
  },
  {
    target: 'systems',
    phase: 'PLAN',
    title: 'Run your structures',
    body: 'Select a structure to switch it off to save power, or to repair it with a spare kit. When power runs short, the base switches off the least important systems first.',
  },
  {
    target: 'viewport',
    phase: 'PLAN',
    title: 'Your base on the Moon',
    body: 'The same structures, in 3D. Click one to select it. Lights, shadows and storm particles show what the panels tell you.',
  },
  {
    target: 'time-controls',
    phase: 'OPERATE',
    title: 'Advance the days',
    body: 'Next day runs one Earth day. Play runs days on their own, and the speed button makes them go faster. Check tomorrow’s sunlight above before a long shadow.',
  },
  {
    target: 'mission-log',
    phase: 'DECIDE',
    title: 'Events and decisions',
    body: 'Storms, leaks and failures stop the clock and ask for a decision. Every option has a cost. The log records what happened and why.',
  },
  {
    target: 'help',
    phase: null,
    title: 'Ready, Commander',
    body: 'You can open this introduction again here at any time. Good luck!',
  },
]

export function stepBody(step: TourStep, ctx: TourContext): string {
  return typeof step.body === 'function' ? step.body(ctx) : step.body
}

// ------------------------------------------------------------------ placement

export interface Rect {
  top: number
  left: number
  width: number
  height: number
}

export interface Size {
  width: number
  height: number
}

export type Side = 'below' | 'above' | 'right' | 'left' | 'center'

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

/**
 * Puts the tutorial card next to its target without covering it, preferring
 * below, then above, then the sides. If nothing fits (the target fills the
 * screen, or there is no target) the card is centred. Always inside the viewport.
 */
export function placeCard(target: Rect | null, card: Size, viewport: Size, gap = 14, margin = 16): { top: number; left: number; side: Side } {
  const maxLeft = Math.max(margin, viewport.width - margin - card.width)
  const maxTop = Math.max(margin, viewport.height - margin - card.height)
  const centred = { top: clamp((viewport.height - card.height) / 2, margin, maxTop), left: clamp((viewport.width - card.width) / 2, margin, maxLeft), side: 'center' as const }
  if (!target) return centred

  const bottom = target.top + target.height
  const right = target.left + target.width
  const hCentre = clamp(target.left + target.width / 2 - card.width / 2, margin, maxLeft)
  const vCentre = clamp(target.top + target.height / 2 - card.height / 2, margin, maxTop)

  if (bottom + gap + card.height <= viewport.height - margin) return { top: bottom + gap, left: hCentre, side: 'below' }
  if (target.top - gap - card.height >= margin) return { top: target.top - gap - card.height, left: hCentre, side: 'above' }
  if (right + gap + card.width <= viewport.width - margin) return { top: vCentre, left: right + gap, side: 'right' }
  if (target.left - gap - card.width >= margin) return { top: vCentre, left: target.left - gap - card.width, side: 'left' }
  return centred
}

// ------------------------------------------------------------------ persistence

const SEEN_KEY = 'junior-astronaut:outpost-tutorial-seen'

export function hasSeenTutorial(): boolean {
  try {
    return globalThis.localStorage?.getItem(SEEN_KEY) === '1'
  } catch {
    // Storage blocked: show the tutorial, it can always be skipped.
    return false
  }
}

export function markTutorialSeen() {
  try {
    globalThis.localStorage?.setItem(SEEN_KEY, '1')
  } catch {
    // Nothing to do: the tutorial will simply show again next time.
  }
}
