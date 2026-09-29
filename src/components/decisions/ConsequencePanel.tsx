/**
 * @file
 * @brief Explains the consequence of the selected mission decision.
 */
import { useEffect, useRef } from 'react'
import { useApp } from '../../app/state/AppContext'
import { eventDef, gameContent } from '../../game'
import type { DecisionRecord } from '../../types/game'
import { Button } from '../ui/ui'

export function ConsequencePanel({ record }: { record: DecisionRecord }) {
  const { dispatch } = useApp()
  const def = eventDef(gameContent, record.eventId)
  const option = def.options.find((o) => o.id === record.optionId)!
  const buttonRef = useRef<HTMLButtonElement>(null)
  useEffect(() => buttonRef.current?.focus(), [record])

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 p-2 backdrop-blur-sm sm:items-center sm:p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="consequence-title" className="w-full max-w-xl rounded-2xl border border-accent-2/40 bg-panel p-5 shadow-2xl">
        <p className="text-xs font-bold tracking-widest text-accent-2 uppercase">Consequence</p>
        <h2 id="consequence-title" className="mt-1 font-display text-xl font-bold">
          <span aria-hidden>{option.icon}</span> {option.label}
        </h2>
        <ul className="mt-3 space-y-1 text-sm">
          <li className="text-good-ink">＋ {option.benefit}</li>
          <li className="text-serious">－ {option.cost}</li>
        </ul>
        {record.notes.length > 0 && (
          <div className="mt-3 rounded-lg border border-warn/30 bg-warn/10 p-3 text-sm">
            <p className="font-semibold text-warn">What happened</p>
            <ul className="mt-1 list-disc pl-5 text-ink-2">
              {record.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </div>
        )}
        <p className="mt-3 rounded-lg bg-panel-2 p-3 text-sm text-ink-2">
          <strong className="text-accent-2">Lesson: </strong>
          {option.lesson}
        </p>
        <p className="mt-2 text-xs text-ink-3">Watch the resource panel and mission log over the next days to see the full effect.</p>
        <div className="mt-4 flex justify-end">
          <Button ref={buttonRef} variant="primary" onClick={() => dispatch({ type: 'dismissConsequence' })}>
            Continue mission →
          </Button>
        </div>
      </div>
    </div>
  )
}
