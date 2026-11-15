/**
 * @file
 * @brief Low-angle polar sunlight, faint earthshine and a little fill so children can read the scene.
 *
 * At the lunar south pole the Sun never rises more than a few degrees above
 * the horizon: shadows are very long and hard, and the sunlit side of every
 * rock glows against deep shade.
 */
import * as THREE from 'three'

export class LightingRig {
  readonly sun: THREE.DirectionalLight
  readonly ambient: THREE.HemisphereLight
  private earthshine: THREE.DirectionalLight
  private sunDisc: THREE.Object3D
  private azimuth = 0.6
  private targetIntensity = 3.2

  constructor(scene: THREE.Scene, sunDisc: THREE.Object3D) {
    this.sunDisc = sunDisc
    this.sun = new THREE.DirectionalLight(0xfff4e2, 3.2)
    this.sun.castShadow = true
    this.sun.shadow.mapSize.set(4096, 4096)
    const cam = this.sun.shadow.camera
    cam.left = -48
    cam.right = 48
    cam.top = 48
    cam.bottom = -48
    cam.near = 1
    cam.far = 260
    this.sun.shadow.bias = -0.0004
    this.sun.shadow.normalBias = 0.04
    this.sun.shadow.radius = 2.5
    // No air means no blue sky light: the fill is weak and comes mostly from the bright ground.
    this.ambient = new THREE.HemisphereLight(0x9aaed6, 0x6b665e, 0.42)
    this.earthshine = new THREE.DirectionalLight(0x9db8ff, 0.18)
    this.earthshine.position.set(-200, 125, -330)
    scene.add(this.sun, this.sun.target, this.ambient, this.earthshine)
    this.place()
  }

  /** @brief Updates the solar direction for a mission day. */
  setConditions(illumination: number, day: number, storm: boolean) {
    this.azimuth = 0.6 + day * ((2 * Math.PI) / 29.5)
    this.targetIntensity = 0.12 + 3.1 * illumination
    this.ambient.intensity = 0.22 + 0.22 * illumination
    this.sun.color.set(storm ? 0xffcfb0 : 0xfff4e2)
    this.place()
  }

  update(dt: number) {
    this.sun.intensity += (this.targetIntensity - this.sun.intensity) * Math.min(1, dt * 2)
  }

  private place() {
    const elevation = 0.17 // ~10° above the horizon
    const dir = new THREE.Vector3(Math.cos(this.azimuth) * Math.cos(elevation), Math.sin(elevation), Math.sin(this.azimuth) * Math.cos(elevation))
    this.sun.position.copy(dir).multiplyScalar(120)
    this.sunDisc.position.copy(dir).multiplyScalar(470)
  }
}
