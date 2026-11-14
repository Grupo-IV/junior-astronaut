/**
 * @file
 * @brief Bridges React mission state to the Three.js outpost scene.
 */
import { useEffect, useRef, useState } from 'react'
import { gameContent } from '../../game'
import { OutpostScene } from '../../three/scene/OutpostScene'
import { toSceneModel } from '../../three/scene/sceneModel'
import { useI18n } from '../../i18n/useI18n'
import type { MissionState } from '../../types/game'

export function MoonViewport({
  mission,
  selectedUid,
  onSelect,
}: {
  mission: MissionState
  selectedUid: string | null
  onSelect: (uid: string | null) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<OutpostScene | null>(null)
  const [failed, setFailed] = useState(false)
  const { t } = useI18n()

  useEffect(() => {
    if (!containerRef.current) return
    try {
      sceneRef.current = new OutpostScene(containerRef.current)
    } catch {
      setFailed(true)
    }
    return () => {
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

  return (
    <div ref={containerRef} className="h-full w-full">
      {failed && <p className="flex h-full items-center justify-center p-6 text-center text-ink-3">{t('outpost.viewportError')}</p>}
    </div>
  )
}
