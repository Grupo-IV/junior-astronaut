/**
 * @file
 * @brief The pressurised habitat: hull with panel seams, windows, airlock, radiators, antenna and floodlights.
 */
import * as THREE from 'three'
import { floodlight, halo, materials, mesh } from './materials'

export interface Habitat {
  group: THREE.Group
  setPowered: (on: boolean) => void
  /**
   * First person: hide the outside parts that would show through the cabin
   * (window frames, structural rings, the airlock barrel), so the windows look
   * straight out at the Moon.
   */
  setInteriorView: (inside: boolean) => void
  update: (t: number) => void
}

export function createHabitat(): Habitat {
  const group = new THREE.Group()
  const m = materials()
  const hull = m.hull.clone()
  hull.map = m.hull.map!.clone()
  hull.map.repeat.set(3, 1)
  hull.map.needsUpdate = true

  // Main module: a horizontal cylinder on legs, 8 m long.
  const body = mesh(new THREE.CylinderGeometry(2.3, 2.3, 8, 48, 1, true), hull, 0, 2.8, 0)
  body.rotation.z = Math.PI / 2
  group.add(body)
  const capGeo = new THREE.SphereGeometry(2.3, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2)
  const capA = mesh(capGeo, m.white, 4, 2.8, 0)
  capA.rotation.z = -Math.PI / 2
  capA.scale.set(1, 0.55, 1)
  const capB = mesh(capGeo, m.white, -4, 2.8, 0)
  capB.rotation.z = Math.PI / 2
  capB.scale.set(1, 0.55, 1)
  group.add(capA, capB)

  const hiddenInside: THREE.Object3D[] = []

  // Structural rings and the docking port.
  for (const x of [-3.2, -1.1, 1.1, 3.2]) {
    const band = mesh(new THREE.TorusGeometry(2.33, 0.08, 10, 48), m.metal, x, 2.8, 0)
    band.rotation.y = Math.PI / 2
    group.add(band)
    hiddenInside.push(band)
  }
  const port = mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.5, 32), m.metal, -5.4, 2.8, 0)
  port.rotation.z = Math.PI / 2
  const portRing = mesh(new THREE.TorusGeometry(0.82, 0.1, 10, 32), m.darkMetal, -5.62, 2.8, 0)
  portRing.rotation.y = Math.PI / 2
  group.add(port, portRing)

  // Gold insulation blanket along the belly (multi-layer insulation).
  const mli = mesh(new THREE.CylinderGeometry(2.36, 2.36, 6, 48, 1, true, Math.PI * 0.62, Math.PI * 0.76), m.gold, 0, 2.8, 0)
  mli.rotation.z = Math.PI / 2
  group.add(mli)

  // Windows with frames: three on the front, one at the back over the power station.
  for (const [x, side] of [[-2.2, 1], [0, 1], [2.2, 1], [1.4, -1]] as const) {
    const frame = mesh(new THREE.TorusGeometry(0.36, 0.06, 8, 24), m.darkMetal, x, 3.35, 2.24 * side)
    const pane = mesh(new THREE.CircleGeometry(0.33, 24), m.window, x, 3.35, 2.25 * side, false)
    frame.rotation.x = -0.25 * side
    pane.rotation.x = -0.25 * side
    if (side === -1) {
      frame.rotation.y = Math.PI
      pane.rotation.y = Math.PI
    }
    group.add(frame, pane)
    hiddenInside.push(frame, pane)
  }

  // Legs with foot pads and braces.
  for (const x of [-3, 0, 3]) {
    for (const z of [-1.6, 1.6]) {
      group.add(mesh(new THREE.CylinderGeometry(0.11, 0.15, 1.3, 8), m.metal, x, 0.62, z))
      group.add(mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.08, 16), m.darkMetal, x, 0.04, z))
    }
  }
  const brace = mesh(new THREE.BoxGeometry(6.4, 0.08, 0.08), m.metal, 0, 0.9, 1.6)
  const brace2 = brace.clone()
  brace2.position.z = -1.6
  group.add(brace, brace2)

  // Airlock module towards the camera, with hatch, handrails and a porch.
  const airlock = mesh(new THREE.CylinderGeometry(1.15, 1.15, 2.2, 32), m.white, 0, 2.2, 2.9)
  airlock.rotation.x = Math.PI / 2
  const hatch = mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.12, 32), m.darkMetal, 0, 2.2, 4.02)
  hatch.rotation.x = Math.PI / 2
  const hatchWindow = mesh(new THREE.CircleGeometry(0.2, 16), m.window, 0, 2.45, 4.09, false)
  group.add(airlock, hatch, hatchWindow)
  hiddenInside.push(airlock)
  for (const x of [-0.95, 0.95]) group.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.4, 6), m.orange, x, 2.2, 4.0))
  group.add(mesh(new THREE.BoxGeometry(2.2, 0.12, 1.4), m.metal, 0, 0.9, 4.6))
  for (let i = 0; i < 3; i++) group.add(mesh(new THREE.BoxGeometry(1.2, 0.08, 0.35), m.darkMetal, 0, 0.18 + i * 0.25, 5.45 - i * 0.3))

  // Radiators on a mast: they dump the heat of people and electronics to space.
  const mast = mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2, 8), m.metal, 1.8, 5.6, -0.6)
  group.add(mast)
  for (const side of [-1, 1]) {
    const rad = mesh(new THREE.BoxGeometry(2.6, 0.04, 1.2), m.radiator, 1.8 + side * 1.5, 6.4, -0.6)
    rad.rotation.z = side * 0.25
    group.add(rad)
  }

  // High-gain antenna pointed at Earth.
  const antMast = mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 8), m.metal, -2.2, 6, 0)
  const dish = mesh(new THREE.SphereGeometry(0.85, 24, 10, 0, Math.PI * 2, 0, Math.PI / 3.2), m.white, -2.2, 7.4, 0)
  dish.rotation.set(Math.PI + 0.7, 0.9, 0)
  const feed = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 6), m.metal, -2.45, 7.65, -0.2)
  feed.rotation.set(0.7, 0.9, 0)
  group.add(antMast, dish, feed)

  // Red beacon on top, and floodlights around the hull.
  const beacon = mesh(new THREE.SphereGeometry(0.12, 12, 12), m.redLight, 0.4, 5.25, 0, false)
  const beaconGlow = halo(0xff4040, 1.4, 0.8)
  beaconGlow.position.copy(beacon.position)
  group.add(beacon, beaconGlow)

  const floods = [
    floodlight(3.4, new THREE.Vector3(0, 0, 9)),
    floodlight(3.4, new THREE.Vector3(-7, 0, 5)),
    floodlight(3.4, new THREE.Vector3(7, 0, 5)),
  ]
  floods[0].position.set(1.6, 0, 5.2)
  floods[1].position.set(-4.6, 0, 2.6)
  floods[2].position.set(4.6, 0, 2.6)
  for (const f of floods) {
    group.add(f)
    f.updateMatrixWorld()
  }
  floods[0].userData.aim(new THREE.Vector3(0, 0, 9))
  floods[1].userData.aim(new THREE.Vector3(-8, 0, 7))
  floods[2].userData.aim(new THREE.Vector3(8, 0, 7))

  group.traverse((o) => {
    if (o instanceof THREE.Mesh && o.castShadow === undefined) o.castShadow = true
  })

  let powered = true
  return {
    group,
    setPowered: (on) => {
      powered = on
      for (const w of [m.window]) w.emissiveIntensity = on ? 2.2 : 0.05
      for (const f of floods) f.userData.setOn(on)
    },
    setInteriorView: (inside) => {
      for (const o of hiddenInside) o.visible = !inside
    },
    update: (t) => {
      const blink = powered && Math.floor(t * 1.2) % 2 === 0
      beacon.visible = blink
      beaconGlow.visible = blink
    },
  }
}
