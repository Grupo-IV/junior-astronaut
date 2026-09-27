// Procedural lunar terrain: a gently rolling plain with a few craters.
// The centre is flattened where the outpost stands.
import * as THREE from 'three'

interface Crater {
  x: number
  z: number
  r: number
  depth: number
}

const CRATERS: Crater[] = [
  { x: -38, z: -30, r: 14, depth: 3.5 },
  { x: 42, z: -18, r: 9, depth: 2.2 },
  { x: 30, z: 38, r: 16, depth: 4 },
  { x: -46, z: 34, r: 8, depth: 1.8 },
  { x: 12, z: -52, r: 11, depth: 2.6 },
  { x: -20, z: 24, r: 4, depth: 0.8 },
  { x: 22, z: 14, r: 3, depth: 0.6 },
  { x: -26, z: -8, r: 3.5, depth: 0.7 },
]

function craterHeight(d: number, c: Crater): number {
  const t = d / c.r
  if (t < 1) return -c.depth * (1 - t * t) + c.depth * 0.25 // bowl
  if (t < 1.6) return c.depth * 0.25 * Math.cos(((t - 1) / 0.6) * (Math.PI / 2)) ** 2 // raised rim
  return 0
}

export function terrainHeight(x: number, z: number): number {
  let h =
    Math.sin(x * 0.045) * Math.cos(z * 0.05) * 1.6 +
    Math.sin(x * 0.13 + 1.3) * Math.sin(z * 0.11 + 0.7) * 0.5 +
    Math.sin(x * 0.31 + z * 0.27) * 0.15
  for (const c of CRATERS) h += craterHeight(Math.hypot(x - c.x, z - c.z), c)
  // Flat landing zone for the outpost; distant ridge (the crater rim) on one side.
  const dist = Math.hypot(x, z)
  const flat = THREE.MathUtils.smoothstep(dist, 16, 30)
  const ridge = Math.max(0, -z - 55) * 0.35
  return h * flat + ridge
}

export function createTerrain(): THREE.Mesh {
  const size = 200
  const segments = 160
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments)
  geometry.rotateX(-Math.PI / 2)
  const pos = geometry.attributes.position
  const colors = new Float32Array(pos.count * 3)
  const color = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const y = terrainHeight(x, z)
    pos.setY(i, y)
    const grain = (Math.sin(x * 1.7) * Math.cos(z * 1.3) + Math.sin(x * 0.37 + z * 0.61)) * 0.03
    const shade = 0.5 + y * 0.025 + grain
    color.setRGB(shade, shade * 0.98, shade * 0.95)
    colors.set([color.r, color.g, color.b], i * 3)
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.receiveShadow = true
  mesh.name = 'terrain'
  return mesh
}
