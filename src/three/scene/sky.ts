/**
 * @file
 * @brief The airless lunar sky: black, full of stars, the Milky Way, the Sun and the Earth.
 *
 * With no atmosphere the sky stays black even in sunlight, right down to a
 * sharp horizon (no blue sky, no haze, no glow at the skyline); stars do not
 * twinkle, and the Earth hangs low over the south-pole horizon. How much of
 * the faint sky you see depends on how bright the ground in view is.
 */
import * as THREE from 'three'
import { seededRandom } from '../textures/noise'
import { earthTextures, glowTexture, milkyWayTexture, starTexture } from '../textures/textures'

/** Orientation of the galactic plane in this sky (shared by the Milky Way and the star field). */
const GALAXY = new THREE.Euler(0.5, 0.3, 0.9)
const SKY_RADIUS = 520

/** Star colours by temperature: mostly white, a few bluish or orange, never saturated. */
const STAR_COLORS: [number, number][] = [
  [0xffffff, 0.42],
  [0xe9efff, 0.2],
  [0xd8e2ff, 0.08],
  [0xfff4e4, 0.18],
  [0xffe6cc, 0.1],
  [0xffd2ad, 0.02],
]

/**
 * Brightness classes, like stellar magnitudes: every class fainter has about
 * three times more stars. Sizes are in screen pixels and stay small.
 */
const CLASSES = [
  { count: 45, size: 2.6, opacity: 1, faint: false },
  { count: 260, size: 2.0, opacity: 0.9, faint: false },
  { count: 1100, size: 1.5, opacity: 0.7, faint: true },
  { count: 4200, size: 1.15, opacity: 0.45, faint: true },
]

function pickColor(r: number): number {
  let acc = 0
  for (const [c, w] of STAR_COLORS) {
    acc += w
    if (r <= acc) return c
  }
  return 0xffffff
}

/**
 * The star field. Stars thicken towards the Milky Way, as they do in the real
 * sky, and nothing twinkles: there is no air. With bright sunlit ground in
 * view, faint stars are lost (as they would be to the eye or to a camera);
 * in shadow they come back.
 */
export function createStars(): THREE.Group {
  const group = new THREE.Group()
  const rand = seededRandom(88)
  const tilt = new THREE.Quaternion().setFromEuler(GALAXY)
  const color = new THREE.Color()
  const dir = new THREE.Vector3()
  const map = starTexture()
  const faint: THREE.PointsMaterial[] = []
  for (const cls of CLASSES) {
    const positions: number[] = []
    const colors: number[] = []
    while (positions.length < cls.count * 3) {
      // Galactic latitude: 45% spread evenly, the rest crowded along the plane.
      const crowd = rand() < 0.55
      const b = crowd ? (rand() + rand() + rand() - 1.5) * 0.28 : Math.asin(rand() * 2 - 1)
      const l = rand() * Math.PI * 2
      dir.set(-Math.cos(l) * Math.cos(b), Math.sin(b), Math.sin(l) * Math.cos(b)).applyQuaternion(tilt)
      if (dir.y < -0.03) continue // below the horizon
      positions.push(dir.x * SKY_RADIUS, dir.y * SKY_RADIUS, dir.z * SKY_RADIUS)
      color.setHex(pickColor(rand()))
      const k = 0.75 + rand() * 0.25
      colors.push(color.r * k, color.g * k, color.b * k)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    const material = new THREE.PointsMaterial({ size: cls.size, map, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: cls.opacity, depthWrite: false })
    material.userData.base = cls.opacity
    if (cls.faint) faint.push(material)
    group.add(new THREE.Points(geometry, material))
  }
  group.userData.setExposure = (sunlit: number) => {
    // Full sun on the ground: faint stars drop to about a third; deep shadow: all of them.
    for (const m of faint) m.opacity = m.userData.base * (1 - 0.65 * sunlit)
  }
  return group
}

export function createMilkyWay(): THREE.Mesh {
  const material = new THREE.MeshBasicMaterial({ map: milkyWayTexture(), side: THREE.BackSide, depthWrite: false, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending })
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(560, 64, 32), material)
  mesh.rotation.copy(GALAXY)
  mesh.renderOrder = -2
  mesh.userData.setExposure = (sunlit: number) => {
    // A faint glow that only shows once the eyes are not dazzled by sunlit ground.
    material.opacity = 0.85 - 0.6 * sunlit
  }
  return mesh
}

export function createEarth(): THREE.Group {
  const group = new THREE.Group()
  const { map, clouds } = earthTextures()
  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(16, 48, 32),
    new THREE.MeshStandardMaterial({ map, roughness: 0.75, metalness: 0, emissive: 0x0b1e44, emissiveIntensity: 0.25 }),
  )
  const cloudLayer = new THREE.Mesh(
    new THREE.SphereGeometry(16.25, 48, 32),
    new THREE.MeshStandardMaterial({ map: clouds, transparent: true, depthWrite: false, roughness: 1 }),
  )
  const atmosphere = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: glowTexture('rgba(110,170,255,0.9)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.3 }),
  )
  atmosphere.scale.setScalar(37)
  group.add(atmosphere, earth, cloudLayer)
  group.position.set(-200, 125, -330)
  earth.rotation.set(0.4, 2.2, 0)
  cloudLayer.rotation.copy(earth.rotation)
  group.userData.spin = (dt: number) => {
    earth.rotation.y += dt * 0.01
    cloudLayer.rotation.y += dt * 0.013
  }
  return group
}

export function createSunDisc(): THREE.Group {
  const group = new THREE.Group()
  const disc = new THREE.Mesh(new THREE.SphereGeometry(9, 24, 24), new THREE.MeshBasicMaterial({ color: 0xfffaf0 }))
  const glare = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: glowTexture('rgba(255,244,214,1)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.7 }),
  )
  glare.scale.setScalar(95)
  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: glowTexture('rgba(255,210,150,0.6)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.14 }),
  )
  halo.scale.setScalar(260)
  group.add(halo, glare, disc)
  return group
}
