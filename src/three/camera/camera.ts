import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export function createCamera(aspect: number): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(48, aspect, 0.5, 1200)
  camera.position.set(24, 15, 28)
  return camera
}

/** Orbit around the outpost; stay above the ground and within the landing zone. */
export function createControls(camera: THREE.PerspectiveCamera, element: HTMLElement): OrbitControls {
  const controls = new OrbitControls(camera, element)
  controls.target.set(0, 1.5, 0)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.minDistance = 10
  controls.maxDistance = 75
  controls.maxPolarAngle = Math.PI * 0.46
  controls.screenSpacePanning = false
  controls.addEventListener('change', () => {
    controls.target.x = THREE.MathUtils.clamp(controls.target.x, -20, 20)
    controls.target.z = THREE.MathUtils.clamp(controls.target.z, -20, 20)
    controls.target.y = THREE.MathUtils.clamp(controls.target.y, 0, 6)
  })
  controls.update()
  return controls
}
