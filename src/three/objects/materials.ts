/**
 * @file
 * @brief Shared materials and small mesh helpers for the outpost models.
 *
 * Created lazily (textures need a document) and shared by every model, so a
 * base with many structures stays cheap to draw.
 */
import * as THREE from 'three'
import { glowTexture, goldFoilTexture, hullTexture, solarCellTexture } from '../textures/textures'

let cache: ReturnType<typeof build> | null = null

function build() {
  const hull = hullTexture()
  return {
    hull: new THREE.MeshStandardMaterial({ map: hull, color: 0xffffff, roughness: 0.55, metalness: 0.15 }),
    white: new THREE.MeshStandardMaterial({ color: 0xe6e5df, roughness: 0.6, metalness: 0.1 }),
    metal: new THREE.MeshStandardMaterial({ color: 0xa3a9b2, roughness: 0.35, metalness: 0.85 }),
    darkMetal: new THREE.MeshStandardMaterial({ color: 0x3a3f48, roughness: 0.5, metalness: 0.6 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x23262d, roughness: 0.75, metalness: 0.25 }),
    gold: new THREE.MeshStandardMaterial({ map: goldFoilTexture(), color: 0xffffff, roughness: 0.32, metalness: 0.95 }),
    solarCells: new THREE.MeshStandardMaterial({ map: solarCellTexture(), roughness: 0.2, metalness: 0.55, side: THREE.DoubleSide }),
    radiator: new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.3, metalness: 0.2, side: THREE.DoubleSide }),
    water: new THREE.MeshStandardMaterial({ color: 0x3aa0d8, roughness: 0.3, metalness: 0.3 }),
    orange: new THREE.MeshStandardMaterial({ color: 0xff8a3d, roughness: 0.5, metalness: 0.2 }),
    blue: new THREE.MeshStandardMaterial({ color: 0x2d6cdf, roughness: 0.5, metalness: 0.2 }),
    hose: new THREE.MeshStandardMaterial({ color: 0xd9d6cf, roughness: 0.8, metalness: 0.05 }),
    bag: new THREE.MeshStandardMaterial({ color: 0x8e887c, roughness: 1, metalness: 0 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xd8ecff, roughness: 0.08, metalness: 0, transmission: 0.55, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false }),
    plant: new THREE.MeshStandardMaterial({ color: 0x3fbf5a, roughness: 0.8 }),
    plantDark: new THREE.MeshStandardMaterial({ color: 0x2a8f45, roughness: 0.8 }),
    tyre: new THREE.MeshStandardMaterial({ color: 0x6f6a62, roughness: 0.95, metalness: 0.3 }),
    window: new THREE.MeshStandardMaterial({ color: 0x0d1016, emissive: 0xffcf8a, emissiveIntensity: 2.2, roughness: 0.2 }),
    lamp: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff1d6, emissiveIntensity: 4 }),
    redLight: new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0xff3030, emissiveIntensity: 3 }),
    glow: glowTexture('rgba(255,236,200,1)'),
  }
}

export function materials() {
  if (!cache) cache = build()
  return cache
}

export function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0, cast = true): THREE.Mesh {
  const m = new THREE.Mesh(geometry, material)
  m.position.set(x, y, z)
  m.castShadow = cast
  m.receiveShadow = true
  return m
}

/** A soft additive halo, for lamps and beacons (bloom does the rest). */
export function halo(color: number, size: number, opacity = 0.6): THREE.Sprite {
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: materials().glow, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity }),
  )
  s.scale.setScalar(size)
  return s
}

/** A floodlight on a short mast: emissive head, halo and a real spotlight aimed at `target`. */
export function floodlight(height: number, target: THREE.Vector3, intensity = 40): THREE.Group {
  const g = new THREE.Group()
  const m = materials()
  g.add(mesh(new THREE.CylinderGeometry(0.05, 0.07, height, 6), m.metal, 0, height / 2, 0))
  const head = mesh(new THREE.BoxGeometry(0.42, 0.24, 0.2), m.darkMetal, 0, height, 0)
  const lens = mesh(new THREE.PlaneGeometry(0.34, 0.16), m.lamp, 0, height, 0.105, false)
  g.add(head, lens)
  const glow = halo(0xfff0d0, 1.6, 0.7)
  glow.position.set(0, height, 0.2)
  g.add(glow)
  const spot = new THREE.SpotLight(0xffeccc, intensity, 26, Math.PI / 4.5, 0.6, 1.6)
  spot.position.set(0, height, 0.1)
  spot.target.position.copy(target)
  g.add(spot, spot.target)
  g.userData.aim = (worldTarget: THREE.Vector3) => {
    head.lookAt(worldTarget)
    lens.lookAt(worldTarget)
  }
  g.userData.setOn = (on: boolean) => {
    spot.intensity = on ? intensity : 0
    glow.visible = on
    lens.material = on ? m.lamp : m.dark
  }
  return g
}
