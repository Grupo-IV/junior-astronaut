/**
 * @file
 * @brief Creates the lunar sky, stars and low-horizon Earth.
 */
import * as THREE from 'three'

export function createStars(count = 1800): THREE.Points {
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const u = Math.random() * 2 - 1
    const theta = Math.random() * Math.PI * 2
    const y = Math.abs(u) * 0.95 + 0.05
    const r = Math.sqrt(1 - y * y)
    positions.set([r * Math.cos(theta) * 450, y * 450, r * Math.sin(theta) * 450], i * 3)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({ color: 0xffffff, size: 1.3, sizeAttenuation: false, transparent: true, opacity: 0.85 })
  return new THREE.Points(geometry, material)
}

export function createEarth(): THREE.Group {
  const group = new THREE.Group()
  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(14, 32, 32),
    new THREE.MeshStandardMaterial({ color: 0x3b6fd8, emissive: 0x0d2a66, emissiveIntensity: 0.6, roughness: 0.8 }),
  )
  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(14.3, 32, 32),
    new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, roughness: 1 }),
  )
  group.add(earth, clouds)
  group.position.set(-220, 38, -300)
  return group
}

export function createSunDisc(): THREE.Mesh {
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(10, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff6d5 }),
  )
  return sun
}
