/**
 * @file
 * @brief Walking in lunar gravity: the "lope" seen in the Apollo footage.
 *
 * The Moon pulls with 1.62 m/s², a sixth of Earth's gravity (NASA Moon fact
 * sheet). Two consequences drive how people move:
 * - each step is a small ballistic hop: lifted at v, a body flies for 2v/g and
 *   rises v²/2g, so steps are long and floaty;
 * - feet grip with friction μ·m·g, so with g six times smaller a person can
 *   only speed up, slow down or turn about six times more gently. Starting,
 *   stopping and cornering take room.
 *
 * The friction coefficient and the take-off speeds are game estimates; the
 * gravity is a measured value.
 */

/** Surface gravity of the Moon, m/s². */
export const MOON_GRAVITY = 1.62

export interface GaitOptions {
  /** Top walking speed, m/s. */
  maxSpeed: number
  /** Boot-on-ground friction coefficient (game estimate). */
  friction: number
  /** Take-off vertical speed per m/s of walking speed (how bouncy the gait is). */
  bounce: number
  /** Limits of the take-off vertical speed, m/s. */
  minLift: number
  maxLift: number
  /** Time each foot spends on the ground between hops, s. */
  contact: number
}

export const OUTDOOR_LOPE: GaitOptions = { maxSpeed: 1.4, friction: 0.6, bounce: 0.5, minLift: 0.25, maxLift: 0.8, contact: 0.12 }
/** Indoors the crew moves carefully: short, low steps. */
export const INDOOR_WALK: GaitOptions = { maxSpeed: 1.3, friction: 0.6, bounce: 0.18, minLift: 0.12, maxLift: 0.3, contact: 0.18 }

/** Highest point of a hop that leaves the ground at `lift` m/s. */
export function hopApex(lift: number, g = MOON_GRAVITY): number {
  return (lift * lift) / (2 * g)
}

/** Time in the air of a hop that leaves the ground at `lift` m/s. */
export function hopFlightTime(lift: number, g = MOON_GRAVITY): number {
  return (2 * lift) / g
}

/** The largest change of velocity the ground allows, m/s². */
export function maxTraction(options: GaitOptions, g = MOON_GRAVITY): number {
  return options.friction * g
}

export interface GaitFrame {
  /** Horizontal velocity after this frame, m/s. */
  vx: number
  vz: number
  /** Height of the body above the ground, m. */
  height: number
  /** Leg swing, −1..1, in step with the hops. */
  swing: number
  /** A foot came down this frame (for dust and footsteps). */
  landed: boolean
  airborne: boolean
}

/**
 * The gait of one person. Give it the velocity they want; it returns the
 * velocity the ground lets them reach and where they are in their hop.
 */
export class LunarGait {
  vx = 0
  vz = 0
  private lift = 0
  private y = 0
  private vy = 0
  private onGround = true
  private groundTime = 0
  private airTime = 0
  private stride = 0

  constructor(
    readonly options: GaitOptions,
    readonly gravity = MOON_GRAVITY,
  ) {}

  get speed() {
    return Math.hypot(this.vx, this.vz)
  }

  step(dt: number, wantX: number, wantZ: number): GaitFrame {
    const o = this.options
    // Wanted speed, capped.
    const want = Math.hypot(wantX, wantZ)
    const scale = want > o.maxSpeed ? o.maxSpeed / want : 1
    const tx = wantX * scale
    const tz = wantZ * scale
    // Friction only acts while a foot is on the ground: in mid-hop nobody can steer or brake.
    let landed = false
    if (this.onGround) {
      const dx = tx - this.vx
      const dz = tz - this.vz
      const dv = Math.hypot(dx, dz)
      const maxDv = maxTraction(o, this.gravity) * dt * 2.2 // both feet push while in contact
      const k = dv > maxDv ? maxDv / dv : 1
      this.vx += dx * k
      this.vz += dz * k
      this.groundTime += dt
      // Push off for the next hop once the foot has been down long enough.
      const speed = this.speed
      if (speed > 0.15 && this.groundTime >= o.contact) {
        this.lift = Math.min(o.maxLift, Math.max(o.minLift, o.bounce * speed))
        this.vy = this.lift
        this.onGround = false
        this.groundTime = 0
        this.airTime = 0
      }
    } else {
      // Ballistic: no air on the Moon, only gravity.
      this.vy -= this.gravity * dt
      this.y += this.vy * dt
      this.airTime += dt
      if (this.y <= 0) {
        this.y = 0
        this.vy = 0
        this.onGround = true
        landed = true
        this.stride += 1
      }
    }
    if (this.onGround) this.y = 0
    // Leg swing: the legs scissor through each hop, alternating every stride.
    const flight = hopFlightTime(this.lift || o.minLift, this.gravity)
    const progress = this.onGround ? 0 : Math.min(1, this.airTime / flight)
    const side = this.stride % 2 === 0 ? 1 : -1
    const swing = side * Math.sin(Math.PI * progress) * Math.min(1, this.speed / o.maxSpeed)
    return { vx: this.vx, vz: this.vz, height: this.y, swing, landed, airborne: !this.onGround }
  }
}
