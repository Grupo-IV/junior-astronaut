/**
 * @file
 * @brief Inline glossary term: a keyboard-accessible button that toggles a short explanation.
 */
import { Fragment, useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { GLOSSARY, splitGlossary, type GlossaryId } from './glossary'

/** Popover API (Chrome 114, Firefox 125, Safari 17) is newer than the build target, so older browsers get a fallback. */
const SUPPORTS_POPOVER = typeof HTMLElement !== 'undefined' && Object.prototype.hasOwnProperty.call(HTMLElement.prototype, 'popover')

const GAP = 6
const MARGIN = 16

export function Term({ id, children }: { id: GlossaryId; children: ReactNode }) {
  const entry = GLOSSARY[id]
  const panelId = useId()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLSpanElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLSpanElement>(null)

  /** Keeps the panel next to the term and inside the viewport (works on narrow screens). */
  const place = useCallback(() => {
    const button = buttonRef.current
    const panel = panelRef.current
    const wrap = wrapRef.current
    if (!button || !panel || !wrap) return
    const b = button.getBoundingClientRect()
    const width = Math.min(288, window.innerWidth - 2 * MARGIN)
    panel.style.width = `${width}px`
    const left = Math.max(MARGIN, Math.min(b.left, window.innerWidth - width - MARGIN))
    const height = panel.offsetHeight
    const fitsBelow = b.bottom + GAP + height <= window.innerHeight - GAP
    const top = fitsBelow || b.top - GAP - height < GAP ? b.bottom + GAP : b.top - GAP - height
    // Popover lives in the top layer (viewport coordinates); the fallback is positioned inside the wrapper.
    const origin = SUPPORTS_POPOVER ? { left: 0, top: 0 } : wrap.getBoundingClientRect()
    panel.style.left = `${left - origin.left}px`
    panel.style.top = `${top - origin.top}px`
  }, [])

  // Popover API: the browser handles click, Escape and light dismiss; we mirror its state.
  useEffect(() => {
    const panel = panelRef.current
    if (!SUPPORTS_POPOVER || !panel) return
    const onBeforeToggle = (e: Event) => {
      if ((e as ToggleEvent).newState === 'open') place()
    }
    const onToggle = (e: Event) => setOpen((e as ToggleEvent).newState === 'open')
    panel.addEventListener('beforetoggle', onBeforeToggle)
    panel.addEventListener('toggle', onToggle)
    return () => {
      panel.removeEventListener('beforetoggle', onBeforeToggle)
      panel.removeEventListener('toggle', onToggle)
    }
  }, [place])

  // Fallback: close on Escape (focus back on the term) and on a press outside.
  useEffect(() => {
    if (SUPPORTS_POPOVER || !open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      buttonRef.current?.focus()
    }
    const onPointer = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, place])

  return (
    <span ref={wrapRef} className={SUPPORTS_POPOVER ? undefined : 'relative'}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        popoverTarget={SUPPORTS_POPOVER ? panelId : undefined}
        onClick={SUPPORTS_POPOVER ? undefined : () => setOpen((o) => !o)}
        className="cursor-help rounded-sm text-inherit underline decoration-accent-2/70 decoration-dotted underline-offset-2 hover:decoration-accent-2"
      >
        {children}
        <sup aria-hidden className="ml-px text-[0.65em] text-accent-2">
          ⓘ
        </sup>
        <span className="sr-only"> (what does this mean?)</span>
      </button>
      <span
        ref={panelRef}
        id={panelId}
        popover={SUPPORTS_POPOVER ? 'auto' : undefined}
        hidden={SUPPORTS_POPOVER ? undefined : !open}
        className={`${SUPPORTS_POPOVER ? 'fixed' : 'absolute z-50'} inset-auto m-0 rounded-lg border border-accent-2/40 bg-panel-2 p-3 text-left text-xs leading-relaxed font-normal tracking-normal text-ink-2 normal-case shadow-2xl`}
      >
        <strong className="block font-display text-sm text-ink">{entry.name}</strong>
        {entry.text}
      </span>
    </span>
  )
}

/** Renders text with the first occurrence of each glossary term made explainable. */
export function GlossaryText({ text }: { text: string }) {
  return (
    <>
      {splitGlossary(text).map((part, i) => (
        <Fragment key={i}>{typeof part === 'string' ? part : <Term id={part.id}>{part.text}</Term>}</Fragment>
      ))}
    </>
  )
}
