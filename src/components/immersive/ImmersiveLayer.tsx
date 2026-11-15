/**
 * @file
 * @brief Directs the first-person experience: exploring the habitat, using its consoles,
 * and living an emergency from the first alarm to the consequence.
 *
 * Sequence of an event:
 *   alarm (sound + red light) → the hands react → the camera goes to the
 *   problem and a hand points at it → cinematic decision (with a countdown
 *   when it cannot wait) → the hands carry out the order → the engine applies
 *   the decision at the moment the hand lands → the outcome, read from the
 *   mission state.
 *
 * Every change to the mission goes through the app reducer and the engine
 * (`decide`, `toggleBuilding`, `repairBuilding`); this component only decides
 * *when* to send them so they match what the player sees.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useApp } from '../../app/state/AppContext'
import { audioEngine, type Fx } from '../../audio/engine'
import { useRelaxed } from '../../app/settings/pace'
import { crewInShelter, decisionTimeLimit, eventDef, gameContent, getMission, shelterStatus } from '../../game'
import { alertLevel, hasTag, leakState, optionHands, stagingFor } from '../../immersive/staging'
import { STATION_ORDER, type HandAction, type HandRequest, type ImmersiveView, type StationId } from '../../immersive/types'
import { useI18n } from '../../i18n/useI18n'
import type { MissionState } from '../../types/game'
import { MissionLog } from '../hud/MissionLog'
import { Icon } from '../ui/Icon'
import { GlossaryText } from '../ui/Term'
import { Button, fmt } from '../ui/ui'
import { CinematicDecision } from './CinematicDecision'
import { CinematicOutcome } from './CinematicOutcome'
import { ImmersiveHud, type TimeControls } from './ImmersiveHud'
import { StationPanel, type StationAction } from './StationPanel'

type Phase = 'explore' | 'staging' | 'decide' | 'acting' | 'outcome'

const ACTION_FX: Record<HandAction, Fx> = {
  press: 'interact',
  point: 'interact',
  grab: 'interact',
  repair: 'repair',
  seal: 'seal',
  startle: 'interact',
  wrist: 'interact',
  beckon: 'interact',
  relax: 'failed',
}

const pendingKey = (m: MissionState) => (m.pendingEvent ? `${m.pendingEvent.eventId}:${m.pendingEvent.day}:${m.decisions.length}` : null)

export function ImmersiveLayer({
  mission,
  view,
  time,
  viewToggle,
  onMenu,
  holdEvents = false,
}: {
  mission: MissionState
  view: ImmersiveView | null
  time: TimeControls
  viewToggle: ReactNode
  onMenu: () => void
  /** The day's results are still being shown: the next event waits. */
  holdEvents?: boolean
}) {
  const { state, dispatch } = useApp()
  const { t, m, content } = useI18n()
  const [station, setStation] = useState<StationId>('command')
  const [panel, setPanel] = useState<StationId | null>(null)
  const [phase, setPhase] = useState<Phase>(() => (mission.status === 'awaiting-decision' ? 'decide' : 'explore'))
  const [logOpen, setLogOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [ticker, setTicker] = useState<number | null>(null)
  const before = useRef<MissionState | null>(null)
  const staged = useRef<string | null>(pendingKey(mission))
  const timers = useRef<number[]>([])
  const live = useRef({ mission, phase, busy, station, view })
  useEffect(() => {
    live.current = { mission, phase, busy, station, view }
  })

  const later = useCallback((ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, Math.max(0, ms)))
  }, [])
  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), [])

  // ------------------------------------------------------------ stations and consoles

  const openStation = useCallback(
    (id: StationId) => {
      const { phase: p, busy: b, view: v } = live.current
      if (p !== 'explore' || b) return
      setPanel(id)
      audioEngine.fx('interact')
      v?.playHands({ action: 'point', station: id, focus: 'console' })
    },
    [],
  )

  /** Closing a console gives the view back to the player (drag to look around again). */
  const closePanel = useCallback(() => {
    setPanel(null)
    const { view: v, station: here, phase: p } = live.current
    if (p === 'explore') v?.focus(here, null)
  }, [])

  const walkTo = useCallback((id: StationId) => {
    const { phase: p, view: v } = live.current
    if (p !== 'explore' || !v) return
    setPanel(null)
    v.goToStation(id)
  }, [])

  useEffect(() => {
    if (!view) return
    view.onStationChange((id) => {
      setStation(id)
      setPanel((open) => (open && open !== id ? null : open))
    })
    view.onInteract(openStation)
    // Arriving in the middle of an event: look at the problem straight away.
    const pending = live.current.mission.pendingEvent
    if (pending) {
      const s = stagingFor(pending.eventId)
      view.focus(s.station, s.focus)
    }
  }, [view, openStation])

  const act = useCallback(
    (action: StationAction) => {
      const { busy: b, view: v, station: here, mission: current } = live.current
      if (b) return
      const where = panel ?? here
      if (action.kind === 'eva') {
        // Two crewmates suit up and go out through the airlock: a wave, then the airlock control.
        setBusy(true)
        const timing = v ? v.playHands({ action: 'beckon', station: 'command', focus: 'airlock' }) : { impactMs: 0, totalMs: 0 }
        later(timing.impactMs, () => {
          audioEngine.fx('seal')
          dispatch({ type: 'goOnEva' })
        })
        later(timing.totalMs, () => setBusy(false))
        return
      }
      if (action.kind === 'toShelter' || action.kind === 'toHabitat') {
        // Through the airlock or the shelter hatch: a hand on the door, then the walk.
        const shelter = shelterStatus(gameContent, current)
        setBusy(true)
        setPanel(null)
        const timing = v
          ? v.playHands(action.kind === 'toShelter' ? { action: shelter.canEnter ? 'beckon' : 'press', station: 'command', focus: 'airlock' } : { action: 'press', station: 'shelter', focus: 'door' })
          : { impactMs: 0, totalMs: 0 }
        later(timing.impactMs, () => {
          audioEngine.fx('seal')
          if (action.kind === 'toShelter') {
            if (shelter.canEnter) dispatch({ type: 'takeShelter' })
            v?.goToStation('shelter')
          } else {
            if (shelter.canLeave) dispatch({ type: 'leaveShelter' })
            v?.goToStation('command')
          }
        })
        later(timing.totalMs, () => setBusy(false))
        return
      }
      if (action.kind === 'inspect') {
        audioEngine.fx('interact')
        v?.playHands({ action: 'point', station: where, focus: 'console' })
        return
      }
      setBusy(true)
      // Spare kits hang on the rack at the life-support station.
      const request: HandRequest =
        action.kind === 'toggle'
          ? { action: 'press', station: where, focus: 'console' }
          : { action: 'repair', station: where, focus: 'console', withKit: action.withSpare && where === 'lifeSupport' }
      const timing = v ? v.playHands(request) : { impactMs: 0, totalMs: 0 }
      later(timing.impactMs, () => {
        if (action.kind === 'toggle') dispatch({ type: 'toggleBuilding', uid: action.uid })
        else dispatch({ type: 'repairBuilding', uid: action.uid })
        audioEngine.fx(action.kind === 'toggle' ? 'interact' : 'repair')
      })
      later(timing.totalMs, () => setBusy(false))
    },
    [dispatch, later, panel],
  )

  // When the crew moves into the shelter (from a console, a decision or the management view), so do you.
  const sheltered = crewInShelter(mission) || hasTag(mission, 'crew_sheltered')
  const wasSheltered = useRef(sheltered)
  useEffect(() => {
    if (sheltered && !wasSheltered.current && live.current.station !== 'shelter') view?.goToStation('shelter')
    wasSheltered.current = sheltered
  }, [sheltered, view])

  // ------------------------------------------------------------ walking (keys)

  useEffect(() => {
    const held = new Set<string>()
    const push = () => {
      const f = (held.has('w') || held.has('arrowup') ? 1 : 0) - (held.has('s') || held.has('arrowdown') ? 1 : 0)
      const r = (held.has('d') || held.has('arrowright') ? 1 : 0) - (held.has('a') || held.has('arrowleft') ? 1 : 0)
      live.current.view?.setMove(f, r)
    }
    const keys = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'])
    const down = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.altKey || e.ctrlKey || e.metaKey) return
      const key = e.key.toLowerCase()
      if (!keys.has(key) || live.current.phase !== 'explore') return
      e.preventDefault()
      held.add(key)
      push()
    }
    const up = (e: KeyboardEvent) => {
      if (held.delete(e.key.toLowerCase())) push()
    }
    const blur = () => {
      held.clear()
      push()
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [])

  // A scene (alarm, decision) takes the body: stop walking.
  useEffect(() => {
    if (phase !== 'explore') view?.setMove(0, 0)
  }, [phase, view])

  // ------------------------------------------------------------ events: alarm → reaction → focus → decision

  useEffect(() => {
    const key = pendingKey(mission)
    if (!key || holdEvents || mission.status !== 'awaiting-decision' || phase !== 'explore' || staged.current === key) return
    staged.current = key
    setPanel(null)
    setLogOpen(false)
    const staging = stagingFor(mission.pendingEvent!.eventId)
    if (!view) {
      setPhase('decide')
      return
    }
    setPhase('staging')
    let delay = 0
    if (staging.reaction === 'startle') {
      view.playHands({ action: 'startle' })
      delay = 900
    } else {
      view.shake(0.25)
    }
    later(delay, () => {
      const timing = view.playHands({ action: 'point', station: staging.station, focus: staging.focus })
      later(timing.totalMs + 200, () => setPhase((p) => (p === 'staging' ? 'decide' : p)))
    })
  }, [mission, phase, view, later, holdEvents])

  const skipStaging = () => {
    timers.current.forEach((id) => window.clearTimeout(id))
    timers.current = []
    setPhase('decide')
    const pending = live.current.mission.pendingEvent
    if (pending && view) {
      const s = stagingFor(pending.eventId)
      view.focus(s.station, s.focus)
    }
  }

  // ------------------------------------------------------------ decision → hands → engine → outcome

  const decide = useCallback(
    (optionId: string, timedOut: boolean) => {
      const { mission: current, phase: p, view: v } = live.current
      if (p !== 'decide' || !current.pendingEvent) return
      const rule = eventDef(gameContent, current.pendingEvent.eventId).options.find((o) => o.id === optionId)
      if (!rule) return
      before.current = current
      setPhase('acting')
      // Out of time: nobody acts, the automatic systems do. The hands drop.
      const request: HandRequest = timedOut ? { action: 'relax' } : optionHands(current.pendingEvent.eventId, rule, current)
      const timing = v ? v.playHands(request) : { impactMs: 0, totalMs: 0 }
      later(timing.impactMs, () => {
        dispatch({ type: 'decide', optionId, timedOut })
        if (!timedOut) audioEngine.fx(ACTION_FX[request.action])
      })
      later(Math.max(timing.totalMs, timing.impactMs + 500), () => setPhase('outcome'))
    },
    [dispatch, later],
  )

  const record = state.consequenceIndex !== null ? mission.decisions[state.consequenceIndex] : null

  useEffect(() => {
    if (phase !== 'outcome' || !record || !before.current) return
    const bad = record.timedOut || leakState(mission) === 'active' || (leakState(before.current) !== 'none' && leakState(mission) === 'slow')
    audioEngine.fx(bad ? 'failed' : 'resolved')
    if (bad) view?.shake(0.2)
  }, [phase, record, mission, view])

  const finishOutcome = () => {
    dispatch({ type: 'dismissConsequence' })
    before.current = null
    setPhase('explore')
    const next = live.current.mission.pendingEvent
    if (!next) view?.focus(live.current.station, null)
  }

  // If the decision was taken somewhere else (e.g. in the management view), go back to exploring.
  useEffect(() => {
    if ((phase === 'decide' || phase === 'staging') && mission.status !== 'awaiting-decision') {
      setPhase('explore')
      view?.focus(station, null)
    }
  }, [phase, mission.status, view, station])

  // ------------------------------------------------------------ log ticker (visual twin of every log sound)

  const logLength = mission.log.length
  useEffect(() => {
    setTicker(logLength - 1)
    const id = window.setTimeout(() => setTicker(null), 6000)
    return () => window.clearTimeout(id)
  }, [logLength])
  const latest = ticker !== null ? mission.log[ticker] : null

  // ------------------------------------------------------------ keyboard

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'Escape') {
        closePanel()
        setLogOpen(false)
        return
      }
      if (live.current.phase !== 'explore') return
      const here = live.current.station
      const i = here === 'shelter' ? -1 : STATION_ORDER.indexOf(here)
      const key = e.key.toLowerCase()
      if (key === 'q' && i >= 0) walkTo(STATION_ORDER[(i - 1 + STATION_ORDER.length) % STATION_ORDER.length])
      else if (key === 'e' && i >= 0) walkTo(STATION_ORDER[(i + 1) % STATION_ORDER.length])
      else if (key === 'f' || (key === ' ' && tag !== 'BUTTON')) {
        e.preventDefault()
        openStation(here)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [walkTo, openStation, closePanel])

  const alert = alertLevel(mission)
  const finished = mission.status === 'success' || mission.status === 'failure'
  const def = getMission(gameContent, mission.missionId)
  const relaxed = useRelaxed()
  const seconds = mission.pendingEvent ? decisionTimeLimit(gameContent, mission.pendingEvent.eventId, mission.rank) : null

  return (
    <>
      <div className={`visor ${alert === 'emergency' ? 'visor-emergency' : alert === 'storm' ? 'visor-storm' : ''}`} aria-hidden />

      {phase === 'explore' && (
        <ImmersiveHud
          mission={mission}
          station={station}
          time={time}
          onStation={walkTo}
          onUse={() => openStation(station)}
          onOpenLog={() => setLogOpen(true)}
          onMenu={onMenu}
          onMove={(f, r) => view?.setMove(f, r)}
          viewToggle={viewToggle}
        />
      )}

      {latest && phase === 'explore' && !panel && !logOpen && (
        <p className="cine-subtitle pointer-events-none fixed inset-x-0 bottom-[26%] z-20 mx-auto w-fit max-w-[min(92vw,40rem)] text-center" role="status">
          {m(latest.msg)}
        </p>
      )}

      {panel && phase === 'explore' && (
        <div className="pointer-events-none fixed inset-x-2 bottom-2 z-30 flex justify-center sm:inset-x-auto sm:right-4 sm:bottom-auto sm:top-24">
          <StationPanel mission={mission} station={panel} busy={busy} onAct={act} onClose={closePanel} />
        </div>
      )}

      {logOpen && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-2 sm:items-center" onClick={() => setLogOpen(false)}>
          <div className="flex h-[60vh] w-full max-w-2xl flex-col gap-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end">
              <Button variant="secondary" className="min-h-11" onClick={() => setLogOpen(false)} aria-label={t('fp.closeLog')}>
                <Icon name="close" /> {t('panel.close')}
              </Button>
            </div>
            <MissionLog mission={mission} />
          </div>
        </div>
      )}

      {phase === 'staging' && (
        <div className="pointer-events-none fixed inset-0 z-30">
          <div className="cine-bar cine-bar-top" aria-hidden />
          <div className="cine-bar cine-bar-bottom" aria-hidden />
          <p className="cine-subtitle absolute inset-x-0 bottom-[14vh] mx-auto w-fit max-w-[90vw] text-center font-display text-base font-bold tracking-[0.2em] uppercase" role="alert">
            <Icon name={eventDef(content, mission.pendingEvent!.eventId).icon} className="mr-2 text-critical" />
            {eventDef(content, mission.pendingEvent!.eventId).title}
          </p>
          <Button variant="ghost" className="pointer-events-auto absolute right-3 bottom-[calc(9vh+0.5rem)] min-h-11" onClick={skipStaging} aria-label={t('cine.skipAria')}>
            {t('cine.skip')} <Icon name="skip" />
          </Button>
        </div>
      )}

      {phase === 'decide' && mission.status === 'awaiting-decision' && mission.pendingEvent && (
        <CinematicDecision key={`${pendingKey(mission)}:${relaxed}`} mission={mission} seconds={relaxed ? null : seconds} onConfirm={decide} />
      )}

      {phase === 'acting' && (
        <div className="pointer-events-none fixed inset-0 z-30">
          <div className="cine-bar cine-bar-top" aria-hidden />
          <div className="cine-bar cine-bar-bottom" aria-hidden />
          <p className="cine-subtitle absolute inset-x-0 bottom-[12vh] mx-auto w-fit text-center text-sm" role="status">
            {t('cine.acting')}
          </p>
        </div>
      )}

      {phase === 'outcome' && record && before.current && (
        <CinematicOutcome record={record} before={before.current} after={mission} onContinue={finishOutcome} />
      )}
      {phase === 'outcome' && !record && (
        // The decision could not be applied (e.g. it became unavailable): nothing changed, keep playing.
        <FallbackContinue onContinue={() => setPhase('explore')} />
      )}

      {finished && phase === 'explore' && (
        <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center p-4">
          <div
            role="status"
            className={`cine-panel pointer-events-auto max-w-md rounded-2xl px-6 py-5 text-center ${mission.status === 'success' ? '' : 'cine-panel-bad'}`}
          >
            <p className="font-display text-2xl font-bold">
              <Icon name={mission.status === 'success' ? 'flag' : 'fail'} className="mr-2" />
              {mission.status === 'success' ? t('outpost.complete') : t('outpost.failed')}
            </p>
            <p className="mt-1 text-ink-2">
              <GlossaryText
                text={
                  mission.status === 'success'
                    ? t('outpost.successLine', { days: def.durationDays, dose: fmt(mission.crewDoseMsv) })
                    : t('outpost.failureLine', { lesson: content.science.lessons[mission.failure!.cause].title, day: mission.failure!.day })
                }
              />
            </p>
            <Button variant="primary" className="mt-4 min-h-11" onClick={() => dispatch({ type: 'navigate', screen: 'result' })}>
              {t('outpost.analysis')} <Icon name="arrowRight" />
            </Button>
          </div>
        </div>
      )}
    </>
  )
}

function FallbackContinue({ onContinue }: { onContinue: () => void }) {
  useEffect(() => {
    onContinue()
  }, [onContinue])
  return null
}
