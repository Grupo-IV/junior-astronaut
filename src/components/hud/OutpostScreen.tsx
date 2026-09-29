/**
 * @file
 * @brief Renders the lunar outpost view and daily operations HUD.
 */
import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { useApp } from '../../app/state/AppContext'
import { gameContent, getMission, illuminationPeriod } from '../../game'
import type { MissionState } from '../../types/game'
import { ConsequencePanel } from '../decisions/ConsequencePanel'
import { EventModal } from '../events/EventModal'
import { ResourcePanel } from '../resources/ResourcePanel'
import { Button, fmt } from '../ui/ui'
import { MissionLog } from './MissionLog'
import { SystemsPanel } from './SystemsPanel'

const MoonViewport = lazy(() => import('./MoonViewport').then((m) => ({ default: m.MoonViewport })))

const SPEEDS = [
  { label: '1×', ms: 2200 },
  { label: '2×', ms: 1100 },
  { label: '4×', ms: 500 },
]

export function OutpostScreen({ mission }: { mission: MissionState }) {
  const { state, dispatch } = useApp()
  const def = getMission(gameContent, mission.missionId)
  const [selectedUid, setSelectedUid] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(0)
  const onSelect = useCallback((uid: string | null) => setSelectedUid(uid), [])

  const finished = mission.status === 'success' || mission.status === 'failure'
  const blocked = mission.status !== 'running' || state.consequenceIndex !== null

  useEffect(() => {
    if (!playing || blocked) return
    const id = window.setTimeout(() => dispatch({ type: 'advanceDay' }), SPEEDS[speed].ms)
    return () => window.clearTimeout(id)
  }, [playing, blocked, speed, mission, dispatch])

  useEffect(() => {
    if (finished) setPlaying(false)
  }, [finished])

  const today = illuminationPeriod(def, Math.max(1, mission.day))
  const tomorrow = illuminationPeriod(def, Math.min(def.durationDays, mission.day + 1))
  const storm = mission.modifiers.find((m) => m.kind === 'storm_dose')
  const consequence = state.consequenceIndex !== null ? mission.decisions[state.consequenceIndex] : null

  return (
    <main className="relative bg-space lg:h-full lg:overflow-hidden">
      <div className="h-[45vh] lg:absolute lg:inset-0 lg:h-auto">
        <Suspense fallback={<p className="flex h-full items-center justify-center text-ink-3">Loading the Moon…</p>}>
          <MoonViewport mission={mission} selectedUid={selectedUid} onSelect={onSelect} />
        </Suspense>
      </div>

      <div className="flex flex-col gap-3 p-3 lg:pointer-events-none lg:absolute lg:inset-0 lg:grid lg:grid-cols-[300px_1fr_320px] lg:grid-rows-[auto_1fr_auto]">
        <header className="pointer-events-auto order-first flex flex-wrap items-center gap-3 rounded-xl border border-line bg-panel/90 px-4 py-2 backdrop-blur lg:col-span-3">
          <div className="mr-auto">
            <p className="font-display text-lg leading-tight font-bold">{def.name}</p>
            <p className="text-xs text-ink-3">
              Day <strong className="text-ink">{mission.day}</strong> of {def.durationDays} · ☀ {mission.day === 0 ? 'Landing' : today.label} · Tomorrow: {tomorrow.label} ({Math.round(tomorrow.factor * 100)}% sun)
            </p>
            <div className="mt-1 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-space" aria-hidden>
              <div className="h-full bg-accent transition-[width]" style={{ width: `${(mission.day / def.durationDays) * 100}%` }} />
            </div>
          </div>
          {storm && (
            <p className="rounded-lg border border-critical/50 bg-critical/15 px-3 py-1 text-sm font-semibold text-critical" role="status">
              ☢ Solar storm · {storm.remainingDays} day(s)
            </p>
          )}
          {!finished ? (
            <div className="flex items-center gap-2" role="group" aria-label="Time controls">
              <Button variant={playing ? 'secondary' : 'primary'} onClick={() => setPlaying((p) => !p)} disabled={blocked && !playing}>
                {playing ? '⏸ Pause' : '▶ Play'}
              </Button>
              <Button onClick={() => dispatch({ type: 'advanceDay' })} disabled={blocked}>
                ⏭ Next day
              </Button>
              <Button variant="ghost" onClick={() => setSpeed((s) => (s + 1) % SPEEDS.length)} aria-label={`Speed ${SPEEDS[speed].label}, click to change`}>
                {SPEEDS[speed].label}
              </Button>
            </div>
          ) : (
            <Button variant="primary" onClick={() => dispatch({ type: 'navigate', screen: 'result' })}>
              {mission.status === 'success' ? '🏁 Mission report' : '📋 What went wrong?'}
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => {
              if (finished || window.confirm('Abort the mission and return to the main menu?')) dispatch({ type: 'navigate', screen: 'menu' })
            }}
          >
            Menu
          </Button>
        </header>

        <div className="pointer-events-auto lg:row-start-2 lg:self-start lg:overflow-y-auto lg:max-h-full">
          <ResourcePanel mission={mission} />
        </div>

        <div className="pointer-events-auto lg:col-start-3 lg:row-start-2 lg:self-start lg:overflow-y-auto lg:max-h-full">
          <SystemsPanel mission={mission} selectedUid={selectedUid} onSelect={onSelect} />
        </div>

        {finished && (
          <div className="pointer-events-auto self-center justify-self-center lg:col-start-2 lg:row-start-2">
            <div
              role="status"
              className={`rounded-2xl border px-8 py-6 text-center backdrop-blur ${mission.status === 'success' ? 'border-good/50 bg-good/15' : 'border-critical/50 bg-critical/15'}`}
            >
              <p className="font-display text-3xl font-bold">{mission.status === 'success' ? '🏁 Mission complete!' : '❌ Mission failed'}</p>
              <p className="mt-1 text-ink-2">
                {mission.status === 'success'
                  ? `All ${def.durationDays} days survived · dose ${fmt(mission.crewDoseMsv)} mSv`
                  : `${gameContent.science.lessons[mission.failure!.cause].title} on day ${mission.failure!.day}`}
              </p>
              <Button variant="primary" className="mt-4" onClick={() => dispatch({ type: 'navigate', screen: 'result' })}>
                See the mission analysis →
              </Button>
            </div>
          </div>
        )}

        <div className="pointer-events-auto h-56 lg:col-span-3 lg:row-start-3 lg:h-40 lg:max-w-3xl lg:justify-self-center lg:w-full">
          <MissionLog mission={mission} />
        </div>
      </div>

      {mission.status === 'awaiting-decision' && mission.pendingEvent && <EventModal mission={mission} />}
      {consequence && <ConsequencePanel record={consequence} />}
    </main>
  )
}
