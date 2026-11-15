/**
 * @file
 * @brief What the game is doing between two scenes, so the player can see it.
 *
 * Any part of the game (3D loading, the first-person camera, the day's
 * simulation, a spacewalk) reports a transition here: its steps, the step it
 * is on and how far it has got. The interface shows them; nothing here
 * changes the mission.
 */

/** Steps of preparing the 3D outpost: download, ground, sky, Earth, hardware, assembly. */
export const LOADING_STEPS = ['engine', 'regolith', 'sky', 'earth', 'materials', 'assemble']

/** Steps of simulating one day, in the order the engine does them. */
export const DAY_STEPS = ['power', 'lifeSupport', 'radiation', 'events']

export type TransitionKind = 'loading' | 'enter' | 'leave' | 'travel' | 'day' | 'eva'

export interface Transition {
  id: number
  kind: TransitionKind
  /** Step ids, translated by the interface as `transition.<kind>.<step>`. */
  steps: string[]
  /** Index of the step in progress (steps before it are done). */
  step: number
  /** 0..1 over the whole transition. */
  progress: number
  /** Values for the texts (a day number, a place, a distance…). */
  detail: Record<string, string | number>
  /** Results of finished steps, by step id (already formatted values). */
  results: Record<string, Record<string, string | number>>
  done: boolean
}

let nextId = 1
let active: Transition[] = []
const listeners = new Set<() => void>()

function emit() {
  active = [...active]
  listeners.forEach((l) => l())
}

export function startTransition(kind: TransitionKind, steps: string[], detail: Record<string, string | number> = {}): number {
  // One transition of each kind at a time: a new one replaces the old.
  active = active.filter((t) => t.kind !== kind)
  const t: Transition = { id: nextId++, kind, steps, step: 0, progress: 0, detail, results: {}, done: false }
  active.push(t)
  emit()
  return t.id
}

/** Reports progress. Updates smaller than 1% are not worth a redraw. */
export function updateTransition(id: number, progress: number, step?: number, results?: Transition['results']) {
  const i = active.findIndex((t) => t.id === id)
  if (i < 0) return
  const t = active[i]
  const p = Math.max(t.progress, Math.min(1, progress))
  const s = step === undefined ? t.step : Math.max(t.step, Math.min(t.steps.length - 1, step))
  if (p - t.progress < 0.01 && s === t.step && !results) return
  active[i] = { ...t, progress: p, step: s, results: results ? { ...t.results, ...results } : t.results }
  emit()
}

/** Marks a transition done; it stays visible for a moment, then goes away. */
export function finishTransition(id: number, linger = 700) {
  const i = active.findIndex((t) => t.id === id)
  if (i < 0) return
  active[i] = { ...active[i], progress: 1, step: active[i].steps.length - 1, done: true }
  emit()
  const remove = () => {
    if (!active.some((t) => t.id === id)) return
    active = active.filter((t) => t.id !== id)
    emit()
  }
  if (linger <= 0 || typeof setTimeout === 'undefined') remove()
  else setTimeout(remove, linger)
}

/** Drops a transition at once (the scene it belonged to went away). */
export function cancelTransition(id: number) {
  if (!active.some((t) => t.id === id)) return
  active = active.filter((t) => t.id !== id)
  emit()
}

export function activeTransitions(): Transition[] {
  return active
}

export function isBusy(kind: TransitionKind): boolean {
  return active.some((t) => t.kind === kind && !t.done)
}

export function subscribeTransitions(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
