/**
 * @file
 * @brief Reusable presentation primitives for the mission interface.
 */
import type { ComponentProps, ReactNode } from 'react'
import { getLocale } from '../../i18n/locale'
import { formatNumber, translate } from '../../i18n/translate'
import { Icon, type IconName } from './Icon'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-gradient-to-b from-[#ffa45e] to-accent text-space hover:brightness-110 font-semibold btn-glow',
  secondary: 'bg-panel-2/80 text-ink border border-hud-dim hover:border-hud/70 hover:bg-panel-2',
  ghost: 'text-ink-2 hover:text-ink hover:bg-white/5',
  danger: 'bg-critical/15 text-critical border border-critical/40 hover:bg-critical/25',
}

export function Button({
  variant = 'secondary',
  className = '',
  ...props
}: ComponentProps<'button'> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  )
}

/** Mission-control panel: dark glass with cyan corner brackets and an optional icon in the title bar. */
export function Panel({ children, className = '', title, id, icon }: { children: ReactNode; className?: string; title?: ReactNode; id?: string; icon?: IconName }) {
  return (
    <section aria-labelledby={title && id ? id : undefined} className={`hud-frame rounded-xl backdrop-blur-md ${className}`}>
      {title && (
        <h2 id={id} className="hud-title flex items-center gap-2 rounded-t-xl border-b border-hud-dim px-4 py-2 font-display text-xs font-bold tracking-[0.18em] text-hud uppercase">
          {icon && <Icon name={icon} size="1.25em" />}
          {title}
        </h2>
      )}
      {children}
    </section>
  )
}

export type Level = 'good' | 'warn' | 'critical' | 'neutral'

const LEVEL_STYLE: Record<Level, { text: string; icon: IconName; word: 'status.ok' | 'status.low' | 'status.critical' | null }> = {
  good: { text: 'text-good-ink', icon: 'check', word: 'status.ok' },
  warn: { text: 'text-warn', icon: 'warning', word: 'status.low' },
  critical: { text: 'text-critical', icon: 'close', word: 'status.critical' },
  neutral: { text: 'text-ink-3', icon: 'dot', word: null },
}

/** Status tag: icon + word, never colour alone. */
export function StatusTag({ level, word }: { level: Level; word?: string }) {
  const s = LEVEL_STYLE[level]
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold tracking-wide ${s.text}`}>
      <Icon name={s.icon} size="1.1em" />
      {word ?? (s.word ? translate(getLocale(), s.word) : '')}
    </span>
  )
}

/** Horizontal meter. `color` is the series/identity colour for the fill. */
export function Meter({ value, max, color, marker, label }: { value: number; max: number; color: string; marker?: number; label: string }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(max, 1e-9)) * 100))
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      className="relative h-2 w-full overflow-hidden rounded-full bg-space"
    >
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: color }} />
      {marker !== undefined && (
        <div className="absolute top-0 h-full w-0.5 bg-ink" style={{ left: `${Math.min(100, (marker / max) * 100)}%` }} aria-hidden />
      )}
    </div>
  )
}

export function Stars({ count, total = 3 }: { count: number; total?: number }) {
  return (
    <span aria-label={translate(getLocale(), 'ui.stars', { count, total })} className="inline-flex gap-2 text-4xl" role="img">
      {Array.from({ length: total }, (_, i) => (
        <Icon key={i} name="star" className={i < count ? 'text-warn drop-shadow-[0_0_10px_rgba(250,178,25,0.6)]' : 'text-line'} />
      ))}
    </span>
  )
}

export function SourceLink({ sourceKey, sources }: { sourceKey: string; sources: Record<string, { title: string; url: string }> }) {
  const src = sources[sourceKey]
  if (!src) return null
  return (
    <a href={src.url} target="_blank" rel="noreferrer" className="text-accent-2 underline decoration-dotted underline-offset-2 hover:text-ink">
      {translate(getLocale(), 'source.label', { title: src.title })}
    </a>
  )
}

/** Formats a number in the current interface language (decimal comma in Portuguese). */
export function fmt(n: number, digits = 0): string {
  return formatNumber(getLocale(), n, digits)
}
