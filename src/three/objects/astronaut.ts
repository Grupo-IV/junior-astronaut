/**
 * @file
 * @brief An articulated astronaut in a surface suit who walks between structures.
 *
 * Lunar gravity is one sixth of Earth's, so the walk is a slow, bouncy lope
 * with long airborne phases, as in the Apollo footage.
 */
import * as THREE from 'three'

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
  private targets: THREE.Vector3[] = [new THREE.Vector3(0, 0, 5.5)]
  private target = new THREE.Vector3(0, 0, 5.5)
  private wait = 2
  private phase = 0
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
    this.group.position.set(0, heightAt(0, 5.5), 5.5)
  }

  setTargets(points: THREE.Vector3[]) {
    this.targets = [new THREE.Vector3(0, 0, 5.5), ...points]
  }

  setIndoors(indoors: boolean) {
    this.group.visible = !indoors
  }

  update(dt: number) {
    if (!this.group.visible) return
    const pos = this.group.position
    const toTarget = new THREE.Vector3(this.target.x - pos.x, 0, this.target.z - pos.z)
    const dist = toTarget.length()
    const ground = this.heightAt(pos.x, pos.z)
    if (dist < 0.3) {
      this.wait -= dt
      pos.y = ground
      // Idle: arms relax, slight breathing sway.
      this.phase += dt
      this.legs.forEach((l) => (l.rotation.x *= 0.85))
      this.arms.forEach((a, i) => (a.rotation.x = Math.sin(this.phase * 1.5 + i) * 0.05))
      this.body.position.y = Math.sin(this.phase * 2) * 0.01
      if (this.wait <= 0) {
        this.target.copy(this.targets[Math.floor(Math.random() * this.targets.length)])
        this.wait = 2 + Math.random() * 4
      }
      return
    }
    const speed = 1.4
    toTarget.normalize()
    pos.addScaledVector(toTarget, Math.min(dist, speed * dt))
    this.phase += dt * 5.5
    const s = Math.sin(this.phase)
    pos.y = ground + Math.abs(s) * 0.22 // low-gravity hop
    this.legs[0].rotation.x = s * 0.55
    this.legs[1].rotation.x = -s * 0.55
    this.arms[0].rotation.x = -s * 0.45
    this.arms[1].rotation.x = s * 0.45
    this.body.rotation.x = 0.12
    this.group.rotation.y = Math.atan2(toTarget.x, toTarget.z)
  }
}
