/**
 * @file
 * @brief Plays the mission soundscape from React state changes.
 */
import { useEffect, useRef } from 'react'
import { gameContent } from '../game'
import type { MissionState } from '../types/game'
import { airLeakLevel, habitatHumLevel, missionCue, radiationClickRate } from './cues'
import { audioEngine } from './engine'

export function useMissionAudio(mission: MissionState) {
  const previous = useRef<MissionState | null>(null)

  useEffect(() => {
    const cue = missionCue(gameContent, previous.current, mission)
    previous.current = mission
    if (cue) audioEngine.play(cue)
    audioEngine.setRadiation(radiationClickRate(mission))
    audioEngine.setHum(habitatHumLevel(mission))
    audioEngine.setLeak(airLeakLevel(mission))
  }, [mission])

  useEffect(() => () => audioEngine.stopAmbient(), [])
}
