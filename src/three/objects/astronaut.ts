// A small astronaut who walks between the habitat and the base's structures.
import * as THREE from 'three'

export class Astronaut {
  readonly group = new THREE.Group()
  private targets: THREE.Vector3[] = [new THREE.Vector3(0, 0, 4.5)]
  private target = new THREE.Vector3(0, 0, 4.5)
  private wait = 2
  private phase = 0

  constructor() {
    const suit = new THREE.MeshStandardMaterial({ color: 0xf5f5f2, roughness: 0.7 })
    const visor = new THREE.MeshStandardMaterial({ color: 0xd4a93a, roughness: 0.15, metalness: 1 })
    const pack = new THREE.MeshStandardMaterial({ color: 0xcfd2d6, roughness: 0.6 })
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.55, 6, 12), suit)
    body.position.y = 0.75
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 16), suit)
    helmet.position.y = 1.45
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16, -Math.PI / 2, Math.PI, Math.PI / 4, Math.PI / 2.2), visor)
    face.position.set(0, 1.45, 0.08)
    const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.55, 0.22), pack)
    backpack.position.set(0, 0.95, -0.3)
    this.group.add(body, helmet, face, backpack)
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.castShadow = true
    })
    this.group.position.set(0, 0, 4.5)
  }

  setTargets(points: THREE.Vector3[]) {
    this.targets = [new THREE.Vector3(0, 0, 4.5), ...points]
  }

  /** During a storm or a power emergency the crew stays inside. */
  setIndoors(indoors: boolean) {
    this.group.visible = !indoors
  }

  update(dt: number) {
    if (!this.group.visible) return
    const pos = this.group.position
    const toTarget = new THREE.Vector3().subVectors(this.target, pos).setY(0)
    const dist = toTarget.length()
    if (dist < 0.3) {
      this.wait -= dt
      pos.y = 0
      if (this.wait <= 0) {
        const next = this.targets[Math.floor(Math.random() * this.targets.length)]
        this.target.copy(next)
        this.wait = 1.5 + Math.random() * 3
      }
      return
    }
    // Lunar "bunny hop": low gravity makes astronauts bounce.
    const speed = 1.6
    toTarget.normalize()
    pos.addScaledVector(toTarget, Math.min(dist, speed * dt))
    this.phase += dt * 7
    pos.y = Math.abs(Math.sin(this.phase)) * 0.25
    this.group.rotation.y = Math.atan2(toTarget.x, toTarget.z)
  }
}
