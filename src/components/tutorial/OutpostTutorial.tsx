/**
 * @file
 * @brief Short, skippable coach-mark tour of the outpost screen.
 *
 * Purely presentational: it reads element positions from the page and never
 * dispatches app actions, so the simulation is untouched. While it is open the
 * outpost screen pauses its auto-play timer, and an overlay blocks clicks.
 */
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useI18n } from '../../i18n/useI18n'
import { Icon } from '../ui/Icon'
import { Button } from '../ui/ui'
import { markTutorialSeen, placeCard, TOUR_PHASES, TOUR_STEPS, type Rect, type TourContext } from './tutorialSteps'

const PAD = 6

export function OutpostTutorial({ open, onClose, context }: { open: boolean; onClose: () => void; context: TourContext }) {
  if (!open) return null
  return <TourDialog onClose={onClose} context={context} />
}

function TourDialog({ onClose, context }: { onClose: () => void; context: TourContext }) {
  const { t } = useI18n()
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const step = TOUR_STEPS[index]
  const last = index === TOUR_STEPS.length - 1

  // Give focus back to whatever opened the tour (e.g. the Tutorial button).
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    return () => opener?.focus({ preventScroll: true })
  }, [])

  useEffect(() => contentRef.current?.focus({ preventScroll: true }), [index])

  useLayoutEffect(() => {
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`)
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    let frame = 0
    const measure = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const vw = window.innerWidth
        const vh = window.innerHeight
        const r = el?.getBoundingClientRect()
        let target: Rect | null = null
        if (r && r.width > 0 && r.height > 0) {
          // Clip to the viewport so a full-screen target (the 3D view) still gets a visible outline.
          const top = Math.max(PAD, r.top)
          const left = Math.max(PAD, r.left)
          target = { top, left, width: Math.min(vw - PAD, r.right) - left, height: Math.min(vh - PAD, r.bottom) - top }
        }
        const card = cardRef.current?.getBoundingClientRect()
        setRect(target)
        setPos(placeCard(target && { ...target, top: target.top - PAD, left: target.left - PAD, width: target.width + PAD * 2, height: target.height + PAD * 2 }, { width: card?.width ?? 352, height: card?.height ?? 240 }, { width: vw, height: vh }))
      })
    }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    if (el) observer?.observe(el)
    if (cardRef.current) observer?.observe(cardRef.current)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
      observer?.disconnect()
    }
  }, [step.target])

  const finish = () => {
    markTutorialSeen()
    onClose()
  }
  const next = () => (last ? finish() : setIndex((i) => i + 1))
  const back = () => setIndex((i) => Math.max(0, i - 1))

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      finish()
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      next()
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      back()
    } else if (e.key === 'Enter' && e.target === contentRef.current) {
      e.preventDefault()
      next()
    } else if (e.key === 'Tab') {
      // Keep focus inside the card while the tour is open.
      const focusable = Array.from(cardRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])') ?? [])
      if (focusable.length === 0) return
      const first = focusable[0]
      const lastEl = focusable[focusable.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || active === contentRef.current)) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && active === lastEl) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  return (
    <div className="fixed inset-0 z-40" onKeyDown={onKeyDown}>
      {/* Click shield: the tour is modal, the game underneath cannot be operated. */}
      <div className={`absolute inset-0 ${rect ? '' : 'bg-black/60'}`} onMouseDown={(e) => e.preventDefault()} aria-hidden />
      {rect && (
        <div
          aria-hidden
          className="pointer-events-none fixed rounded-xl ring-2 ring-accent shadow-[0_0_0_9999px_rgba(3,6,14,0.62)] motion-safe:transition-all motion-safe:duration-300"
          style={{ top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }}
        />
      )}

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        className={`hud-frame fixed w-[min(22rem,calc(100vw-2rem))] rounded-2xl shadow-2xl motion-safe:transition-[top,left] motion-safe:duration-300 ${pos ? '' : 'invisible'}`}
        style={{ top: pos?.top ?? 16, left: pos?.left ?? 16 }}
      >
        <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2">
          <ol className="flex items-center gap-1 text-[10px] font-bold tracking-widest" aria-label={t('tour.loop')}>
            {TOUR_PHASES.map((phase, i) => (
              <li key={phase} className="flex items-center gap-1">
                <span
                  className={`rounded-full px-2 py-0.5 ${phase === step.phase ? 'bg-accent text-space' : 'text-ink-3'}`}
                  aria-current={phase === step.phase ? 'step' : undefined}
                >
                  {t(`tour.phase.${phase}`)}
                </span>
                {i < TOUR_PHASES.length - 1 && <Icon name="chevronRight" className="text-ink-3" />}
              </li>
            ))}
          </ol>
          <span className="text-xs text-ink-3">
            {t('tour.progress', { step: index + 1, total: TOUR_STEPS.length })}
          </span>
        </div>

        <div ref={contentRef} tabIndex={-1} className="px-4 pt-3 outline-none">
          <h2 id="tour-title" className="font-display text-lg font-bold">
            {t(`tour.${step.id}.title`)}
          </h2>
          <p id="tour-body" className="mt-1 text-sm text-ink-2">
            {t(`tour.${step.id}.body`, { crew: context.crew, days: context.days })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 px-4 pt-3 pb-2">
          <Button variant="ghost" className="mr-auto px-2" onClick={finish}>
            {last ? t('tour.close') : t('tour.skip')}
          </Button>
          <Button onClick={back} disabled={index === 0}>
            <Icon name="arrowLeft" /> {t('tour.back')}
          </Button>
          <Button variant="primary" onClick={next}>
            {last ? t('tour.done') : t('tour.next')} {!last && <Icon name="arrowRight" />}
          </Button>
        </div>
        <p className="px-4 pb-3 text-[11px] text-ink-3">{t('tour.keys')}</p>
      </div>
    </div>
  )
}
