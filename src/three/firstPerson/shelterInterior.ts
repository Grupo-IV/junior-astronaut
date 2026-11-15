/**
 * @file
 * @brief Inside the radiation shelter: a small pressurised room under the regolith mound.
 *
 * Everything the crew needs to ride out a storm for two days: bunks for four,
 * oxygen and water, and a radiation monitor that compares the storm dose
 * outside with what gets through the walls (both from the mission state). A
 * maintenance panel is left open on the wall so you can see what protects
 * you: bags of lunar soil behind a mesh.
 */
import * as THREE from 'three'
import type { FocusPoint } from '../../immersive/types'
import { CollisionWorld } from '../physics/collision'
import type { ShelterModel } from '../scene/sceneModel'
import { floorPlateTexture, interiorPanelTexture, trefoilTexture } from '../textures/textures'

const ROOM_R = 1.75
const FLOOR = 0.15
const CEILING = 2.3
/** Eye height above the shelter's base. */
export const SHELTER_EYE = FLOOR + 1.6

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

/** A mesh at a position (Object3D.position cannot be replaced, only set). */
function placed<T extends THREE.Object3D>(o: T, x: number, y: number, z: number): T {
  o.position.set(x, y, z)
  return o
}

export class ShelterInterior {
  readonly group = new THREE.Group()
  readonly pickables: THREE.Object3D[] = []
  /** Walls and furniture, in the shelter's own coordinates. */
  readonly world = new CollisionWorld()
  /** Where you appear coming in through the hatch, and where you look. */
  readonly entry = { stand: v(0.95, SHELTER_EYE, 0), look: v(-1.4, 1.2, 0.2) }
  /** The shelter "station": in front of the radiation monitor. */
  readonly station = { stand: v(0.35, SHELTER_EYE, 0.35), look: v(0, 1.35, ROOM_R) }
  private points: Partial<Record<FocusPoint, THREE.Vector3>> = {
    console: v(0, 1.35, ROOM_R - 0.18),
    door: v(ROOM_R - 0.1, 1.2, 0),
    hatch: v(ROOM_R - 0.1, 1.2, 0),
  }
  private screen: { ctx: CanvasRenderingContext2D; texture: THREE.CanvasTexture; key: string }
  private statusLamp: THREE.MeshStandardMaterial
  private ceilingRing: THREE.MeshStandardMaterial
  private light: THREE.PointLight
  private model: ShelterModel | null = null
  private time = 0

  constructor() {
    this.group.name = 'shelter-interior'
    const panel = interiorPanelTexture()
    panel.repeat.set(5, 1.4)
    const wall = new THREE.MeshStandardMaterial({ map: panel, color: 0xd9d6cc, roughness: 0.9, side: THREE.BackSide })
    const walls = new THREE.Mesh(new THREE.CylinderGeometry(ROOM_R, ROOM_R, CEILING - FLOOR, 48, 1, true), wall)
    walls.position.y = (FLOOR + CEILING) / 2
    const floorMap = floorPlateTexture()
    floorMap.repeat.set(5, 5)
    const floor = new THREE.Mesh(new THREE.CircleGeometry(ROOM_R, 48), new THREE.MeshStandardMaterial({ map: floorMap, roughness: 0.75, metalness: 0.35 }))
    floor.rotation.x = -Math.PI / 2
    floor.position.y = FLOOR
    const ceilingMap = interiorPanelTexture()
    ceilingMap.repeat.set(2, 2)
    const ceiling = new THREE.Mesh(new THREE.CircleGeometry(ROOM_R, 48), new THREE.MeshStandardMaterial({ map: ceilingMap, roughness: 0.9 }))
    ceiling.rotation.x = Math.PI / 2
    ceiling.position.y = CEILING
    this.group.add(walls, floor, ceiling)

    const trim = new THREE.MeshStandardMaterial({ color: 0x59606c, roughness: 0.45, metalness: 0.6 })
    const dark = new THREE.MeshStandardMaterial({ color: 0x23272f, roughness: 0.6, metalness: 0.4 })
    // Structural ribs: a pressure vessel, not a tent.
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.08, CEILING - FLOOR, 0.05), trim)
      rib.position.set(Math.cos(a) * (ROOM_R - 0.03), (FLOOR + CEILING) / 2, Math.sin(a) * (ROOM_R - 0.03))
      rib.rotation.y = -a
      this.group.add(rib)
    }
    // Ceiling light ring.
    this.ceilingRing = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffe6c4, emissiveIntensity: 1.4 })
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.035, 8, 48), this.ceilingRing)
    ring.rotation.x = Math.PI / 2
    ring.position.y = CEILING - 0.04
    this.group.add(ring)
    this.light = new THREE.PointLight(0xffe6c4, 0, 5, 1.4)
    this.light.position.set(0, CEILING - 0.3, 0)
    this.group.add(this.light)

    // The hermetic hatch (+x), with its seal, wheel and status lamp.
    const hatch = new THREE.Group()
    hatch.position.set(ROOM_R - 0.02, 1.15, 0)
    hatch.rotation.y = -Math.PI / 2
    const lid = new THREE.Mesh(new THREE.CircleGeometry(0.62, 40), new THREE.MeshStandardMaterial({ color: 0xc8ccd2, roughness: 0.55, metalness: 0.45 }))
    const seal = new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.05, 10, 40), trim)
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.02, 8, 28), dark)
    wheel.position.z = 0.06
    hatch.add(lid, seal, wheel)
    for (let i = 0; i < 3; i++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.02, 0.02), dark)
      spoke.rotation.z = (i * Math.PI) / 3
      spoke.position.z = 0.06
      hatch.add(spoke)
    }
    hatch.userData.station = 'shelter'
    this.group.add(hatch)
    this.pickables.push(hatch)
    this.statusLamp = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x5aa9ff, emissiveIntensity: 2 })
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.5), this.statusLamp)
    lamp.position.set(ROOM_R - 0.05, 1.95, 0)
    this.group.add(lamp)

    // Bunks for four: two double bunks against the walls.
    const frame = new THREE.MeshStandardMaterial({ color: 0x9aa1ab, roughness: 0.5, metalness: 0.5 })
    const mattress = new THREE.MeshStandardMaterial({ color: 0x2d5fae, roughness: 0.95 })
    const bunk = (x: number, z: number, rotY: number) => {
      const g = new THREE.Group()
      g.position.set(x, 0, z)
      g.rotation.y = rotY
      for (const y of [0.45, 1.25]) {
        g.add(placed(new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.06, 1.85), frame), 0, y, 0))
        g.add(placed(new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.1, 1.78), mattress), 0, y + 0.08, 0))
      }
      for (const px of [-0.34, 0.34]) for (const pz of [-0.9, 0.9]) g.add(placed(new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.4, 0.04), frame), px, 0.85, pz))
      this.group.add(g)
    }
    bunk(-1.25, 0, 0)
    bunk(0, -1.25, Math.PI / 2)
    this.world.addArea({ kind: 'disc', x: 0, z: 0, r: ROOM_R - 0.05 })
    this.world.addObstacle({ kind: 'box', x: -1.25, z: 0, hx: 0.38, hz: 0.95 })
    this.world.addObstacle({ kind: 'box', x: 0, z: -1.25, hx: 0.95, hz: 0.38 })

    // Radiation monitor (+z): storm outside vs behind the walls, from the mission state.
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 0.36), frame)
    desk.position.set(0, 0.95, ROOM_R - 0.3)
    this.group.add(desk)
    this.world.addObstacle({ kind: 'box', x: 0, z: ROOM_R - 0.3, hx: 0.52, hz: 0.2 })
    const canvas = document.createElement('canvas')
    canvas.width = 320
    canvas.height = 200
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    this.screen = { ctx: canvas.getContext('2d')!, texture, key: '' }
    const monitor = new THREE.Group()
    monitor.position.set(0, 1.4, ROOM_R - 0.06)
    monitor.rotation.y = Math.PI
    monitor.add(placed(new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.5, 0.05), dark), 0, 0, -0.03))
    monitor.add(new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.42), new THREE.MeshStandardMaterial({ color: 0, emissive: 0xffffff, emissiveMap: texture, emissiveIntensity: 0.9 })))
    monitor.userData.station = 'shelter'
    this.group.add(monitor)
    this.pickables.push(monitor)
    // Trefoil sign and a handheld dosimeter by the hatch.
    const sign = new THREE.Mesh(new THREE.CircleGeometry(0.16, 32), new THREE.MeshStandardMaterial({ map: trefoilTexture(), roughness: 0.6 }))
    sign.position.set(0.9, 1.95, ROOM_R - 0.25)
    sign.lookAt(0.9 * 0.5, 1.95, 0)
    this.group.add(sign)
    const dosimeter = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.05), new THREE.MeshStandardMaterial({ color: 0xf2c21c, roughness: 0.5 }))
    dosimeter.position.set(ROOM_R - 0.12, 1.3, 0.75)
    this.group.add(dosimeter)

    // Maintenance panel left open: the regolith bags that do the shielding, behind a mesh.
    const niche = new THREE.Group()
    const a = -2.2
    niche.position.set(Math.cos(a) * (ROOM_R - 0.02), 1.45, Math.sin(a) * (ROOM_R - 0.02))
    niche.lookAt(0, 1.45, 0)
    niche.add(placed(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.5, 0.02), new THREE.MeshStandardMaterial({ color: 0x8e887c, roughness: 1 })), 0, 0, -0.02))
    const bag = new THREE.MeshStandardMaterial({ color: 0x8e887c, roughness: 1 })
    for (const [x, y] of [[-0.16, -0.12], [0.16, -0.12], [0, 0.12], [-0.3, 0.12], [0.3, 0.12]]) {
      const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.18, 4, 8), bag)
      b.rotation.z = Math.PI / 2
      b.position.set(x, y, 0.02)
      niche.add(b)
    }
    for (const [w, h, x, y] of [[0.7, 0.04, 0, 0.27], [0.7, 0.04, 0, -0.27], [0.04, 0.58, -0.35, 0], [0.04, 0.58, 0.35, 0]] as const) {
      niche.add(placed(new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), trim), x, y, 0.06))
    }
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.5, 1, 1), new THREE.MeshStandardMaterial({ color: 0x555a63, wireframe: true }))
    mesh.position.z = 0.08
    niche.add(mesh)
    this.group.add(niche)

    // Supplies for the stay: oxygen bottles and water bags.
    const bottle = new THREE.MeshStandardMaterial({ color: 0x199e70, roughness: 0.35, metalness: 0.5 })
    for (const z of [-0.95, -1.15]) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.6, 14), bottle)
      b.position.set(1.15, FLOOR + 0.3, z)
      this.group.add(b)
    }
    const water = new THREE.MeshStandardMaterial({ color: 0x3987e5, roughness: 0.3, transparent: true, opacity: 0.88 })
    for (let i = 0; i < 3; i++) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.2), water)
      w.position.set(0.85 + i * 0.05, FLOOR + 0.15, 1.1 - i * 0.22)
      this.group.add(w)
    }
    this.world.addObstacle({ kind: 'circle', x: 1.15, z: -1.05, r: 0.2 })
    this.world.addObstacle({ kind: 'box', x: 0.9, z: 0.88, hx: 0.2, hz: 0.35 })

    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.receiveShadow = false
        o.castShadow = false
      }
    })
    this.setActive(false)
  }

  setActive(active: boolean) {
    this.group.visible = active
    this.light.intensity = active ? 2.6 : 0
  }

  /** World position of a point of interest. */
  point(focus: FocusPoint | null | undefined): THREE.Vector3 {
    const local = (focus && this.points[focus]) || this.points.console!
    return this.group.localToWorld(local.clone())
  }

  stationOf(object: THREE.Object3D | null): 'shelter' | null {
    let o: THREE.Object3D | null = object
    while (o && o.userData.station === undefined) o = o.parent
    return o ? 'shelter' : null
  }

  setState(model: ShelterModel) {
    this.model = model
    this.statusLamp.emissive.setHex(!model.operational ? 0x6b7280 : model.crewInside ? 0x3ddc84 : model.storm ? 0xffb020 : 0x5aa9ff)
    this.ceilingRing.emissiveIntensity = model.operational ? 1.4 : 0.3
    const key = `${model.outsideRate}|${model.insideRate}|${model.crewInside}|${model.operational}`
    if (key === this.screen.key) return
    this.screen.key = key
    const { ctx } = this.screen
    const w = 320
    const h = 200
    ctx.fillStyle = '#061018'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = 'rgba(90,209,255,0.25)'
    ctx.lineWidth = 2
    ctx.strokeRect(4, 4, w - 8, h - 8)
    ctx.font = '600 22px "Space Grotesk", "Inter", system-ui, sans-serif'
    ctx.textBaseline = 'middle'
    // Two bars on the same scale: the storm outside, and what passes the walls. Numbers in mSv/day.
    const max = Math.max(1, model.outsideRate)
    const rows: [string, number, string][] = [
      ['☢', model.outsideRate, '#ff6a5a'],
      ['⌂', model.insideRate, '#3ddc84'],
    ]
    rows.forEach(([icon, value, color], i) => {
      const y = 50 + i * 62
      ctx.fillStyle = color
      ctx.textAlign = 'left'
      ctx.fillText(icon, 18, y)
      ctx.fillStyle = 'rgba(255,255,255,0.08)'
      ctx.fillRect(52, y - 12, 160, 24)
      ctx.fillStyle = color
      ctx.fillRect(52, y - 12, 160 * Math.min(1, value / max), 24)
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'right'
      ctx.fillText(value > 0 ? value.toFixed(value < 10 ? 1 : 0) : '0', w - 18, y)
    })
    ctx.fillStyle = '#8390ad'
    ctx.textAlign = 'right'
    ctx.font = '600 16px "Inter", system-ui, sans-serif'
    ctx.fillText('mSv/d', w - 18, 170)
    if (model.crewInside) {
      ctx.fillStyle = '#3ddc84'
      ctx.beginPath()
      ctx.moveTo(30, 150)
      ctx.lineTo(48, 140)
      ctx.lineTo(66, 150)
      ctx.lineTo(66, 165)
      ctx.quadraticCurveTo(48, 190, 30, 165)
      ctx.closePath()
      ctx.fill()
    }
    this.screen.texture.needsUpdate = true
  }

  update(dt: number) {
    this.time += dt
    if (!this.group.visible || !this.model) return
    if (this.model.storm && !this.model.crewInside) this.statusLamp.emissiveIntensity = 1 + Math.max(0, Math.sin(this.time * 4)) * 2
    else this.statusLamp.emissiveIntensity = 2
  }
}
