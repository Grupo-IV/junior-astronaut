/**
 * @file
 * @brief Creates the low-angle lunar lighting rig and ambient fill light.
 */
import * as THREE from 'three'

export class LightingRig {
  readonly sun: THREE.DirectionalLight
  readonly ambient: THREE.HemisphereLight
  private sunDisc: THREE.Object3D
  private azimuth = 0.6
  private targetIntensity = 3

  constructor(scene: THREE.Scene, sunDisc: THREE.Object3D) {
    this.sunDisc = sunDisc
    this.sun = new THREE.DirectionalLight(0xfff4e0, 3)
    this.sun.castShadow = true
    this.sun.shadow.mapSize.set(2048, 2048)
    const cam = this.sun.shadow.camera
    cam.left = -30
    cam.right = 30
    cam.top = 30
    cam.bottom = -30
    cam.near = 1
    cam.far = 200
    this.sun.shadow.bias = -0.0005
    this.ambient = new THREE.HemisphereLight(0x8fa8d8, 0x3a3833, 0.35)
    scene.add(this.sun, this.sun.target, this.ambient)
    this.place()
  }

  /** @brief Updates the solar direction for a mission day. */
  setConditions(illumination: number, day: number, storm: boolean) {
    this.azimuth = 0.6 + day * ((2 * Math.PI) / 29.5)
    this.targetIntensity = 0.15 + 2.9 * illumination
    this.sun.color.set(storm ? 0xffc9a8 : 0xfff4e0)
    this.place()
  }

  update(dt: number) {
    this.sun.intensity += (this.targetIntensity - this.sun.intensity) * Math.min(1, dt * 2)
  }

  private place() {
    const elevation = 0.16 // ~9° above the horizon
    const dir = new THREE.Vector3(Math.cos(this.azimuth) * Math.cos(elevation), Math.sin(elevation), Math.sin(this.azimuth) * Math.cos(elevation))
    this.sun.position.copy(dir).multiplyScalar(80)
    this.sunDisc.position.copy(dir).multiplyScalar(420)
  }
}
