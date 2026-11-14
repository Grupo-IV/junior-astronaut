/**
 * @file
 * @brief First-person body and camera: entering the habitat, walking (with
 * collisions), going to a station, looking around, cinematic framing, going
 * through the airlock to the shelter, and the hand-off back to the orbit view.
 *
 * The player is a body (a vertical cylinder) on the floor plan of the place
 * they are in. Every move, walked with the keys or the on-screen stick or
 * done automatically to reach a station, goes through that place's collision
 * world, so walls, hatches and hardware stop the body and it slides along
 * them. The eyes lean in for close work but are kept on the free side of any
 * wall, so the camera never sees through a closed hatch.
 */
import * as THREE from 'three'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { FocusPoint, HabitatStationId, StationId } from '../../immersive/types'
import { STATION_ORDER } from '../../immersive/types'
import type { CollisionWorld } from '../physics/collision'
import type { AstronautHands } from './hands'
import { EYE_Y, FLOOR_Y, STATIONS, type HabitatInterior } from './interior'
import { SHELTER_EYE, type ShelterInterior } from './shelterInterior'

type Phase = 'orbit' | 'entering' | 'inside' | 'leaving'
type Location = 'habitat' | 'shelter'

const ORBIT_NEAR = 0.3
const FP_NEAR = 0.04
const LOOK_SPEED = 1.15
/** Body radius on the floor plan (shoulders of a person in a flight suit). */
const BODY_R = 0.28
/** Walking speed indoors, m/s. In 1/6 g people move carefully indoors. */
const WALK = 1.3
/** The eyes keep this far from any wall when leaning in. */
const EYE_R = 0.1

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)

function angleDelta(a: number, b: number) {
  let d = b - a
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return d
}

/** Yaw and pitch that look from `from` towards `to` (yaw 0 looks down −z). */
function aimAt(from: THREE.Vector3, to: THREE.Vector3): [number, number] {
  const d = to.clone().sub(from)
  return [Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z))]
}

/** Vertical field of view that keeps a wide horizontal view on landscape screens and enough height on phones. */
export function firstPersonFov(aspect: number): number {
  const horizontal = THREE.MathUtils.degToRad(95)
  const vertical = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(horizontal / 2) / Math.max(0.3, aspect)))
  return THREE.MathUtils.clamp(vertical, 58, 80)
}

export interface RigHooks {
  /** Show or hide the exterior parts that would intrude into the cabin. */
  setInteriorView: (inside: boolean) => void
  onStationChange: (id: StationId) => void
  onInteract: (id: StationId) => void
  /** World position of a point of interest at a station (habitat or shelter). */
  pointAt: (station: StationId, focus: FocusPoint | null | undefined) => THREE.Vector3
}

/** A place you can be in: its floor plan, eye height and what you can tap. */
interface Place {
  world: CollisionWorld
  frame: THREE.Object3D
  eyeY: number
  pickables: THREE.Object3D[]
  stationOf: (o: THREE.Object3D | null) => StationId | null
  setActive: (on: boolean) => void
}

export class FirstPersonRig {
  private phase: Phase = 'orbit'
  private location: Location = 'habitat'
  private station: StationId = 'command'
  private shelter: ShelterInterior | null = null
  /** Eye position at rest (world), on the floor plan of the current place. */
  private pos = new THREE.Vector3()
  private velocity = new THREE.Vector2()
  private input = new THREE.Vector2()
  private autoWalk: THREE.Vector3 | null = null
  private travel: { t: number; to: Location; then: StationId | null; switched: boolean } | null = null
  private yaw = 0
  private pitch = 0
  private aimYaw = 0
  private aimPitch = 0
  private lean = new THREE.Vector3()
  private leanTarget = new THREE.Vector3()
  private focusPoint: THREE.Vector3 | null = null
  private pendingFocus: { station: StationId; point: FocusPoint; distance: number } | null = null
  private shakeAmp = 0
  private bobPhase = 0
  private fade: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  private transition = { t: 0, switched: false, fromPos: new THREE.Vector3(), fromQuat: new THREE.Quaternion(), fromFov: 45 }
  private saved = { pos: new THREE.Vector3(), target: new THREE.Vector3(), fov: 45 }
  private drag: { id: number; x: number; y: number; startX: number; startY: number; time: number } | null = null
  private raycaster = new THREE.Raycaster()
  private reducedMotion = false
  private lastYaw = 0
  private lastPitch = 0

  constructor(
    private camera: THREE.PerspectiveCamera,
    private controls: OrbitControls,
    private element: HTMLElement,
    private interior: HabitatInterior,
    private hands: AstronautHands,
    private hooks: RigHooks,
  ) {
    this.fade = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthTest: false, depthWrite: false }),
    )
    this.fade.renderOrder = 10_000
    this.fade.frustumCulled = false
    this.fade.visible = false
    camera.add(this.fade)
    try {
      this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    } catch {
      this.reducedMotion = false
    }
    element.addEventListener('pointerdown', this.onDown)
    element.addEventListener('pointermove', this.onMove)
    element.addEventListener('pointerup', this.onUp)
    element.addEventListener('pointercancel', this.onCancel)
  }

  get inside() {
    return this.phase === 'inside' || this.phase === 'entering'
  }

  /** Flying in from the orbit view, before the fade. */
  get flyingIn() {
    return this.phase === 'entering' && !this.transition.switched
  }

  /** The body is in a place and can walk (inside, or fading in from the fly-in). */
  private get walkable() {
    return this.phase === 'inside' || (this.phase === 'entering' && this.transition.switched)
  }

  get currentStation() {
    return this.station
  }

  /** The radiation shelter's interior, once the shelter is on the base. */
  setShelter(shelter: ShelterInterior | null) {
    this.shelter = shelter
  }

  // ------------------------------------------------------------------ places

  private place(location: Location = this.location): Place {
    if (location === 'shelter' && this.shelter) {
      const s = this.shelter
      return { world: s.world, frame: s.group, eyeY: SHELTER_EYE, pickables: s.pickables, stationOf: (o) => s.stationOf(o), setActive: (on) => s.setActive(on) }
    }
    const i = this.interior
    return { world: i.world, frame: i.group, eyeY: EYE_Y, pickables: i.pickables, stationOf: (o) => i.stationOf(o), setActive: (on) => i.setActive(on) }
  }

  private locationOf(id: StationId): Location {
    return id === 'shelter' ? 'shelter' : 'habitat'
  }

  /** Where to stand at a station, and what to look at (world). */
  private standAt(id: StationId): { stand: THREE.Vector3; look: THREE.Vector3 } {
    if (id === 'shelter' && this.shelter) {
      return { stand: this.shelter.group.localToWorld(this.shelter.station.stand.clone()), look: this.shelter.group.localToWorld(this.shelter.station.look.clone()) }
    }
    const def = STATIONS[id === 'shelter' ? 'command' : id]
    return { stand: this.interior.group.localToWorld(def.stand.clone()), look: this.interior.group.localToWorld(def.look.clone()) }
  }

  private toLocal(p: THREE.Vector3, place: Place) {
    return place.frame.worldToLocal(p.clone())
  }

  // ------------------------------------------------------------------ orbit ⇄ first person

  enter() {
    if (this.phase === 'inside' || this.phase === 'entering') return
    this.saved.pos.copy(this.camera.position)
    this.saved.target.copy(this.controls.target)
    this.saved.fov = this.camera.fov
    this.controls.enabled = false
    this.transition = { t: 0, switched: false, fromPos: this.camera.position.clone(), fromQuat: this.camera.quaternion.clone(), fromFov: this.camera.fov }
    this.phase = 'entering'
    this.element.style.touchAction = 'none'
  }

  leave() {
    if (this.phase === 'orbit' || this.phase === 'leaving') return
    this.transition = { t: 0, switched: false, fromPos: this.camera.position.clone(), fromQuat: this.camera.quaternion.clone(), fromFov: this.camera.fov }
    this.phase = 'leaving'
    this.focusPoint = null
    this.leanTarget.set(0, 0, 0)
    this.input.set(0, 0)
  }

  // ------------------------------------------------------------------ moving

  /** Walk to a station (through the airlock if it is in the other building). */
  goToStation(id: StationId) {
    if (id === 'shelter' && !this.shelter) return
    const { stand, look } = this.standAt(id)
    if (!this.walkable) {
      // Not walking yet (flying in): just be there when we arrive.
      this.station = id
      return
    }
    if (this.locationOf(id) !== this.location) {
      this.startTravel(this.locationOf(id), id)
      return
    }
    const changed = id !== this.station
    this.station = id
    this.autoWalk = stand
    if (!this.focusPoint) [this.aimYaw, this.aimPitch] = aimAt(stand, look)
    if (changed) this.hooks.onStationChange(id)
  }

  /** Seconds before the body reaches where it is going. */
  get travelSeconds() {
    let s = 0
    if (this.travel) s += (this.travel.switched ? 0.35 : 0.7) * (1 - Math.min(1, this.travel.t / 0.7))
    if (this.autoWalk) s += Math.hypot(this.autoWalk.x - this.pos.x, this.autoWalk.z - this.pos.z) / WALK
    return s
  }

  setMove(forward: number, strafe: number) {
    this.input.set(THREE.MathUtils.clamp(strafe, -1, 1), THREE.MathUtils.clamp(forward, -1, 1))
    if (this.input.lengthSq() > 0.01) {
      this.autoWalk = null
      // Walking away gives the view back.
      if (this.focusPoint) {
        this.focusPoint = null
        this.leanTarget.set(0, 0, 0)
      }
    }
  }

  private startTravel(to: Location, then: StationId | null) {
    if (this.travel) return
    this.travel = { t: 0, to, then, switched: false }
    this.autoWalk = null
    this.input.set(0, 0)
  }

  /** Lean in towards a point and keep looking at it. `null` gives the view back to the player. */
  focus(station: StationId, point: FocusPoint | null, distance = 0.62) {
    if (!point) {
      this.focusPoint = null
      this.pendingFocus = null
      this.leanTarget.set(0, 0, 0)
      if (station !== this.station && this.locationOf(station) === this.location) this.goToStation(station)
      return
    }
    if (this.locationOf(station) !== this.location && this.walkable) {
      this.pendingFocus = { station, point, distance }
      this.goToStation(station)
      return
    }
    this.goToStation(station)
    const target = this.hooks.pointAt(station, point)
    this.focusPoint = target
    const { stand } = this.standAt(station)
    const toTarget = target.clone().sub(stand)
    const length = toTarget.length()
    const k = length > distance ? 1 - distance / length : 0
    this.leanTarget.copy(toTarget.multiplyScalar(k))
    // Keep the eyes above knee height even when leaning towards something low.
    const floor = this.location === 'shelter' ? SHELTER_EYE - 1.6 : FLOOR_Y
    const minY = floor + 1.15 - stand.y
    if (this.leanTarget.y < minY) this.leanTarget.y = minY
  }

  shake(strength: number) {
    if (this.reducedMotion) return
    this.shakeAmp = Math.max(this.shakeAmp, strength * 0.035)
  }

  // ------------------------------------------------------------------ pointer: drag to look, tap to use

  private onDown = (e: PointerEvent) => {
    if (this.phase !== 'inside') return
    this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, time: performance.now() }
    try {
      this.element.setPointerCapture(e.pointerId)
    } catch {
      // Capture is optional (older browsers).
    }
  }

  private onMove = (e: PointerEvent) => {
    if (!this.drag || e.pointerId !== this.drag.id || this.phase !== 'inside') return
    const dx = e.clientX - this.drag.x
    const dy = e.clientY - this.drag.y
    this.drag.x = e.clientX
    this.drag.y = e.clientY
    if (this.focusPoint) return
    const perPixel = (THREE.MathUtils.degToRad(this.camera.fov) / Math.max(200, this.element.clientHeight)) * LOOK_SPEED
    // Drag right to look right, drag up to look up (mobile shooter convention).
    this.aimYaw -= dx * perPixel
    this.aimPitch = THREE.MathUtils.clamp(this.aimPitch - dy * perPixel, -1.1, 1.0)
  }

  private onUp = (e: PointerEvent) => {
    const drag = this.drag
    this.drag = null
    if (!drag || e.pointerId !== drag.id || this.phase !== 'inside') return
    const moved = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY)
    if (moved > 8 || performance.now() - drag.time > 600) return
    const rect = this.element.getBoundingClientRect()
    const pointer = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
    this.raycaster.setFromCamera(pointer, this.camera)
    const place = this.place()
    const hit = this.raycaster.intersectObjects(place.pickables, true)[0]
    const station = place.stationOf(hit?.object ?? null)
    if (!station) return
    if (station !== 'shelter') this.interior.highlight(station)
    this.hooks.onInteract(station)
  }

  private onCancel = () => {
    this.drag = null
  }

  // ------------------------------------------------------------------ frame

  /** Called every frame while not in orbit. Returns false once back in the orbit view. */
  update(dt: number): boolean {
    if (this.phase === 'orbit') return false
    if (this.phase === 'entering') this.updateEnter(dt)
    else if (this.phase === 'leaving') this.updateLeave(dt)
    else this.updateInside(dt)
    this.fade.position.set(0, 0, -(this.camera.near + 0.01))
    const s = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * (this.camera.near + 0.01) * 2.2
    this.fade.scale.set(s * Math.max(1, this.camera.aspect), s, 1)
    this.fade.visible = this.fade.material.opacity > 0.001
    // updateLeave() may have just handed the camera back to the orbit view.
    return (this.phase as Phase) !== 'orbit'
  }

  private setFade(opacity: number) {
    this.fade.material.opacity = THREE.MathUtils.clamp(opacity, 0, 1)
  }

  /** Puts the body in a place: at a station, or at the entrance looking in. */
  private arrive(location: Location, station: StationId | null) {
    this.place(this.location).setActive(false)
    this.location = location
    const place = this.place()
    place.setActive(true)
    this.focusPoint = null
    this.lean.set(0, 0, 0)
    this.leanTarget.set(0, 0, 0)
    this.velocity.set(0, 0)
    this.autoWalk = null
    let stand: THREE.Vector3
    let look: THREE.Vector3
    if (location === 'shelter' && this.shelter) {
      stand = this.shelter.group.localToWorld(this.shelter.entry.stand.clone())
      look = this.shelter.group.localToWorld(this.shelter.entry.look.clone())
      this.station = 'shelter'
    } else {
      // Through the airlock: at the command station, looking down the module.
      stand = this.interior.group.localToWorld(STATIONS.command.stand.clone())
      look = this.interior.group.localToWorld(STATIONS.lifeSupport.look.clone())
      this.station = station && station !== 'shelter' ? station : 'command'
      if (this.station !== 'command') stand = this.standAt(this.station).stand
    }
    this.pos.copy(stand)
    ;[this.aimYaw, this.aimPitch] = aimAt(stand, look)
    this.yaw = this.aimYaw
    this.pitch = this.aimPitch
    this.hooks.onStationChange(this.station)
  }

  private switchInside() {
    this.hooks.setInteriorView(true)
    this.camera.near = FP_NEAR
    this.camera.fov = firstPersonFov(this.camera.aspect)
    this.camera.updateProjectionMatrix()
    this.hands.fit()
    this.hands.setVisible(true)
    const target = this.station
    this.location = 'habitat'
    this.arrive(this.locationOf(target) === 'shelter' && this.shelter ? 'shelter' : 'habitat', target === 'command' ? null : target)
    if (target === 'command' || target === 'shelter') this.pitch -= 0.08
  }

  private updateEnter(dt: number) {
    const tr = this.transition
    const fly = this.reducedMotion ? 0.05 : 1.15
    const fadeOut = 0.35
    const fadeIn = 0.55
    tr.t += dt
    if (tr.t < fly) {
      // Fly to the airlock door, outside.
      const p = easeInOut(tr.t / fly)
      const door = this.interior.group.localToWorld(new THREE.Vector3(0, 2.4, 7.5))
      const hatch = this.interior.group.localToWorld(new THREE.Vector3(0, 2.2, 4.0))
      this.camera.position.lerpVectors(tr.fromPos, door, p)
      const look = new THREE.Matrix4().lookAt(door, hatch, new THREE.Vector3(0, 1, 0))
      this.camera.quaternion.slerpQuaternions(tr.fromQuat, new THREE.Quaternion().setFromRotationMatrix(look), p)
      this.camera.fov = THREE.MathUtils.lerp(tr.fromFov, 55, p)
      this.camera.updateProjectionMatrix()
      this.setFade(0)
      return
    }
    if (tr.t < fly + fadeOut) {
      const p = (tr.t - fly) / fadeOut
      const door = this.interior.group.localToWorld(new THREE.Vector3(0, 2.4, 7.5))
      const hatch = this.interior.group.localToWorld(new THREE.Vector3(0, 2.25, 4.6))
      this.camera.position.lerpVectors(door, hatch, easeInOut(p))
      this.setFade(p)
      return
    }
    if (!tr.switched) {
      tr.switched = true
      this.switchInside()
    }
    this.updateInside(dt)
    const p = (tr.t - fly - fadeOut) / fadeIn
    this.setFade(1 - p)
    if (p >= 1) {
      this.setFade(0)
      this.phase = 'inside'
    }
  }

  private updateLeave(dt: number) {
    const tr = this.transition
    const fadeOut = 0.32
    const fadeIn = 0.5
    tr.t += dt
    if (tr.t < fadeOut) {
      this.updateInside(dt)
      this.setFade(tr.t / fadeOut)
      return
    }
    if (!tr.switched) {
      tr.switched = true
      this.hands.stop()
      this.hands.setVisible(false)
      this.interior.setActive(false)
      this.shelter?.setActive(false)
      this.location = 'habitat'
      this.travel = null
      this.hooks.setInteriorView(false)
      this.camera.near = ORBIT_NEAR
      this.camera.fov = this.saved.fov
      this.camera.position.copy(this.saved.pos)
      this.controls.target.copy(this.saved.target)
      this.camera.lookAt(this.saved.target)
      this.camera.updateProjectionMatrix()
      this.controls.enabled = true
      this.element.style.touchAction = ''
    }
    const p = (tr.t - fadeOut) / fadeIn
    this.setFade(1 - p)
    if (p >= 1) {
      this.setFade(0)
      this.fade.visible = false
      this.phase = 'orbit'
    }
  }

  private updateTravel(dt: number) {
    const tr = this.travel!
    tr.t += dt
    const out = this.reducedMotion ? 0.1 : 0.4
    const back = this.reducedMotion ? 0.1 : 0.45
    if (tr.t < out) {
      this.setFade(tr.t / out)
      return
    }
    if (!tr.switched) {
      tr.switched = true
      this.arrive(tr.to, tr.then)
      if (this.pendingFocus) {
        const f = this.pendingFocus
        this.pendingFocus = null
        this.focus(f.station, f.point, f.distance)
      }
    }
    const p = (tr.t - out) / back
    this.setFade(1 - p)
    if (p >= 1) {
      this.setFade(0)
      this.travel = null
    }
  }

  private updateInside(dt: number) {
    if (this.travel) this.updateTravel(dt)
    const place = this.place()

    // 1. Where the body wants to go this frame.
    const desired = new THREE.Vector2()
    if (this.autoWalk) {
      const dx = this.autoWalk.x - this.pos.x
      const dz = this.autoWalk.z - this.pos.z
      const d = Math.hypot(dx, dz)
      if (d < 0.04) this.autoWalk = null
      else desired.set((dx / d) * Math.min(WALK, d * 4), (dz / d) * Math.min(WALK, d * 4))
    } else if (!this.travel && this.input.lengthSq() > 0.0001) {
      // Forward is where the player looks (yaw 0 looks down −z); strafe is to the right.
      const fx = -Math.sin(this.yaw)
      const fz = -Math.cos(this.yaw)
      const rx = Math.cos(this.yaw)
      const rz = -Math.sin(this.yaw)
      const len = Math.min(1, this.input.length())
      const ix = this.input.x / Math.max(1, this.input.length())
      const iy = this.input.y / Math.max(1, this.input.length())
      desired.set((fx * iy + rx * ix) * WALK * len, (fz * iy + rz * ix) * WALK * len)
    }
    // Smooth start and stop: no instant jumps.
    this.velocity.lerp(desired, Math.min(1, dt * (this.autoWalk ? 10 : 7)))

    // 2. Move the body through the collision world (walls, hatches, hardware).
    const speed = this.velocity.length()
    if (speed > 0.001) {
      const local = this.toLocal(this.pos, place)
      const next = place.world.move(local.x, local.z, this.velocity.x * dt, this.velocity.y * dt, BODY_R)
      const moved = place.frame.localToWorld(new THREE.Vector3(next.x, local.y, next.z))
      // Blocked for good (e.g. a hatch closed in front of an automatic walk): stop trying.
      if (this.autoWalk && moved.distanceTo(this.pos) < speed * dt * 0.1) this.autoWalk = null
      this.pos.copy(moved)
      this.bobPhase += dt * 6.5 * Math.min(1, speed / WALK)
    }
    const walking = speed > 0.25
    this.hands.setWalking(walking, dt)
    if (!this.autoWalk && !this.travel) this.updateStation()

    // 3. Eyes: lean towards what we work on, but never into or through a wall.
    this.lean.lerp(this.leanTarget, Math.min(1, dt * (this.focusPoint ? 2.6 : 3.5)))
    const eye = this.pos.clone().add(this.lean)
    const eyeLocal = this.toLocal(eye, place)
    const free = place.world.resolve(eyeLocal.x, eyeLocal.z, EYE_R)
    eye.copy(place.frame.localToWorld(new THREE.Vector3(free.x, eyeLocal.y, free.z)))
    if (this.focusPoint) [this.aimYaw, this.aimPitch] = aimAt(eye, this.focusPoint)
    const follow = Math.min(1, dt * (this.focusPoint ? 4.5 : 12))
    this.yaw += angleDelta(this.yaw, this.aimYaw) * follow
    this.pitch += (this.aimPitch - this.pitch) * follow

    const bob = walking && !this.reducedMotion ? Math.abs(Math.sin(this.bobPhase)) * 0.04 : 0
    const breathe = Math.sin((performance.now() / 1000) * 1.4) * 0.004
    const shake = this.shakeAmp > 0.0005 ? new THREE.Vector3((Math.random() - 0.5) * this.shakeAmp, (Math.random() - 0.5) * this.shakeAmp, (Math.random() - 0.5) * this.shakeAmp) : new THREE.Vector3()
    this.shakeAmp *= Math.exp(-dt * 5)
    this.camera.position.copy(eye).add(shake)
    this.camera.position.y += bob + breathe
    this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch + shake.y * 0.6, this.yaw + shake.x * 0.6, 0, 'YXZ'))
    this.hands.setSway(angleDelta(this.lastYaw, this.yaw) / Math.max(dt, 1e-3), (this.pitch - this.lastPitch) / Math.max(dt, 1e-3))
    this.lastYaw = this.yaw
    this.lastPitch = this.pitch
  }

  /** While walking freely, the nearest station is the one the player is "at". */
  private updateStation() {
    if (this.location === 'shelter') {
      if (this.station !== 'shelter') {
        this.station = 'shelter'
        this.hooks.onStationChange('shelter')
      }
      return
    }
    let best: HabitatStationId = 'command'
    let bestD = Infinity
    for (const id of STATION_ORDER) {
      const s = this.standAt(id).stand
      const d = Math.hypot(s.x - this.pos.x, s.z - this.pos.z)
      if (d < bestD) {
        bestD = d
        best = id
      }
    }
    if (best !== this.station) {
      this.station = best
      this.hooks.onStationChange(best)
    }
  }

  /** Keeps the field of view right for the screen shape (phones in portrait need a taller view). */
  resize() {
    if (this.phase === 'orbit') return
    if (this.phase === 'inside' || this.transition.switched) {
      this.camera.fov = firstPersonFov(this.camera.aspect)
      this.camera.updateProjectionMatrix()
      this.hands.fit()
    }
  }

  dispose() {
    this.element.removeEventListener('pointerdown', this.onDown)
    this.element.removeEventListener('pointermove', this.onMove)
    this.element.removeEventListener('pointerup', this.onUp)
    this.element.removeEventListener('pointercancel', this.onCancel)
  }
}
