/**
 * @file
 * @brief Renders the lunar outpost view and daily operations HUD.
 */
import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { useApp } from '../../app/state/AppContext'
import { useMissionAudio } from '../../audio/useMissionAudio'
import { gameContent, getMission, illuminationPeriod } from '../../game'
import { useI18n } from '../../i18n/useI18n'
import type { ImmersiveView } from '../../immersive/types'
import type { MissionState } from '../../types/game'
import { ConsequencePanel } from '../decisions/ConsequencePanel'
import { ImmersiveLayer } from '../immersive/ImmersiveLayer'
import { ViewToggle } from '../immersive/ViewToggle'
import { EventModal } from '../events/EventModal'
import { ResourcePanel } from '../resources/ResourcePanel'
import { OutpostTutorial } from '../tutorial/OutpostTutorial'
import { hasSeenTutorial } from '../tutorial/tutorialSteps'
import { RankInsignia } from '../art/RankInsignia'
import { Icon } from '../ui/Icon'
import { LanguageToggle } from '../ui/LanguageToggle'
import { SoundToggle } from '../ui/SoundToggle'
import { Button, fmt } from '../ui/ui'
import { GlossaryText } from '../ui/Term'
import { ScienceObjective } from '../science/ScienceObjective'
import { AlertsBar } from './AlertsBar'
import { DayProcessing } from './DayProcessing'
import { LoadingStart, TransitionStatus, useTransitionBusy } from './TransitionStatus'
import { LOADING_STEPS } from '../../immersive/transitions'
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
  const { t, content } = useI18n()
  const def = getMission(gameContent, mission.missionId)
  const text = getMission(content, mission.missionId)
  const [selectedUid, setSelectedUid] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(0)
  const [tourOpen, setTourOpen] = useState(() => !hasSeenTutorial())
  const closeTour = useCallback(() => setTourOpen(false), [])
  const onSelect = useCallback((uid: string | null) => setSelectedUid(uid), [])
  const [immersiveView, setImmersiveView] = useState<ImmersiveView | null>(null)
  // The tutorial points at the management panels, so it always runs in the management view.
  const view = tourOpen ? 'orbit' : state.view
  const immersive = view === 'firstPerson'
  const dayBusy = useTransitionBusy('day')
  useMissionAudio(mission)

  const finished = mission.status === 'success' || mission.status === 'failure'
  const blocked = mission.status !== 'running' || state.consequenceIndex !== null

  useEffect(() => {
    // The tutorial only pauses the UI timer; it never changes the mission itself.
    if (!playing || blocked || tourOpen) return
    const id = window.setTimeout(() => dispatch({ type: 'advanceDay' }), SPEEDS[speed].ms)
    return () => window.clearTimeout(id)
  }, [playing, blocked, tourOpen, speed, mission, dispatch])

  useEffect(() => {
    if (finished) setPlaying(false)
  }, [finished])

  const today = illuminationPeriod(def, Math.max(1, mission.day))
  const periodLabel = mission.day === 0 ? t('outpost.landing') : text.illumination[def.illumination.indexOf(today)].label
  const consequence = state.consequenceIndex !== null ? mission.decisions[state.consequenceIndex] : null
  const abort = () => {
    if (finished || window.confirm(t('outpost.abortConfirm'))) dispatch({ type: 'navigate', screen: 'menu' })
  }

  return (
    <main className={immersive ? 'fixed inset-0 overflow-hidden bg-space' : 'relative bg-space lg:h-full lg:overflow-hidden'}>
      <div data-tour="viewport" className={immersive ? 'absolute inset-0' : 'h-[45vh] lg:absolute lg:inset-0 lg:h-auto'}>
        <Suspense
          fallback={
            <p className="flex h-full items-center justify-center text-ink-3">
              <LoadingStart steps={LOADING_STEPS} />
              {t('outpost.loading')}
            </p>
          }
        >
          <MoonViewport mission={mission} selectedUid={selectedUid} onSelect={onSelect} view={view} onView={setImmersiveView} />
        </Suspense>
      </div>

      {immersive && (
        <ImmersiveLayer
          mission={mission}
          view={immersiveView}
          holdEvents={dayBusy}
          viewToggle={<ViewToggle variant="hud" />}
          onMenu={abort}
          time={{
            playing,
            blocked,
            finished,
            speedLabel: SPEEDS[speed].label,
            togglePlay: () => setPlaying((p) => !p),
            nextDay: () => dispatch({ type: 'advanceDay' }),
            cycleSpeed: () => setSpeed((s) => (s + 1) % SPEEDS.length),
          }}
        />
      )}

      {!immersive && (
      <div className="flex flex-col gap-3 p-3 lg:pointer-events-none lg:absolute lg:inset-0 lg:grid lg:grid-cols-[300px_1fr_320px] lg:grid-rows-[auto_1fr_auto]">
        <header className="hud-frame pointer-events-auto order-first flex flex-wrap items-center gap-3 rounded-xl px-4 py-2 backdrop-blur-md lg:col-span-3">
          <div data-tour="mission-clock" className="mr-auto">
            <p className="flex items-center gap-2 font-display text-lg leading-tight font-bold">
              <span title={t(`rank.${mission.rank}.name`)}>
                <RankInsignia rank={mission.rank} size={22} />
              </span>
              {text.name}
            </p>
            <p className="flex items-center gap-2 text-xs text-ink-3">
              <span className="font-display text-sm font-bold text-ink tabular-nums">{t('fp.day', { day: mission.day, days: def.durationDays })}</span>
              <span title={periodLabel}>
                <Icon name="sun" className="text-warn" /> {Math.round((mission.history.at(-1)?.illumination ?? 1) * 100)}%
              </span>
            </p>
            <div className="mt-1 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-space" aria-hidden>
              <div className="h-full bg-gradient-to-r from-hud to-accent transition-[width]" style={{ width: `${(mission.day / def.durationDays) * 100}%` }} />
            </div>
          </div>
          <AlertsBar mission={mission} className="order-last basis-full" />
          {!finished ? (
            <div data-tour="time-controls" className="flex items-center gap-2" role="group" aria-label={t('outpost.timeControls')}>
              <Button variant={playing ? 'secondary' : 'primary'} onClick={() => setPlaying((p) => !p)} disabled={blocked && !playing}>
                <Icon name={playing ? 'pause' : 'play'} /> {playing ? t('outpost.pause') : t('outpost.play')}
              </Button>
              <Button onClick={() => dispatch({ type: 'advanceDay' })} disabled={blocked}>
                <Icon name="skip" /> {t('outpost.next')}
              </Button>
              <Button variant="ghost" onClick={() => setSpeed((s) => (s + 1) % SPEEDS.length)} aria-label={t('outpost.speedAria', { speed: SPEEDS[speed].label })}>
                {SPEEDS[speed].label}
              </Button>
            </div>
          ) : (
            <Button variant="primary" onClick={() => dispatch({ type: 'navigate', screen: 'result' })}>
              <Icon name={mission.status === 'success' ? 'flag' : 'report'} /> {mission.status === 'success' ? t('outpost.report') : t('outpost.whatWentWrong')}
            </Button>
          )}
          <div data-tour="view-toggle">
            <ViewToggle />
          </div>
          <Button data-tour="help" variant="ghost" className="px-2.5" onClick={() => setTourOpen(true)} aria-label={t('outpost.tutorialAria')} title={t('outpost.tutorial')}>
            <Icon name="help" />
          </Button>
          <SoundToggle compact />
          <LanguageToggle />
          <Button variant="ghost" onClick={abort}>
            {t('outpost.menu')}
          </Button>
        </header>

        <div data-tour="resources" className="pointer-events-auto lg:row-start-2 lg:self-start lg:overflow-y-auto lg:max-h-full">
          <ResourcePanel mission={mission} />
          <div className="mt-3">
            <ScienceObjective mission={mission} />
          </div>
        </div>

        <div data-tour="systems" className="pointer-events-auto lg:col-start-3 lg:row-start-2 lg:self-start lg:overflow-y-auto lg:max-h-full">
          <SystemsPanel mission={mission} selectedUid={selectedUid} onSelect={onSelect} />
        </div>

        {finished && (
          <div className="pointer-events-auto self-center justify-self-center lg:col-start-2 lg:row-start-2">
            <div
              role="status"
              className={`rounded-2xl border px-8 py-6 text-center backdrop-blur ${mission.status === 'success' ? 'border-good/50 bg-good/15' : 'border-critical/50 bg-critical/15'}`}
            >
              <p className="font-display text-3xl font-bold"><Icon name={mission.status === 'success' ? 'flag' : 'fail'} className="mr-2" />
                {mission.status === 'success' ? t('outpost.complete') : t('outpost.failed')}</p>
              <p className="mt-1 text-ink-2">
                <GlossaryText
                  text={
                    mission.status === 'success'
                      ? t('outpost.successLine', { days: def.durationDays, dose: fmt(mission.crewDoseMsv) })
                      : t('outpost.failureLine', { lesson: content.science.lessons[mission.failure!.cause].title, day: mission.failure!.day })
                  }
                />
              </p>
              <Button variant="primary" className="mt-4" onClick={() => dispatch({ type: 'navigate', screen: 'result' })}>
                {t('outpost.analysis')} <Icon name="arrowRight" />
              </Button>
            </div>
          </div>
        )}

        <div data-tour="mission-log" className="pointer-events-auto h-56 lg:col-span-3 lg:row-start-3 lg:h-40 lg:max-w-3xl lg:justify-self-center lg:w-full">
          <MissionLog mission={mission} />
        </div>
      </div>
      )}

      <DayProcessing mission={mission} duration={playing ? Math.min(1000, SPEEDS[speed].ms * 0.6) : 1000} />
      <TransitionStatus className={immersive ? 'top-24 right-3' : 'right-3 bottom-3 sm:right-4 sm:bottom-4'} />
      {/* The next scene (an event) waits until the day's results have been shown. */}
      {!immersive && !dayBusy && mission.status === 'awaiting-decision' && mission.pendingEvent && <EventModal mission={mission} />}
      {!immersive && consequence && <ConsequencePanel record={consequence} />}
      <OutpostTutorial open={tourOpen} onClose={closeTour} context={{ crew: def.crew, days: def.durationDays }} />
    </main>
  )
}
