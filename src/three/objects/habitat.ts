// The main habitat module (always present) — a horizontal pressurised cylinder.
import * as THREE from 'three'

export function createHabitat(): { group: THREE.Group; setPowered: (on: boolean) => void } {
  const group = new THREE.Group()
  const shell = new THREE.MeshStandardMaterial({ color: 0xf1f0ea, roughness: 0.55, metalness: 0.1 })
  const trim = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.4, metalness: 0.7 })
  const windowMat = new THREE.MeshStandardMaterial({ color: 0x111418, emissive: 0xffd28a, emissiveIntensity: 1.2 })

  const body = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 7, 32), shell)
  body.rotation.z = Math.PI / 2
  body.position.y = 2.6
  const capGeo = new THREE.SphereGeometry(2.2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2)
  const capA = new THREE.Mesh(capGeo, shell)
  capA.rotation.z = -Math.PI / 2
  capA.position.set(3.5, 2.6, 0)
  const capB = new THREE.Mesh(capGeo, shell)
  capB.rotation.z = Math.PI / 2
  capB.position.set(-3.5, 2.6, 0)
  group.add(body, capA, capB)

  for (const x of [-2.4, 0, 2.4]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(2.22, 0.07, 8, 40), trim)
    band.rotation.y = Math.PI / 2
    band.position.set(x, 2.6, 0)
    group.add(band)
  }
  for (const x of [-1.2, 1.2]) {
    const win = new THREE.Mesh(new THREE.CircleGeometry(0.35, 16), windowMat)
    win.position.set(x, 3.1, 2.19)
    group.add(win)
  }
  for (const [x, z] of [[-2.5, -1.3], [2.5, -1.3], [-2.5, 1.3], [2.5, 1.3]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.2, 8), trim)
    leg.position.set(x, 0.6, z)
    group.add(leg)
  }
  const airlock = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2, 1.6), shell)
  airlock.position.set(0, 1.5, 2.6)
  const hatch = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.3, 0.05), trim)
  hatch.position.set(0, 1.35, 3.42)
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 6), trim)
  antenna.position.set(-2, 5.8, 0)
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 8, 0, Math.PI * 2, 0, Math.PI / 3), trim)
  dish.position.set(-2, 7, 0)
  dish.rotation.x = Math.PI
  group.add(airlock, hatch, antenna, dish)

  group.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true
      o.receiveShadow = true
    }
  })
  return {
    group,
    setPowered: (on) => {
      windowMat.emissiveIntensity = on ? 1.2 : 0.05
    },
  }
}
