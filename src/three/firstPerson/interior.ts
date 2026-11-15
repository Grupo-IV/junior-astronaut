/**
 * @file
 * @brief The inside of the habitat module, seen in first person.
 *
 * The interior sits inside the same hull the management view shows from
 * outside, so its windows look out on the real outpost: the structures, the
 * Sun, the storm particles. Everything that matters is driven by the mission
 * state (`InteriorModel`): console lights, the sealed bay hatch, the air leak,
 * how full the storage shelves are, the spare kits on the rack, the alarms.
 *
 * Words never appear in 3D: screens show numbers, units and symbols only, so
 * the interface language stays in the React layer.
 */
import * as THREE from 'three'
import type { FocusPoint, HabitatStationId } from '../../immersive/types'
import { STATION_ORDER } from '../../immersive/types'
import { addRoomWalls, CollisionWorld } from '../physics/collision'
import type { ConsoleStatus, InteriorModel, InteriorReadouts } from '../scene/sceneModel'
import { floorPlateTexture, glowTexture, interiorPanelTexture } from '../textures/textures'
import { LeakJet } from './leakJet'

/** Module geometry, in the habitat's own coordinates (the hull is an 8 m cylinder along x). */
export const AXIS_Y = 2.8
export const RADIUS = 2.12
export const FLOOR_Y = 1.3
export const CEILING_Y = 4.35
export const END_X = 3.85
export const EYE_Y = FLOOR_Y + 1.6

const WALL_TOP = Math.acos((CEILING_Y - AXIS_Y) / RADIUS)
const WALL_BOTTOM = Math.acos((FLOOR_Y - AXIS_Y) / RADIUS)
const WIN_TOP = Math.acos((3.7 - AXIS_Y) / RADIUS)
const WIN_BOTTOM = Math.acos((3.0 - AXIS_Y) / RADIUS)

/** Window openings: x range and side of the module (+1 = towards the airlock, −1 = back). */
const WINDOWS: { x0: number; x1: number; side: 1 | -1 }[] = [
  { x0: -2.6, x1: -1.8, side: 1 },
  { x0: 1.8, x1: 2.6, side: 1 },
  { x0: 1.0, x1: 1.8, side: -1 },
]

const BAY = { z: 0.46, y0: 1.4, y1: 3.0, depth: 1.0 }
const HINGE = new THREE.Vector3(-END_X + 0.02, (BAY.y0 + BAY.y1) / 2, -BAY.z - 0.01)
/** The hatch opens into the bay, so cabin pressure pushes it shut against its seal. */
const DOOR_OPEN = -1.6
const BREACH = new THREE.Vector3(-END_X - BAY.depth + 0.05, 2.72, 0.2)

export interface StationDef {
  id: HabitatStationId
  /** Where the player stands. */
  stand: THREE.Vector3
  /** Where the player looks on arrival. */
  look: THREE.Vector3
  /** Points the camera and the hands can aim at. */
  points: Partial<Record<FocusPoint, THREE.Vector3>>
}

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

/** On the curved wall, slightly inside it: angle `a` measured from straight up towards +z. */
function onWall(x: number, a: number, inset = 0): THREE.Vector3 {
  return v(x, AXIS_Y + (RADIUS - inset) * Math.cos(a), (RADIUS - inset) * Math.sin(a))
}

function wallAngleAt(y: number, side: 1 | -1) {
  return side * Math.acos((y - AXIS_Y) / RADIUS)
}

export const STATIONS: Record<HabitatStationId, StationDef> = {
  lifeSupport: {
    id: 'lifeSupport',
    stand: v(-2.3, EYE_Y, 0),
    look: v(-END_X, 2.6, 0),
    points: {
      hatch: v(-END_X + 0.1, 2.25, 0),
      leak: BREACH.clone(),
      console: v(-END_X + 0.1, 2.75, -1.0),
      kit: v(-END_X + 0.16, 2.55, 0.98),
    },
  },
  agro: {
    id: 'agro',
    stand: v(-1.75, EYE_Y, 0.25),
    look: v(-2.2, 3.05, 2.0),
    points: {
      window: onWall(-2.2, wallAngleAt(3.35, 1), 0.02),
      plants: v(-2.2, 2.68, 1.88),
      console: onWall(-1.35, wallAngleAt(2.7, 1), 0.2),
    },
  },
  command: {
    id: 'command',
    stand: v(0, EYE_Y, -0.25),
    look: v(0, 2.45, 2.0),
    points: {
      airlock: onWall(0, wallAngleAt(2.35, 1), 0.12),
      console: onWall(1.08, wallAngleAt(2.75, 1), 0.2),
    },
  },
  power: {
    id: 'power',
    stand: v(1.4, EYE_Y, 0.3),
    look: v(1.4, 3.0, -2.0),
    points: {
      window: onWall(1.4, wallAngleAt(3.35, -1), 0.02),
      console: onWall(1.4, wallAngleAt(2.55, -1), 0.2),
    },
  },
  storage: {
    id: 'storage',
    stand: v(2.4, EYE_Y, 0),
    look: v(END_X, 2.6, 0),
    points: {
      shelf: v(END_X - 0.45, 2.58, 0.1),
      console: v(END_X - 0.08, 3.3, -0.95),
    },
  },
}

const STATUS_COLOR: Record<ConsoleStatus, number> = { ok: 0x35d07f, warn: 0xffb020, fault: 0xff3b3b, idle: 0x4a5160 }

/** A curved wall patch between two lengths and two angles, facing the axis. */
function shell(x0: number, x1: number, a0: number, a1: number, segments = 10): THREE.BufferGeometry {
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const index: number[] = []
  for (let j = 0; j <= segments; j++) {
    const a = a0 + ((a1 - a0) * j) / segments
    const c = Math.cos(a)
    const s = Math.sin(a)
    for (const x of [x0, x1]) {
      positions.push(x, AXIS_Y + RADIUS * c, RADIUS * s)
      normals.push(0, -c, -s)
      uvs.push(x / 1.2, (a * RADIUS) / 1.2)
    }
  }
  const flip = a1 < a0
  for (let j = 0; j < segments; j++) {
    const a = j * 2
    if (!flip) index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    else index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  g.setIndex(index)
  return g
}

/** A small canvas screen: redrawn only when what it shows changes. */
class Screen {
  readonly texture: THREE.CanvasTexture
  private ctx: CanvasRenderingContext2D
  private key = ''
  constructor(
    readonly width = 256,
    readonly height = 160,
  ) {
    const c = document.createElement('canvas')
    c.width = width
    c.height = height
    this.ctx = c.getContext('2d')!
    this.texture = new THREE.CanvasTexture(c)
    this.texture.colorSpace = THREE.SRGBColorSpace
  }
  draw(key: string, paint: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
    if (key === this.key) return
    this.key = key
    const { ctx, width: w, height: h } = this
    ctx.fillStyle = '#061018'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = 'rgba(90,209,255,0.25)'
    ctx.lineWidth = 2
    ctx.strokeRect(4, 4, w - 8, h - 8)
    paint(ctx, w, h)
    this.texture.needsUpdate = true
  }
}

function bar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fraction: number, color: string) {
  ctx.fillStyle = 'rgba(255,255,255,0.08)'
  ctx.fillRect(x, y, w, h)
  ctx.fillStyle = color
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, fraction)), h)
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color = '#cfe9ff', align: CanvasTextAlign = 'left') {
  ctx.fillStyle = color
  ctx.font = `600 ${size}px "Space Grotesk", "Inter", system-ui, sans-serif`
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x, y)
}

const fixed = (n: number, d = 0) => (Math.round(n * 10 ** d) / 10 ** d).toFixed(d)

/**
 * Where a person can stand inside the module, in its own coordinates: the
 * floor between the side walls (with a body's room for the curve of the hull)
 * and the end walls, the doorway into the life-support bay, and the hardware
 * that sticks out. The bay hatch closes the doorway when it is shut.
 */
export function habitatWorld(): CollisionWorld {
  const w = new CollisionWorld()
  addRoomWalls(w, -END_X, END_X, -1.4, 1.4, [{ side: '-x', from: -BAY.z, to: BAY.z }])
  addRoomWalls(w, -END_X - BAY.depth, -END_X, -BAY.z, BAY.z, [{ side: '+x', from: -BAY.z, to: BAY.z }])
  w.addObstacle({ kind: 'box', x: -END_X + 0.12, z: 0.98, hx: 0.14, hz: 0.33 }) // spare kit rack
  w.addObstacle({ kind: 'box', x: END_X - 0.25, z: 0.1, hx: 0.27, hz: 0.76 }) // storage rack
  w.addObstacle({ kind: 'circle', x: -END_X - 0.5, z: 0.22, r: 0.17 }) // tank in the bay
  // The hatch: shut across the doorway, or swung open against the bay wall.
  w.addObstacle({ kind: 'box', x: -END_X + 0.02, z: 0, hx: 0.05, hz: BAY.z, id: 'bayHatchShut' })
  w.addObstacle({ kind: 'box', x: -END_X - 0.48, z: -BAY.z + 0.07, hx: 0.47, hz: 0.08, id: 'bayHatchOpen' })
  w.setEnabled('bayHatchShut', false)
  return w
}

export class HabitatInterior {
  readonly group = new THREE.Group()
  readonly pickables: THREE.Object3D[] = []
  /** Walls, doorway and hardware for walking around inside (module coordinates). */
  readonly world = habitatWorld()
  private screens = new Map<HabitatStationId, Screen>()
  private leds = new Map<HabitatStationId, THREE.MeshStandardMaterial>()
  private highlightUntil = new Map<HabitatStationId, number>()
  private door = new THREE.Group()
  private doorAngle = DOOR_OPEN
  private doorTarget = DOOR_OPEN
  private bayLamp: THREE.MeshStandardMaterial
  private sealLamp: THREE.MeshStandardMaterial
  private ceilingPanels: THREE.MeshStandardMaterial
  private beacons: THREE.MeshStandardMaterial
  private beaconHalos: THREE.Sprite[] = []
  private mainLights: THREE.PointLight[] = []
  private alarmLight: THREE.PointLight
  private bayLight: THREE.PointLight
  private kits: THREE.Object3D[] = []
  private oxygenBottles: THREE.Object3D[] = []
  private waterBags: THREE.Object3D[] = []
  private foodPacks: THREE.Object3D[] = []
  private plants: THREE.Mesh[] = []
  private frost: THREE.Mesh
  private leak = new LeakJet()
  private shelterSign: THREE.MeshStandardMaterial
  private model: InteriorModel | null = null
  private readouts: InteriorReadouts | null = null
  private kitsTaken = 0
  private active = false
  private time = 0

  constructor() {
    this.group.name = 'habitat-interior'
    const panel = interiorPanelTexture()
    const wall = new THREE.MeshStandardMaterial({ map: panel, color: 0xe2e2de, roughness: 0.88, metalness: 0.02 })
    wall.shadowSide = THREE.DoubleSide
    const floorMap = floorPlateTexture()
    floorMap.repeat.set(7.7 / 0.6, 3 / 0.6)
    const floor = new THREE.MeshStandardMaterial({ map: floorMap, roughness: 0.75, metalness: 0.35 })
    floor.shadowSide = THREE.DoubleSide
    const trim = new THREE.MeshStandardMaterial({ color: 0x59606c, roughness: 0.45, metalness: 0.6 })
    const dark = new THREE.MeshStandardMaterial({ color: 0x23272f, roughness: 0.6, metalness: 0.4 })
    const rack = new THREE.MeshStandardMaterial({ color: 0xb9bec6, roughness: 0.6, metalness: 0.3 })
    const rail = new THREE.MeshStandardMaterial({ color: 0x2f6fd6, roughness: 0.5, metalness: 0.2 })

    // ---- Shell: floor, ceiling, curved walls with window openings, end walls.
    const add = (mesh: THREE.Mesh, cast = false) => {
      mesh.receiveShadow = true
      mesh.castShadow = cast
      this.group.add(mesh)
      return mesh
    }
    const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(END_X * 2, 3.0), floor)
    floorMesh.rotation.x = -Math.PI / 2
    floorMesh.position.set(0, FLOOR_Y, 0)
    add(floorMesh, true)
    const ceilingMap = panel.clone()
    ceilingMap.repeat.set(6, 2.4)
    ceilingMap.needsUpdate = true
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(END_X * 2, 3.0), new THREE.MeshStandardMaterial({ map: ceilingMap, roughness: 0.9 }))
    ceiling.rotation.x = Math.PI / 2
    ceiling.position.set(0, CEILING_Y, 0)
    ceiling.material.shadowSide = THREE.DoubleSide
    add(ceiling, true)

    for (const side of [1, -1] as const) {
      const top = side * WALL_TOP
      const bottom = side * WALL_BOTTOM
      const winTop = side * WIN_TOP
      const winBottom = side * WIN_BOTTOM
      add(new THREE.Mesh(shell(-END_X, END_X, top, winTop, 6), wall), true)
      add(new THREE.Mesh(shell(-END_X, END_X, winBottom, bottom, 12), wall), true)
      const gaps = WINDOWS.filter((w) => w.side === side).sort((a, b) => a.x0 - b.x0)
      let x = -END_X
      for (const w of gaps) {
        add(new THREE.Mesh(shell(x, w.x0, winTop, winBottom, 4), wall), true)
        x = w.x1
      }
      add(new THREE.Mesh(shell(x, END_X, winTop, winBottom, 4), wall), true)
    }

    // Window frames: four bars around each opening, set into the wall.
    for (const w of WINDOWS) {
      const mid = (w.x0 + w.x1) / 2
      const aTop = w.side * WIN_TOP
      const aBottom = w.side * WIN_BOTTOM
      const aMid = (aTop + aBottom) / 2
      for (const a of [aTop, aBottom]) {
        const p = onWall(mid, a, 0.03)
        const bar = new THREE.Mesh(new THREE.BoxGeometry(w.x1 - w.x0 + 0.12, 0.06, 0.08), trim)
        bar.position.copy(p)
        bar.rotation.x = a - Math.PI / 2
        this.group.add(bar)
      }
      for (const x of [w.x0, w.x1]) {
        const p = onWall(x, aMid, 0.03)
        const h = Math.abs(WIN_BOTTOM - WIN_TOP) * RADIUS + 0.06
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.06, h, 0.08), trim)
        bar.position.copy(p)
        bar.rotation.x = aMid - Math.PI / 2
        this.group.add(bar)
      }
      // A faint pane: catches the cabin lights without hiding the view.
      const pane = new THREE.Mesh(
        new THREE.PlaneGeometry(w.x1 - w.x0, Math.abs(WIN_BOTTOM - WIN_TOP) * RADIUS),
        new THREE.MeshStandardMaterial({ color: 0x9fc8ff, transparent: true, opacity: 0.07, roughness: 0.05, metalness: 0.9, depthWrite: false }),
      )
      pane.position.copy(onWall(mid, aMid, -0.01))
      pane.lookAt(v(mid, AXIS_Y, 0))
      this.group.add(pane)
    }

    // End walls. The −x wall has the doorway into the life-support bay.
    const disc = (hole: boolean) => {
      const shape = new THREE.Shape()
      shape.absarc(0, AXIS_Y, RADIUS, 0, Math.PI * 2, false)
      if (hole) {
        const h = new THREE.Path()
        h.moveTo(-BAY.z, BAY.y0)
        h.lineTo(-BAY.z, BAY.y1)
        h.lineTo(BAY.z, BAY.y1)
        h.lineTo(BAY.z, BAY.y0)
        h.lineTo(-BAY.z, BAY.y0)
        shape.holes.push(h)
      }
      const g = new THREE.ShapeGeometry(shape, 32)
      const uv = g.attributes.uv as THREE.BufferAttribute
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 1.2, uv.getY(i) / 1.2)
      return g
    }
    const westWall = add(new THREE.Mesh(disc(true), wall), true)
    westWall.rotation.y = Math.PI / 2
    westWall.position.x = -END_X
    const eastWall = add(new THREE.Mesh(disc(false), wall), true)
    eastWall.rotation.y = -Math.PI / 2
    eastWall.position.x = END_X

    // Handrails and service lines along the ceiling corners.
    for (const side of [1, -1]) {
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, END_X * 2 - 0.6, 8), rail)
      r.rotation.z = Math.PI / 2
      r.position.copy(onWall(0, side * Math.acos((3.85 - AXIS_Y) / RADIUS), 0.09))
      this.group.add(r)
      const lines: [number, number][] = [
        [0.035, 0x2e9e6a], // oxygen line (green)
        [0.03, 0x3987e5], // water line (blue)
        [0.025, 0x8a8f99], // power
      ]
      lines.forEach(([radius, color], i) => {
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, END_X * 2, 10), new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.3 }))
        pipe.rotation.z = Math.PI / 2
        pipe.position.set(0, CEILING_Y - 0.08 - i * 0.02, side * (1.3 - i * 0.1))
        this.group.add(pipe)
      })
    }

    // Ceiling light panels and emergency beacons.
    this.ceilingPanels = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xfff1dc, emissiveIntensity: 2.2 })
    for (const x of [-2.6, -0.85, 0.85, 2.6]) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.03, 0.42), this.ceilingPanels)
      lamp.position.set(x, CEILING_Y - 0.02, 0)
      this.group.add(lamp)
    }
    this.beacons = new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0xff2a2a, emissiveIntensity: 0 })
    for (const x of [-3.3, 3.3]) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), this.beacons)
      b.rotation.x = Math.PI
      b.position.set(x, CEILING_Y - 0.01, 0.75)
      this.group.add(b)
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,60,60,1)'), color: 0xff4040, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }))
      glow.scale.setScalar(0.9)
      glow.position.set(x, CEILING_Y - 0.08, 0.75)
      this.beaconHalos.push(glow)
      this.group.add(glow)
    }
    for (const x of [-1.9, 1.9]) {
      const l = new THREE.PointLight(0xfff0da, 0, 7.5, 1.4)
      l.position.set(x, CEILING_Y - 0.25, 0)
      this.mainLights.push(l)
      this.group.add(l)
    }
    this.alarmLight = new THREE.PointLight(0xff2a1a, 0, 8, 1.3)
    this.alarmLight.position.set(0, CEILING_Y - 0.3, 0.4)
    this.group.add(this.alarmLight)

    // Floor guide strip.
    const strip = new THREE.Mesh(new THREE.BoxGeometry(END_X * 2 - 0.4, 0.005, 0.03), new THREE.MeshStandardMaterial({ color: 0x0, emissive: 0x5ad1ff, emissiveIntensity: 0.6 }))
    strip.position.set(0, FLOOR_Y + 0.004, 1.35)
    const strip2 = strip.clone()
    strip2.position.z = -1.35
    this.group.add(strip, strip2)

    // ---- Life-support bay: doorway, motorised hatch, the breach, the kit rack.
    const bayMat = new THREE.MeshStandardMaterial({ color: 0x8c939e, roughness: 0.7, metalness: 0.4, side: THREE.BackSide })
    const bay = new THREE.Mesh(new THREE.BoxGeometry(BAY.depth, BAY.y1 - BAY.y0 + 0.1, BAY.z * 2 + 0.1), bayMat)
    bay.position.set(-END_X - BAY.depth / 2, (BAY.y0 + BAY.y1) / 2, 0)
    bay.receiveShadow = true
    this.group.add(bay)
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x2e9e6a, roughness: 0.5, metalness: 0.3 })
    for (const [z, y0, y1] of [[-0.3, BAY.y0, BAY.y1], [0.2, 2.72, BAY.y1]] as const) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, y1 - y0, 10), pipeMat)
      pipe.position.set(BREACH.x + 0.08, (y0 + y1) / 2, z)
      this.group.add(pipe)
    }
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.9, 20), new THREE.MeshStandardMaterial({ color: 0xd8dde3, roughness: 0.4, metalness: 0.5 }))
    tank.position.set(-END_X - 0.5, BAY.y0 + 0.5, 0.22)
    this.group.add(tank)
    // The feedthrough where the oxygen line crosses the hull, with its cracked seal.
    const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.04, 24), trim)
    flange.rotation.z = Math.PI / 2
    flange.position.copy(BREACH).add(v(0.02, 0, 0))
    const crack = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.006, 0.12), new THREE.MeshBasicMaterial({ color: 0x050505 }))
    crack.position.copy(BREACH).add(v(0.045, 0.06, 0))
    crack.rotation.x = 0.4
    this.frost = new THREE.Mesh(
      new THREE.CircleGeometry(0.2, 24),
      new THREE.MeshStandardMaterial({ color: 0xf4f9ff, roughness: 1, transparent: true, opacity: 0, depthWrite: false }),
    )
    this.frost.rotation.y = Math.PI / 2
    this.frost.position.copy(BREACH).add(v(0.005, 0, 0))
    this.group.add(flange, crack, this.frost)
    this.bayLamp = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xbfd8ff, emissiveIntensity: 1.4 })
    const bayLampMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.12), this.bayLamp)
    bayLampMesh.position.set(-END_X - 0.5, BAY.y1 + 0.02, 0)
    this.group.add(bayLampMesh)
    this.bayLight = new THREE.PointLight(0xbfd8ff, 0, 2.6, 1.5)
    this.bayLight.position.set(-END_X - 0.5, BAY.y1 - 0.15, 0)
    this.group.add(this.bayLight)
    this.leak.aim(BREACH, v(-END_X - 0.2, 2.3, 0), v(0.6, 0.6, 0.45))
    this.group.add(this.leak.points)

    // Doorway frame.
    for (const [w, h, y, z] of [
      [0.08, BAY.y1 - BAY.y0 + 0.16, (BAY.y0 + BAY.y1) / 2, -BAY.z - 0.04],
      [0.08, BAY.y1 - BAY.y0 + 0.16, (BAY.y0 + BAY.y1) / 2, BAY.z + 0.04],
      [BAY.z * 2 + 0.16, 0.08, BAY.y1 + 0.04, 0],
      [BAY.z * 2 + 0.16, 0.08, BAY.y0 - 0.04, 0],
    ] as const) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.1, h, w === 0.08 ? 0.08 : w), trim)
      f.position.set(-END_X + 0.03, y, z)
      this.group.add(f)
    }
    this.sealLamp = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x35d07f, emissiveIntensity: 1.6 })
    const sealLampMesh = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.5), this.sealLamp)
    sealLampMesh.position.set(-END_X + 0.06, BAY.y1 + 0.16, 0)
    this.group.add(sealLampMesh)

    // The hatch door, hinged on the −z side of the doorway.
    this.door.position.copy(HINGE)
    const doorMat = new THREE.MeshStandardMaterial({ color: 0xc8ccd2, roughness: 0.55, metalness: 0.45 })
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.07, BAY.y1 - BAY.y0 + 0.04, BAY.z * 2 + 0.04), doorMat)
    leaf.position.set(0.04, 0, BAY.z + 0.01)
    leaf.castShadow = true
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.018, 10, 32), dark)
    wheel.rotation.y = Math.PI / 2
    wheel.position.set(0.1, 0.05, BAY.z + 0.01)
    const spokes = new THREE.Group()
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.34, 0.015), dark)
      s.rotation.x = (i * Math.PI) / 3
      spokes.add(s)
    }
    spokes.position.copy(wheel.position)
    const port = new THREE.Mesh(new THREE.CircleGeometry(0.08, 20), new THREE.MeshStandardMaterial({ color: 0x0b1420, roughness: 0.1, metalness: 0.8 }))
    port.rotation.y = Math.PI / 2
    port.position.set(0.08, 0.5, BAY.z + 0.01)
    this.door.add(leaf, wheel, spokes, port)
    this.door.userData.station = 'lifeSupport'
    this.door.rotation.y = DOOR_OPEN
    this.group.add(this.door)
    this.pickables.push(this.door)

    // Spare kit rack to the right of the doorway: what is on it is what you have.
    const kitMat = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.5, metalness: 0.1 })
    const crossMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 })
    const kitRack = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.3, 0.62), rack)
    kitRack.position.set(-END_X + 0.04, 2.25, 0.98)
    kitRack.userData.station = 'lifeSupport'
    this.group.add(kitRack)
    this.pickables.push(kitRack)
    for (let i = 0; i < 4; i++) {
      const kit = new THREE.Group()
      kit.add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.4), kitMat))
      const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.12, 0.035), crossMat)
      const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.035, 0.12), crossMat)
      c1.position.x = c2.position.x = 0.082
      kit.add(c1, c2)
      kit.position.set(-END_X + 0.16, 2.78 - i * 0.28, 0.98)
      this.kits.push(kit)
      this.group.add(kit)
    }

    // ---- Consoles (one per station): housing, screen, status strip, buttons.
    const housing = new THREE.MeshStandardMaterial({ color: 0x2b3038, roughness: 0.55, metalness: 0.5 })
    const button = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x5ad1ff, emissiveIntensity: 0.9 })
    const consoleAt = (id: HabitatStationId, pos: THREE.Vector3, normal: THREE.Vector3, w = 0.62, h = 0.42) => {
      const g = new THREE.Group()
      g.position.copy(pos)
      g.lookAt(pos.clone().add(normal))
      const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.07), housing)
      box.position.z = -0.035
      const screen = new Screen()
      const face = new THREE.Mesh(
        new THREE.PlaneGeometry(w * 0.78, h * 0.62),
        new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: screen.texture, emissiveIntensity: 0.85, roughness: 0.3 }),
      )
      face.position.set(-w * 0.06, h * 0.08, 0.002)
      const led = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: STATUS_COLOR.idle, emissiveIntensity: 1.8 })
      const ledMesh = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, 0.018, 0.01), led)
      ledMesh.position.set(-w * 0.06, -h * 0.36, 0.004)
      g.add(box, face, ledMesh)
      for (let i = 0; i < 3; i++) {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 14), button)
        b.rotation.x = Math.PI / 2
        b.position.set(w * 0.4, h * 0.22 - i * 0.1, 0.005)
        g.add(b)
      }
      g.userData.station = id
      this.group.add(g)
      this.pickables.push(g)
      this.screens.set(id, screen)
      this.leds.set(id, led)
      return g
    }
    const inward = (p: THREE.Vector3) => v(0, AXIS_Y - p.y, -p.z).normalize()
    consoleAt('lifeSupport', v(-END_X + 0.01, 2.75, -1.0), v(1, 0, 0), 0.6, 0.48)
    const agro = STATIONS.agro.points.console!
    consoleAt('agro', agro, inward(agro), 0.55, 0.36)
    const cmd = STATIONS.command.points.console!
    consoleAt('command', cmd, inward(cmd), 0.62, 0.42)
    const pwr = STATIONS.power.points.console!
    consoleAt('power', pwr, inward(pwr), 0.7, 0.4)
    consoleAt('storage', v(END_X - 0.01, 3.3, -0.95), v(-1, 0, 0), 0.5, 0.34)

    // Plant tray under the agro window: small seedlings for experiments.
    const tray = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.3), rack)
    tray.position.set(-2.2, 2.55, 1.88)
    tray.userData.station = 'agro'
    this.group.add(tray)
    this.pickables.push(tray)
    const foliage = new THREE.MeshStandardMaterial({ color: 0x3fbf5a, roughness: 0.8 })
    for (let i = 0; i < 6; i++) {
      const p = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.14, 7), foliage)
      p.position.set(-2.52 + i * 0.13, 2.66, 1.88 + (i % 2 ? 0.05 : -0.05))
      this.plants.push(p)
      this.group.add(p)
    }
    const grow = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.02, 0.08), new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xff5ad8, emissiveIntensity: 1.2 }))
    grow.position.set(-2.2, 2.97, 1.95)
    this.group.add(grow)

    // Airlock inner hatch, and the radiation shelter sign above it.
    const airlockPos = STATIONS.command.points.airlock!
    const hatch = new THREE.Group()
    hatch.position.copy(airlockPos)
    hatch.lookAt(airlockPos.clone().add(inward(airlockPos)))
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.06, 12, 40), trim)
    const lid = new THREE.Mesh(new THREE.CircleGeometry(0.6, 40), doorMat)
    lid.position.z = -0.01
    const hWheel = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.018, 10, 28), dark)
    hWheel.position.z = 0.05
    const hPort = new THREE.Mesh(new THREE.CircleGeometry(0.11, 20), port.material)
    hPort.position.set(0, 0.34, 0.01)
    hatch.add(ring, lid, hWheel, hPort)
    hatch.userData.station = 'command'
    this.group.add(hatch)
    this.pickables.push(hatch)
    this.shelterSign = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffb020, emissiveIntensity: 0.15 })
    const sign = new THREE.Mesh(new THREE.CircleGeometry(0.09, 3), this.shelterSign)
    const signPos = onWall(0, wallAngleAt(3.25, 1), 0.04)
    sign.position.copy(signPos)
    sign.lookAt(signPos.clone().add(inward(signPos)))
    sign.rotateZ(Math.PI)
    this.group.add(sign)

    // Storage rack at the +x end: oxygen bottles, water bags, food packs.
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.5, 1.5), new THREE.MeshStandardMaterial({ color: 0x9aa1ab, roughness: 0.6, metalness: 0.4, side: THREE.BackSide }))
    frame.position.set(END_X - 0.25, FLOOR_Y + 1.25, 0.1)
    frame.userData.station = 'storage'
    this.group.add(frame)
    this.pickables.push(frame)
    for (const y of [1.75, 2.35, 2.95]) {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.03, 1.46), rack)
      shelf.position.set(END_X - 0.25, y, 0.1)
      this.group.add(shelf)
    }
    const bottleMat = new THREE.MeshStandardMaterial({ color: 0x199e70, roughness: 0.35, metalness: 0.5 })
    for (let i = 0; i < 7; i++) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.48, 16), bottleMat)
      b.position.set(END_X - 0.25, 3.22, -0.5 + i * 0.2)
      this.oxygenBottles.push(b)
      this.group.add(b)
    }
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x3987e5, roughness: 0.3, metalness: 0.1, transparent: true, opacity: 0.88 })
    for (let i = 0; i < 6; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.42, 0.21), waterMat)
      b.position.set(END_X - 0.25, 2.58, -0.48 + i * 0.23)
      this.waterBags.push(b)
      this.group.add(b)
    }
    const foodMat = new THREE.MeshStandardMaterial({ color: 0xd8c7a2, roughness: 0.9 })
    for (let i = 0; i < 8; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.32, 0.16), foodMat)
      b.position.set(END_X - 0.25, 1.94, -0.5 + i * 0.172)
      this.foodPacks.push(b)
      this.group.add(b)
    }

    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh && o.castShadow === false) o.receiveShadow = true
    })
    this.setActive(false)
  }

  /** The interior is only drawn (and lit) in first person; the hull hides it otherwise. */
  setActive(active: boolean) {
    this.active = active
    this.group.visible = active
    if (!active) {
      for (const l of [...this.mainLights, this.alarmLight, this.bayLight]) l.intensity = 0
    }
  }

  /** World position of a focus point at a station. */
  point(station: HabitatStationId, focus: FocusPoint | null | undefined): THREE.Vector3 {
    const def = STATIONS[station]
    const local = (focus && def.points[focus]) || def.points.console || def.look
    if (focus === 'kit') {
      const visible = this.kits.filter((k) => k.visible)
      if (visible.length > 0) return this.group.localToWorld(visible[0].position.clone().add(v(0.06, 0, 0)))
    }
    return this.group.localToWorld(local.clone())
  }

  /** The hand took a spare kit from the rack (until the mission state catches up). */
  takeKit() {
    this.kitsTaken += 1
    this.applyKits()
  }

  /** A short glow on a station's console after the player uses it. */
  highlight(station: HabitatStationId) {
    this.highlightUntil.set(station, this.time + 0.6)
  }

  /** Which station a picked object belongs to. */
  stationOf(object: THREE.Object3D | null): HabitatStationId | null {
    let o: THREE.Object3D | null = object
    while (o && o.userData.station === undefined) o = o.parent
    return o ? (o.userData.station as HabitatStationId) : null
  }

  setState(model: InteriorModel) {
    const readouts = model.readouts
    const previousSpares = this.model?.spareParts
    this.model = model
    this.readouts = readouts
    if (previousSpares !== undefined && model.spareParts !== previousSpares) this.kitsTaken = 0
    this.doorTarget = model.baySealed ? 0 : DOOR_OPEN
    this.world.setEnabled('bayHatchShut', model.baySealed)
    this.world.setEnabled('bayHatchOpen', !model.baySealed)
    this.leak.setStrength(model.leak === 'active' ? 1 : model.leak === 'slow' ? 0.35 : 0)
    if (model.baySealed) this.leak.aim(v(-END_X + 0.06, 2.9, BAY.z), v(-END_X + 0.9, 2.5, 0.2), v(0.6, 0.6, 0.6))
    else this.leak.aim(BREACH, v(-END_X - 0.2, 2.3, 0), v(0.6, 0.6, 0.45))
    this.applyKits()
    const show = (items: THREE.Object3D[], fraction: number) => {
      const n = fraction <= 0.001 ? 0 : Math.max(1, Math.round(Math.min(1, fraction) * items.length))
      items.forEach((it, i) => (it.visible = i < n))
    }
    show(this.oxygenBottles, model.supplies.oxygen)
    show(this.waterBags, model.supplies.water)
    show(this.foodPacks, model.supplies.food)
    const growth = readouts.greenhouseGrowth ?? 0.4
    this.plants.forEach((p, i) => p.scale.setScalar(0.5 + 0.6 * growth * (0.85 + (i % 3) * 0.08)))
    for (const id of STATION_ORDER) this.leds.get(id)!.emissive.setHex(STATUS_COLOR[model.stations[id]])
    this.shelterSign.emissiveIntensity = model.crewSheltered || model.alert === 'storm' ? 2 : 0.15
    this.drawScreens()
  }

  private applyKits() {
    const n = Math.max(0, Math.min(this.kits.length, (this.model?.spareParts ?? 0) - this.kitsTaken))
    this.kits.forEach((k, i) => (k.visible = i >= this.kits.length - n))
  }

  private drawScreens() {
    const m = this.model!
    const r = this.readouts!
    const leakKey = `${m.leak}${m.baySealed}`
    this.screens.get('lifeSupport')!.draw(`${fixed(r.oxygenKg, 1)}|${leakKey}|${m.stations.lifeSupport}`, (ctx, w, h) => {
      label(ctx, 'O₂', 18, 30, 26, '#7ff0c0')
      label(ctx, `${fixed(r.oxygenKg, 1)} kg`, w - 18, 30, 30, '#ffffff', 'right')
      // Cabin pressure trace: flat when sealed, falling during a leak.
      const kpa = m.leak === 'active' ? 96.2 : m.leak === 'slow' ? 99.1 : 101.3
      label(ctx, `${fixed(kpa, 1)} kPa`, 18, 72, 22, m.leak === 'none' ? '#cfe9ff' : '#ff8a7a')
      ctx.strokeStyle = m.leak === 'none' ? '#5ad1ff' : '#ff5a5a'
      ctx.lineWidth = 3
      ctx.beginPath()
      for (let i = 0; i <= 20; i++) {
        const x = 18 + (i / 20) * (w - 36)
        const drop = m.leak === 'active' ? (i / 20) ** 1.4 * 34 : m.leak === 'slow' ? (i / 20) * 12 : 0
        ctx.lineTo(x, 100 + drop)
      }
      ctx.stroke()
      // Bay hatch symbol: open frame, or a closed block with a lock bar.
      ctx.fillStyle = m.baySealed ? '#ff5a5a' : 'rgba(90,209,255,0.6)'
      if (m.baySealed) ctx.fillRect(w - 48, h - 44, 28, 30)
      else ctx.strokeRect(w - 48, h - 44, 28, 30)
    })
    this.screens.get('agro')!.draw(`${fixed(r.greenhouseGrowth ?? -1, 2)}|${m.stations.agro}`, (ctx, w) => {
      label(ctx, 'CO₂ → O₂', 18, 30, 22, '#9cf5a8')
      if (r.greenhouseGrowth === null) {
        label(ctx, '—', w / 2, 90, 44, '#4a5160', 'center')
        return
      }
      label(ctx, `${Math.round(r.greenhouseGrowth * 100)}%`, w - 18, 30, 28, '#ffffff', 'right')
      bar(ctx, 18, 70, w - 36, 22, r.greenhouseGrowth, '#3fbf5a')
      label(ctx, '☘', 18, 125, 26, '#3fbf5a')
    })
    this.screens.get('command')!.draw(`${r.day}|${r.days}|${fixed(r.doseMsv)}|${m.alert}`, (ctx, w) => {
      label(ctx, `${r.day} / ${r.days}`, 18, 32, 30, '#ffffff')
      bar(ctx, 18, 60, w - 36, 12, r.day / Math.max(1, r.days), '#5ad1ff')
      label(ctx, `${fixed(r.doseMsv)} mSv`, 18, 105, 24, m.alert === 'storm' ? '#ffb020' : '#cfe9ff')
      if (m.alert === 'storm' || m.alert === 'emergency') {
        ctx.fillStyle = m.alert === 'storm' ? '#ffb020' : '#ff3b3b'
        ctx.beginPath()
        ctx.arc(w - 40, 108, 16, 0, Math.PI * 2)
        ctx.fill()
      }
    })
    this.screens.get('power')!.draw(`${Math.round(r.batteryPercent)}|${Math.round(r.sunPercent)}|${m.habitatPowered}`, (ctx, w) => {
      label(ctx, 'kWh', 18, 30, 22, '#ffd27a')
      label(ctx, `${Math.round(r.batteryPercent)}%`, w - 18, 30, 30, '#ffffff', 'right')
      bar(ctx, 18, 58, w - 36, 22, r.batteryPercent / 100, r.batteryPercent < 10 ? '#ff3b3b' : r.batteryPercent < 30 ? '#ffb020' : '#fab219')
      label(ctx, '☀', 18, 115, 26, '#ffd27a')
      bar(ctx, 52, 106, w - 70, 16, r.sunPercent / 100, '#ffd27a')
    })
    const s = m.supplies
    this.screens.get('storage')!.draw(`${fixed(s.oxygen, 2)}|${fixed(s.water, 2)}|${fixed(s.food, 2)}`, (ctx, w) => {
      const rows: [string, number, string][] = [
        ['O₂', s.oxygen, '#199e70'],
        ['H₂O', s.water, '#3987e5'],
        ['◼', s.food, '#d95926'],
      ]
      rows.forEach(([name, f, color], i) => {
        label(ctx, name, 18, 34 + i * 40, 20, color)
        bar(ctx, 80, 24 + i * 40, w - 100, 20, f, color)
      })
    })
  }

  update(dt: number) {
    this.time += dt
    if (!this.active || !this.model) return
    const m = this.model
    const t = this.time
    // Hatch motor: about a second to swing shut.
    const step = dt * 2.2
    this.doorAngle += Math.max(-step, Math.min(step, this.doorTarget - this.doorAngle))
    this.door.rotation.y = this.doorAngle

    const powered = m.habitatPowered
    const emergency = m.alert === 'emergency'
    const storm = m.alert === 'storm'
    const flicker = !powered ? 0.12 : emergency ? 0.62 + 0.04 * Math.sin(t * 31) : 1
    for (const l of this.mainLights) l.intensity = 3.6 * flicker
    this.ceilingPanels.emissiveIntensity = 2.2 * flicker
    // Rotating beacons: a fast red sweep for emergencies, slow amber pulse for storms and cautions.
    const sweep = emergency ? Math.max(0, Math.sin(t * 7)) ** 3 : storm || m.alert === 'caution' ? 0.35 + 0.35 * Math.sin(t * 2.2) : 0
    const alarmColor = emergency ? 0xff2a1a : 0xffa020
    this.alarmLight.color.setHex(alarmColor)
    this.alarmLight.intensity = emergency ? 4.2 * sweep : storm ? 1.8 * sweep : 0
    this.beacons.emissive.setHex(alarmColor)
    this.beacons.emissiveIntensity = 4 * sweep
    for (const h of this.beaconHalos) {
      h.material.color.setHex(alarmColor)
      h.material.opacity = 0.9 * sweep
    }
    // Bay: hazard red while the breach is open to the cabin.
    const leakOpen = m.leak !== 'none' && !m.baySealed
    this.bayLight.color.setHex(leakOpen ? 0xff6050 : 0xbfd8ff)
    this.bayLight.intensity = (leakOpen ? 2.2 + 1.2 * Math.max(0, Math.sin(t * 5)) : 1.4) * (powered ? 1 : 0.3)
    this.bayLamp.emissive.setHex(leakOpen ? 0xff6050 : 0xbfd8ff)
    this.sealLamp.emissive.setHex(m.baySealed ? 0xff3b3b : m.leak === 'active' ? 0xffb020 : 0x35d07f)
    this.sealLamp.emissiveIntensity = m.leak === 'active' && !m.baySealed ? 1 + Math.max(0, Math.sin(t * 9)) * 2 : 1.6
    const frost = this.frost.material as THREE.MeshStandardMaterial
    frost.opacity += ((m.leak === 'none' ? 0 : m.leak === 'active' ? 0.75 : 0.35) - frost.opacity) * Math.min(1, dt * 0.5)
    this.leak.update(dt)
    for (const id of STATION_ORDER) {
      const led = this.leds.get(id)!
      const status = m.stations[id]
      const lit = (this.highlightUntil.get(id) ?? 0) > t
      led.emissiveIntensity = lit ? 5 : status === 'fault' ? 1 + 2 * Math.max(0, Math.sin(t * 6)) : 1.8
    }
  }
}
