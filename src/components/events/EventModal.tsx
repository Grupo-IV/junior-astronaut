// EVENT → DECIDE. Explains the event (WHAT / WHY / ENGINEERING PRINCIPLE)
// and presents options with explicit benefits and costs.
import { useEffect, useRef } from 'react'
import { useApp } from '../../app/state/AppContext'
import { eventDef, gameContent } from '../../game'
import type { MissionState } from '../../types/game'
import { DecisionOptions } from '../decisions/DecisionOptions'
import { SourceLink } from '../ui/ui'

export function EventModal({ mission }: { mission: MissionState }) {
  const { dispatch } = useApp()
  const pending = mission.pendingEvent!
  const def = eventDef(gameContent, pending.eventId)
  const variant = pending.variant ? def.variants?.[pending.variant] : undefined
  const target = pending.targetUid ? mission.buildings.find((b) => b.uid === pending.targetUid) : undefined
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => headingRef.current?.focus(), [pending])

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center overflow-y-auto bg-black/60 p-2 backdrop-blur-sm sm:items-center sm:p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="event-title" className="my-auto w-full max-w-3xl rounded-2xl border border-critical/40 bg-panel shadow-2xl">
        <header className="rounded-t-2xl border-b border-line bg-critical/10 px-5 py-4">
          <p className="text-xs font-bold tracking-widest text-critical uppercase">⚠ Event · Day {pending.day}</p>
          <h2 id="event-title" ref={headingRef} tabIndex={-1} className="mt-1 font-display text-2xl font-bold outline-none">
            <span aria-hidden>{def.icon}</span> {def.title}
          </h2>
          {variant && <p className="text-sm text-serious">{variant.label}</p>}
        </header>
        <div className="space-y-3 px-5 py-4 text-sm">
          <Explain label="What?" text={def.what + (target ? ` Affected: ${gameContent.buildings[target.defId].name}.` : '')} />
          <Explain label="Why?" text={def.why} />
        </div>
        <div className="px-5 pb-2">
          <h3 className="mb-2 font-display text-sm font-bold tracking-widest text-ink-3 uppercase">Your decision</h3>
          <DecisionOptions mission={mission} def={def} onChoose={(optionId) => dispatch({ type: 'decide', optionId })} />
        </div>
        <footer className="rounded-b-2xl border-t border-line bg-panel-2 px-5 py-3 text-xs text-ink-2">
          <strong className="text-accent-2">Engineering principle: </strong>
          {def.principle} <SourceLink sourceKey={def.source} sources={gameContent.science.sources} />
        </footer>
      </div>
    </div>
  )
}

function Explain({ label, text }: { label: string; text: string }) {
  return (
    <p>
      <strong className="mr-1 font-display tracking-wide text-accent">{label}</strong>
      <span className="text-ink-2">{text}</span>
    </p>
  )
}
