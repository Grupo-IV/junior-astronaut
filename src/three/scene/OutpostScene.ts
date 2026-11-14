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
import type { FocusPoint, HabitatStationId, HandRequest, HandTiming, ImmersiveView, StationId, ViewMode } from '../../immersive/types'
import { createCamera, createControls } from '../camera/camera'
import { FirstPersonRig } from '../firstPerson/firstPersonRig'
import { AstronautHands, gestureTiming } from '../firstPerson/hands'
import { HabitatInterior } from '../firstPerson/interior'
import { ShelterInterior } from '../firstPerson/shelterInterior'
import { NavGrid } from '../physics/collision'
import { entrances, LANDER_AT, outpostWorld, ROVER_AT, WALK_BOUNDS, type PlacedBuilding } from '../physics/outpostColliders'
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


/** How close the camera leans to each kind of point before the hands work on it. */
const LEAN: Record<FocusPoint, number> = {
  console: 0.6,
  // The breach is inside the bay: look at it from the doorway, on the cabin side of the hatch.
  leak: 1.3,
  hatch: 0.95,
  window: 0.95,
  shelf: 0.62,
  kit: 0.56,
  plants: 0.6,
  airlock: 0.95,
  door: 0.9,
}

export class OutpostScene implements ImmersiveView {
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
  private stars = createStars()
  private milkyWay = createMilkyWay()
  private visuals = new Map<string, BuildingVisual>()
  private hoses = new Map<string, THREE.Mesh>()
  private selectionRing: THREE.Mesh
  private timer = new THREE.Timer()
  private resizeObserver: ResizeObserver
  private detachPicking: () => void
  private selectHandler: (uid: string | null) => void = () => {}
  private sunDirection = new THREE.Vector3()
  private interior = new HabitatInterior()
  private shelterInterior: ShelterInterior | null = null
  private shelterVisual: BuildingVisual | null = null
  private navKey = ''
  private placed: PlacedBuilding[] = []
  private hands: AstronautHands
  private rig: FirstPersonRig
  private viewMode: ViewMode = 'orbit'
  private timers: number[] = []
  private stationHandler: (id: StationId) => void = () => {}
  private interactHandler: (id: StationId) => void = () => {}

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
      [0, 11.5, 5],
      [-10, 3, 4.5],
      [8, 2.5, 4],
      [0, -11, 11],
    ]
    this.scene.add(
      this.milkyWay,
      this.stars,
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
    // The camera carries the astronaut's hands, so it has to be part of the scene.
    this.scene.add(this.camera)
    this.controls = createControls(this.camera, this.renderer.domElement)
    this.habitat.group.add(this.interior.group)
    this.hands = new AstronautHands(this.camera)
    this.rig = new FirstPersonRig(this.camera, this.controls, this.renderer.domElement, this.interior, this.hands, {
      setInteriorView: (inside) => this.habitat.setInteriorView(inside),
      onStationChange: (id) => this.stationHandler(id),
      onInteract: (id) => this.interactHandler(id),
      pointAt: (station, focus) => this.pointAt(station, focus),
    })
    this.detachPicking = attachPicking(
      this.renderer.domElement,
      this.camera,
      () => [...this.visuals.values()].map((v) => v.group),
      (uid) => {
        // Inside the habitat a tap uses a console instead of selecting a structure.
        if (!this.rig.inside) this.selectHandler(uid)
      },
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
        if (b.defId === 'radiation_shelter' && !this.shelterInterior) {
          // The shelter can be entered in first person.
          this.shelterVisual = visual
          this.shelterInterior = new ShelterInterior()
          visual.group.add(this.shelterInterior.group)
          this.rig.setShelter(this.shelterInterior)
        }
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

    this.updateNavigation()
    this.astronaut.setTargets(
      [...this.visuals.values()].map((v) => v.group.position.clone().add(new THREE.Vector3(0, 0, 3))),
    )
    // The crewmate goes in during a storm (to the shelter if there is one) or when the habitat loses power.
    const doors = entrances(this.placed)
    const sheltering = model.stormActive && model.interior.shelter.operational && doors.shelter
    this.astronaut.setRefuge(sheltering ? doors.shelter : model.stormActive || model.habitatUnpowered ? doors.habitat : null)
    this.shelterVisual?.setShelter(model.interior.shelter)
    this.shelterInterior?.setState(model.interior.shelter)
    this.storm.setActive(model.stormActive)
    this.habitat.setPowered(!model.habitatUnpowered)
    this.lighting.setConditions(model.illumination, model.day, model.stormActive)
    // Sky exposure follows how much sunlit ground is in view (inside, the cabin lights do the dazzling).
    const sunlit = Math.min(1, model.illumination)
    this.stars.userData.setExposure(sunlit)
    this.milkyWay.userData.setExposure(sunlit)
    this.interior.setState(model.interior)
    this.hands.setTension(model.interior.alert === 'emergency' || model.interior.alert === 'storm' ? 1 : 0)

    const selected = model.selectedUid ? this.visuals.get(model.selectedUid) : undefined
    this.selectionRing.visible = !!selected
    if (selected) this.selectionRing.position.set(selected.group.position.x, selected.group.position.y + 0.08, selected.group.position.z)
  }

  /** Floor plan and routes for the crewmate outside, rebuilt when the structures change. */
  private updateNavigation() {
    this.placed = [...this.visuals.values()].map((v) => ({ defId: v.defId, x: v.group.position.x, z: v.group.position.z }))
    const key = this.placed.map((b) => `${b.defId}@${b.x},${b.z}`).join('|')
    if (key === this.navKey) return
    this.navKey = key
    const world = outpostWorld(this.placed)
    const { minX, minZ, maxX, maxZ } = WALK_BOUNDS
    this.astronaut.setNavigation(world, new NavGrid(world, minX, minZ, maxX, maxZ, 0.5, 0.4))
  }

  /** World position of a point of interest, in the habitat or in the shelter. */
  private pointAt(station: StationId, focus: FocusPoint | null | undefined): THREE.Vector3 {
    if (station === 'shelter') return this.shelterInterior ? this.shelterInterior.point(focus) : this.interior.point('command', 'airlock')
    return this.interior.point(station, focus)
  }

  setMove(forward: number, strafe: number) {
    this.rig.setMove(forward, strafe)
  }

  private resize() {
    const { clientWidth: w, clientHeight: h } = this.container
    if (w === 0 || h === 0) return
    this.renderer.setSize(w, h)
    this.composer.setSize(w, h)
    this.bloom.resolution.set(w, h)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.rig.resize()
  }

  // ------------------------------------------------------------------ first person (ImmersiveView)

  setViewMode(mode: ViewMode) {
    if (mode === this.viewMode) return
    this.viewMode = mode
    this.clearTimers()
    if (mode === 'firstPerson') this.rig.enter()
    else this.rig.leave()
  }

  goToStation(id: StationId) {
    this.rig.focus(this.rig.currentStation, null)
    this.rig.goToStation(id)
  }

  focus(station: StationId, point: FocusPoint | null) {
    this.rig.focus(station, point, point ? LEAN[point] : undefined)
  }

  shake(strength: number) {
    this.rig.shake(strength)
  }

  onStationChange(handler: (id: StationId) => void) {
    this.stationHandler = handler
  }

  onInteract(handler: (id: StationId) => void) {
    this.interactHandler = handler
  }

  /**
   * Moves to where the work is, leans in, and plays the gesture. The timing
   * includes the walk, so the caller can apply the order when the hand lands.
   */
  playHands(request: HandRequest): HandTiming {
    const station = request.station ?? this.rig.currentStation
    const focus = request.focus ?? 'console'
    const after = (ms: number, fn: () => void) => this.timers.push(window.setTimeout(fn, ms))
    const highlight = () => {
      if (station !== 'shelter') this.interior.highlight(station as HabitatStationId)
    }
    const delayed = (delay: number, timing: HandTiming): HandTiming => ({ impactMs: delay + timing.impactMs, totalMs: delay + timing.totalMs })

    if (request.action === 'startle') {
      this.rig.shake(0.8)
      return this.hands.play('startle')
    }
    if (request.action === 'relax') return this.hands.play('relax')
    if (request.action === 'wrist') {
      this.rig.focus(this.rig.currentStation, null)
      return this.hands.play('wrist', { onImpact: highlight })
    }

    if (request.action === 'seal') {
      // Hatch control on the station console, then the wheel once the hatch has swung shut.
      this.rig.focus(station, 'console', 0.75)
      const delay = Math.round(this.rig.travelSeconds * 1000) + 350
      after(delay + 1300, () => this.rig.focus(station, 'hatch', 0.55))
      const target = this.pointAt(station, 'console')
      const wheel = this.pointAt(station, 'hatch')
      after(delay, () => this.hands.play('seal', { target, secondary: wheel, onImpact: highlight }))
      return delayed(delay, gestureTiming('seal', false))
    }

    // Repairs are done up close (for a breach, that means stepping into the bay), then the astronaut steps back.
    const workLean = focus === 'leak' ? 0.6 : LEAN[focus]
    if (request.action === 'repair' && request.withKit) {
      // Take a kit from the rack first, then lean in to the work.
      this.rig.focus(station, 'kit', LEAN.kit)
      const delay = Math.round(this.rig.travelSeconds * 1000) + 450
      after(delay + 520, () => this.rig.focus(station, focus, workLean))
      const target = this.pointAt(station, focus)
      const kit = this.pointAt(station, 'kit')
      const timing = delayed(delay, gestureTiming('repair', true))
      after(delay, () => this.hands.play('repair', { target, secondary: kit, withKit: true, onTake: () => this.interior.takeKit(), onImpact: highlight }))
      after(timing.totalMs, () => this.rig.focus(station, focus === 'leak' ? 'leak' : null, LEAN.leak))
      return timing
    }

    const lean =
      request.action === 'repair' ? workLean : request.action === 'point' ? Math.max(0.95, LEAN[focus]) : request.action === 'beckon' ? 1.15 : LEAN[focus]
    this.rig.focus(station, focus, lean)
    const delay = Math.round(this.rig.travelSeconds * 1000) + (request.action === 'point' ? 150 : 380)
    const target = this.pointAt(station, focus)
    if (request.action === 'repair' && focus === 'leak') {
      after(delay + gestureTiming('repair', false).totalMs, () => this.rig.focus(station, 'leak', LEAN.leak))
    }
    after(delay, () =>
      this.hands.play(request.action, {
        target,
        withKit: focus === 'kit',
        onTake: focus === 'kit' ? () => this.interior.takeKit() : undefined,
        onImpact: highlight,
      }),
    )
    return delayed(delay, gestureTiming(request.action, false))
  }

  private clearTimers() {
    for (const id of this.timers) window.clearTimeout(id)
    this.timers = []
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
    // Inside the habitat the first-person rig drives the camera; outside, the orbit controls do.
    const inside = this.rig.update(dt)
    if (!inside) this.controls.update()
    this.astronaut.setHidden(this.rig.flyingIn)
    this.interior.update(dt)
    this.shelterInterior?.update(dt)
    this.hands.update(dt)
    if (inside) this.selectionRing.visible = false
    this.composer.render()
  }

  dispose() {
    this.renderer.setAnimationLoop(null)
    this.clearTimers()
    this.rig.dispose()
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
