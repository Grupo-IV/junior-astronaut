/**
 * @file
 * @brief The lander that brought the crew, an unpressurised rover, its tyre tracks and footprints.
 */
import * as THREE from 'three'
import { seededRandom } from '../textures/noise'
import { halo, materials, mesh } from './materials'

/** A two-stage crew lander: gold-foil descent stage on four legs, ascent cabin on top. */
export function createLander(): THREE.Group {
  const g = new THREE.Group()
  const m = materials()
  const descent = mesh(new THREE.CylinderGeometry(2.1, 2.1, 1.6, 8), m.gold, 0, 2.2, 0)
  g.add(descent)
  g.add(mesh(new THREE.CylinderGeometry(2.15, 2.15, 0.12, 8), m.darkMetal, 0, 3.05, 0))
  g.add(mesh(new THREE.CylinderGeometry(0.55, 0.9, 1, 20, 1, true), m.darkMetal, 0, 1, 0))
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4
    const x = Math.cos(a)
    const z = Math.sin(a)
    const strut = mesh(new THREE.CylinderGeometry(0.08, 0.1, 3, 8), m.metal, x * 2.6, 1.3, z * 2.6)
    strut.lookAt(x * 1.6, 2.6, z * 1.6)
    strut.rotateX(Math.PI / 2)
    const pad = mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.12, 16), m.metal, x * 3.2, 0.06, z * 3.2)
    g.add(strut, pad)
  }
  // Ascent cabin with windows and RCS thruster quads.
  const cabin = mesh(new THREE.CylinderGeometry(1.4, 1.6, 2, 12), m.white, 0, 4.1, 0)
  const top = mesh(new THREE.SphereGeometry(1.4, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), m.white, 0, 5.1, 0)
  g.add(cabin, top)
  for (const a of [0.2, -0.2]) {
    const win = mesh(new THREE.PlaneGeometry(0.4, 0.5), m.window, Math.sin(a) * 1.52, 4.4, Math.cos(a) * 1.52, false)
    win.rotation.y = a
    g.add(win)
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2
    g.add(mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), m.darkMetal, Math.cos(a) * 1.55, 4.8, Math.sin(a) * 1.55))
  }
  g.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 6), m.metal, 0.6, 6.3, 0))
  const tip = mesh(new THREE.SphereGeometry(0.08, 8, 8), m.redLight, 0.6, 6.95, 0, false)
  const tipGlow = halo(0xff4040, 0.9, 0.7)
  tipGlow.position.copy(tip.position)
  g.add(tip, tipGlow)
  // Ladder.
  for (let i = 0; i < 6; i++) g.add(mesh(new THREE.BoxGeometry(0.5, 0.05, 0.05), m.metal, 0, 0.6 + i * 0.4, 2.55))
  for (const x of [-0.25, 0.25]) g.add(mesh(new THREE.BoxGeometry(0.05, 2.6, 0.05), m.metal, x, 1.6, 2.55))
  return g
}

/** An unpressurised lunar rover: chassis, four wire-mesh wheels, seats, antenna and headlights. */
export function createRover(): THREE.Group {
  const g = new THREE.Group()
  const m = materials()
  g.add(mesh(new THREE.BoxGeometry(2.2, 0.25, 3.4), m.metal, 0, 0.75, 0))
  g.add(mesh(new THREE.BoxGeometry(2, 0.5, 0.8), m.white, 0, 1.05, -1.2))
  for (const x of [-0.5, 0.5]) {
    g.add(mesh(new THREE.BoxGeometry(0.7, 0.12, 0.7), m.blue, x, 1, 0.2))
    g.add(mesh(new THREE.BoxGeometry(0.7, 0.7, 0.1), m.blue, x, 1.35, -0.15))
  }
  g.add(mesh(new THREE.BoxGeometry(0.5, 0.4, 0.3), m.dark, 0, 1.2, 1.1))
  for (const [x, z] of [[-1.25, 1.2], [1.25, 1.2], [-1.25, -1.2], [1.25, -1.2]]) {
    const wheel = mesh(new THREE.TorusGeometry(0.42, 0.14, 10, 24), m.tyre, x, 0.5, z)
    wheel.rotation.y = Math.PI / 2
    const hub = mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.3, 12), m.darkMetal, x, 0.5, z)
    hub.rotation.z = Math.PI / 2
    const fender = mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.36, 16, 1, true, 0, Math.PI), m.orange, x, 0.55, z)
    fender.rotation.set(0, 0, Math.PI / 2)
    g.add(wheel, hub, fender)
  }
  const mastPole = mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 6), m.metal, 0.7, 1.6, 1.4)
  const umbrella = mesh(new THREE.SphereGeometry(0.45, 16, 6, 0, Math.PI * 2, 0, Math.PI / 3), m.white, 0.7, 2.25, 1.4)
  umbrella.rotation.x = Math.PI
  g.add(mastPole, umbrella)
  for (const x of [-0.7, 0.7]) {
    g.add(mesh(new THREE.BoxGeometry(0.22, 0.14, 0.05), m.lamp, x, 0.95, 1.73, false))
    const glow = halo(0xfff2d6, 0.9, 0.5)
    glow.position.set(x, 0.95, 1.8)
    g.add(glow)
  }
  return g
}

/**
 * A ground decal that follows the terrain: used for tyre tracks and boot
 * prints. `pattern` draws one tile of the decal texture.
 */
function trail(
  path: THREE.Vector3[],
  width: number,
  heightAt: (x: number, z: number) => number,
  pattern: (ctx: CanvasRenderingContext2D) => void,
  repeatEvery: number,
  opacity: number,
): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(path)
  const steps = Math.ceil(curve.getLength() * 2)
  const positions: number[] = []
  const uvs: number[] = []
  const index: number[] = []
  let travelled = 0
  let prev = curve.getPoint(0)
  for (let i = 0; i <= steps; i++) {
    const p = curve.getPoint(i / steps)
    const tangent = curve.getTangent(i / steps)
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize().multiplyScalar(width / 2)
    travelled += p.distanceTo(prev)
    prev = p
    for (const s of [-1, 1]) {
      const x = p.x + side.x * s
      const z = p.z + side.z * s
      positions.push(x, heightAt(x, z) + 0.03, z)
      uvs.push(s < 0 ? 0 : 1, travelled / repeatEvery)
    }
    if (i > 0) {
      const a = (i - 1) * 2
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(index)
  geo.computeVertexNormals()
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 64
  const ctx = c.getContext('2d')!
  pattern(ctx)
  const tex = new THREE.CanvasTexture(c)
  tex.wrapT = THREE.RepeatWrapping
  const mat = new THREE.MeshStandardMaterial({ color: 0x3e3b37, alphaMap: tex, transparent: true, opacity, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 })
  const meshOut = new THREE.Mesh(geo, mat)
  meshOut.receiveShadow = true
  meshOut.renderOrder = 1
  return meshOut
}

export function createTracks(heightAt: (x: number, z: number) => number): THREE.Group {
  const g = new THREE.Group()
  const tread = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, 64, 64)
    ctx.fillStyle = '#fff'
    for (const x of [4, 44]) for (let y = 0; y < 64; y += 8) ctx.fillRect(x, y, 16, 5)
  }
  const boots = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, 64, 64)
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.ellipse(18, 16, 7, 12, 0, 0, Math.PI * 2)
    ctx.ellipse(46, 48, 7, 12, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  const rand = seededRandom(5)
  const wander = (pts: [number, number][]) => pts.map(([x, z]) => new THREE.Vector3(x + (rand() - 0.5), 0, z + (rand() - 0.5)))
  // Rover tracks from the lander to the base and out towards the crater rim.
  g.add(trail(wander([[-15, 15], [-8, 17], [0, 17.5], [9, 16], [16, 12]]), 2.6, heightAt, tread, 1.2, 0.55))
  g.add(trail(wander([[16, 12], [23, 6], [29, -4], [33, -14], [35, -26]]), 2.6, heightAt, tread, 1.2, 0.45))
  // Boot prints between habitat, lander and shelter.
  g.add(trail(wander([[0, 6.5], [-4, 8.5], [-9, 10], [-15, 10.5]]), 0.7, heightAt, boots, 1.4, 0.5))
  g.add(trail(wander([[0, 6.5], [3, 9], [3.5, 13], [1, 14.5]]), 0.7, heightAt, boots, 1.4, 0.5))
  return g
}

/** A flexible hose lying on the ground between two points (power and fluid lines, as in the reference art). */
export function createHose(from: THREE.Vector3, to: THREE.Vector3, heightAt: (x: number, z: number) => number, radius = 0.09): THREE.Mesh {
  const pts: THREE.Vector3[] = []
  const n = 8
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const x = THREE.MathUtils.lerp(from.x, to.x, t) + Math.sin(t * Math.PI) * 0.8
    const z = THREE.MathUtils.lerp(from.z, to.z, t) + Math.sin(t * Math.PI * 2) * 0.4
    const lift = i === 0 ? from.y : i === n ? to.y : 0
    pts.push(new THREE.Vector3(x, heightAt(x, z) + radius + lift, z))
  }
  const curve = new THREE.CatmullRomCurve3(pts)
  const hose = mesh(new THREE.TubeGeometry(curve, 48, radius, 8, false), materials().hose)
  return hose
}
