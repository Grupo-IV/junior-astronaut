/**
 * @file
 * @brief An articulated astronaut in a surface suit who walks between structures.
 *
 * Lunar gravity is one sixth of Earth's, so the walk is a slow, bouncy lope
 * with long airborne phases, as in the Apollo footage.
 *
 * The crewmate walks round the hardware, never through it: routes come from a
 * navigation grid over the outpost's floor plan, every step goes through the
 * collision world, and going inside means walking to a real door (the habitat
 * airlock, or the shelter hatch during a storm) before disappearing.
 */
import * as THREE from 'three'
import type { CollisionWorld, NavGrid, Point } from '../physics/collision'
import { LunarGait, maxTraction, OUTDOOR_LOPE } from '../physics/locomotion'

const BODY_R = 0.35

/** What a spacewalk is doing, for the progress shown to the player. */
export interface EvaProgress {
  /** 0 suit up and out, 1 walk out, 2 collect, 3 walk back, 4 back inside. */
  step: number
  progress: number
  /** Distance to walk to the sample site, m. */
  distance: number
}

const COLLECT_SECONDS = 3

function part(geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(geometry, material)
  m.position.set(x, y, z)
  m.castShadow = true
  return m
}

export class Astronaut {
  readonly group = new THREE.Group()
  private body = new THREE.Group()
  private legs: THREE.Group[] = []
  private arms: THREE.Group[] = []
  private targets: THREE.Vector3[] = [new THREE.Vector3(0, 0, 6.2)]
  private wait = 2
  private phase = 0
  private indoors = false
  private hidden = false
  private heightAt: (x: number, z: number) => number

  constructor(heightAt: (x: number, z: number) => number = () => 0) {
    this.heightAt = heightAt
    const suit = new THREE.MeshStandardMaterial({ color: 0xf2f1ec, roughness: 0.8 })
    const joints = new THREE.MeshStandardMaterial({ color: 0xc9c7c0, roughness: 0.9 })
    const stripe = new THREE.MeshStandardMaterial({ color: 0x2d6cdf, roughness: 0.6 })
    const visor = new THREE.MeshStandardMaterial({ color: 0xe0a83a, roughness: 0.08, metalness: 1, envMapIntensity: 1.5 })
    const dark = new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.7 })
    const pack = new THREE.MeshStandardMaterial({ color: 0xdedcd5, roughness: 0.7 })

    // Torso and life-support backpack (PLSS).
    this.body.add(part(new THREE.CapsuleGeometry(0.3, 0.42, 6, 14), suit, 0, 1.12, 0))
    this.body.add(part(new THREE.TorusGeometry(0.29, 0.05, 6, 20), stripe, 0, 1.05, 0).rotateX(Math.PI / 2))
    this.body.add(part(new THREE.BoxGeometry(0.5, 0.62, 0.26), pack, 0, 1.2, -0.3))
    this.body.add(part(new THREE.BoxGeometry(0.42, 0.14, 0.2), dark, 0, 1.55, -0.3))
    this.body.add(part(new THREE.BoxGeometry(0.3, 0.16, 0.1), dark, 0, 1.1, 0.29)) // chest controls
    // Helmet with a gold sun visor.
    this.body.add(part(new THREE.CylinderGeometry(0.17, 0.2, 0.08, 16), joints, 0, 1.52, 0))
    this.body.add(part(new THREE.SphereGeometry(0.25, 20, 20), suit, 0, 1.74, 0))
    const face = part(new THREE.SphereGeometry(0.235, 20, 20, -Math.PI * 0.42, Math.PI * 0.84, Math.PI * 0.28, Math.PI * 0.42), visor, 0, 1.74, 0.025)
    this.body.add(face)
    this.body.add(part(new THREE.BoxGeometry(0.1, 0.06, 0.06), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2d0, emissiveIntensity: 2 }), 0.17, 1.88, 0.12))

    for (const side of [-1, 1]) {
      const arm = new THREE.Group()
      arm.position.set(side * 0.38, 1.38, 0)
      arm.add(part(new THREE.SphereGeometry(0.11, 10, 10), suit))
      arm.add(part(new THREE.CapsuleGeometry(0.09, 0.28, 4, 10), suit, 0, -0.22, 0))
      arm.add(part(new THREE.TorusGeometry(0.09, 0.03, 6, 12), stripe, 0, -0.1, 0).rotateX(Math.PI / 2))
      arm.add(part(new THREE.CapsuleGeometry(0.085, 0.22, 4, 10), suit, 0, -0.52, 0.02))
      arm.add(part(new THREE.SphereGeometry(0.085, 10, 10), dark, 0, -0.7, 0.03))
      this.arms.push(arm)
      this.body.add(arm)

      const leg = new THREE.Group()
      leg.position.set(side * 0.15, 0.78, 0)
      leg.add(part(new THREE.CapsuleGeometry(0.12, 0.28, 4, 10), suit, 0, -0.18, 0))
      leg.add(part(new THREE.TorusGeometry(0.12, 0.03, 6, 12), stripe, 0, -0.3, 0).rotateX(Math.PI / 2))
      leg.add(part(new THREE.CapsuleGeometry(0.11, 0.22, 4, 10), suit, 0, -0.5, 0))
      leg.add(part(new THREE.BoxGeometry(0.2, 0.12, 0.32), joints, 0, -0.72, 0.05))
      this.legs.push(leg)
      this.body.add(leg)
    }
    this.group.add(this.body)
    this.group.position.set(0, heightAt(0, 6.2), 6.2)
  }

  private world: CollisionWorld | null = null
  private grid: NavGrid | null = null
  private path: Point[] = []
  private refuge: Point | null = null
  private lastDoor: Point = { x: 0, z: 6 }
  private mode: 'wander' | 'toRefuge' | 'inside' | 'eva' = 'wander'
  private stuck = 0
  private gait = new LunarGait(OUTDOOR_LOPE)
  private heading = 0
  private eva: {
    phase: 'out' | 'collect' | 'back'
    site: Point
    door: Point
    outLength: number
    walked: number
    collectTime: number
    onProgress: (p: EvaProgress) => void
    onCollected: (site: Point) => void
    onDone: (completed: boolean) => void
  } | null = null
  /** A boot came down: for the regolith dust. */
  onLanding: (x: number, z: number, vx: number, vz: number) => void = () => {}

  /** Floor plan and route finder of the outpost (rebuilt when structures change). */
  setNavigation(world: CollisionWorld, grid: NavGrid) {
    this.world = world
    this.grid = grid
    const p = this.group.position
    const free = world.resolve(p.x, p.z, BODY_R)
    p.x = free.x
    p.z = free.z
    this.path = []
  }

  setTargets(points: THREE.Vector3[]) {
    this.targets = [new THREE.Vector3(0, 0, 6.2), ...points]
  }

  /**
   * Somewhere to go inside (a door), or null to come out and work. The
   * crewmate walks to the door and then goes in.
   */
  setRefuge(door: Point | null) {
    const same = (a: Point | null, b: Point | null) => (a && b ? a.x === b.x && a.z === b.z : a === b)
    if (same(door, this.refuge)) return
    this.refuge = door
    if (door && this.eva) this.endEva(false)
    if (door) {
      this.mode = this.mode === 'inside' ? 'inside' : 'toRefuge'
      if (this.mode === 'toRefuge') this.plan(door)
    } else if (this.mode !== 'wander') {
      if (this.mode === 'inside') {
        // Come back out through the door we went in by.
        this.group.position.set(this.lastDoor.x, this.heightAt(this.lastDoor.x, this.lastDoor.z), this.lastDoor.z)
      }
      this.mode = 'wander'
      this.path = []
      this.wait = 1
    }
    this.applyVisibility()
  }

  /** Kept for callers that only know "indoors or not": goes to the habitat door. */
  setIndoors(indoors: boolean) {
    this.setRefuge(indoors ? { x: 0, z: 6.0 } : null)
  }

  /** Out of the way while the camera flies in through the airlock. */
  setHidden(hidden: boolean) {
    this.hidden = hidden
    this.applyVisibility()
  }

  private applyVisibility() {
    this.indoors = this.mode === 'inside'
    this.group.visible = !this.indoors && !this.hidden
  }

  /**
   * Two crewmates go out of the airlock at `door`, walk to `site`, collect a
   * sample and walk back. Progress is reported from the real walk.
   */
  startEva(door: Point, site: Point, handlers: { onProgress: (p: EvaProgress) => void; onCollected: (site: Point) => void; onDone: (completed: boolean) => void }) {
    if (this.eva) this.endEva(false)
    this.mode = 'eva'
    this.hidden = false
    this.group.position.set(door.x, this.heightAt(door.x, door.z), door.z)
    this.gait = new LunarGait(OUTDOOR_LOPE)
    this.plan(site)
    const length = this.pathLength()
    this.eva = { phase: 'out', site, door, outLength: Math.max(1, length), walked: 0, collectTime: 0, ...handlers }
    this.applyVisibility()
    handlers.onProgress({ step: 1, progress: 0.05, distance: Math.round(length) })
  }

  private pathLength() {
    let from = { x: this.group.position.x, z: this.group.position.z }
    let total = 0
    for (const p of this.path) {
      total += Math.hypot(p.x - from.x, p.z - from.z)
      from = p
    }
    return total
  }

  private endEva(completed: boolean) {
    const eva = this.eva
    this.eva = null
    if (this.mode === 'eva') this.mode = 'wander'
    this.path = []
    this.wait = 1.5
    eva?.onDone(completed)
  }

  private plan(to: Point) {
    const from = { x: this.group.position.x, z: this.group.position.z }
    this.path = this.grid ? this.grid.path(from, to) : [to]
    this.stuck = 0
  }

  update(dt: number) {
    if (this.mode === 'inside') return
    const pos = this.group.position
    if (this.eva?.phase === 'collect') {
      this.updateCollect(dt)
      return
    }
    const next = this.path[0]
    if (!next) {
      if (this.eva) {
        this.arriveEva()
        return
      }
      if (this.mode === 'toRefuge' && this.refuge) {
        // At the door: go in.
        this.lastDoor = { ...this.refuge }
        this.mode = 'inside'
        this.applyVisibility()
        return
      }
      this.move(dt, 0, 0)
      if (this.gait.speed < 0.05) this.idle(dt)
      if (this.wait <= 0) {
        const t = this.targets[Math.floor(Math.random() * this.targets.length)]
        this.plan({ x: t.x, z: t.z })
        this.wait = 2 + Math.random() * 4
      }
      return
    }
    const dx = next.x - pos.x
    const dz = next.z - pos.z
    const dist = Math.hypot(dx, dz)
    const last = this.path.length === 1
    // Corners are taken without stopping; the final point is approached with room to brake.
    if (dist < (last ? 0.12 : 0.6)) {
      this.path.shift()
      return
    }
    const remaining = last ? dist : dist + 1
    // Braking distance on the Moon: v² = 2·a·d, with a set by the boots' grip.
    const brake = Math.sqrt(2 * maxTraction(OUTDOOR_LOPE) * 0.9 * remaining)
    const speed = Math.min(OUTDOOR_LOPE.maxSpeed, brake)
    const before = { x: pos.x, z: pos.z }
    this.move(dt, (dx / dist) * speed, (dz / dist) * speed)
    const moved = Math.hypot(pos.x - before.x, pos.z - before.z)
    if (this.eva) this.trackEva(moved)
    // Pushed back by something (a structure that appeared): find another way.
    if (moved < this.gait.speed * dt * 0.3 && this.gait.speed > 0.2) {
      this.stuck += dt
      if (this.stuck > 0.8) this.plan(this.path[this.path.length - 1])
    } else this.stuck = 0
  }

  /** One frame of lunar gait towards (wantX, wantZ) m/s, through the collision world. */
  private move(dt: number, wantX: number, wantZ: number) {
    const pos = this.group.position
    const f = this.gait.step(dt, wantX, wantZ)
    if (Math.hypot(f.vx, f.vz) > 0.001) {
      const to = this.world ? this.world.move(pos.x, pos.z, f.vx * dt, f.vz * dt, BODY_R) : { x: pos.x + f.vx * dt, z: pos.z + f.vz * dt }
      pos.x = to.x
      pos.z = to.z
    }
    pos.y = this.heightAt(pos.x, pos.z) + f.height
    if (f.landed) this.onLanding(pos.x, pos.z, f.vx, f.vz)
    // Turn towards where the body is going, as fast as the grip allows (no instant pivots).
    const speed = Math.hypot(f.vx, f.vz)
    if (speed > 0.1) {
      const target = Math.atan2(f.vx, f.vz)
      let d = target - this.heading
      while (d > Math.PI) d -= Math.PI * 2
      while (d < -Math.PI) d += Math.PI * 2
      const maxTurn = Math.max(2.5, maxTraction(OUTDOOR_LOPE) / Math.max(0.3, speed) * 2) * dt
      this.heading += Math.max(-maxTurn, Math.min(maxTurn, d))
      this.group.rotation.y = this.heading
    }
    const k = Math.min(1, speed / OUTDOOR_LOPE.maxSpeed)
    this.legs[0].rotation.x = f.swing * 0.6
    this.legs[1].rotation.x = -f.swing * 0.6
    this.arms[0].rotation.x = -f.swing * 0.45
    this.arms[1].rotation.x = f.swing * 0.45
    // Lean into the lope, more at speed; the body tucks slightly in the air.
    this.body.rotation.x = 0.04 + 0.12 * k + (f.airborne ? 0.03 : 0)
  }

  private trackEva(moved: number) {
    const eva = this.eva!
    eva.walked += moved
    const share = Math.min(1, eva.walked / eva.outLength)
    if (eva.phase === 'out') eva.onProgress({ step: 1, progress: 0.05 + 0.4 * share, distance: Math.round(eva.outLength) })
    else eva.onProgress({ step: 3, progress: 0.6 + 0.35 * share, distance: Math.round(eva.outLength) })
  }

  private arriveEva() {
    const eva = this.eva!
    if (eva.phase === 'out') {
      eva.phase = 'collect'
      eva.collectTime = 0
      eva.onProgress({ step: 2, progress: 0.45, distance: Math.round(eva.outLength) })
      return
    }
    eva.onProgress({ step: 4, progress: 1, distance: Math.round(eva.outLength) })
    this.endEva(true)
  }

  /** Kneel, scoop, bag: a few seconds at the site. */
  private updateCollect(dt: number) {
    const eva = this.eva!
    eva.collectTime += dt
    const p = Math.min(1, eva.collectTime / COLLECT_SECONDS)
    this.gait.step(dt, 0, 0)
    const pos = this.group.position
    pos.y = this.heightAt(pos.x, pos.z) - Math.sin(p * Math.PI) * 0.35
    this.body.rotation.x = Math.sin(p * Math.PI) * 0.6
    this.arms.forEach((a) => (a.rotation.x = -Math.sin(p * Math.PI) * 1.1))
    this.legs.forEach((l) => (l.rotation.x = Math.sin(p * Math.PI) * 0.5))
    eva.onProgress({ step: 2, progress: 0.45 + 0.15 * p, distance: Math.round(eva.outLength) })
    if (p >= 1) {
      eva.onCollected(eva.site)
      eva.phase = 'back'
      eva.walked = 0
      this.plan(eva.door)
      eva.outLength = Math.max(1, this.pathLength())
      this.body.rotation.x = 0
    }
  }

  private idle(dt: number) {
    const pos = this.group.position
    this.wait -= dt
    pos.y = this.heightAt(pos.x, pos.z)
    // Idle: arms relax, slight breathing sway.
    this.phase += dt
    this.legs.forEach((l) => (l.rotation.x *= 0.85))
    this.arms.forEach((a, i) => (a.rotation.x = Math.sin(this.phase * 1.5 + i) * 0.05))
    this.body.position.y = Math.sin(this.phase * 2) * 0.01
    this.body.rotation.x *= 0.9
  }
}
