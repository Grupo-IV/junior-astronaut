// Simple, readable structures built from primitives. Each visual shows its
// status with a beacon (colour AND blink pattern, so it doesn't rely on colour alone).
import * as THREE from 'three'
import type { BuildingId } from '../../types/game'
import type { SceneBuilding, VisualStatus } from '../scene/sceneModel'

const mat = {
  white: new THREE.MeshStandardMaterial({ color: 0xe8e8e4, roughness: 0.6, metalness: 0.1 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.4, metalness: 0.7 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x2c2f36, roughness: 0.7, metalness: 0.3 }),
  panel: new THREE.MeshStandardMaterial({ color: 0x1b2f6b, roughness: 0.25, metalness: 0.6, side: THREE.DoubleSide }),
  gold: new THREE.MeshStandardMaterial({ color: 0xc9a13b, roughness: 0.35, metalness: 0.9 }),
  water: new THREE.MeshStandardMaterial({ color: 0x3aa0d8, roughness: 0.3, metalness: 0.2 }),
  regolith: new THREE.MeshStandardMaterial({ color: 0x8a857a, roughness: 1, flatShading: true }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0xcfe8ff, roughness: 0.05, transmission: 0.6, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
  plant: new THREE.MeshStandardMaterial({ color: 0x3fbf5a, roughness: 0.8 }),
}

const STATUS_COLOR: Record<VisualStatus, number> = {
  running: 0x3ddc84,
  passive: 0x5aa9ff,
  off: 0x6b7280,
  unpowered: 0xffb020,
  failed: 0xff3b3b,
}

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(geometry, material)
  m.position.set(x, y, z)
  m.castShadow = true
  m.receiveShadow = true
  return m
}

export class BuildingVisual {
  readonly group = new THREE.Group()
  private beacon: THREE.Mesh
  private beaconMat: THREE.MeshBasicMaterial
  private status: VisualStatus = 'running'
  private panel?: THREE.Object3D
  private plants: THREE.Mesh[] = []
  private growLight?: THREE.PointLight
  private batteryBar?: THREE.Mesh
  private fan?: THREE.Object3D

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
    this.beaconMat = new THREE.MeshBasicMaterial({ color: STATUS_COLOR.running })
    this.beacon = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), this.beaconMat)
    this.beacon.position.y = beaconHeight
    this.group.add(this.beacon)
  }

  private buildSolar(): number {
    this.group.add(mesh(new THREE.CylinderGeometry(0.12, 0.18, 6, 8), mat.metal, 0, 3, 0))
    const panel = new THREE.Group()
    const cells = mesh(new THREE.BoxGeometry(3.2, 4.6, 0.08), mat.panel)
    const frame = mesh(new THREE.BoxGeometry(3.4, 0.1, 0.12), mat.metal, 0, 2.35, 0)
    panel.add(cells, frame)
    panel.position.y = 4.2
    this.group.add(panel)
    this.panel = panel
    return 6.6
  }

  private buildBattery(): number {
    this.group.add(mesh(new THREE.BoxGeometry(1.8, 1.3, 1.3), mat.white, 0, 0.65, 0))
    this.group.add(mesh(new THREE.BoxGeometry(1.9, 0.12, 1.4), mat.dark, 0, 1.36, 0))
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.18, 0.02), new THREE.MeshBasicMaterial({ color: 0x3ddc84 }))
    bar.position.set(0, 0.7, 0.66)
    this.group.add(bar)
    this.batteryBar = bar
    return 2
  }

  private buildRecycler(): number {
    this.group.add(mesh(new THREE.BoxGeometry(2.4, 1.8, 1.8), mat.white, 0, 0.9, 0))
    this.group.add(mesh(new THREE.CylinderGeometry(0.7, 0.7, 2.4, 16), mat.water, 1.8, 1.2, 0))
    const fan = mesh(new THREE.BoxGeometry(0.9, 0.08, 0.18), mat.dark, -0.4, 1.86, 0)
    this.group.add(fan)
    this.fan = fan
    return 3
  }

  private buildOxygen(): number {
    this.group.add(mesh(new THREE.CylinderGeometry(0.55, 0.55, 2.8, 16), mat.white, -0.6, 1.4, 0))
    this.group.add(mesh(new THREE.CylinderGeometry(0.4, 0.4, 2.2, 16), mat.metal, 0.6, 1.1, 0))
    this.group.add(mesh(new THREE.SphereGeometry(0.55, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat.white, -0.6, 2.8, 0))
    this.group.add(mesh(new THREE.TorusGeometry(0.35, 0.06, 8, 16), mat.gold, 0, 1.9, 0.3))
    return 3.8
  }

  private buildGreenhouse(): number {
    this.group.add(mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.3, 32), mat.metal, 0, 0.15, 0))
    const dome = new THREE.Mesh(new THREE.SphereGeometry(3, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat.glass)
    dome.position.y = 0.3
    this.group.add(dome)
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2
      const r = i % 2 === 0 ? 1.1 : 2.1
      const plant = mesh(new THREE.ConeGeometry(0.28, 0.9, 6), mat.plant, Math.cos(a) * r, 0.75, Math.sin(a) * r)
      this.plants.push(plant)
      this.group.add(plant)
    }
    this.growLight = new THREE.PointLight(0xff4fd8, 4, 6)
    this.growLight.position.y = 2
    this.group.add(this.growLight)
    return 3.8
  }

  private buildShelter(): number {
    const geo = new THREE.SphereGeometry(3.2, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2)
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const bump = 1 + Math.sin(i * 12.9898) * 0.05
      pos.setXYZ(i, pos.getX(i) * bump, pos.getY(i) * bump, pos.getZ(i) * bump)
    }
    geo.computeVertexNormals()
    this.group.add(mesh(geo, mat.regolith, 0, 0, 0))
    this.group.add(mesh(new THREE.BoxGeometry(1.3, 1.8, 1.2), mat.white, 0, 0.9, 3.1))
    return 4
  }

  setState(b: SceneBuilding) {
    this.status = b.status
    this.beaconMat.color.setHex(STATUS_COLOR[b.status])
    const active = b.status === 'running'
    this.plants.forEach((p, i) => {
      const s = Math.max(0.05, b.growth) * (0.8 + (i % 3) * 0.15)
      p.scale.setScalar(s)
      p.visible = b.growth > 0.02
    })
    if (this.growLight) this.growLight.intensity = active ? 4 : 0
  }

  setBatteryLevel(fraction: number) {
    if (!this.batteryBar) return
    this.batteryBar.scale.x = Math.max(0.02, fraction)
    ;(this.batteryBar.material as THREE.MeshBasicMaterial).color.setHex(fraction > 0.3 ? 0x3ddc84 : fraction > 0.1 ? 0xffb020 : 0xff3b3b)
  }

  update(t: number, sunDirection: THREE.Vector3) {
    // Blink patterns: failed = fast blink, unpowered = slow pulse.
    if (this.status === 'failed') this.beacon.visible = Math.floor(t * 4) % 2 === 0
    else if (this.status === 'unpowered') {
      this.beacon.visible = true
      this.beacon.scale.setScalar(0.8 + Math.sin(t * 3) * 0.25)
    } else {
      this.beacon.visible = true
      this.beacon.scale.setScalar(1)
    }
    if (this.panel) this.panel.rotation.y = Math.atan2(sunDirection.x, sunDirection.z)
    if (this.fan && this.status === 'running') this.fan.rotation.y = t * 6
  }
}
