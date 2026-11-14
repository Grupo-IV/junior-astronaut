/**
 * @file
 * @brief Pure rules that turn mission state changes into sound cues.
 *
 * Sound only reinforces what the interface already shows: every cue here has
 * a visual twin (event dialog, storm badge, EMERGENCY tag, mission log), so
 * the game stays fully playable with audio muted.
 *
 * Realism notes:
 * - There is no air on the Moon, so nothing outside is audible. Every sound is
 *   what the crew would hear *inside* the habitat: the caution & warning
 *   system, the radiation dosimeter and the life-support fans.
 * - Alarm classes follow the idea of the ISS Caution & Warning hierarchy:
 *   a "warning" is a threat to the crew that needs action now; a "caution"
 *   is a system problem that needs attention soon.
 */
import type { GameContent, MissionState } from '../types/game'

export type Cue = 'caution' | 'warning' | 'storm' | 'emergency' | 'success' | 'failure'

/** Higher wins when several things happen on the same day: one sound per tick keeps audio discreet. */
const PRIORITY: Record<Cue, number> = { failure: 6, success: 5, emergency: 4, warning: 3, storm: 2, caution: 1 }

/**
 * Events that threaten the crew directly. Everything else is a caution.
 * A cabin leak is an *emergency*, the ISS class above warning (with fire and
 * toxic air): the crew drops everything.
 */
const EVENT_CUE: Record<string, Cue> = { solar_storm: 'storm', oxygen_leak: 'emergency' }

function isNewMission(prev: MissionState, next: MissionState) {
  return prev.missionId !== next.missionId || prev.seed !== next.seed || next.day < prev.day
}

/**
 * Returns the single sound to play for the change `prev → next`, or null.
 * Never fires on the first render of a mission (no previous state).
 */
export function missionCue(content: GameContent, prev: MissionState | null, next: MissionState): Cue | null {
  if (!prev || prev === next || isNewMission(prev, next)) return null
  const cues: Cue[] = []

  if (next.status !== prev.status) {
    if (next.status === 'failure') cues.push('failure')
    if (next.status === 'success') cues.push('success')
  }

  const pending = next.pendingEvent
  const prevPending = prev.pendingEvent
  if (pending && (!prevPending || prevPending.eventId !== pending.eventId || prevPending.day !== pending.day)) {
    cues.push(EVENT_CUE[pending.eventId] ?? 'caution')
  }

  if (next.day > prev.day) {
    if (next.lastReport?.habitatUnpowered) cues.push('warning')
    const warn = content.environment.doseWarningMsv
    if (prev.crewDoseMsv < warn && next.crewDoseMsv >= warn) cues.push('warning')
  }

  return cues.reduce<Cue | null>((best, c) => (best === null || PRIORITY[c] > PRIORITY[best] ? c : best), null)
}

/** Storm dose in mSv/day that actually reaches the crew right now (after shielding). */
export function stormDoseRate(state: MissionState): number {
  const active = state.modifiers.filter((m) => m.remainingDays > 0)
  const storm = active.filter((m) => m.kind === 'storm_dose').reduce((acc, m) => acc + m.value, 0)
  if (storm <= 0) return 0
  const factor = active.filter((m) => m.kind === 'dose_factor').reduce((acc, m) => acc * m.value, 1)
  return storm * factor
}

/** Dose rate that maps to the fastest click rate (a severe NOAA S4 storm with no shielding). */
const FULL_SCALE_MSV_PER_DAY = 110
const MAX_CLICKS_PER_SECOND = 14
const MIN_CLICKS_PER_SECOND = 0.6

/**
 * Average dosimeter clicks per second. Like a real Geiger counter the rate is
 * proportional to the dose rate, so shielding is *audible*: moving the crew
 * into the shelter drops a severe storm from a crackle to a few slow ticks.
 * Background cosmic rays are left silent to keep the soundscape discreet.
 */
export function radiationClickRate(state: MissionState): number {
  if (state.status === 'success' || state.status === 'failure') return 0
  const rate = stormDoseRate(state)
  if (rate <= 0) return 0
  return Math.min(MAX_CLICKS_PER_SECOND, Math.max(MIN_CLICKS_PER_SECOND, (rate / FULL_SCALE_MSV_PER_DAY) * MAX_CLICKS_PER_SECOND))
}

/**
 * Hiss of air escaping through a breach, 0..1. It is inside the pressurised
 * cabin, so it is real sound: loud while the breach is open to the cabin,
 * faint while a sealed or patched leak still seeps, silent when fixed.
 */
export function airLeakLevel(state: MissionState): number {
  if (state.status === 'success' || state.status === 'failure') return 0
  const pending = state.pendingEvent?.eventId
  if (pending === 'oxygen_leak' || pending === 'oxygen_leak_located') return 1
  return state.modifiers.some((m) => m.kind === 'oxygen_loss' && m.remainingDays > 0) ? 0.3 : 0
}

/**
 * Loudness of the habitat's life-support fans, 0..1. On the ISS the fans are
 * the background noise of daily life; when the power dies they stop, and the
 * sudden quiet is itself the scariest sound on board.
 */
export function habitatHumLevel(state: MissionState): number {
  if (state.status === 'failure') return 0
  if (state.lastReport?.habitatUnpowered) return 0
  if ((state.lastReport?.shed.length ?? 0) > 0) return 0.55
  return 1
}
