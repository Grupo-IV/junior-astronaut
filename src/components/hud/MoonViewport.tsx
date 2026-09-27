// React ↔ Three.js bridge. Mounts the OutpostScene once and pushes a new
// SceneModel whenever the mission state changes.
import { useEffect, useRef, useState } from 'react'
import { gameContent } from '../../game'
import { OutpostScene } from '../../three/scene/OutpostScene'
import { toSceneModel } from '../../three/scene/sceneModel'
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
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    try {
      sceneRef.current = new OutpostScene(containerRef.current)
    } catch {
      setError('3D view unavailable: your browser could not start WebGL. The mission still works with the panels.')
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
      {error && <p className="flex h-full items-center justify-center p-6 text-center text-ink-3">{error}</p>}
    </div>
  )
}
