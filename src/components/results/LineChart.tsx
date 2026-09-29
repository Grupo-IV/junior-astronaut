/**
 * @file
 * @brief Accessible SVG line chart with a tabular representation.
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react'

export interface Series {
  key: string
  label: string
  color: string
  values: number[]
}

export interface Band {
  from: number
  to: number
  label: string
}

interface Props {
  title: string
  unit: string
  days: number[]
  series: Series[]
  threshold?: { value: number; label: string }
  bands?: Band[]
  yMax?: number
  height?: number
}

const PAD = { top: 12, right: 64, bottom: 26, left: 40 }
const LABEL_GAP = 12

/** A "nice" tick step (1, 2, 2.5, 5 × 10^n) giving about four intervals. */
function niceStep(max: number): number {
  const raw = Math.max(max, 1e-9) / 4
  const p = 10 ** Math.floor(Math.log10(raw))
  const n = raw / p
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p
}

/** Nudges end labels apart vertically so they never overlap. */
function spreadLabels(ys: number[]): number[] {
  const order = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y)
  for (let k = 1; k < order.length; k++) order[k].y = Math.max(order[k].y, order[k - 1].y + LABEL_GAP)
  const out: number[] = []
  for (const o of order) out[o.i] = o.y
  return out
}

function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(560)
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(280, entry.contentRect.width)))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, width]
}

export function LineChart({ title, unit, days, series, threshold, bands = [], yMax, height = 200 }: Props) {
  const id = useId()
  const [hover, setHover] = useState<number | null>(null)
  const [boxRef, W] = useWidth<HTMLDivElement>()
  const H = height
  const { max, step } = useMemo(() => {
    const top = yMax ?? Math.max(threshold?.value ?? 0, ...series.flatMap((s) => s.values)) * 1.05
    const st = niceStep(top)
    return { max: Math.ceil(top / st) * st, step: st }
  }, [yMax, series, threshold])
  const n = days.length
  const x = (i: number) => PAD.left + (n <= 1 ? 0 : (i / (n - 1)) * (W - PAD.left - PAD.right))
  const y = (v: number) => PAD.top + (1 - Math.min(v, max) / max) * (H - PAD.top - PAD.bottom)
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step)
  const endLabelY = spreadLabels(series.map((s) => y(s.values[n - 1] ?? 0) + 3))
  const dayToIndex = (d: number) => days.indexOf(d)
  const labelEvery = Math.max(1, Math.ceil(n / 8))

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * W
    const i = Math.round(((px - PAD.left) / (W - PAD.left - PAD.right)) * (n - 1))
    setHover(Math.max(0, Math.min(n - 1, i)))
  }

  return (
    <figure className="rounded-xl border border-line bg-panel p-3">
      <figcaption className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <span id={`${id}-t`} className="font-display text-sm font-bold">
          {title}
        </span>
        {series.length > 1 && (
          <ul className="flex flex-wrap gap-3 text-xs text-ink-2" aria-label="Legend">
            {series.map((s) => (
              <li key={s.key} className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-4 rounded" style={{ background: s.color }} aria-hidden />
                {s.label}
              </li>
            ))}
          </ul>
        )}
      </figcaption>
      <div className="relative" ref={boxRef}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          height={H}
          className="block w-full touch-none"
          role="img"
          aria-labelledby={`${id}-t`}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') setHover((h) => Math.min(n - 1, (h ?? -1) + 1))
            if (e.key === 'ArrowLeft') setHover((h) => Math.max(0, (h ?? n) - 1))
          }}
          onBlur={() => setHover(null)}
        >
          {bands.map((b) => {
            const i0 = dayToIndex(b.from)
            const i1 = dayToIndex(b.to)
            if (i0 < 0 || i1 < 0) return null
            return (
              <g key={`${b.from}-${b.label}`}>
                <rect x={x(i0) - 4} y={PAD.top} width={x(i1) - x(i0) + 8} height={H - PAD.top - PAD.bottom} fill="currentColor" className="text-line" opacity={0.45} />
                <text x={(x(i0) + x(i1)) / 2} y={PAD.top + 10} textAnchor="middle" fontSize={9} className="fill-ink-3">
                  {b.label}
                </text>
              </g>
            )
          })}
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="currentColor" className="text-line" strokeWidth={t === 0 ? 1 : 0.5} />
              <text x={PAD.left - 6} y={y(t) + 3} textAnchor="end" fontSize={10} className="fill-ink-3">
                {Number.isInteger(t) ? t : t.toFixed(1)}
              </text>
            </g>
          ))}
          {days.map((d, i) =>
            i % labelEvery === 0 || (i === n - 1 && (n - 1) % labelEvery >= labelEvery / 2) ? (
              <text key={d} x={x(i)} y={H - 8} textAnchor="middle" fontSize={10} className="fill-ink-3">
                D{d}
              </text>
            ) : null,
          )}
          {threshold && (
            <g>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(threshold.value)} y2={y(threshold.value)} stroke="var(--color-critical)" strokeDasharray="4 3" strokeWidth={1.5} />
              <text x={W - PAD.right + 4} y={y(threshold.value) + 3} fontSize={10} className="fill-ink-2">
                {threshold.label}
              </text>
            </g>
          )}
          {series.map((s, si) => (
            <g key={s.key}>
              <polyline
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
              />
              {series.length > 1 && s.values.length > 0 && (
                <text x={x(n - 1) + 6} y={endLabelY[si]} fontSize={10} className="fill-ink-2">
                  {s.label}
                </text>
              )}
            </g>
          ))}
          {hover !== null && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={H - PAD.bottom} stroke="currentColor" className="text-ink-3" strokeWidth={1} />
              {series.map((s) => (
                <circle key={s.key} cx={x(hover)} cy={y(s.values[hover])} r={4} fill={s.color} stroke="var(--color-panel)" strokeWidth={2} />
              ))}
            </g>
          )}
        </svg>
        {hover !== null && (
          <div
            className="pointer-events-none absolute top-1 rounded-lg border border-line bg-panel-2 px-2 py-1 text-xs shadow-lg"
            style={{ left: `${(x(hover) / W) * 100}%`, transform: x(hover) > W / 2 ? 'translateX(calc(-100% - 8px))' : 'translateX(8px)' }}
          >
            <p className="font-semibold">Day {days[hover]}</p>
            {series.map((s) => (
              <p key={s.key} className="flex items-center gap-1.5 text-ink-2">
                <span className="inline-block size-2 rounded-full" style={{ background: s.color }} aria-hidden />
                {s.label}: <span className="text-ink">{s.values[hover].toFixed(1)}</span> {unit}
              </p>
            ))}
          </div>
        )}
      </div>
      <details className="mt-1 text-xs text-ink-3">
        <summary className="cursor-pointer">Show data table</summary>
        <div className="mt-2 max-h-48 overflow-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className="pr-3">Day</th>
                {series.map((s) => (
                  <th key={s.key} className="pr-3">
                    {s.label} ({unit})
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((d, i) => (
                <tr key={d}>
                  <td className="pr-3">{d}</td>
                  {series.map((s) => (
                    <td key={s.key} className="pr-3 text-ink-2">
                      {s.values[i].toFixed(1)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  )
}
