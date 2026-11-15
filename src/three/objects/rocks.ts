/**
 * @file
 * @brief Boulders and pebbles scattered over the regolith (instanced for speed).
 *
 * Rocks gather on crater rims (ejecta) and thin out near the prepared landing
 * zone, where the crew would have cleared them.
 */
import * as THREE from 'three'
import { fbm, seededRandom } from '../textures/noise'
import { craterList, terrainHeight } from '../scene/terrain'

function rockGeometry(seed: number, detail = 2): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(1, detail)
  const pos = geo.attributes.position
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const n = fbm(v.x * 1.4 + seed, v.y * 1.4 + v.z * 0.7, 4, seed) * 0.42
    // Flatten facets a little: lunar boulders are angular, not round.
    const k = 1 + n + Math.round(n * 4) * 0.04
    v.multiplyScalar(k)
    v.y *= 0.72
    pos.setXYZ(i, v.x, v.y, v.z)
  }
  geo.computeVertexNormals()
  return geo
}

export function createRocks(avoid: [number, number, number][] = []): THREE.Group {
  const group = new THREE.Group()
  const rand = seededRandom(404)
  const material = new THREE.MeshStandardMaterial({ color: 0x8d8a84, roughness: 0.95, metalness: 0, flatShading: true })
  const dark = new THREE.MeshStandardMaterial({ color: 0x5f5c58, roughness: 0.98, metalness: 0, flatShading: true })
  const variants = [rockGeometry(1), rockGeometry(2), rockGeometry(3), rockGeometry(4, 1)]
  const blocked = (x: number, z: number, r: number) => avoid.some(([ax, az, ar]) => Math.hypot(x - ax, z - az) < ar + r)

  const placements: { x: number; z: number; s: number }[] = []
  // Ejecta boulders around crater rims.
  for (const c of craterList()) {
    const n = Math.min(14, Math.round(c.r * 0.7))
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2
      const d = c.r * (1 + rand() * 0.8)
      placements.push({ x: c.x + Math.cos(a) * d, z: c.z + Math.sin(a) * d, s: 0.25 + rand() ** 3 * c.r * 0.12 })
    }
  }
  // Scattered field.
  for (let i = 0; i < 520; i++) {
    const a = rand() * Math.PI * 2
    const d = 14 + rand() ** 1.4 * 190
    placements.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, s: 0.15 + rand() ** 4 * 3.2 })
  }

  const matrices: THREE.Matrix4[][] = variants.map(() => [])
  const darkMatrices: THREE.Matrix4[] = []
  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const e = new THREE.Euler()
  for (const p of placements) {
    const dist = Math.hypot(p.x, p.z)
    if (dist < 20 && p.s > 0.35) continue // cleared landing zone
    if (blocked(p.x, p.z, p.s)) continue
    e.set(rand() * 0.6, rand() * Math.PI * 2, rand() * 0.6)
    q.setFromEuler(e)
    const s = p.s
    m.compose(new THREE.Vector3(p.x, terrainHeight(p.x, p.z) - s * 0.25, p.z), q, new THREE.Vector3(s * (0.8 + rand() * 0.5), s, s * (0.8 + rand() * 0.5)))
    if (rand() < 0.25) darkMatrices.push(m.clone())
    else matrices[Math.floor(rand() * variants.length)].push(m.clone())
  }
  variants.forEach((geo, i) => {
    const inst = new THREE.InstancedMesh(geo, material, matrices[i].length)
    matrices[i].forEach((mm, k) => inst.setMatrixAt(k, mm))
    inst.castShadow = true
    inst.receiveShadow = true
    group.add(inst)
  })
  const darkInst = new THREE.InstancedMesh(variants[0], dark, darkMatrices.length)
  darkMatrices.forEach((mm, k) => darkInst.setMatrixAt(k, mm))
  darkInst.castShadow = true
  darkInst.receiveShadow = true
  group.add(darkInst)

  // Pebbles close to the base: tiny, many, no shadows needed.
  const pebbleGeo = rockGeometry(9, 0)
  const pebbles = new THREE.InstancedMesh(pebbleGeo, material, 700)
  for (let i = 0; i < 700; i++) {
    const a = rand() * Math.PI * 2
    const d = 3 + rand() * 40
    const x = Math.cos(a) * d
    const z = Math.sin(a) * d
    const s = 0.04 + rand() ** 2 * 0.16
    e.set(rand() * 3, rand() * 3, rand() * 3)
    q.setFromEuler(e)
    m.compose(new THREE.Vector3(x, terrainHeight(x, z) - s * 0.2, z), q, new THREE.Vector3(s, s * 0.7, s))
    pebbles.setMatrixAt(i, m)
  }
  pebbles.receiveShadow = true
  group.add(pebbles)
  return group
}
