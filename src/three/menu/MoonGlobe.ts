/**
 * @file
 * @brief Title-screen hero: a slowly turning Moon (procedural maria and craters) with the Earth behind.
 */
import * as THREE from 'three'
import { fbm, seededRandom } from '../textures/noise'
import { earthTextures, glowTexture } from '../textures/textures'

/** Equirectangular lunar albedo and normal map. Maria are dark basalt plains; young craters have bright rays. */
function moonTextures(w = 1024, h = 512): { map: THREE.CanvasTexture; normalMap: THREE.CanvasTexture } {
  const height = new Float32Array(w * h)
  const albedo = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    const lat = (y / h - 0.5) * Math.PI
    for (let x = 0; x < w; x++) {
      const lon = (x / w) * Math.PI * 2
      const sx = Math.cos(lat) * Math.cos(lon) * 1.6
      const sy = Math.cos(lat) * Math.sin(lon) * 1.6
      const sz = Math.sin(lat) * 1.6
      const i = y * w + x
      height[i] = fbm(sx + 5, sy + sz * 0.8, 6, 3) * 0.6
      const maria = fbm(sx * 0.9 + 20, sy * 0.9 - sz * 0.6, 4, 9)
      const dark = THREE.MathUtils.smoothstep(maria, -0.08, 0.14)
      albedo[i] = 0.78 - dark * 0.42 + fbm(sx * 6, sy * 6 + sz * 6, 3, 2) * 0.06
      height[i] -= dark * 0.15
    }
  }
  const rand = seededRandom(1972)
  for (let c = 0; c < 260; c++) {
    const cx = rand() * w
    const cy = h * (0.08 + rand() * 0.84)
    const r = 1.5 + rand() ** 3.6 * 30
    const stretch = 1 / Math.max(0.25, Math.cos((cy / h - 0.5) * Math.PI))
    const rayed = r > 9 && rand() < 0.18
    const reach = Math.ceil(r * (rayed ? 4 : 1.7))
    for (let dy = -reach; dy <= reach; dy++) {
      const y = Math.round(cy + dy)
      if (y < 0 || y >= h) continue
      for (let dx = -Math.ceil(reach * stretch); dx <= Math.ceil(reach * stretch); dx++) {
        const x = (((Math.round(cx + dx)) % w) + w) % w
        const d = Math.hypot(dx / stretch, dy) / r
        const i = y * w + x
        if (d < 1) {
          height[i] -= 0.22 * (1 - d * d) ** 1.5 * Math.min(1, r / 10)
          albedo[i] -= 0.03 * (1 - d)
        } else if (d < 1.7) {
          height[i] += 0.07 * Math.cos(((d - 1) / 0.7) * (Math.PI / 2)) ** 2 * Math.min(1, r / 10)
          albedo[i] += 0.04 * (1.7 - d)
        }
        if (rayed && d > 1 && d < 4) {
          const ang = Math.atan2(dy, dx / stretch)
          const ray = Math.max(0, Math.sin(ang * 9 + c) ** 16)
          albedo[i] += ray * 0.16 * (1 - (d - 1) / 3)
        }
      }
    }
  }
  const mapCanvas = document.createElement('canvas')
  mapCanvas.width = w
  mapCanvas.height = h
  const normalCanvas = document.createElement('canvas')
  normalCanvas.width = w
  normalCanvas.height = h
  const mctx = mapCanvas.getContext('2d')!
  const nctx = normalCanvas.getContext('2d')!
  const mi = mctx.createImageData(w, h)
  const ni = nctx.createImageData(w, h)
  const at = (x: number, y: number) => height[Math.max(0, Math.min(h - 1, y)) * w + ((x + w) % w)]
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      const v = Math.max(0, Math.min(1, albedo[i])) * 255
      mi.data[i * 4] = v
      mi.data[i * 4 + 1] = v * 0.98
      mi.data[i * 4 + 2] = v * 0.95
      mi.data[i * 4 + 3] = 255
      const dx = (at(x + 1, y) - at(x - 1, y)) * 2.4
      const dy = (at(x, y + 1) - at(x, y - 1)) * 2.4
      const len = Math.hypot(dx, dy, 1)
      ni.data[i * 4] = ((-dx / len) * 0.5 + 0.5) * 255
      ni.data[i * 4 + 1] = ((dy / len) * 0.5 + 0.5) * 255
      ni.data[i * 4 + 2] = (1 / len) * 255
      ni.data[i * 4 + 3] = 255
    }
  }
  mctx.putImageData(mi, 0, 0)
  nctx.putImageData(ni, 0, 0)
  const map = new THREE.CanvasTexture(mapCanvas)
  map.colorSpace = THREE.SRGBColorSpace
  map.anisotropy = 8
  return { map, normalMap: new THREE.CanvasTexture(normalCanvas) }
}

export class MoonGlobe {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)
  private moon: THREE.Mesh
  private earth: THREE.Group
  private observer: ResizeObserver
  private still: boolean

  constructor(private container: HTMLElement) {
    this.still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.domElement.style.display = 'block'
    container.appendChild(this.renderer.domElement)

    const { map, normalMap } = moonTextures()
    this.moon = new THREE.Mesh(
      new THREE.SphereGeometry(1, 128, 64),
      new THREE.MeshStandardMaterial({ map, normalMap, normalScale: new THREE.Vector2(0.9, 0.9), roughness: 1, metalness: 0 }),
    )
    this.moon.rotation.set(0.25, -1.2, 0.08)
    const rim = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glowTexture('rgba(150,200,255,0.55)'), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.45 }),
    )
    rim.scale.setScalar(2.35)
    rim.position.z = -0.4

    const { map: earthMap, clouds } = earthTextures()
    this.earth = new THREE.Group()
    const earthBody = new THREE.Mesh(new THREE.SphereGeometry(0.13, 48, 32), new THREE.MeshStandardMaterial({ map: earthMap, roughness: 0.7 }))
    const earthClouds = new THREE.Mesh(new THREE.SphereGeometry(0.132, 48, 32), new THREE.MeshStandardMaterial({ map: clouds, transparent: true, depthWrite: false }))
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glowTexture('rgba(110,170,255,0.9)'), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.6 }),
    )
    halo.scale.setScalar(0.42)
    this.earth.add(halo, earthBody, earthClouds)
    this.earth.position.set(-0.92, 0.86, 0.3)

    const sun = new THREE.DirectionalLight(0xfff4e6, 3.4)
    sun.position.set(-3, 1.4, 1.6)
    const fill = new THREE.AmbientLight(0x6a7cff, 0.06)
    this.scene.add(rim, this.moon, this.earth, sun, fill)
    this.camera.position.set(0, 0, 4.6)

    this.observer = new ResizeObserver(() => this.resize())
    this.observer.observe(container)
    this.resize()
    this.renderer.setAnimationLoop((t) => this.frame(t))
  }

  private resize() {
    const { clientWidth: w, clientHeight: h } = this.container
    if (!w || !h) return
    this.renderer.setSize(w, h)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  private frame(time: number) {
    if (!this.still) {
      this.moon.rotation.y = -1.2 + time * 0.00004
      this.earth.children[1].rotation.y = time * 0.0001
      this.earth.children[2].rotation.y = time * 0.00013
    }
    this.renderer.render(this.scene, this.camera)
    if (this.still) this.renderer.setAnimationLoop(null)
  }

  dispose() {
    this.renderer.setAnimationLoop(null)
    this.observer.disconnect()
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Sprite) {
        o.geometry.dispose()
        const mat = o.material as THREE.Material & { map?: THREE.Texture; normalMap?: THREE.Texture }
        mat.map?.dispose()
        mat.normalMap?.dispose()
        mat.dispose()
      }
    })
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
