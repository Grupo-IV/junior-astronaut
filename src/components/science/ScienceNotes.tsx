/**
 * @file
 * @brief "The science in this game": every important number, what kind of value it is
 * (law of nature, measured, engineering reference or game choice), its unit, range and source.
 */
import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n/useI18n'
import type { ScienceKind } from '../../types/game'
import { Icon, type IconName } from '../ui/Icon'
import { GlossaryText } from '../ui/Term'
import { Button, SourceLink } from '../ui/ui'

const KINDS: { kind: ScienceKind; icon: IconName; style: string }[] = [
  { kind: 'physics', icon: 'science', style: 'border-accent-2/50 text-accent-2' },
  { kind: 'measured', icon: 'satellite', style: 'border-good/50 text-good-ink' },
  { kind: 'engineering', icon: 'wrench', style: 'border-hud/50 text-hud' },
  { kind: 'game', icon: 'sparkle', style: 'border-warn/50 text-warn' },
]

export function ScienceNotesButton({ className = '' }: { className?: string }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="secondary" className={className} onClick={() => setOpen(true)}>
        <Icon name="science" /> {t('science.open')}
      </Button>
      {open && <ScienceNotes onClose={() => setOpen(false)} />}
    </>
  )
}

export function ScienceNotes({ onClose }: { onClose: () => void }) {
  const { t, n, content } = useI18n()
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => headingRef.current?.focus(), [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const params = content.science.parameters

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-2 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="science-title"
        className="hud-frame max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-2xl p-4 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 id="science-title" ref={headingRef} tabIndex={-1} className="font-display text-xl font-bold outline-none">
              <Icon name="science" className="mr-1.5 text-accent-2" /> {t('science.title')}
            </h2>
            <p className="mt-1 text-sm text-ink-2">{t('science.intro')}</p>
          </div>
          <Button variant="ghost" className="min-h-11 min-w-11 px-2" onClick={onClose} aria-label={t('science.close')}>
            <Icon name="close" />
          </Button>
        </header>

        <div className="mt-4 rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm">
          <p className="font-semibold text-warn">
            <Icon name="radiation" className="mr-1.5" /> {t('science.dose.title')}
          </p>
          <p className="mt-1 text-ink-2">
            <GlossaryText text={t('science.dose.body')} />
          </p>
        </div>

        {KINDS.map(({ kind, icon, style }) => {
          const list = params.filter((p) => p.kind === kind)
          if (list.length === 0) return null
          return (
            <section key={kind} className="mt-5" aria-labelledby={`kind-${kind}`}>
              <h3 id={`kind-${kind}`} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold tracking-wide uppercase ${style}`}>
                <Icon name={icon} /> {t(`science.kind.${kind}`)}
              </h3>
              <p className="mt-1 text-xs text-ink-3">{t(`science.kind.${kind}.about`)}</p>
              <ul className="mt-2 space-y-2">
                {list.map((p) => (
                  <li key={p.id} className="rounded-xl bg-white/[0.03] p-3 text-sm">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-semibold">{p.name}</span>
                      {p.value !== null && (
                        <span className="font-display font-bold text-ink tabular-nums">
                          {n(p.value, String(p.value).split('.')[1]?.length ?? 0)} {p.unit}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-ink-2">
                      <GlossaryText text={p.note} />
                    </p>
                    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-3">
                      {p.range && <span>{t('science.range', { range: p.range })}</span>}
                      {p.source ? <SourceLink sourceKey={p.source} sources={content.science.sources} /> : <span>{t('science.gameRule')}</span>}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </section>
    </div>
  )
}
