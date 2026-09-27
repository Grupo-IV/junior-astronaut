/**
 * @file
 * @brief Creates the solar storm particle effect.
 */
import * as THREE from 'three'

export class StormParticles {
  readonly points: THREE.Points
  private velocities: Float32Array
  private count: number
  private active = false
  private material: THREE.PointsMaterial

  constructor(count = 900) {
    this.count = count
    const positions = new Float32Array(count * 3)
    this.velocities = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      positions.set(this.randomStart(), i * 3)
      this.velocities[i] = 20 + Math.random() * 25
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.material = new THREE.PointsMaterial({
      color: 0xff7a3d,
      size: 0.35,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    this.points = new THREE.Points(geometry, this.material)
    this.points.frustumCulled = false
  }

  private randomStart(): [number, number, number] {
    return [(Math.random() - 0.5) * 70, 15 + Math.random() * 25, (Math.random() - 0.5) * 70]
  }

  setActive(active: boolean) {
    this.active = active
  }

  update(dt: number, sunDirection: THREE.Vector3) {
    const target = this.active ? 0.9 : 0
    this.material.opacity += (target - this.material.opacity) * Math.min(1, dt * 2)
    this.points.visible = this.material.opacity > 0.01
    if (!this.points.visible) return
    const pos = this.points.geometry.attributes.position as THREE.BufferAttribute
    const dir = new THREE.Vector3(-sunDirection.x, -0.6, -sunDirection.z).normalize()
    for (let i = 0; i < this.count; i++) {
      const v = this.velocities[i] * dt
      let x = pos.getX(i) + dir.x * v
      let y = pos.getY(i) + dir.y * v
      let z = pos.getZ(i) + dir.z * v
      if (y < 0) [x, y, z] = this.randomStart()
      pos.setXYZ(i, x, y, z)
    }
    pos.needsUpdate = true
  }
}
