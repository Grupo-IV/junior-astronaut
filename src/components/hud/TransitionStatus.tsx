/**
 * @file
 * @brief Shows what the game is doing between scenes: the steps, the one in
 * progress, the results of the finished ones, and how far it has got.
 */
import { useEffect, useSyncExternalStore } from 'react'
import { activeTransitions, cancelTransition, startTransition, subscribeTransitions, type Transition, type TransitionKind } from '../../immersive/transitions'
import { useI18n } from '../../i18n/useI18n'
import type { UiKey } from '../../i18n/translate'
import { Icon } from '../ui/Icon'

export function useTransitions(): Transition[] {
  return useSyncExternalStore(subscribeTransitions, activeTransitions, activeTransitions)
}

/** Is a transition of this kind still running? */
export function useTransitionBusy(kind: TransitionKind): boolean {
  return useTransitions().some((t) => t.kind === kind && !t.done)
}

/** While the 3D code itself is downloading: the first loading step. */
export function LoadingStart({ steps }: { steps: string[] }) {
  useEffect(() => {
    const id = startTransition('loading', steps)
    return () => cancelTransition(id)
  }, [steps])
  return null
}

const TITLE_ICON: Record<TransitionKind, Parameters<typeof Icon>[0]['name']> = {
  loading: 'moon',
  enter: 'helmet',
  leave: 'overview',
  travel: 'shield',
  day: 'calendar',
  eva: 'astronaut',
}

export function TransitionStatus({ className = '' }: { className?: string }) {
  const { t } = useI18n()
  const transitions = useTransitions()
  if (transitions.length === 0) return null
  const text = (key: string, args?: Record<string, string | number>) => t(key as UiKey, args)
  const detail = (tr: Transition) => {
    const d: Record<string, string | number> = { ...tr.detail }
    if (tr.kind === 'travel') d.place = tr.detail.to === 'shelter' ? t('station.shelter') : t('sys.habitat')
    return d
  }

  return (
    <div className={`pointer-events-none fixed z-40 flex w-[min(20rem,calc(100vw-1.5rem))] flex-col gap-2 ${className}`}>
      {transitions.map((tr) => {
        const percent = Math.round(tr.progress * 100)
        return (
          <section key={tr.id} className="hud-chip !block !rounded-xl !p-3 text-xs shadow-xl" aria-labelledby={`tr-${tr.id}`}>
            <div className="flex items-center justify-between gap-2">
              <p id={`tr-${tr.id}`} className="font-display text-[13px] font-bold" role="status">
                <Icon name={TITLE_ICON[tr.kind]} className="mr-1.5 text-accent-2" />
                {text(`transition.${tr.kind}.title`, detail(tr))}
              </p>
              <span className="font-mono tabular-nums text-ink-2" aria-hidden>
                {percent}%
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={t('transition.aria')}>
              <div className="h-full rounded-full bg-gradient-to-r from-hud to-accent transition-[width] duration-200" style={{ width: `${percent}%` }} />
            </div>
            <ol className="mt-2 space-y-0.5">
              {tr.steps.map((step, i) => {
                const state = tr.done || i < tr.step ? 'done' : i === tr.step ? 'now' : 'next'
                const result = tr.results[step]
                return (
                  <li key={step} className={`flex items-start gap-1.5 ${state === 'next' ? 'text-ink-3' : state === 'now' ? 'text-ink' : 'text-ink-2'}`}>
                    <span className="mt-px w-3.5 shrink-0" aria-hidden>
                      {state === 'done' ? <Icon name="check" className="text-good-ink" /> : state === 'now' ? <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-accent-2 border-t-transparent" /> : <Icon name="dot" />}
                    </span>
                    <span>
                      {text(`transition.${tr.kind}.${step}`, { ...detail(tr), ...result })}
                      {result && state === 'done' && text(`transition.${tr.kind}.${step}.result`, { ...detail(tr), ...result }) !== `transition.${tr.kind}.${step}.result` && (
                        <span className="text-ink-3"> · {text(`transition.${tr.kind}.${step}.result`, { ...detail(tr), ...result })}</span>
                      )}
                    </span>
                  </li>
                )
              })}
            </ol>
          </section>
        )
      })}
    </div>
  )
}
