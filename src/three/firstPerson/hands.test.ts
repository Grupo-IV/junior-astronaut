/**
 * The scene schedules each order to reach the mission when the hand lands, so
 * the published gesture timings must match the real animations.
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import type { HandAction } from '../../immersive/types'
import { AstronautHands, gestureTiming } from './hands'

const ACTIONS: HandAction[] = ['press', 'point', 'grab', 'repair', 'seal', 'startle', 'wrist', 'beckon', 'relax']

describe('astronaut hands', () => {
  it('every gesture lands and ends when its timing says', () => {
    const camera = new THREE.PerspectiveCamera(70, 16 / 9, 0.04, 100)
    const hands = new AstronautHands(camera)
    const target = new THREE.Vector3(0.1, -0.1, -0.7)
    for (const action of ACTIONS) {
      for (const withKit of action === 'repair' ? [false, true] : [false]) {
        const played = hands.play(action, { target, secondary: target, withKit })
        expect(played, `${action}${withKit ? ' with kit' : ''}`).toEqual(gestureTiming(action, withKit))
        expect(played.impactMs).toBeLessThanOrEqual(played.totalMs)
      }
    }
  })

  it('the moment a gesture lands is reported once, at the right time', () => {
    const camera = new THREE.PerspectiveCamera(70, 16 / 9, 0.04, 100)
    const hands = new AstronautHands(camera)
    hands.setVisible(true)
    let landed = 0
    let at = 0
    const timing = hands.play('press', { target: new THREE.Vector3(0.1, -0.05, -0.6), onImpact: () => (landed++, (at = elapsed)) })
    let elapsed = 0
    for (let i = 0; i < 200; i++) {
      hands.update(1 / 60)
      elapsed += 1000 / 60
    }
    expect(landed).toBe(1)
    expect(Math.abs(at - timing.impactMs)).toBeLessThan(40)
  })

  it('reaches for a point in front and comes back to rest', () => {
    const camera = new THREE.PerspectiveCamera(70, 16 / 9, 0.04, 100)
    const hands = new AstronautHands(camera)
    hands.fit()
    hands.setVisible(true)
    for (let i = 0; i < 60; i++) hands.update(1 / 60)
    const right = hands.root.children[0]
    const rest = right.position.clone()
    const target = new THREE.Vector3(0.05, -0.05, -0.55)
    hands.play('press', { target })
    // At the press (~0.46 s) the fingertip is on the button: the wrist is one hand-length (≈17 cm) behind it.
    for (let i = 0; i < 27; i++) hands.update(1 / 60)
    expect(rest.distanceTo(target)).toBeGreaterThan(0.25)
    expect(right.position.distanceTo(target)).toBeCloseTo(0.17, 1)
    for (let i = 0; i < 120; i++) hands.update(1 / 60)
    expect(right.position.distanceTo(rest)).toBeLessThan(0.03)
  })
})
