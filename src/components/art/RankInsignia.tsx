/**
 * @file
 * @brief Shoulder-patch insignia for each crew rank (original SVG artwork).
 *
 * Ranks climb visually: one chevron for a cadet, two for a mission
 * specialist, three with a gear for a flight engineer, and gold wings with a
 * star for the commander.
 */
import { useId } from 'react'
import type { RankId } from '../../game/ranks'

const PALETTE: Record<RankId, { from: string; to: string; edge: string; mark: string }> = {
  cadet: { from: '#3aa0ff', to: '#1a3f8c', edge: '#9fd6ff', mark: '#ffffff' },
  specialist: { from: '#2fd3a0', to: '#0e6650', edge: '#9ff0d4', mark: '#ffffff' },
  engineer: { from: '#ff9d4d', to: '#a1400f', edge: '#ffd2a6', mark: '#fff6ea' },
  commander: { from: '#ffd36b', to: '#a36a06', edge: '#fff0b8', mark: '#3a2500' },
}

function Chevron({ y, color }: { y: number; color: string }) {
  return <path d={`M30 ${y}l20 12 20-12v9l-20 12-20-12z`} fill={color} />
}

export function RankInsignia({ rank, size = 56, className = '' }: { rank: RankId; size?: number; className?: string }) {
  const id = useId().replace(/:/g, '')
  const p = PALETTE[rank]
  return (
    <svg viewBox="0 0 100 116" width={size} height={(size * 116) / 100} className={className} aria-hidden>
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.from} />
          <stop offset="100%" stopColor={p.to} />
        </linearGradient>
      </defs>
      <path d="M50 3l44 14v40c0 28-19 46-44 56C25 103 6 85 6 57V17z" fill={`url(#${id}-g)`} stroke={p.edge} strokeWidth="3" />
      <path d="M50 11l36 11.5V57c0 23-15 38-36 47-21-9-36-24-36-47V22.5z" fill="none" stroke={p.edge} strokeOpacity="0.45" strokeWidth="1.5" />
      {rank === 'cadet' && (
        <>
          <Chevron y={52} color={p.mark} />
          <circle cx="50" cy="34" r="5" fill={p.mark} />
        </>
      )}
      {rank === 'specialist' && (
        <>
          <Chevron y={40} color={p.mark} />
          <Chevron y={58} color={p.mark} />
        </>
      )}
      {rank === 'engineer' && (
        <>
          <g transform="translate(50 33)" fill={p.mark}>
            {Array.from({ length: 8 }, (_, i) => (
              <rect key={i} x="-3" y="-13" width="6" height="7" rx="1" transform={`rotate(${i * 45})`} />
            ))}
            <circle r="8.5" />
            <circle r="3.5" fill={p.to} />
          </g>
          <Chevron y={52} color={p.mark} />
          <Chevron y={66} color={p.mark} />
          <Chevron y={80} color={p.mark} />
        </>
      )}
      {rank === 'commander' && (
        <>
          <path d="M50 22l5 10.5 11.5 1.7-8.3 8 2 11.4L50 48.2l-10.2 5.4 2-11.4-8.3-8 11.5-1.7z" fill={p.mark} />
          <path d="M48 66c-10-8-22-9-36-6 8 3 13 7 15 11-5-1-9 0-12 2 9 2 19 4 33 3zM52 66c10-8 22-9 36-6-8 3-13 7-15 11 5-1 9 0 12 2-9 2-19 4-33 3z" fill={p.mark} />
          <circle cx="50" cy="70" r="5" fill={p.mark} />
        </>
      )}
    </svg>
  )
}
