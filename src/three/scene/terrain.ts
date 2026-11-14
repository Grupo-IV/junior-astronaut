/**
 * @file
 * @brief Procedural lunar south-pole terrain: rolling regolith, craters and distant massifs.
 *
 * The landing zone in the middle is flattened (bases are built on prepared,
 * level ground); around it the ground rolls, craters overlap, and high
 * mountains close the horizon, as on the rims near Shackleton crater.
 */
import * as THREE from 'three'
import { fbm, ridged, seededRandom } from '../textures/noise'
import { regolithTextures } from '../textures/textures'

interface Crater {
  x: number
  z: number
  r: number
  depth: number
}

const SIZE = 440
const SEGMENTS = 300

/** A few hand-placed craters near the base, then a seeded field with a realistic size spread (many small, few large). */
const CRATERS: Crater[] = (() => {
  const list: Crater[] = [
    { x: -38, z: -30, r: 14, depth: 3.5 },
    { x: 44, z: -20, r: 9, depth: 2.2 },
    { x: 32, z: 40, r: 17, depth: 4.2 },
    { x: -48, z: 34, r: 8, depth: 1.8 },
    { x: 12, z: -54, r: 11, depth: 2.6 },
    { x: -22, z: 26, r: 4, depth: 0.8 },
    { x: 24, z: 16, r: 3, depth: 0.6 },
    { x: -28, z: -10, r: 3.5, depth: 0.7 },
  ]
  const rand = seededRandom(1969)
  while (list.length < 90) {
    const x = (rand() - 0.5) * 380
    const z = (rand() - 0.5) * 380
    if (Math.hypot(x, z) < 34) continue
    const r = 1.5 + rand() ** 2.6 * 30
    list.push({ x, z, r, depth: r * (0.16 + rand() * 0.1) })
  }
  return list
})()

function craterHeight(d: number, c: Crater): number {
  const t = d / c.r
  if (t < 1) return -c.depth * (1 - t * t) + c.depth * 0.25 // bowl
  if (t < 1.7) return c.depth * 0.25 * Math.cos(((t - 1) / 0.7) * (Math.PI / 2)) ** 2 // raised rim and ejecta
  return 0
}

export function terrainHeight(x: number, z: number): number {
  let h = fbm(x * 0.012, z * 0.012, 5, 42) * 3.2 + fbm(x * 0.06, z * 0.06, 3, 7) * 0.45
  for (const c of CRATERS) {
    const dx = x - c.x
    const dz = z - c.z
    if (Math.abs(dx) > c.r * 1.7 || Math.abs(dz) > c.r * 1.7) continue
    h += craterHeight(Math.hypot(dx, dz), c)
  }
  const dist = Math.hypot(x, z)
  const flat = THREE.MathUtils.smoothstep(dist, 17, 34)
  // Massifs on the horizon: ridged mountains rising beyond ~95 m, highest towards the south (-z).
  const far = THREE.MathUtils.smoothstep(dist, 95, 200)
  const south = 0.65 + 0.35 * THREE.MathUtils.smoothstep(-z, -60, 160)
  const massif = ridged(x * 0.009 + 3, z * 0.009 - 2, 5, 11) * 70 * far * south
  return h * flat + massif
}

export function createTerrain(): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS)
  geometry.rotateX(-Math.PI / 2)
  const pos = geometry.attributes.position
  const colors = new Float32Array(pos.count * 3)
  const color = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const y = terrainHeight(x, z)
    pos.setY(i, y)
    // Highlands are brighter (anorthosite), lowlands a little darker; crater floors darkest.
    const albedo = 0.78 + fbm(x * 0.02 + 50, z * 0.02, 3, 3) * 0.12 + Math.min(0, y) * 0.03 + Math.min(1, y / 60) * 0.12
    color.setRGB(albedo, albedo * 0.99, albedo * 0.97)
    colors.set([color.r, color.g, color.b], i * 3)
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()

  const { map, normalMap } = regolithTextures()
  map.repeat.set(SIZE / 17, SIZE / 17)
  normalMap.repeat.set(SIZE / 17, SIZE / 17)
  const material = new THREE.MeshStandardMaterial({
    map,
    normalMap,
    normalScale: new THREE.Vector2(0.8, 0.8),
    vertexColors: true,
    roughness: 0.97,
    metalness: 0,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.receiveShadow = true
  mesh.name = 'terrain'
  return mesh
}

/** Crater centres, exported so boulders can gather on crater rims. */
export function craterList(): readonly Crater[] {
  return CRATERS
}
