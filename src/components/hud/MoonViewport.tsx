/**
 * @file
 * @brief Bridges React mission state to the Three.js outpost scene.
 *
 * The scene is prepared in steps (ground, sky, Earth, hardware, assembly) and
 * each step is reported, so the player sees the base being built instead of a
 * frozen screen.
 */
import { useEffect, useRef, useState } from 'react'
import { gameContent } from '../../game'
import { cancelTransition, finishTransition, LOADING_STEPS, startTransition, updateTransition } from '../../immersive/transitions'
import type { ImmersiveView, ViewMode } from '../../immersive/types'
import { OutpostScene } from '../../three/scene/OutpostScene'
import { toSceneModel } from '../../three/scene/sceneModel'
import { useI18n } from '../../i18n/useI18n'
import type { MissionState } from '../../types/game'

export function MoonViewport({
  mission,
  selectedUid,
  onSelect,
  view = 'orbit',
  onView,
}: {
  mission: MissionState
  selectedUid: string | null
  onSelect: (uid: string | null) => void
  /** Management view (orbit) or first person inside the habitat. */
  view?: ViewMode
  /** Hands the first-person controls of the scene to the interface (null when it goes away). */
  onView?: (view: ImmersiveView | null) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<OutpostScene | null>(null)
  const onViewRef = useRef(onView)
  const orbitLabel = useRef<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [ready, setReady] = useState(false)
  const { t } = useI18n()
  // The latest props, applied as soon as the scene exists.
  const latest = useRef({ mission, selectedUid, onSelect, view })
  latest.current = { mission, selectedUid, onSelect, view }

  useEffect(() => {
    onViewRef.current = onView
  }, [onView])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let cancelled = false
    let scene: OutpostScene | null = null
    const id = startTransition('loading', LOADING_STEPS)
    updateTransition(id, 0.05, 1)
    OutpostScene.prepare((step, progress) => {
      if (!cancelled) updateTransition(id, progress, step)
    })
      .then(() => {
        if (cancelled) return
        scene = new OutpostScene(container)
        sceneRef.current = scene
        const { mission: m, selectedUid: s, onSelect: select } = latest.current
        scene.onSelect(select)
        scene.update(toSceneModel(gameContent, m, s))
        onViewRef.current?.(scene)
        finishTransition(id)
        setReady(true)
      })
      .catch(() => {
        cancelTransition(id)
        setFailed(true)
      })
    return () => {
      cancelled = true
      cancelTransition(id)
      onViewRef.current?.(null)
      scene?.dispose()
      sceneRef.current = null
      setReady(false)
    }
  }, [])

  useEffect(() => {
    sceneRef.current?.onSelect(onSelect)
  }, [onSelect, ready])

  useEffect(() => {
    sceneRef.current?.update(toSceneModel(gameContent, mission, selectedUid))
  }, [mission, selectedUid, ready])

  useEffect(() => {
    sceneRef.current?.setViewMode(view)
    const canvas = containerRef.current?.querySelector('canvas')
    if (!canvas) return
    if (orbitLabel.current === null) orbitLabel.current = canvas.getAttribute('aria-label')
    canvas.setAttribute('aria-label', view === 'firstPerson' ? t('fp.canvasAria') : (orbitLabel.current ?? ''))
  }, [view, t, ready])

  return (
    <div ref={containerRef} className="h-full w-full">
      {failed && <p className="flex h-full items-center justify-center p-6 text-center text-ink-3">{t('outpost.viewportError')}</p>}
    </div>
  )
}
