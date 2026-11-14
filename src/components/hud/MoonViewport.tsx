/**
 * @file
 * @brief Bridges React mission state to the Three.js outpost scene.
 */
import { useEffect, useRef, useState } from 'react'
import { gameContent } from '../../game'
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
  const { t } = useI18n()

  useEffect(() => {
    onViewRef.current = onView
  }, [onView])

  useEffect(() => {
    if (!containerRef.current) return
    try {
      sceneRef.current = new OutpostScene(containerRef.current)
      onViewRef.current?.(sceneRef.current)
    } catch {
      setFailed(true)
    }
    return () => {
      onViewRef.current?.(null)
      sceneRef.current?.dispose()
      sceneRef.current = null
    }
  }, [])

  useEffect(() => {
    sceneRef.current?.onSelect(onSelect)
  }, [onSelect])

  useEffect(() => {
    sceneRef.current?.update(toSceneModel(gameContent, mission, selectedUid))
  }, [mission, selectedUid])

  useEffect(() => {
    sceneRef.current?.setViewMode(view)
    const canvas = containerRef.current?.querySelector('canvas')
    if (!canvas) return
    if (orbitLabel.current === null) orbitLabel.current = canvas.getAttribute('aria-label')
    canvas.setAttribute('aria-label', view === 'firstPerson' ? t('fp.canvasAria') : (orbitLabel.current ?? ''))
  }, [view, t])

  return (
    <div ref={containerRef} className="h-full w-full">
      {failed && <p className="flex h-full items-center justify-center p-6 text-center text-ink-3">{t('outpost.viewportError')}</p>}
    </div>
  )
}
