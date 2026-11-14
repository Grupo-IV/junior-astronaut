/**
 * @file
 * @brief Cinematic decision: the event, what is at stake, two to four options and, when the
 * situation cannot wait, a countdown.
 *
 * The options are the event's real options from the engine: choosing one only
 * reports the choice; the mission changes when the hands carry out the order
 * (see ImmersiveLayer). When the countdown ends the event's fallback runs.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { audioEngine } from '../../audio/engine'
import { eventDef, gameContent, optionAvailability } from '../../game'
import { stagingFor, type ContextFact } from '../../immersive/staging'
import { useI18n } from '../../i18n/useI18n'
import type { MissionState } from '../../types/game'
import { Icon } from '../ui/Icon'
import { GlossaryText } from '../ui/Term'
import { Button } from '../ui/ui'

const LETTERS = ['A', 'B', 'C', 'D']

export function CinematicDecision({
  mission,
  seconds,
  onConfirm,
}: {
  mission: MissionState
  /** Time to decide, or null when the situation can wait. */
  seconds: number | null
  onConfirm: (optionId: string, timedOut: boolean) => void
}) {
  const { t, m, n, content } = useI18n()
  const pending = mission.pendingEvent!
  const rules = eventDef(gameContent, pending.eventId)
  const text = eventDef(content, pending.eventId)
  const staging = stagingFor(pending.eventId)
  const variant = pending.variant ? text.variants?.[pending.variant] : undefined
  const target = pending.targetUid ? mission.buildings.find((b) => b.uid === pending.targetUid) : undefined
  const options = useMemo(
    () => rules.options.map((rule, i) => ({ rule, text: text.options[i], availability: optionAvailability(gameContent, mission, rule) })),
    [rules, text, mission],
  )
  const firstOpen = options.findIndex((o) => o.availability.available)
  const [selected, setSelected] = useState<number | null>(null)
  const [left, setLeft] = useState(seconds ?? 0)
  const done = useRef(false)
  const headingRef = useRef<HTMLHeadingElement>(null)

  const confirm = useCallback(
    (index: number, timedOut = false) => {
      if (done.current) return
      const o = options[index]
      if (!timedOut && !o?.availability.available) return
      done.current = true
      audioEngine.fx(timedOut ? 'failed' : 'confirm')
      onConfirm(timedOut ? rules.urgency!.fallback : o.rule.id, timedOut)
    },
    [options, onConfirm, rules],
  )

  const choose = useCallback(
    (index: number) => {
      if (!options[index]?.availability.available) return
      setSelected((current) => {
        if (current !== index) audioEngine.fx('select')
        return index
      })
    },
    [options],
  )

  // The countdown must not restart when the component re-renders: it calls the latest `confirm` through a ref.
  const confirmRef = useRef(confirm)
  useEffect(() => {
    confirmRef.current = confirm
  }, [confirm])

  useEffect(() => headingRef.current?.focus(), [pending.eventId])

  // Countdown. It pauses while the page is hidden, so switching apps never costs a decision.
  useEffect(() => {
    if (seconds === null) return
    let remaining = seconds
    let lastWhole = Math.ceil(remaining)
    let last = performance.now()
    const id = window.setInterval(() => {
      const now = performance.now()
      const elapsed = (now - last) / 1000
      last = now
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      remaining = Math.max(0, remaining - elapsed)
      setLeft(remaining)
      const whole = Math.ceil(remaining)
      if (whole !== lastWhole) {
        lastWhole = whole
        if (whole <= 5 && whole > 0) audioEngine.fx('tick')
      }
      if (remaining <= 0) {
        window.clearInterval(id)
        confirmRef.current(-1, true)
      }
    }, 100)
    return () => window.clearInterval(id)
  }, [seconds])

  // Keyboard: A–D or 1–4 choose, arrows move, Enter or Space confirms.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return
      const key = e.key.toLowerCase()
      const letter = 'abcd'.indexOf(key)
      const digit = '1234'.indexOf(key)
      const index = letter >= 0 ? letter : digit
      if (index >= 0 && index < options.length) {
        e.preventDefault()
        choose(index)
        return
      }
      if (['arrowdown', 'arrowright', 'arrowup', 'arrowleft'].includes(key)) {
        e.preventDefault()
        const step = key === 'arrowdown' || key === 'arrowright' ? 1 : -1
        const open = options.map((o, i) => (o.availability.available ? i : -1)).filter((i) => i >= 0)
        if (open.length === 0) return
        const at = selected === null ? -1 : open.indexOf(selected)
        choose(open[(at + step + open.length) % open.length])
        return
      }
      if ((key === 'enter' || key === ' ') && selected !== null) {
        const tag = (e.target as HTMLElement | null)?.tagName
        if (tag === 'BUTTON' && key === ' ') return
        e.preventDefault()
        confirm(selected)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [options, selected, choose, confirm])

  const fraction = seconds ? left / seconds : 1
  const timerTone = fraction > 0.5 ? 'var(--color-hud)' : fraction > 0.25 ? 'var(--color-warn)' : 'var(--color-critical)'
  const emergency = staging.alert === 'emergency'

  const fact = (f: ContextFact): string | null => {
    switch (f) {
      case 'oxygen':
        return t('cine.context.oxygen', { kg: n(mission.stocks.oxygen, 1) })
      case 'water':
        return t('cine.context.water', { kg: n(mission.stocks.water, 1) })
      case 'food':
        return t('cine.context.food', { kg: n(mission.stocks.food, 1) })
      case 'power':
        return t('cine.context.power', { kwh: n(mission.stocks.energy) })
      case 'dose':
        return t('cine.context.dose', { dose: n(mission.crewDoseMsv, 1), limit: gameContent.environment.doseLimitMsv })
      case 'spares':
        return t('cine.context.spares', { count: mission.spareParts })
      case 'affected':
        return target ? t('cine.context.affected', { building: content.buildings[target.defId].name }) : null
    }
  }
  const facts = staging.context.map(fact).filter((f): f is string => !!f)

  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="cine-title"
      className="pointer-events-none fixed inset-0 z-40 flex flex-col justify-between gap-2 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <div className={`cine-vignette ${emergency ? 'cine-vignette-emergency' : ''}`} aria-hidden />
      <div className="cine-bar cine-bar-top" aria-hidden />
      <div className="cine-bar cine-bar-bottom" aria-hidden />
      {/* What is happening: top left, so the middle of the view (the problem, the hands) stays visible. */}
      <header className="cine-panel cine-panel-soft pointer-events-auto relative mx-2 overflow-y-auto rounded-2xl px-4 py-3 sm:mx-5 sm:mt-[3vh] sm:max-w-xl sm:px-5">
        <p className={`flex items-center gap-2 text-[11px] font-bold tracking-[0.3em] uppercase ${emergency ? 'text-critical' : staging.alert === 'storm' ? 'text-warn' : 'text-accent-2'}`}>
          <span className="relative inline-flex">
            <Icon name="warning" />
            <span className="animate-pulse-ring absolute inset-0 rounded-full border border-current" />
          </span>
          {t(`cine.alert.${staging.alert}`)} · {t('cine.day', { day: pending.day })}
        </p>
        <h2 id="cine-title" ref={headingRef} tabIndex={-1} className="mt-1 font-display text-lg leading-tight font-bold tracking-wide uppercase outline-none sm:text-2xl">
          <Icon name={text.icon} className={`mr-2 ${emergency ? 'text-critical' : 'text-accent'}`} />
          {text.title}
        </h2>
        {variant && <p className="text-sm text-serious">{variant.label}</p>}
        <p className="mt-1.5 text-[13px] leading-snug text-ink-2 sm:text-sm">
          <GlossaryText text={text.what} />
        </p>
        {facts.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5 text-xs" aria-label={t('event.what')}>
            {facts.map((f) => (
              <li key={f} className="hud-chip">
                {f}
              </li>
            ))}
          </ul>
        )}
        <details className="mt-1.5 text-xs text-ink-3">
          <summary className="cursor-pointer text-accent-2/80 hover:text-accent-2">{t('cine.why')}</summary>
          <p className="mt-1 text-ink-2">
            <GlossaryText text={text.why} />
          </p>
        </details>
      </header>

      {/* The choice: across the bottom of the screen. */}
      <div className="cine-panel pointer-events-auto relative mx-auto w-[calc(100%-1rem)] max-w-4xl overflow-y-auto rounded-2xl px-3 pt-2.5 pb-2.5 sm:px-5">

        {seconds !== null ? (
          <div className="flex items-center gap-3" role="timer" aria-label={t('cine.timerAria', { seconds: Math.ceil(left) })}>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10" aria-hidden>
              <div className="h-full rounded-full transition-[width] duration-100 ease-linear" style={{ width: `${fraction * 100}%`, background: timerTone }} />
            </div>
            <span className="min-w-[3.5rem] text-right font-mono text-sm font-bold tabular-nums" style={{ color: timerTone }}>
              {t('cine.timer', { seconds: Math.ceil(left) })}
            </span>
          </div>
        ) : (
          <p className="text-xs text-ink-3">{t('cine.noTimer')}</p>
        )}

        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2 sm:gap-2">
          {options.map(({ rule, text: o, availability }, i) => {
            const isSelected = selected === i
            return (
              <li key={rule.id}>
                <button
                  type="button"
                  disabled={!availability.available}
                  aria-pressed={isSelected}
                  aria-label={t('cine.optionAria', { letter: LETTERS[i], label: o.label })}
                  onPointerEnter={(e) => {
                    if (e.pointerType === 'mouse') choose(i)
                  }}
                  onClick={() => (isSelected ? confirm(i) : choose(i))}
                  className="cine-option group flex min-h-[3.25rem] w-full flex-col rounded-xl px-3 py-2.5 text-left disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <span className="flex items-start gap-2.5">
                    <span className="cine-letter mt-0.5 shrink-0" aria-hidden>
                      {LETTERS[i]}
                    </span>
                    <span className="font-semibold leading-snug">
                      <Icon name={o.icon} className="mr-1.5 text-hud" />
                      {o.label}
                    </span>
                  </span>
                  {!availability.available && availability.reason && (
                    <span className="mt-1 block pl-9 text-xs font-semibold text-critical">
                      <Icon name="close" className="mr-1" />
                      {t('decision.unavailable', { reason: m(availability.reason) })}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>

        {selected !== null && (
          <div className="mt-2 rounded-xl bg-white/[0.04] px-3 py-2 text-xs" aria-live="polite">
            <p className="text-good-ink">
              <Icon name="plus" className="mr-1" />
              <span className="sr-only">{t('decision.benefit')} </span>
              <GlossaryText text={options[selected].text.benefit} />
            </p>
            <p className="mt-0.5 text-serious">
              <Icon name="minus" className="mr-1" />
              <span className="sr-only">{t('decision.cost')} </span>
              <GlossaryText text={options[selected].text.cost} />
            </p>
          </div>
        )}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-ink-3">
            {selected !== null ? t('cine.confirmHint') : <span className="hidden sm:inline">{t('cine.keys')}</span>}
          </p>
          <Button variant="primary" className="min-h-11 min-w-36" disabled={firstOpen < 0} onClick={() => (selected === null ? choose(firstOpen) : confirm(selected))}>
            {selected === null ? t('cine.select') : t('cine.confirm')} <Icon name="arrowRight" />
          </Button>
        </div>
      </div>
    </section>
  )
}
