/**
 * @file
 * @brief Shared vocabulary of the first-person experience.
 *
 * React (HUD, decisions) and Three.js (habitat interior, hands, camera) talk
 * through these types only, so the interface never imports the 3D engine and
 * the 3D engine never reads the mission rules.
 */

export type ViewMode = 'orbit' | 'firstPerson'

/** Work stations inside the habitat module, ordered along its length (−x to +x). */
export type HabitatStationId = 'lifeSupport' | 'agro' | 'command' | 'power' | 'storage'

/** Habitat stations, plus the radiation shelter (a separate building reached through the airlock). */
export type StationId = HabitatStationId | 'shelter'

export const STATION_ORDER: HabitatStationId[] = ['lifeSupport', 'agro', 'command', 'power', 'storage']

/** Things at a station that the camera or a hand can aim at. */
export type FocusPoint = 'console' | 'leak' | 'hatch' | 'window' | 'shelf' | 'kit' | 'plants' | 'airlock' | 'door'

/**
 * What the astronaut's hands do.
 * - press: index finger pushes a control
 * - point: index finger points at something to check it
 * - grab: hand reaches, closes and lifts an object (recolha)
 * - repair: one hand braces, the other works with a tool (optionally after taking a spare kit)
 * - seal: both hands turn a hatch wheel
 * - startle: both hands jerk up, then stay ready (emergency)
 * - wrist: the left wrist computer comes up and the right hand taps it
 * - beckon: a wave towards the airlock, then a press (calling the crew)
 * - relax: hands go back to rest
 */
export type HandAction = 'press' | 'point' | 'grab' | 'repair' | 'seal' | 'startle' | 'wrist' | 'beckon' | 'relax'

export interface HandRequest {
  action: HandAction
  /** Station whose `focus` point the hand aims at (defaults to the current station). */
  station?: StationId
  focus?: FocusPoint
  /** Repair: take a spare kit from the rack first. */
  withKit?: boolean
}

/** Timing of a hand animation, so the interface can apply the order when the hand "lands". */
export interface HandTiming {
  impactMs: number
  totalMs: number
}

export type AlertLevel = 'none' | 'caution' | 'storm' | 'emergency'

/** Imperative API of the 3D view used by the immersive interface. */
export interface ImmersiveView {
  setViewMode(mode: ViewMode): void
  goToStation(id: StationId): void
  /** Cinematic framing: lean in and look at a point. `null` releases the camera to the player. */
  focus(station: StationId, point: FocusPoint | null): void
  playHands(request: HandRequest): HandTiming
  /** A short camera jolt (alarms, impacts). 0..1 */
  shake(strength: number): void
  /**
   * Walking input from keys or the on-screen stick: forward and sideways,
   * each −1..1, relative to where the player looks. (0, 0) stops.
   */
  setMove(forward: number, strafe: number): void
  onStationChange(handler: (id: StationId) => void): void
  /** The player tapped a console in the 3D view. */
  onInteract(handler: (id: StationId) => void): void
}
