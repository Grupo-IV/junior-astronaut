/**
 * @file
 * @brief Visible air flow towards a hull breach.
 *
 * Air leaving a pressurised cabin rushes *towards* the crack: dust and lint
 * drift to it, and the gas cools as it accelerates, so moisture condenses in a
 * small mist right at the opening. Particles therefore converge on the breach
 * and vanish into it; they never spray out into the room.
 */
import * as THREE from 'three'
import { glowTexture } from '../textures/textures'

const COUNT = 240

export class LeakJet {
  readonly points: THREE.Points
  private positions: Float32Array
  private colors: Float32Array
  private velocity: Float32Array
  private life: Float32Array
  private material: THREE.PointsMaterial
  private target = new THREE.Vector3()
  /** Where particles appear: a box (centre, half size) the air is drawn from. */
  private spawnCentre = new THREE.Vector3()
  private spawnHalf = new THREE.Vector3(0.4, 0.6, 0.4)
  private strength = 0
  private targetStrength = 0

  constructor() {
    this.positions = new Float32Array(COUNT * 3)
    this.colors = new Float32Array(COUNT * 3)
    this.velocity = new Float32Array(COUNT * 3)
    this.life = new Float32Array(COUNT)
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3))
    this.material = new THREE.PointsMaterial({
      size: 0.035,
      map: glowTexture('rgba(235,245,255,1)'),
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    })
    this.points = new THREE.Points(geometry, this.material)
    this.points.frustumCulled = false
    this.points.visible = false
    for (let i = 0; i < COUNT; i++) this.respawn(i, Math.random())
  }

  /** Breach position and the region the air is drawn from (local coordinates of the parent). */
  aim(target: THREE.Vector3, spawnCentre: THREE.Vector3, spawnHalf: THREE.Vector3) {
    this.target.copy(target)
    this.spawnCentre.copy(spawnCentre)
    this.spawnHalf.copy(spawnHalf)
    for (let i = 0; i < COUNT; i++) this.respawn(i, Math.random())
  }

  /** 0 = sealed, 0.35 = slow seep, 1 = open breach. */
  setStrength(strength: number) {
    this.targetStrength = strength
  }

  private respawn(i: number, age = 0) {
    const p = i * 3
    // Near particles form the condensation mist; far ones are dust drawn in from the room.
    const mist = Math.random() < 0.35
    if (mist) {
      this.positions[p] = this.target.x + (Math.random() - 0.5) * 0.12
      this.positions[p + 1] = this.target.y + (Math.random() - 0.5) * 0.12
      this.positions[p + 2] = this.target.z + (Math.random() - 0.5) * 0.12
    } else {
      this.positions[p] = this.spawnCentre.x + (Math.random() * 2 - 1) * this.spawnHalf.x
      this.positions[p + 1] = this.spawnCentre.y + (Math.random() * 2 - 1) * this.spawnHalf.y
      this.positions[p + 2] = this.spawnCentre.z + (Math.random() * 2 - 1) * this.spawnHalf.z
    }
    this.velocity[p] = this.velocity[p + 1] = this.velocity[p + 2] = 0
    this.life[i] = age
  }

  update(dt: number) {
    this.strength += (this.targetStrength - this.strength) * Math.min(1, dt * 1.5)
    this.points.visible = this.strength > 0.02
    if (!this.points.visible) return
    const pull = 2.2 + 5 * this.strength
    const active = Math.floor(COUNT * Math.min(1, 0.25 + this.strength))
    for (let i = 0; i < COUNT; i++) {
      const p = i * 3
      if (i >= active) {
        this.colors[p] = this.colors[p + 1] = this.colors[p + 2] = 0
        continue
      }
      const dx = this.target.x - this.positions[p]
      const dy = this.target.y - this.positions[p + 1]
      const dz = this.target.z - this.positions[p + 2]
      const d = Math.hypot(dx, dy, dz) + 1e-4
      // Flow speeds up close to the breach (the air accelerates through the opening).
      const a = (pull / (0.25 + d)) * dt
      this.velocity[p] = this.velocity[p] * 0.96 + (dx / d) * a + (Math.random() - 0.5) * 0.02
      this.velocity[p + 1] = this.velocity[p + 1] * 0.96 + (dy / d) * a + (Math.random() - 0.5) * 0.02
      this.velocity[p + 2] = this.velocity[p + 2] * 0.96 + (dz / d) * a + (Math.random() - 0.5) * 0.02
      this.positions[p] += this.velocity[p] * dt
      this.positions[p + 1] += this.velocity[p + 1] * dt
      this.positions[p + 2] += this.velocity[p + 2] * dt
      this.life[i] += dt
      if (d < 0.03 || this.life[i] > 4) {
        this.respawn(i)
        continue
      }
      // Mist glows white near the breach; dust farther away is faint.
      const near = Math.max(0, 1 - d / 0.35)
      const fadeIn = Math.min(1, this.life[i] * 3)
      const b = (0.12 + 0.75 * near) * fadeIn * this.strength
      this.colors[p] = b
      this.colors[p + 1] = b
      this.colors[p + 2] = b * 1.08
    }
    ;(this.points.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true
    ;(this.points.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true
  }
}
