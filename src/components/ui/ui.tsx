// Small reusable UI building blocks.
import type { ComponentProps, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-space hover:brightness-110 font-semibold',
  secondary: 'bg-panel-2 text-ink border border-line hover:border-ink-3',
  ghost: 'text-ink-2 hover:text-ink hover:bg-panel-2',
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

export function Panel({ children, className = '', title, id }: { children: ReactNode; className?: string; title?: ReactNode; id?: string }) {
  return (
    <section aria-labelledby={title && id ? id : undefined} className={`rounded-xl border border-line bg-panel/90 backdrop-blur ${className}`}>
      {title && (
        <h2 id={id} className="border-b border-line px-4 py-2 font-display text-xs font-bold tracking-widest text-ink-3 uppercase">
          {title}
        </h2>
      )}
      {children}
    </section>
  )
}

export type Level = 'good' | 'warn' | 'critical' | 'neutral'

const LEVEL_STYLE: Record<Level, { text: string; icon: string; word: string }> = {
  good: { text: 'text-good-ink', icon: '✔', word: 'OK' },
  warn: { text: 'text-warn', icon: '▲', word: 'LOW' },
  critical: { text: 'text-critical', icon: '✖', word: 'CRITICAL' },
  neutral: { text: 'text-ink-3', icon: '•', word: '' },
}

/** Status tag: icon + word, never colour alone. */
export function StatusTag({ level, word }: { level: Level; word?: string }) {
  const s = LEVEL_STYLE[level]
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold tracking-wide ${s.text}`}>
      <span aria-hidden>{s.icon}</span>
      {word ?? s.word}
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
    <span aria-label={`${count} of ${total} stars`} className="text-3xl tracking-widest">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={i < count ? 'text-warn' : 'text-line'} aria-hidden>
          ★
        </span>
      ))}
    </span>
  )
}

export function SourceLink({ sourceKey, sources }: { sourceKey: string; sources: Record<string, { title: string; url: string }> }) {
  const src = sources[sourceKey]
  if (!src) return null
  return (
    <a href={src.url} target="_blank" rel="noreferrer" className="text-accent-2 underline decoration-dotted underline-offset-2 hover:text-ink">
      Source: {src.title}
    </a>
  )
}

export function fmt(n: number, digits = 0): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits })
}
