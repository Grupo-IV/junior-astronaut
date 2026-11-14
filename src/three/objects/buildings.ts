/**
 * @file
 * @brief Detailed models of the outpost structures and their status beacons.
 *
 * Each model is built from simple shapes but follows real hardware: vertical
 * solar arrays that track the low polar Sun, battery containers with
 * radiators, recycler and electrolyser racks with tanks and plumbing, an
 * inflatable LED greenhouse, and a shelter buried under regolith bags.
 */
import * as THREE from 'three'
import type { BuildingId } from '../../types/game'
import type { SceneBuilding, VisualStatus } from '../scene/sceneModel'
import { seededRandom } from '../textures/noise'
import { halo, materials, mesh } from './materials'

const STATUS_COLOR: Record<VisualStatus, number> = {
  running: 0x3ddc84,
  passive: 0x5aa9ff,
  off: 0x6b7280,
  unpowered: 0xffb020,
  failed: 0xff3b3b,
}

function pipe(points: [number, number, number][], radius: number, material: THREE.Material): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.1)
  return mesh(new THREE.TubeGeometry(curve, 24, radius, 8, false), material)
}

export class BuildingVisual {
  readonly group = new THREE.Group()
  private beacon: THREE.Mesh
  private beaconMat: THREE.MeshStandardMaterial
  private beaconHalo: THREE.Sprite
  private status: VisualStatus = 'running'
  private trackers: THREE.Object3D[] = []
  private plants: THREE.Mesh[] = []
  private growLight?: THREE.PointLight
  private growGlow?: THREE.Sprite
  private batteryBars: THREE.Mesh[] = []
  private fans: THREE.Object3D[] = []

  constructor(readonly uid: string, readonly defId: BuildingId) {
    this.group.userData.uid = uid
    let beaconHeight = 3
    switch (defId) {
      case 'solar_array':
        beaconHeight = this.buildSolar()
        break
      case 'battery':
        beaconHeight = this.buildBattery()
        break
      case 'water_recycler':
        beaconHeight = this.buildRecycler()
        break
      case 'oxygen_generator':
        beaconHeight = this.buildOxygen()
        break
      case 'greenhouse':
        beaconHeight = this.buildGreenhouse()
        break
      case 'radiation_shelter':
        beaconHeight = this.buildShelter()
        break
    }
    const m = materials()
    this.group.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), m.metal, 0, beaconHeight - 0.3, 0))
    this.beaconMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: STATUS_COLOR.running, emissiveIntensity: 3 })
    this.beacon = mesh(new THREE.SphereGeometry(0.17, 14, 14), this.beaconMat, 0, beaconHeight, 0, false)
    this.beaconHalo = halo(STATUS_COLOR.running, 1.3, 0.55)
    this.beaconHalo.position.y = beaconHeight
    this.group.add(this.beacon, this.beaconHalo)
  }

  /** Two vertical wings on a lattice mast; a gimbal turns them to face the Sun. */
  private buildSolar(): number {
    const m = materials()
    this.group.add(mesh(new THREE.CylinderGeometry(0.9, 1.1, 0.3, 8), m.darkMetal, 0, 0.15, 0))
    this.group.add(mesh(new THREE.CylinderGeometry(0.16, 0.22, 8.6, 10), m.metal, 0, 4.4, 0))
    for (let i = 0; i < 6; i++) {
      const brace = mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 4), m.metal, 0, 1 + i * 1.3, 0)
      brace.rotation.z = i % 2 ? 0.9 : -0.9
      this.group.add(brace)
    }
    const head = new THREE.Group()
    head.position.y = 6.2
    head.add(mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), m.dark))
    for (const side of [-1, 1]) {
      const wing = new THREE.Group()
      wing.add(mesh(new THREE.BoxGeometry(2.8, 5.2, 0.06), m.solarCells))
      wing.add(mesh(new THREE.BoxGeometry(2.9, 0.08, 0.1), m.metal, 0, 2.62, 0))
      wing.add(mesh(new THREE.BoxGeometry(2.9, 0.08, 0.1), m.metal, 0, -2.62, 0))
      wing.add(mesh(new THREE.BoxGeometry(0.06, 5.3, 0.1), m.metal, side * 1.45, 0, 0))
      wing.position.x = side * 1.75
      head.add(wing)
    }
    head.add(mesh(new THREE.BoxGeometry(0.7, 0.08, 0.08), m.metal, 0, 0, 0))
    this.group.add(head)
    this.trackers.push(head)
    return 9.2
  }

  /** A ribbed battery container with radiator fins and a charge strip. */
  private buildBattery(): number {
    const m = materials()
    this.group.add(mesh(new THREE.BoxGeometry(2.2, 0.15, 1.6), m.darkMetal, 0, 0.08, 0))
    this.group.add(mesh(new THREE.BoxGeometry(2, 1.4, 1.4), m.white, 0, 0.85, 0))
    for (let i = -3; i <= 3; i++) this.group.add(mesh(new THREE.BoxGeometry(0.06, 1.3, 1.46), m.metal, i * 0.28, 0.85, 0))
    this.group.add(mesh(new THREE.BoxGeometry(2.1, 0.1, 1.5), m.darkMetal, 0, 1.6, 0))
    const fins = mesh(new THREE.BoxGeometry(1.6, 0.04, 0.9), m.radiator, 0, 2.05, 0)
    fins.rotation.x = 0.35
    this.group.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6), m.metal, 0, 1.8, 0), fins)
    for (let i = 0; i < 5; i++) {
      const cell = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.02), new THREE.MeshStandardMaterial({ color: 0x0a0a0a, emissive: 0x3ddc84, emissiveIntensity: 2.2 }))
      cell.position.set(-0.6 + i * 0.3, 1.05, 0.715)
      this.group.add(cell)
      this.batteryBars.push(cell)
    }
    return 2.7
  }

  /** Water recovery: process rack, a pair of spherical tanks, plumbing and a cooling fan. */
  private buildRecycler(): number {
    const m = materials()
    this.group.add(mesh(new THREE.BoxGeometry(3.6, 0.15, 2.4), m.darkMetal, 0, 0.08, 0))
    this.group.add(mesh(new THREE.BoxGeometry(2, 1.9, 1.7), m.hull, -0.6, 1.1, 0))
    for (const z of [-0.6, 0.6]) {
      this.group.add(mesh(new THREE.SphereGeometry(0.62, 24, 16), m.water, 1.15, 0.95, z))
      this.group.add(mesh(new THREE.TorusGeometry(0.62, 0.04, 6, 24), m.metal, 1.15, 0.95, z))
    }
    this.group.add(pipe([[0.4, 1.4, 0.3], [0.8, 1.7, 0.4], [1.15, 1.57, 0.6]], 0.06, m.metal))
    this.group.add(pipe([[0.4, 0.7, -0.3], [0.8, 0.5, -0.5], [1.15, 0.4, -0.6]], 0.06, m.metal))
    const fanHousing = mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.14, 20), m.dark, -0.6, 2.1, 0)
    const fan = new THREE.Group()
    for (let i = 0; i < 4; i++) {
      const blade = mesh(new THREE.BoxGeometry(0.75, 0.02, 0.14), m.metal)
      blade.rotation.y = (i * Math.PI) / 2
      fan.add(blade)
    }
    fan.position.set(-0.6, 2.19, 0)
    this.group.add(fanHousing, fan)
    this.fans.push(fan)
    const panel = mesh(new THREE.PlaneGeometry(0.6, 0.4), new THREE.MeshStandardMaterial({ color: 0x0b1220, emissive: 0x2a8cff, emissiveIntensity: 1.4 }), -0.6, 1.3, 0.86, false)
    this.group.add(panel)
    return 3
  }

  /** Electrolyser: tall pressure tanks, a cell stack with gauges, and a radiator. */
  private buildOxygen(): number {
    const m = materials()
    this.group.add(mesh(new THREE.BoxGeometry(2.8, 0.15, 2), m.darkMetal, 0, 0.08, 0))
    for (const [x, z, h] of [[-0.8, -0.4, 2.8], [-0.8, 0.5, 2.4]] as const) {
      this.group.add(mesh(new THREE.CylinderGeometry(0.42, 0.42, h, 24), m.white, x, h / 2 + 0.15, z))
      this.group.add(mesh(new THREE.SphereGeometry(0.42, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), m.white, x, h + 0.15, z))
      for (const y of [0.6, h - 0.3]) this.group.add(mesh(new THREE.TorusGeometry(0.43, 0.035, 6, 24), m.blue, x, y, z).rotateX(Math.PI / 2))
    }
    this.group.add(mesh(new THREE.BoxGeometry(1.1, 1.5, 1.2), m.hull, 0.7, 0.9, 0))
    for (let i = 0; i < 5; i++) this.group.add(mesh(new THREE.BoxGeometry(1.14, 0.05, 1.24), m.metal, 0.7, 0.35 + i * 0.27, 0))
    for (const z of [-0.3, 0.3]) {
      const gauge = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 16), m.darkMetal, 0.7, 1.4, 0.62 + 0.01)
      gauge.position.z = 0.62
      gauge.position.x = 0.7 + z
      gauge.rotation.x = Math.PI / 2
      this.group.add(gauge)
    }
    this.group.add(pipe([[-0.4, 2.2, -0.4], [0.2, 2.1, -0.2], [0.7, 1.7, 0]], 0.05, m.metal))
    const rad = mesh(new THREE.BoxGeometry(0.04, 1.2, 1.4), m.radiator, 1.4, 2.1, 0)
    rad.rotation.z = -0.3
    this.group.add(rad)
    return 3.8
  }

  /** Inflatable dome with ribs, LED-lit hydroponic racks inside. */
  private buildGreenhouse(): number {
    const m = materials()
    this.group.add(mesh(new THREE.CylinderGeometry(3.35, 3.45, 0.35, 40), m.darkMetal, 0, 0.17, 0))
    const dome = new THREE.Mesh(new THREE.SphereGeometry(3.15, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), m.glass)
    dome.position.y = 0.34
    this.group.add(dome)
    for (let i = 0; i < 8; i++) {
      const rib = mesh(new THREE.TorusGeometry(3.17, 0.05, 6, 40, Math.PI), m.white, 0, 0.34, 0)
      rib.rotation.y = (i / 8) * Math.PI
      this.group.add(rib)
    }
    const ring = mesh(new THREE.TorusGeometry(2.75, 0.05, 6, 40), m.white, 0, 1.9, 0)
    ring.rotation.x = Math.PI / 2
    this.group.add(ring)
    // Two rows of racks with plants.
    const rand = seededRandom(17)
    for (const z of [-1, 1]) {
      this.group.add(mesh(new THREE.BoxGeometry(3.6, 0.1, 0.7), m.white, 0, 0.75, z))
      this.group.add(mesh(new THREE.BoxGeometry(3.6, 0.1, 0.7), m.white, 0, 1.45, z))
      for (let k = 0; k < 16; k++) {
        const shelf = k % 2 ? 1.5 : 0.8
        const plant = mesh(new THREE.SphereGeometry(0.17, 8, 6), k % 3 ? m.plant : m.plantDark, -1.6 + Math.floor(k / 2) * 0.45, shelf + 0.12, z + (rand() - 0.5) * 0.3)
        plant.scale.y = 1.3
        this.plants.push(plant)
        this.group.add(plant)
      }
    }
    this.growLight = new THREE.PointLight(0xff5ad8, 6, 7, 1.5)
    this.growLight.position.y = 2
    this.growGlow = halo(0xff6be0, 6, 0.35)
    this.growGlow.position.y = 1.4
    this.group.add(this.growLight, this.growGlow)
    // Airlock tunnel.
    const tunnel = mesh(new THREE.CylinderGeometry(0.7, 0.7, 1.4, 20), m.white, 0, 0.9, 3.5)
    tunnel.rotation.x = Math.PI / 2
    this.group.add(tunnel)
    return 4
  }

  /** A shelter buried under rings of regolith-filled bags, with a reinforced entrance. */
  private buildShelter(): number {
    const m = materials()
    const rand = seededRandom(23)
    const bagGeo = new THREE.CapsuleGeometry(0.3, 0.62, 4, 8)
    bagGeo.rotateZ(Math.PI / 2)
    const rows = 6
    let count = 0
    const bags = new THREE.InstancedMesh(bagGeo, m.bag, 400)
    const mtx = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    for (let r = 0; r < rows; r++) {
      const radius = 3.3 - r * 0.46
      const y = 0.27 + r * 0.4
      const n = Math.floor((2 * Math.PI * radius) / 0.78)
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + (r % 2) * 0.2
        if (Math.abs(a - Math.PI / 2) < 0.35 && r < 3) continue // doorway
        q.setFromEuler(new THREE.Euler(0, -a + (rand() - 0.5) * 0.15, (rand() - 0.5) * 0.1))
        mtx.compose(new THREE.Vector3(Math.cos(a) * radius, y, Math.sin(a) * radius), q, new THREE.Vector3(1, 0.72 + rand() * 0.12, 1.15))
        bags.setMatrixAt(count++, mtx)
      }
    }
    bags.count = count
    bags.castShadow = true
    bags.receiveShadow = true
    this.group.add(bags)
    const cap = mesh(new THREE.SphereGeometry(1.25, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), m.bag, 0, 2.55, 0)
    this.group.add(cap)
    const frame = mesh(new THREE.BoxGeometry(1.4, 1.6, 0.25), m.metal, 0, 0.8, 3.25)
    const door = mesh(new THREE.BoxGeometry(1, 1.3, 0.06), m.darkMetal, 0, 0.75, 3.39)
    const sign = mesh(new THREE.PlaneGeometry(0.5, 0.2), new THREE.MeshStandardMaterial({ color: 0x1a1200, emissive: 0xffc23d, emissiveIntensity: 1.6 }), 0, 1.75, 3.39, false)
    this.group.add(frame, door, sign)
    return 4.2
  }

  setState(b: SceneBuilding) {
    this.status = b.status
    this.beaconMat.emissive.setHex(STATUS_COLOR[b.status])
    this.beaconHalo.material.color.setHex(STATUS_COLOR[b.status])
    const active = b.status === 'running'
    this.plants.forEach((p, i) => {
      const s = Math.max(0.05, b.growth) * (0.75 + (i % 3) * 0.15)
      p.scale.set(s, s * 1.3, s)
      p.visible = b.growth > 0.02
    })
    if (this.growLight) this.growLight.intensity = active ? 6 : 0
    if (this.growGlow) this.growGlow.visible = active
  }

  setBatteryLevel(fraction: number) {
    const lit = Math.ceil(Math.max(0, Math.min(1, fraction)) * this.batteryBars.length)
    const color = fraction > 0.3 ? 0x3ddc84 : fraction > 0.1 ? 0xffb020 : 0xff3b3b
    this.batteryBars.forEach((bar, i) => {
      const mat = bar.material as THREE.MeshStandardMaterial
      mat.emissive.setHex(color)
      mat.emissiveIntensity = i < lit ? 2.2 : 0.05
    })
  }

  update(t: number, sunDirection: THREE.Vector3) {
    if (this.status === 'failed') {
      const on = Math.floor(t * 4) % 2 === 0
      this.beacon.visible = on
      this.beaconHalo.visible = on
    } else if (this.status === 'unpowered') {
      this.beacon.visible = this.beaconHalo.visible = true
      this.beacon.scale.setScalar(0.8 + Math.sin(t * 3) * 0.25)
    } else {
      this.beacon.visible = this.beaconHalo.visible = true
      this.beacon.scale.setScalar(1)
    }
    for (const tr of this.trackers) tr.rotation.y = Math.atan2(sunDirection.x, sunDirection.z)
    if (this.status === 'running') for (const f of this.fans) f.rotation.y = t * 8
  }
}
