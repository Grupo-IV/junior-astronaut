/**
 * @file
 * @brief The airless lunar sky: black, full of stars, the Milky Way, the Sun and the Earth.
 *
 * With no atmosphere the sky stays black even in sunlight, stars do not
 * twinkle, and the Earth hangs low over the south-pole horizon.
 */
import * as THREE from 'three'
import { seededRandom } from '../textures/noise'
import { earthTextures, glowTexture, milkyWayTexture } from '../textures/textures'

const STAR_COLORS = [0xffffff, 0xdfe7ff, 0xcfdcff, 0xfff4e0, 0xffe2c4]

/** Three layers of stars (dim, medium, bright) with a few colour temperatures. */
export function createStars(): THREE.Group {
  const group = new THREE.Group()
  const rand = seededRandom(88)
  const layers = [
    { count: 3200, size: 1, opacity: 0.55 },
    { count: 900, size: 1.6, opacity: 0.8 },
    { count: 160, size: 2.6, opacity: 1 },
  ]
  const color = new THREE.Color()
  for (const layer of layers) {
    const positions = new Float32Array(layer.count * 3)
    const colors = new Float32Array(layer.count * 3)
    for (let i = 0; i < layer.count; i++) {
      const u = rand() * 2 - 1
      const theta = rand() * Math.PI * 2
      const y = Math.abs(u) * 0.97 + 0.03
      const r = Math.sqrt(1 - y * y)
      positions.set([r * Math.cos(theta) * 520, y * 520, r * Math.sin(theta) * 520], i * 3)
      color.setHex(STAR_COLORS[Math.floor(rand() * STAR_COLORS.length)])
      colors.set([color.r, color.g, color.b], i * 3)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    const material = new THREE.PointsMaterial({ size: layer.size, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: layer.opacity, depthWrite: false })
    group.add(new THREE.Points(geometry, material))
  }
  return group
}

export function createMilkyWay(): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(560, 48, 24),
    new THREE.MeshBasicMaterial({ map: milkyWayTexture(), side: THREE.BackSide, depthWrite: false, transparent: true, opacity: 0.85 }),
  )
  mesh.rotation.set(0.5, 0.3, 0.9)
  mesh.renderOrder = -2
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
    new THREE.SpriteMaterial({ map: glowTexture('rgba(110,170,255,0.9)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55 }),
  )
  atmosphere.scale.setScalar(48)
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
    new THREE.SpriteMaterial({ map: glowTexture('rgba(255,244,214,1)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85 }),
  )
  glare.scale.setScalar(150)
  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: glowTexture('rgba(255,210,150,0.6)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.35 }),
  )
  halo.scale.setScalar(420)
  group.add(halo, glare, disc)
  return group
}
