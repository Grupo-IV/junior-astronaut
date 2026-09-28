/**
 * @file
 * @brief Handles pointer picking of structures in the outpost scene.
 */
import * as THREE from 'three'

export function attachPicking(
  element: HTMLElement,
  camera: THREE.Camera,
  pickables: () => THREE.Object3D[],
  onPick: (uid: string | null) => void,
): () => void {
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  let down: { x: number; y: number } | null = null

  const onDown = (e: PointerEvent) => {
    down = { x: e.clientX, y: e.clientY }
  }
  const onUp = (e: PointerEvent) => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return
    down = null
    const rect = element.getBoundingClientRect()
    pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
    raycaster.setFromCamera(pointer, camera)
    const hit = raycaster.intersectObjects(pickables(), true)[0]
    let obj: THREE.Object3D | null = hit?.object ?? null
    while (obj && obj.userData.uid === undefined) obj = obj.parent
    onPick(obj ? (obj.userData.uid as string) : null)
  }
  element.addEventListener('pointerdown', onDown)
  element.addEventListener('pointerup', onUp)
  return () => {
    element.removeEventListener('pointerdown', onDown)
    element.removeEventListener('pointerup', onUp)
  }
}
