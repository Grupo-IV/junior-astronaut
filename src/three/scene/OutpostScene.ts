/**
 * @file
 * @brief Owns the Three.js outpost scene and renders a SceneModel.
 */
import * as THREE from 'three'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { createCamera, createControls } from '../camera/camera'
import { attachPicking } from '../interaction/picking'
import { LightingRig } from '../lighting/lights'
import { Astronaut } from '../objects/astronaut'
import { BuildingVisual } from '../objects/buildings'
import { createHabitat } from '../objects/habitat'
import { slotFor } from '../objects/layout'
import { StormParticles } from '../objects/stormParticles'
import type { SceneModel } from './sceneModel'
import { createEarth, createStars, createSunDisc } from './sky'
import { createTerrain, terrainHeight } from './terrain'

export class OutpostScene {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private controls: OrbitControls
  private lighting: LightingRig
  private habitat = createHabitat()
  private astronaut = new Astronaut()
  private storm = new StormParticles()
  private visuals = new Map<string, BuildingVisual>()
  private selectionRing: THREE.Mesh
  private timer = new THREE.Timer()
  private resizeObserver: ResizeObserver
  private detachPicking: () => void
  private selectHandler: (uid: string | null) => void = () => {}
  private sunDirection = new THREE.Vector3()

  constructor(private container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.domElement.style.display = 'block'
    this.renderer.domElement.setAttribute('aria-label', '3D view of the lunar outpost. Click a structure to inspect it.')
    this.renderer.domElement.setAttribute('role', 'img')
    container.appendChild(this.renderer.domElement)

    this.scene.background = new THREE.Color(0x000000)
    const sunDisc = createSunDisc()
    this.scene.add(createTerrain(), createStars(), createEarth(), sunDisc, this.habitat.group, this.astronaut.group, this.storm.points)
    this.lighting = new LightingRig(this.scene, sunDisc)

    this.selectionRing = new THREE.Mesh(
      new THREE.RingGeometry(2.4, 2.7, 48),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
    )
    this.selectionRing.rotation.x = -Math.PI / 2
    this.selectionRing.visible = false
    this.scene.add(this.selectionRing)

    this.camera = createCamera(1)
    this.controls = createControls(this.camera, this.renderer.domElement)
    this.detachPicking = attachPicking(
      this.renderer.domElement,
      this.camera,
      () => [...this.visuals.values()].map((v) => v.group),
      (uid) => this.selectHandler(uid),
    )

    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(container)
    this.resize()
    this.renderer.setAnimationLoop(() => this.frame())
  }

  onSelect(handler: (uid: string | null) => void) {
    this.selectHandler = handler
  }

  update(model: SceneModel) {
    const seen = new Set<string>()
    const counters = new Map<string, number>()
    for (const b of model.buildings) {
      seen.add(b.uid)
      let visual = this.visuals.get(b.uid)
      if (!visual) {
        visual = new BuildingVisual(b.uid, b.defId)
        const index = counters.get(b.defId) ?? 0
        const [x, z] = slotFor(b.defId, index)
        visual.group.position.set(x, terrainHeight(x, z), z)
        this.visuals.set(b.uid, visual)
        this.scene.add(visual.group)
      }
      counters.set(b.defId, (counters.get(b.defId) ?? 0) + 1)
      visual.setState(b)
      if (b.defId === 'battery') visual.setBatteryLevel(model.batteryFraction)
    }
    for (const [uid, visual] of this.visuals) {
      if (!seen.has(uid)) {
        this.scene.remove(visual.group)
        this.visuals.delete(uid)
      }
    }

    this.astronaut.setTargets(
      [...this.visuals.values()].map((v) => v.group.position.clone().add(new THREE.Vector3(0, 0, 2.2))),
    )
    this.astronaut.setIndoors(model.stormActive || model.habitatUnpowered)
    this.storm.setActive(model.stormActive)
    this.habitat.setPowered(!model.habitatUnpowered)
    this.lighting.setConditions(model.illumination, model.day, model.stormActive)

    const selected = model.selectedUid ? this.visuals.get(model.selectedUid) : undefined
    this.selectionRing.visible = !!selected
    if (selected) this.selectionRing.position.set(selected.group.position.x, selected.group.position.y + 0.05, selected.group.position.z)
  }

  private resize() {
    const { clientWidth: w, clientHeight: h } = this.container
    if (w === 0 || h === 0) return
    this.renderer.setSize(w, h)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  private frame() {
    this.timer.update()
    const dt = Math.min(0.1, this.timer.getDelta())
    const t = this.timer.getElapsed()
    this.sunDirection.copy(this.lighting.sun.position).normalize()
    this.lighting.update(dt)
    this.astronaut.update(dt)
    this.storm.update(dt, this.sunDirection)
    for (const v of this.visuals.values()) v.update(t, this.sunDirection)
    ;(this.selectionRing.material as THREE.MeshBasicMaterial).opacity = 0.55 + Math.sin(t * 4) * 0.25
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.renderer.setAnimationLoop(null)
    this.timer.dispose()
    this.resizeObserver.disconnect()
    this.detachPicking()
    this.controls.dispose()
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Points) {
        o.geometry.dispose()
        const m = o.material
        if (Array.isArray(m)) m.forEach((x) => x.dispose())
        else m.dispose()
      }
    })
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
