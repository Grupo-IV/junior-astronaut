/**
 * @file
 * @brief The astronaut's own arms and gloved hands, in first person.
 *
 * Each hand is an articulated glove (palm, four two-joint fingers, thumb) on a
 * sleeve that stays aimed at an off-screen elbow, so the arm always reads as
 * attached to the body. Hands are animated procedurally: an action is a short
 * list of segments, each blending towards a pose that can follow a moving
 * target in the world (a button, a hatch wheel, a kit on its rack). Targets
 * are re-read every frame, so the hand stays on the object while the camera
 * leans in or the body sways.
 *
 * Gestures are short and always tied to an action: nothing moves at random
 * except breathing and the lag that follows head movement.
 */
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { HandAction, HandTiming } from '../../immersive/types'

type Side = 1 | -1 // 1 = right, −1 = left
type PropId = 'wrench' | 'kit' | 'sealant' | 'bag' | null

interface Pose {
  pos: THREE.Vector3
  quat: THREE.Quaternion
  /** Middle, ring and little finger: 0 open … 1 fist. */
  curl: number
  /** Index finger: 0 straight (pointing) … 1 curled. */
  index: number
  thumb: number
}

type PoseSource = (progress: number) => Pose

interface Segment {
  dur: number
  to: PoseSource
  ease?: (t: number) => number
  /** Track the source directly (after a short blend), for motion along a path. */
  follow?: boolean
  onStart?: () => void
  onEnd?: () => void
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const easeOut = (t: number) => 1 - (1 - t) ** 3

const TIP_LENGTH = 0.17
const PALM_CENTRE = 0.06
const MAX_REACH = 0.74

function pose(pos: THREE.Vector3, quat: THREE.Quaternion, curl: number, index: number, thumb: number): Pose {
  return { pos, quat, curl, index, thumb }
}

function clonePose(p: Pose): Pose {
  return pose(p.pos.clone(), p.quat.clone(), p.curl, p.index, p.thumb)
}

function lerpPose(a: Pose, b: Pose, t: number, out: Pose): Pose {
  out.pos.lerpVectors(a.pos, b.pos, t)
  out.quat.slerpQuaternions(a.quat, b.quat, t)
  out.curl = a.curl + (b.curl - a.curl) * t
  out.index = a.index + (b.index - a.index) * t
  out.thumb = a.thumb + (b.thumb - a.thumb) * t
  return out
}

const euler = (x: number, y: number, z: number) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, 'YXZ'))

type GripMode = 'press' | 'point' | 'open' | 'grip' | 'palm'

const FINGERS: Record<GripMode, [number, number, number]> = {
  press: [0.9, 0.0, 0.7],
  point: [0.92, 0.0, 0.75],
  open: [0.12, 0.08, 0.1],
  grip: [0.92, 0.88, 0.85],
  palm: [0.04, 0.02, 0.1],
}

class Hand {
  readonly wrist = new THREE.Group()
  readonly sleeve = new THREE.Group()
  private fingers: { prox: THREE.Group; dist: THREE.Group }[] = []
  private thumbBase = new THREE.Group()
  private thumbProx = new THREE.Group()
  private thumbDist = new THREE.Group()
  private props = new Map<Exclude<PropId, null>, THREE.Object3D>()
  readonly current: Pose
  private from: Pose
  private queue: Segment[] = []
  private segTime = 0
  private started = false
  private scratch: Pose
  private shoulder: THREE.Vector3
  private elbow: THREE.Vector3
  wristScreen: THREE.MeshStandardMaterial | null = null

  constructor(
    readonly side: Side,
    mats: Record<'glove' | 'pad' | 'ring' | 'suit' | 'stripe' | 'dark', THREE.Material>,
  ) {
    const s = side
    this.shoulder = new THREE.Vector3(0.2 * s, -0.3, 0.02)
    this.elbow = new THREE.Vector3(0.28 * s, -0.46, 0.12)

    // Glove: palm, back-of-hand pad, gauntlet and the metal disconnect ring.
    const palm = new THREE.Mesh(new RoundedBoxGeometry(0.088, 0.034, 0.096, 3, 0.014), mats.glove)
    palm.position.set(0, 0, -0.05)
    const knuckles = new THREE.Mesh(new RoundedBoxGeometry(0.082, 0.014, 0.034, 2, 0.006), mats.pad)
    knuckles.position.set(0, 0.019, -0.078)
    const gauntlet = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.041, 0.075, 18), mats.glove)
    gauntlet.rotation.x = Math.PI / 2
    gauntlet.position.set(0, 0.002, 0.026)
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.009, 8, 24), mats.ring)
    ring.position.set(0, 0.002, 0.066)
    const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.051, 0.005, 6, 24), mats.stripe)
    stripe.position.set(0, 0.002, 0.078)
    this.wrist.add(palm, knuckles, gauntlet, ring, stripe)

    // Fingers: index, middle, ring, little. Fingertips are rubberised (dark).
    const xs = [-0.031, -0.0105, 0.0105, 0.03]
    const prox = [0.042, 0.046, 0.043, 0.035]
    const dist = [0.034, 0.036, 0.034, 0.028]
    xs.forEach((x, i) => {
      const r = i === 3 ? 0.0092 : 0.0104
      const p = new THREE.Group()
      p.position.set(x * s, 0, -0.096)
      const pm = new THREE.Mesh(new THREE.CapsuleGeometry(r, prox[i] - 2 * r, 4, 8), mats.glove)
      pm.rotation.x = Math.PI / 2
      pm.position.z = -prox[i] / 2
      const d = new THREE.Group()
      d.position.z = -prox[i]
      const dm = new THREE.Mesh(new THREE.CapsuleGeometry(r * 0.95, dist[i] - 2 * r, 4, 8), mats.pad)
      dm.rotation.x = Math.PI / 2
      dm.position.z = -dist[i] / 2
      d.add(dm)
      p.add(pm, d)
      this.wrist.add(p)
      this.fingers.push({ prox: p, dist: d })
    })
    this.thumbBase.position.set(-0.044 * s, -0.006, -0.026)
    const tp = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.012, 4, 8), mats.glove)
    tp.rotation.x = Math.PI / 2
    tp.position.z = -0.018
    this.thumbProx.position.z = -0.012
    this.thumbProx.add(tp)
    this.thumbDist.position.z = -0.036
    const td = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.01, 4, 8), mats.pad)
    td.rotation.x = Math.PI / 2
    td.position.z = -0.015
    this.thumbDist.add(td)
    this.thumbProx.add(this.thumbDist)
    this.thumbBase.add(this.thumbProx)
    this.wrist.add(this.thumbBase)

    // Sleeve: from the glove ring back towards the elbow, out of view.
    const sleeveGeo = new THREE.CylinderGeometry(0.06, 0.072, 0.56, 18, 1, true)
    sleeveGeo.rotateX(Math.PI / 2)
    sleeveGeo.translate(0, 0, 0.28)
    const sleeveMesh = new THREE.Mesh(sleeveGeo, mats.suit)
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0645, 0.0655, 0.03, 18, 1, true), mats.stripe)
    band.rotation.x = Math.PI / 2
    band.position.z = 0.16
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.061, 0.012, 8, 24), mats.suit)
    cuff.position.z = 0.004
    this.sleeve.add(sleeveMesh, band, cuff)
    if (side === -1) {
      // Wrist computer on the left forearm: the crew's checklist and diagnostics.
      const body = new THREE.Mesh(new RoundedBoxGeometry(0.07, 0.026, 0.085, 2, 0.007), mats.dark)
      body.position.set(0, 0.07, 0.12)
      this.wristScreen = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x5ad1ff, emissiveIntensity: 0.35 })
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.054, 0.066), this.wristScreen)
      screen.rotation.x = -Math.PI / 2
      screen.position.set(0, 0.0836, 0.12)
      this.sleeve.add(body, screen)
    }

    // Props held in the right hand.
    if (side === 1) {
      const wrench = new THREE.Group()
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.014, 0.022), mats.ring)
      const head = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.009, 6, 14, Math.PI * 1.5), mats.ring)
      head.position.x = -0.095
      head.rotation.x = Math.PI / 2
      wrench.add(handle, head)
      wrench.position.set(-0.03, -0.024, -0.072)
      const kit = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.2), new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.5 }))
      kit.position.set(0, -0.09, -0.08)
      const sealant = new THREE.Group()
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.13, 12), new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.4 }))
      tube.rotation.x = Math.PI / 2
      const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.05, 10), mats.dark)
      nozzle.rotation.x = -Math.PI / 2
      nozzle.position.z = -0.088
      sealant.add(tube, nozzle)
      sealant.position.set(0, -0.022, -0.1)
      const bag = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.15, 0.08, 2, 0.02), new THREE.MeshStandardMaterial({ color: 0x3987e5, roughness: 0.3, transparent: true, opacity: 0.9 }))
      bag.position.set(0, -0.09, -0.08)
      for (const [id, obj] of [['wrench', wrench], ['kit', kit], ['sealant', sealant], ['bag', bag]] as const) {
        obj.visible = false
        this.props.set(id, obj)
        this.wrist.add(obj)
      }
    }

    for (const g of [this.wrist, this.sleeve]) {
      g.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.castShadow = false
          o.receiveShadow = false
          o.frustumCulled = false
        }
      })
    }

    this.current = pose(new THREE.Vector3(0.2 * s, -0.7, -0.4), euler(0.3, 0, 0), 0.4, 0.4, 0.4)
    this.from = clonePose(this.current)
    this.scratch = clonePose(this.current)
  }

  setProp(id: PropId) {
    for (const [key, obj] of this.props) obj.visible = key === id
  }

  run(segments: Segment[]) {
    this.queue = segments
    this.segTime = 0
    this.started = false
    this.from = clonePose(this.current)
  }

  get busy() {
    return this.queue.length > 0
  }

  /** A pose with the hand aimed at a point (camera space). */
  reach(target: THREE.Vector3, mode: GripMode, standoff: number, roll = 0, tilt = 0): Pose {
    const d = target.clone().sub(this.shoulder).normalize()
    const tipLen = mode === 'open' || mode === 'grip' || mode === 'palm' ? PALM_CENTRE : TIP_LENGTH
    const tip = target.clone().addScaledVector(d, -standoff)
    const fromShoulder = tip.clone().sub(this.shoulder)
    if (fromShoulder.length() > MAX_REACH) tip.copy(this.shoulder).addScaledVector(fromShoulder.normalize(), MAX_REACH)
    const pos = tip.addScaledVector(d, -tipLen)
    const m = new THREE.Matrix4().lookAt(new THREE.Vector3(), d, new THREE.Vector3(0, 1, 0))
    const quat = new THREE.Quaternion().setFromRotationMatrix(m)
    const defaultRoll = mode === 'grip' || mode === 'open' ? -1.25 : mode === 'palm' ? 0 : -0.3
    quat.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), (defaultRoll + roll) * this.side))
    if (tilt) quat.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), tilt))
    const [curl, index, thumb] = FINGERS[mode]
    return pose(pos, quat, curl, index, thumb)
  }

  update(dt: number, idle: Pose, offset: THREE.Vector3) {
    let target: Pose
    if (this.queue.length > 0) {
      const seg = this.queue[0]
      if (!this.started) {
        this.started = true
        seg.onStart?.()
      }
      this.segTime += dt
      const p = Math.min(1, this.segTime / seg.dur)
      const t = seg.follow ? Math.min(1, p * 6) : (seg.ease ?? easeInOut)(p)
      target = lerpPose(this.from, seg.to(p), t, this.scratch)
      if (p >= 1) {
        seg.onEnd?.()
        this.queue.shift()
        this.from = clonePose(target)
        this.segTime = 0
        this.started = false
      }
      this.apply(target, offset)
      return
    }
    // Idle: glide back towards the resting pose.
    lerpPose(this.current, idle, Math.min(1, dt * 5), this.scratch)
    this.apply(this.scratch, offset)
  }

  private apply(p: Pose, offset: THREE.Vector3) {
    if (p !== this.current) {
      this.current.pos.copy(p.pos)
      this.current.quat.copy(p.quat)
      this.current.curl = p.curl
      this.current.index = p.index
      this.current.thumb = p.thumb
    }
    this.wrist.position.copy(p.pos).add(offset)
    this.wrist.quaternion.copy(p.quat)
    this.fingers.forEach((f, i) => {
      const c = i === 0 ? p.index : p.curl
      f.prox.rotation.x = -c * 1.3
      f.dist.rotation.x = -c * 1.5
    })
    const s = this.side
    this.thumbBase.rotation.set(-0.25 - p.thumb * 0.45, s * (0.8 - p.thumb * 0.6), s * -0.5)
    this.thumbProx.rotation.x = -p.thumb * 0.5
    this.thumbDist.rotation.x = -p.thumb * 0.7
    // The sleeve runs from the glove ring to the elbow.
    const start = new THREE.Vector3(0, 0.002, 0.07).applyQuaternion(this.wrist.quaternion).add(this.wrist.position)
    const dir = this.elbow.clone().sub(start).normalize()
    this.sleeve.position.copy(start)
    this.sleeve.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir)
  }
}

/**
 * How long each gesture takes, and when it lands (ms). The scene schedules
 * gestures after a walk, so it needs these before the gesture starts; a test
 * checks they match what `play` really does.
 */
export function gestureTiming(action: HandAction, withKit: boolean): HandTiming {
  const table: Record<HandAction, HandTiming> = {
    press: { impactMs: 460, totalMs: 1000 },
    point: { impactMs: 360, totalMs: 1330 },
    grab: { impactMs: 540, totalMs: 1860 },
    repair: withKit ? { impactMs: 2460, totalMs: 2910 } : { impactMs: 1700, totalMs: 2150 },
    seal: { impactMs: 460, totalMs: 3280 },
    startle: { impactMs: 130, totalMs: 890 },
    wrist: { impactMs: 680, totalMs: 1790 },
    beckon: { impactMs: 1390, totalMs: 1930 },
    relax: { impactMs: 0, totalMs: 450 },
  }
  return table[action]
}

export interface HandContext {
  /** World points, read every frame (the camera can move during the action). */
  target?: THREE.Vector3
  /** Repair: where the spare kit is taken from. Seal: the wheel to turn after pressing `target`. */
  secondary?: THREE.Vector3
  withKit?: boolean
  /** Called when the hand reaches the moment that matters (button pressed, object taken…). */
  onImpact?: () => void
  /** Repair with a kit: the kit leaves its rack. */
  onTake?: () => void
}

export class AstronautHands {
  readonly root = new THREE.Group()
  private right: Hand
  private left: Hand
  private tension = 0
  private time = 0
  private sway = new THREE.Vector3()
  private swayTarget = new THREE.Vector3()
  private bob = 0
  private tanH = 1
  private tanV = 0.6
  private temp = new THREE.Vector3()

  constructor(private camera: THREE.PerspectiveCamera) {
    const mats = {
      glove: new THREE.MeshStandardMaterial({ color: 0xc9c6bd, roughness: 0.92, metalness: 0 }),
      pad: new THREE.MeshStandardMaterial({ color: 0x3b3e45, roughness: 0.95 }),
      ring: new THREE.MeshStandardMaterial({ color: 0xaab3bf, roughness: 0.3, metalness: 0.85 }),
      suit: new THREE.MeshStandardMaterial({ color: 0xd2d0c8, roughness: 0.95 }),
      stripe: new THREE.MeshStandardMaterial({ color: 0x2d6cdf, roughness: 0.6 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x23262d, roughness: 0.6, metalness: 0.3 }),
    }
    this.right = new Hand(1, mats)
    this.left = new Hand(-1, { ...mats, stripe: new THREE.MeshStandardMaterial({ color: 0xd9532b, roughness: 0.6 }) })
    this.root.add(this.right.wrist, this.right.sleeve, this.left.wrist, this.left.sleeve)
    this.root.visible = false
    camera.add(this.root)
  }

  setVisible(visible: boolean) {
    if (visible && !this.root.visible) {
      // Hands come up into view as the astronaut steps in.
      for (const h of [this.right, this.left]) {
        h.current.pos.set(h.side * 0.22, -0.75, -0.38)
        h.run([{ dur: 0.7, to: () => this.idlePose(h), ease: easeOut }])
      }
    }
    this.root.visible = visible
  }

  /** 0 relaxed … 1 tense (hands held ready during alarms). */
  setTension(level: number) {
    this.tension = level
  }

  /** Head turning speed (rad/s): hands lag a little behind the view. */
  setSway(yawRate: number, pitchRate: number) {
    this.swayTarget.set(-yawRate * 0.012, pitchRate * 0.01, 0)
  }

  /** Walking: a soft low-gravity bounce. */
  setWalking(walking: boolean, dt: number) {
    if (walking) this.bob += dt * 6.5
    else this.bob *= Math.max(0, 1 - dt * 4)
  }

  /** Fit the resting hands to the screen: portrait phones see a narrower, taller view. */
  fit() {
    const halfV = THREE.MathUtils.degToRad(this.camera.fov / 2)
    this.tanV = Math.tan(halfV)
    this.tanH = this.tanV * this.camera.aspect
  }

  private idlePose(h: Hand): Pose {
    const s = h.side
    // A little further away on portrait phones, where the view is narrow and the hands would look huge.
    const z = this.camera.aspect < 1 ? -0.52 : -0.44
    // Low in the corners of the view whatever the screen shape (about 75% of the way down, 62% out),
    // relaxed, palms turned in: present but out of the way.
    const restX = Math.min(0.22, this.tanH * 0.62 * Math.abs(z)) * s
    const restY = -Math.min(0.24, this.tanV * 0.74 * Math.abs(z))
    const rest = pose(new THREE.Vector3(restX, restY, z), euler(0.02, 0.28 * s, -1.05 * s), 0.5, 0.42, 0.45)
    if (this.tension <= 0) return rest
    // Ready: a little higher and closer, hands half open.
    const ready = pose(new THREE.Vector3(restX * 0.86, restY * 0.78, -0.4), euler(0.22, 0.3 * s, -1.15 * s), 0.6, 0.5, 0.55)
    return lerpPose(rest, ready, this.tension, clonePose(rest))
  }

  private local(world: THREE.Vector3 | undefined, fallback: THREE.Vector3): THREE.Vector3 {
    if (!world) return fallback.clone()
    this.camera.updateMatrixWorld()
    return this.camera.worldToLocal(this.temp.copy(world)).clone()
  }

  /** Starts a gesture. Returns when it lands and when it ends (ms). */
  play(action: HandAction, ctx: HandContext = {}): HandTiming {
    const R = this.right
    const L = this.left
    const ahead = new THREE.Vector3(0.05, -0.12, -0.6)
    const T = () => this.local(ctx.target, ahead)
    const S = () => this.local(ctx.secondary ?? ctx.target, ahead)
    const idleR = () => this.idlePose(R)
    const idleL = () => this.idlePose(L)
    let impact = 0
    let total = 0
    const sum = (segs: Segment[]) => segs.reduce((acc, s) => acc + s.dur, 0)
    const at = (segs: Segment[], index: number) => sum(segs.slice(0, index + 1))
    const fire = () => ctx.onImpact?.()

    switch (action) {
      case 'press': {
        const r: Segment[] = [
          { dur: 0.32, to: () => R.reach(T(), 'press', 0.09), ease: easeOut },
          { dur: 0.14, to: () => R.reach(T(), 'press', -0.008), onEnd: fire },
          { dur: 0.12, to: () => R.reach(T(), 'press', 0.06) },
          { dur: 0.42, to: idleR },
        ]
        R.run(r)
        impact = at(r, 1)
        total = sum(r)
        break
      }
      case 'point': {
        const r: Segment[] = [
          { dur: 0.36, to: () => R.reach(T(), 'point', 0.24), ease: easeOut, onEnd: fire },
          { dur: 0.55, to: (p) => R.reach(T(), 'point', 0.24 - Math.sin(p * Math.PI) * 0.03), follow: true },
          { dur: 0.42, to: idleR },
        ]
        R.run(r)
        impact = at(r, 0)
        total = sum(r)
        break
      }
      case 'grab': {
        const r: Segment[] = [
          { dur: 0.38, to: () => R.reach(T(), 'open', 0.04, 0, 0.2), ease: easeOut },
          { dur: 0.16, to: () => R.reach(T(), 'grip', 0.0, 0, 0.2), onEnd: () => (R.setProp(ctx.withKit ? 'kit' : 'bag'), ctx.onTake?.(), fire()) },
          { dur: 0.42, to: () => pose(new THREE.Vector3(0.07, -0.15, -0.36), euler(0.25, 0.4, -1.1), 0.92, 0.88, 0.85) },
          { dur: 0.45, to: () => pose(new THREE.Vector3(0.07, -0.15, -0.36), euler(0.25, 0.4, -1.1), 0.92, 0.88, 0.85) },
          { dur: 0.45, to: idleR, onEnd: () => R.setProp(null) },
        ]
        R.run(r)
        impact = at(r, 1)
        total = sum(r)
        break
      }
      case 'repair': {
        const r: Segment[] = []
        if (ctx.withKit) {
          r.push(
            { dur: 0.36, to: () => R.reach(S(), 'open', 0.05, 0, 0.2), ease: easeOut },
            { dur: 0.15, to: () => R.reach(S(), 'grip', 0.0, 0, 0.2), onEnd: () => (R.setProp('kit'), ctx.onTake?.()) },
            { dur: 0.5, to: () => R.reach(T(), 'grip', 0.07) },
            { dur: 0.45, to: (p) => R.reach(T(), 'grip', 0.03 - Math.abs(Math.sin(p * Math.PI * 2)) * 0.02), follow: true, onEnd: () => R.setProp(null) },
          )
        } else {
          // Sealant from the tool belt: the hand dips out of view, then comes back with it.
          r.push(
            { dur: 0.28, to: () => pose(new THREE.Vector3(0.24, -0.5, -0.28), euler(-0.2, 0.2, -1.2), 0.9, 0.9, 0.8) },
            { dur: 0.42, to: () => R.reach(T(), 'grip', 0.12), onStart: () => R.setProp('sealant') },
          )
        }
        // Work the seal: small circles along the crack.
        r.push(
          { dur: 1.0, to: (p) => R.reach(T().add(new THREE.Vector3(Math.cos(p * Math.PI * 5) * 0.03, Math.sin(p * Math.PI * 5) * 0.02, 0)), ctx.withKit ? 'palm' : 'grip', ctx.withKit ? 0.02 : 0.1), follow: true, onEnd: fire },
          { dur: 0.45, to: idleR, onEnd: () => R.setProp(null) },
        )
        const braceAt = () => T().add(new THREE.Vector3(-0.16, 0.06, 0.02))
        const l: Segment[] = [
          { dur: Math.max(0.2, sum(r) - 1.9), to: idleL },
          { dur: 0.45, to: () => L.reach(braceAt(), 'palm', 0.02, 0, 0.9), ease: easeOut },
          { dur: 1.0, to: () => L.reach(braceAt(), 'palm', 0.01, 0, 0.9) },
          { dur: 0.45, to: idleL },
        ]
        R.run(r)
        L.run(l)
        impact = at(r, r.length - 2)
        total = Math.max(sum(r), sum(l))
        break
      }
      case 'seal': {
        // Press the hatch control, wait for the motor, then turn the wheel to lock it.
        const radius = 0.17
        const rim = (phase: number, turn: number) => {
          const a = phase + turn
          return S().add(this.worldDirToCamera(new THREE.Vector3(0, Math.sin(a) * radius, Math.cos(a) * radius)))
        }
        const turn = (p: number) => easeInOut(p) * Math.PI * 0.6
        const r: Segment[] = [
          { dur: 0.32, to: () => R.reach(T(), 'press', 0.09), ease: easeOut },
          { dur: 0.14, to: () => R.reach(T(), 'press', -0.008), onEnd: fire },
          { dur: 0.2, to: () => R.reach(T(), 'press', 0.08) },
          { dur: 0.8, to: idleR },
          { dur: 0.36, to: () => R.reach(rim(0, 0), 'open', 0.02) },
          { dur: 0.12, to: () => R.reach(rim(0, 0), 'grip', 0) },
          { dur: 0.8, to: (p) => R.reach(rim(0, turn(p)), 'grip', 0), follow: true },
          { dur: 0.12, to: () => R.reach(rim(0, Math.PI * 0.6), 'open', 0.02) },
          { dur: 0.42, to: idleR },
        ]
        const l: Segment[] = [
          { dur: sum(r.slice(0, 4)), to: idleL },
          { dur: 0.36, to: () => L.reach(rim(Math.PI, 0), 'open', 0.02) },
          { dur: 0.12, to: () => L.reach(rim(Math.PI, 0), 'grip', 0) },
          { dur: 0.8, to: (p) => L.reach(rim(Math.PI, turn(p)), 'grip', 0), follow: true },
          { dur: 0.12, to: () => L.reach(rim(Math.PI, Math.PI * 0.6), 'open', 0.02) },
          { dur: 0.42, to: idleL },
        ]
        R.run(r)
        L.run(l)
        impact = at(r, 1)
        total = sum(r)
        break
      }
      case 'startle': {
        const raised = (h: Hand) => () => pose(new THREE.Vector3(0.13 * h.side, -0.05, -0.31), euler(1.05, 0.3 * h.side, -0.25 * h.side), 0.12, 0.1, 0.15)
        for (const h of [R, L]) {
          const up = raised(h)
          h.run([
            { dur: 0.13, to: up, ease: easeOut },
            { dur: 0.38, to: (p) => { const q = up(); q.pos.x += Math.sin(p * 40) * 0.004; q.pos.y += Math.cos(p * 33) * 0.003; return q }, follow: true },
            { dur: 0.38, to: () => this.idlePose(h) },
          ])
        }
        impact = 130
        total = 890
        fire()
        return { impactMs: impact, totalMs: total }
      }
      case 'wrist': {
        const up = () => pose(new THREE.Vector3(-0.045, -0.16, -0.34), euler(0.95, -0.35, 1.25), 0.55, 0.5, 0.5)
        const screen = () => {
          L.sleeve.updateMatrix()
          return new THREE.Vector3(0, 0.09, 0.11).applyMatrix4(L.sleeve.matrix)
        }
        const l: Segment[] = [
          { dur: 0.42, to: up, ease: easeOut, onStart: () => this.glowWrist(1.6) },
          { dur: 0.95, to: up },
          { dur: 0.42, to: idleL, onEnd: () => this.glowWrist(0.35) },
        ]
        const r: Segment[] = [
          { dur: 0.3, to: idleR },
          { dur: 0.28, to: () => R.reach(screen(), 'press', 0.05), ease: easeOut },
          { dur: 0.1, to: () => R.reach(screen(), 'press', 0.0), onEnd: fire },
          { dur: 0.12, to: () => R.reach(screen(), 'press', 0.04) },
          { dur: 0.1, to: () => R.reach(screen(), 'press', 0.0) },
          { dur: 0.12, to: () => R.reach(screen(), 'press', 0.05) },
          { dur: 0.42, to: idleR },
        ]
        L.run(l)
        R.run(r)
        impact = at(r, 2)
        total = Math.max(sum(l), sum(r))
        break
      }
      case 'beckon': {
        const wave = (p: number) => {
          const q = R.reach(T(), 'open', 0.38, 0.9, 0.5)
          q.quat.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.sin(p * Math.PI * 4) * 0.45))
          return q
        }
        const r: Segment[] = [
          { dur: 0.3, to: () => wave(0), ease: easeOut },
          { dur: 0.65, to: wave, follow: true },
          { dur: 0.3, to: () => R.reach(T(), 'press', 0.09) },
          { dur: 0.14, to: () => R.reach(T(), 'press', -0.008), onEnd: fire },
          { dur: 0.12, to: () => R.reach(T(), 'press', 0.06) },
          { dur: 0.42, to: idleR },
        ]
        R.run(r)
        impact = at(r, 3)
        total = sum(r)
        break
      }
      case 'relax': {
        R.run([{ dur: 0.45, to: idleR }])
        L.run([{ dur: 0.45, to: idleL }])
        fire()
        return { impactMs: 0, totalMs: 450 }
      }
    }
    return { impactMs: Math.round(impact * 1000), totalMs: Math.round(total * 1000) }
  }

  private worldDirToCamera(dir: THREE.Vector3): THREE.Vector3 {
    const q = this.camera.getWorldQuaternion(new THREE.Quaternion()).invert()
    return dir.applyQuaternion(q)
  }

  private glowWrist(intensity: number) {
    if (this.left.wristScreen) this.left.wristScreen.emissiveIntensity = intensity
  }

  /** Stop any gesture (e.g. leaving first person). */
  stop() {
    this.right.run([])
    this.left.run([])
    this.right.setProp(null)
  }

  update(dt: number) {
    if (!this.root.visible) return
    this.time += dt
    this.sway.lerp(this.swayTarget, Math.min(1, dt * 6))
    const breathe = Math.sin(this.time * 1.5) * 0.004
    const bobY = -Math.abs(Math.sin(this.bob)) * 0.014
    const bobX = Math.sin(this.bob) * 0.006
    const tremor = this.tension > 0.5 ? Math.sin(this.time * 23) * 0.0012 : 0
    for (const h of [this.right, this.left]) {
      const offset = new THREE.Vector3(this.sway.x + bobX * h.side, this.sway.y + breathe + bobY + tremor, 0)
      h.update(dt, this.idlePose(h), offset)
    }
  }
}
