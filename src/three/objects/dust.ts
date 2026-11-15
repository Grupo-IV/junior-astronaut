/**
 * @file
 * @brief Regolith kicked up by boots.
 *
 * With no air on the Moon there is no drag and no floating cloud: every grain
 * flies on a clean parabola under 1.62 m/s² and drops straight back, as in the
 * Apollo rover footage.
 */
import * as THREE from 'three'
import { MOON_GRAVITY } from '../physics/locomotion'
import { glowTexture } from '../textures/textures'

const COUNT = 160

export class RegolithDust {
  readonly points: THREE.Points
  private pos: Float32Array
  private vel: Float32Array
  private alive: Uint8Array
  private next = 0

  constructor(private heightAt: (x: number, z: number) => number) {
    this.pos = new Float32Array(COUNT * 3)
    this.vel = new Float32Array(COUNT * 3)
    this.alive = new Uint8Array(COUNT)
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(this.pos, 3))
    this.points = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({ color: 0x9c958a, size: 0.05, map: glowTexture('rgba(255,255,255,1)'), transparent: true, depthWrite: false }),
    )
    this.points.frustumCulled = false
    for (let i = 0; i < COUNT; i++) this.pos[i * 3 + 1] = -100
  }

  /** A boot lands at (x, z) moving at (vx, vz): a few grains fly forward and sideways. */
  kick(x: number, z: number, vx: number, vz: number) {
    const y = this.heightAt(x, z) + 0.03
    for (let k = 0; k < 10; k++) {
      const i = this.next
      this.next = (this.next + 1) % COUNT
      const a = Math.random() * Math.PI * 2
      const spread = 0.25 + Math.random() * 0.35
      this.pos.set([x, y, z], i * 3)
      this.vel.set([vx * 0.5 + Math.cos(a) * spread, 0.4 + Math.random() * 0.6, vz * 0.5 + Math.sin(a) * spread], i * 3)
      this.alive[i] = 1
    }
  }

  update(dt: number) {
    let any = false
    for (let i = 0; i < COUNT; i++) {
      if (!this.alive[i]) continue
      any = true
      const p = i * 3
      this.vel[p + 1] -= MOON_GRAVITY * dt
      this.pos[p] += this.vel[p] * dt
      this.pos[p + 1] += this.vel[p + 1] * dt
      this.pos[p + 2] += this.vel[p + 2] * dt
      if (this.pos[p + 1] < this.heightAt(this.pos[p], this.pos[p + 2])) {
        this.alive[i] = 0
        this.pos[p + 1] = -100
      }
    }
    if (any) (this.points.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true
  }
}
