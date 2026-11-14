/**
 * @file
 * @brief Owns the Three.js outpost scene and renders a SceneModel.
 */
import * as THREE from 'three'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { createCamera, createControls } from '../camera/camera'
import { attachPicking } from '../interaction/picking'
import { LightingRig } from '../lighting/lights'
import { Astronaut } from '../objects/astronaut'
import { BuildingVisual } from '../objects/buildings'
import { createHabitat } from '../objects/habitat'
import { slotFor } from '../objects/layout'
import { createRocks } from '../objects/rocks'
import { StormParticles } from '../objects/stormParticles'
import { createHose, createLander, createRover, createTracks } from '../objects/vehicles'
import type { SceneModel } from './sceneModel'
import { createEarth, createMilkyWay, createStars, createSunDisc } from './sky'
import { createTerrain, terrainHeight } from './terrain'

const LANDER_AT: [number, number] = [-19, 11]
const ROVER_AT: [number, number] = [16, 12]

export class OutpostScene {
  private renderer: THREE.WebGLRenderer
  private composer: EffectComposer
  private bloom: UnrealBloomPass
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private controls: OrbitControls
  private lighting: LightingRig
  private habitat = createHabitat()
  private astronaut = new Astronaut(terrainHeight)
  private storm = new StormParticles()
  private earth = createEarth()
  private visuals = new Map<string, BuildingVisual>()
  private hoses = new Map<string, THREE.Mesh>()
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
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.renderer.domElement.style.display = 'block'
    this.renderer.domElement.setAttribute('aria-label', '3D view of the lunar outpost. Click a structure to inspect it.')
    this.renderer.domElement.setAttribute('role', 'img')
    container.appendChild(this.renderer.domElement)

    this.scene.background = new THREE.Color(0x000000)
    const sunDisc = createSunDisc()
    const lander = createLander()
    lander.position.set(LANDER_AT[0], terrainHeight(...LANDER_AT), LANDER_AT[1])
    lander.rotation.y = 0.6
    const rover = createRover()
    rover.position.set(ROVER_AT[0], terrainHeight(...ROVER_AT), ROVER_AT[1])
    rover.rotation.y = -2.2
    const avoid: [number, number, number][] = [
      [0, 0, 7.5],
      [LANDER_AT[0], LANDER_AT[1], 4.5],
      [ROVER_AT[0], ROVER_AT[1], 3],
      [0, 10, 4.5],
      [-10, 3, 4.5],
      [8, 2.5, 4],
      [0, -11, 11],
    ]
    this.scene.add(
      createMilkyWay(),
      createStars(),
      this.earth,
      sunDisc,
      createTerrain(),
      createRocks(avoid),
      createTracks(terrainHeight),
      lander,
      rover,
      this.habitat.group,
      this.astronaut.group,
      this.storm.points,
    )
    this.lighting = new LightingRig(this.scene, sunDisc)

    this.selectionRing = new THREE.Mesh(
      new THREE.RingGeometry(2.9, 3.25, 64),
      new THREE.MeshBasicMaterial({ color: 0x5ad1ff, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }),
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

    // Bloom only catches really bright things: lamps, windows, beacons, the Sun.
    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.5, 0.88)
    this.composer.addPass(this.bloom)
    this.composer.addPass(new OutputPass())

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
        // Power and fluid line from the habitat to the new structure.
        const from = new THREE.Vector3(Math.sign(x || 1) * 2.5, 0.25, z > 0 ? 1.8 : -1.8)
        const to = new THREE.Vector3(x - Math.sign(x || 0.001) * 1.2, 0.2, z - Math.sign(z || 0.001) * 1.2)
        const hose = createHose(from, to, terrainHeight)
        this.hoses.set(b.uid, hose)
        this.scene.add(hose)
      }
      counters.set(b.defId, (counters.get(b.defId) ?? 0) + 1)
      visual.setState(b)
      if (b.defId === 'battery') visual.setBatteryLevel(model.batteryFraction)
    }
    for (const [uid, visual] of this.visuals) {
      if (!seen.has(uid)) {
        this.scene.remove(visual.group)
        this.visuals.delete(uid)
        const hose = this.hoses.get(uid)
        if (hose) this.scene.remove(hose)
        this.hoses.delete(uid)
      }
    }

    this.astronaut.setTargets(
      [...this.visuals.values()].map((v) => v.group.position.clone().add(new THREE.Vector3(0, 0, 3))),
    )
    this.astronaut.setIndoors(model.stormActive || model.habitatUnpowered)
    this.storm.setActive(model.stormActive)
    this.habitat.setPowered(!model.habitatUnpowered)
    this.lighting.setConditions(model.illumination, model.day, model.stormActive)

    const selected = model.selectedUid ? this.visuals.get(model.selectedUid) : undefined
    this.selectionRing.visible = !!selected
    if (selected) this.selectionRing.position.set(selected.group.position.x, selected.group.position.y + 0.08, selected.group.position.z)
  }

  private resize() {
    const { clientWidth: w, clientHeight: h } = this.container
    if (w === 0 || h === 0) return
    this.renderer.setSize(w, h)
    this.composer.setSize(w, h)
    this.bloom.resolution.set(w, h)
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
    this.habitat.update(t)
    this.earth.userData.spin?.(dt)
    for (const v of this.visuals.values()) v.update(t, this.sunDirection)
    ;(this.selectionRing.material as THREE.MeshBasicMaterial).opacity = 0.55 + Math.sin(t * 4) * 0.25
    this.controls.update()
    this.composer.render()
  }

  dispose() {
    this.renderer.setAnimationLoop(null)
    this.timer.dispose()
    this.resizeObserver.disconnect()
    this.detachPicking()
    this.controls.dispose()
    this.composer.dispose()
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Points || o instanceof THREE.Sprite) {
        o.geometry.dispose()
        const mats = Array.isArray(o.material) ? o.material : [o.material]
        for (const mat of mats) {
          for (const value of Object.values(mat)) if (value instanceof THREE.Texture) value.dispose()
          mat.dispose()
        }
      }
    })
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
