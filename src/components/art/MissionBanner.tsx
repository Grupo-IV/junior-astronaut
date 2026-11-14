/**
 * @file
 * @brief Mission card artwork: a lunar horizon with the base, low Sun and Earth (original SVG).
 */
import { useId } from 'react'

export function MissionBanner({ variant, className = '' }: { variant: 'cadet' | 'commander' | 'mars'; className?: string }) {
  const id = useId().replace(/:/g, '')
  const mars = variant === 'mars'
  const ground = mars ? ['#c4643a', '#6e2a14'] : ['#b9b6ae', '#4a4843']
  const sky = mars ? ['#3a1a14', '#0c0606'] : ['#0b1638', '#03050c']
  return (
    <svg viewBox="0 0 400 160" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={sky[1]} />
          <stop offset="100%" stopColor={sky[0]} />
        </linearGradient>
        <linearGradient id={`${id}-ground`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={ground[0]} />
          <stop offset="100%" stopColor={ground[1]} />
        </linearGradient>
        <radialGradient id={`${id}-sun`}>
          <stop offset="0%" stopColor="#fff8e6" />
          <stop offset="30%" stopColor="#ffd9a0" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#ffb060" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="160" fill={`url(#${id}-sky)`} />
      {Array.from({ length: 40 }, (_, i) => (
        <circle key={i} cx={(i * 97) % 400} cy={(i * 53) % 90} r={i % 7 === 0 ? 1.3 : 0.7} fill="#fff" opacity={0.4 + (i % 5) * 0.12} />
      ))}
      {!mars && (
        <g>
          <circle cx="330" cy="38" r="15" fill="#2f73d8" />
          <ellipse cx="325" cy="33" rx="6" ry="4" fill="#3fbf5a" />
          <ellipse cx="335" cy="44" rx="4" ry="3" fill="#3fbf5a" />
          <ellipse cx="328" cy="27" rx="7" ry="2" fill="#fff" opacity="0.7" />
          <circle cx="330" cy="38" r="19" fill="none" stroke="#7ab4ff" strokeOpacity="0.35" strokeWidth="4" />
        </g>
      )}
      <circle cx={mars ? 90 : 60} cy="108" r="60" fill={`url(#${id}-sun)`} />
      {/* Distant massifs */}
      <path d="M0 110 L40 84 L70 96 L110 70 L150 92 L190 78 L230 98 L270 74 L320 96 L360 82 L400 100 V160 H0z" fill={ground[1]} opacity="0.85" />
      <path d="M0 122 Q100 104 200 118 T400 114 V160 H0z" fill={`url(#${id}-ground)`} />
      <ellipse cx="300" cy="140" rx="34" ry="6" fill="#000" opacity="0.18" />
      <ellipse cx="70" cy="148" rx="20" ry="4" fill="#000" opacity="0.18" />
      {/* Outpost silhouette */}
      <g transform={variant === 'commander' ? 'translate(150 100)' : 'translate(170 104)'}>
        <rect x="0" y="6" width="56" height="16" rx="8" fill="#eceae4" />
        <rect x="24" y="0" width="10" height="8" rx="2" fill="#d6d3cc" />
        <circle cx="14" cy="14" r="2.2" fill="#ffcf8a" />
        <circle cx="28" cy="14" r="2.2" fill="#ffcf8a" />
        <circle cx="42" cy="14" r="2.2" fill="#ffcf8a" />
        <path d="M-26 22V-14M-40 -14h28v-22h-28z" stroke="#c8ccd4" strokeWidth="2" fill="#1d3a8a" />
        {variant === 'commander' && (
          <>
            <path d="M78 22a14 14 0 0128 0z" fill="#d8ecff" opacity="0.6" stroke="#fff" />
            <path d="M-60 22V-10M-74 -10h28v-22h-28z" stroke="#c8ccd4" strokeWidth="2" fill="#1d3a8a" />
            <rect x="62" y="12" width="12" height="10" fill="#cfcbc2" />
          </>
        )}
      </g>
    </svg>
  )
}
