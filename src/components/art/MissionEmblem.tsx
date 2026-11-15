/**
 * @file
 * @brief The game's mission patch: a round embroidered-style emblem (original artwork).
 */
import { useId } from 'react'

export function MissionEmblem({ size = 96, ringText, className = '' }: { size?: number; ringText: string; className?: string }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className={className} aria-hidden>
      <defs>
        <radialGradient id={`${id}-sky`} cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#1d3a8a" />
          <stop offset="70%" stopColor="#0a1640" />
          <stop offset="100%" stopColor="#050a1f" />
        </radialGradient>
        <radialGradient id={`${id}-moon`} cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#f2f2ee" />
          <stop offset="65%" stopColor="#b9b7b0" />
          <stop offset="100%" stopColor="#6f6c66" />
        </radialGradient>
        <linearGradient id={`${id}-flame`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe08a" />
          <stop offset="100%" stopColor="#ff5a1f" stopOpacity="0" />
        </linearGradient>
        <path id={`${id}-ring`} d="M100,100 m-74,0 a74,74 0 1,1 148,0 a74,74 0 1,1 -148,0" />
      </defs>
      <circle cx="100" cy="100" r="97" fill="#0b1226" stroke="#ffb067" strokeWidth="4" />
      <circle cx="100" cy="100" r="86" fill="#101b3a" stroke="#5ad1ff" strokeWidth="2" />
      <text fill="#eaf6ff" fontFamily="Space Grotesk, Inter, sans-serif" fontWeight="700" fontSize="13" letterSpacing="3">
        <textPath href={`#${id}-ring`} startOffset="2%">
          {ringText}
        </textPath>
      </text>
      <circle cx="100" cy="100" r="62" fill={`url(#${id}-sky)`} stroke="#5ad1ff" strokeOpacity="0.6" strokeWidth="1.5" />
      {[
        [70, 62, 1.6],
        [128, 58, 1.2],
        [140, 88, 1.8],
        [62, 96, 1.1],
        [112, 74, 0.9],
        [84, 50, 1],
      ].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#fff" />
      ))}
      {/* Moon horizon */}
      <clipPath id={`${id}-clip`}>
        <circle cx="100" cy="100" r="62" />
      </clipPath>
      <g clipPath={`url(#${id}-clip)`}>
        <circle cx="100" cy="196" r="70" fill={`url(#${id}-moon)`} />
        <ellipse cx="78" cy="140" rx="9" ry="3" fill="#8d8a83" />
        <ellipse cx="122" cy="146" rx="12" ry="3.5" fill="#8d8a83" />
        <ellipse cx="100" cy="158" rx="6" ry="2" fill="#8d8a83" />
      </g>
      {/* Earth */}
      <circle cx="136" cy="70" r="11" fill="#2f73d8" />
      <ellipse cx="132" cy="66" rx="4.5" ry="3" fill="#3fbf5a" />
      <ellipse cx="140" cy="75" rx="3" ry="2.2" fill="#3fbf5a" />
      {/* Rocket */}
      <g transform="translate(100 100) rotate(28)">
        <path d="M0 -40c10 8 14 22 13 38H-13C-14 -18 -10 -32 0 -40z" fill="#f5f6f8" stroke="#1b2442" strokeWidth="2" />
        <circle cx="0" cy="-16" r="5" fill="#5ad1ff" stroke="#1b2442" strokeWidth="2" />
        <path d="M-13 -6l-9 12 9-2zM13 -6l9 12-9-2z" fill="#ff8a3d" stroke="#1b2442" strokeWidth="2" strokeLinejoin="round" />
        <path d="M-7 -2h14l-3 26h-8z" fill={`url(#${id}-flame)`} />
      </g>
      <path d="M100 4l3 7h7l-6 4 2 7-6-4-6 4 2-7-6-4h7z" fill="#ffb067" />
    </svg>
  )
}
