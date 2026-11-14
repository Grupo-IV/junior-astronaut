/**
 * @file
 * @brief What a decision did, read from the mission itself: the notes the engine wrote,
 * the change in every store, and the state of the habitat now.
 */
import { useEffect, useRef } from 'react'
import { eventDef } from '../../game'
import { decisionDeltas, hasTag, leakState, type Delta } from '../../immersive/staging'
import { useI18n } from '../../i18n/useI18n'
import type { DecisionRecord, MissionState } from '../../types/game'
import { Icon, type IconName } from '../ui/Icon'
import { GlossaryText } from '../ui/Term'
import { Button } from '../ui/ui'

const DELTA_ICON: Record<Delta['kind'], IconName> = {
  oxygen: 'oxygen',
  water: 'water',
  food: 'food',
  energy: 'battery',
  spares: 'toolbox',
  dose: 'radiation',
}

/** Whether more of this is good news (doses are the other way round). */
const MORE_IS_BETTER: Record<Delta['kind'], boolean> = { oxygen: true, water: true, food: true, energy: true, spares: true, dose: false }

export function CinematicOutcome({
  record,
  before,
  after,
  onContinue,
}: {
  record: DecisionRecord
  before: MissionState
  after: MissionState
  onContinue: () => void
}) {
  const { t, m, n, content } = useI18n()
  const def = eventDef(content, record.eventId)
  const option = def.options.find((o) => o.id === record.optionId)!
  const deltas = decisionDeltas(before, after)
  const buttonRef = useRef<HTMLButtonElement>(null)
  useEffect(() => buttonRef.current?.focus(), [record])

  const wasLeak = leakState(before) !== 'none'
  const leak = leakState(after)
  const states: { text: string; good: boolean }[] = []
  if (wasLeak) states.push(leak === 'none' ? { text: t('cine.state.leakStopped'), good: true } : { text: t('cine.state.leakActive'), good: false })
  if (hasTag(after, 'bay_sealed') && !hasTag(before, 'bay_sealed')) states.push({ text: t('cine.state.baySealed'), good: true })
  if (hasTag(after, 'crew_sheltered') && !hasTag(before, 'crew_sheltered')) states.push({ text: t('cine.state.sheltered'), good: true })
  const followUp = after.status === 'awaiting-decision' && !!after.pendingEvent

  const signed = (value: number, digits: number) => `${value > 0 ? '+' : '−'}${n(Math.abs(value), digits)}`
  const deltaText = (d: Delta) => {
    switch (d.kind) {
      case 'oxygen':
      case 'water':
      case 'food':
        return t('cine.delta.kg', { name: t(`stock.${d.kind}`), delta: signed(d.value, 1) })
      case 'energy':
        return t('cine.delta.kwh', { name: t('stock.energy'), delta: signed(d.value, 0) })
      case 'spares':
        return t('cine.delta.spares', { delta: signed(d.value, 0) })
      case 'dose':
        return t('cine.delta.msv', { name: t('res.dose'), delta: signed(d.value, 1) })
    }
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-end justify-center p-2 sm:items-center sm:p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="outcome-title"
        className={`cine-panel animate-rise pointer-events-auto max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl p-4 sm:p-5 ${record.timedOut ? 'cine-panel-bad' : ''}`}
      >
        <p className={`text-[11px] font-bold tracking-[0.3em] uppercase ${record.timedOut ? 'text-critical' : 'text-accent-2'}`}>
          {record.timedOut ? t('cine.timedOut') : t('cine.outcome')}
        </p>
        <h2 id="outcome-title" className="mt-1 font-display text-lg leading-tight font-bold sm:text-xl">
          <Icon name={option.icon} className="mr-1.5 text-accent-2" />
          {option.label}
        </h2>

        {record.notes.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-ink-2">
            {record.notes.map((note, i) => (
              <li key={i} className="flex gap-2">
                <Icon name="info" className="mt-0.5 text-warn" />
                <span>
                  <GlossaryText text={m(note)} />
                </span>
              </li>
            ))}
          </ul>
        )}

        {states.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm font-semibold">
            {states.map((s) => (
              <li key={s.text} className={s.good ? 'text-good-ink' : 'text-critical'}>
                <Icon name={s.good ? 'check' : 'warning'} className="mr-1.5" />
                {s.text}
              </li>
            ))}
          </ul>
        )}

        <h3 className="mt-4 text-[11px] font-bold tracking-[0.2em] text-ink-3 uppercase">{t('cine.changes')}</h3>
        {deltas.length === 0 ? (
          <p className="mt-1 text-sm text-ink-3">{t('cine.noChange')}</p>
        ) : (
          <ul className="mt-1.5 flex flex-wrap gap-1.5 text-sm">
            {deltas.map((d) => {
              const good = d.value > 0 === MORE_IS_BETTER[d.kind]
              return (
                <li key={d.kind} className={`hud-chip ${good ? 'text-good-ink' : 'text-serious'}`}>
                  <Icon name={DELTA_ICON[d.kind]} />
                  {deltaText(d)}
                </li>
              )
            })}
          </ul>
        )}

        <p className="mt-4 rounded-lg bg-white/5 p-3 text-sm text-ink-2">
          <strong className="text-accent-2">{t('consequence.lesson')} </strong>
          <GlossaryText text={option.lesson} />
        </p>
        {followUp && <p className="mt-2 text-xs font-semibold text-warn">{t('cine.next')}</p>}
        <div className="mt-4 flex justify-end">
          <Button ref={buttonRef} variant="primary" className="min-h-11" onClick={onContinue}>
            {t('consequence.continue')} <Icon name="arrowRight" />
          </Button>
        </div>
      </section>
    </div>
  )
}
