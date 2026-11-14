/**
 * @file
 * @brief Friendly astronaut mascot for the title screen (original SVG artwork).
 *
 * White surface suit with blue mission stripes, a gold sun visor reflecting
 * the Earth, a life-support backpack and a waving glove.
 */
import { useId } from 'react'

export function AstronautMascot({ className = '' }: { className?: string }) {
  const id = useId().replace(/:/g, '')
  const g = (name: string) => `url(#${id}-${name})`
  return (
    <svg viewBox="0 0 320 400" className={className} aria-hidden>
      <defs>
        <linearGradient id={`${id}-suit`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#e3e6ec" />
          <stop offset="100%" stopColor="#a9b0bd" />
        </linearGradient>
        <radialGradient id={`${id}-visor`} cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#ffe6a3" />
          <stop offset="35%" stopColor="#f2a43a" />
          <stop offset="75%" stopColor="#a8541a" />
          <stop offset="100%" stopColor="#3a1a08" />
        </radialGradient>
        <linearGradient id={`${id}-pack`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d9dde4" />
          <stop offset="100%" stopColor="#8f97a6" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#5ad1ff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#5ad1ff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="160" cy="210" rx="160" ry="190" fill={g('glow')} />
      {/* Backpack */}
      <rect x="78" y="150" width="164" height="150" rx="26" fill={g('pack')} stroke="#2a3350" strokeWidth="4" />
      {/* Legs */}
      <path d="M118 300v58c0 10 8 16 18 16h18v-74z" fill={g('suit')} stroke="#2a3350" strokeWidth="4" />
      <path d="M202 300v58c0 10-8 16-18 16h-18v-74z" fill={g('suit')} stroke="#2a3350" strokeWidth="4" />
      <rect x="112" y="356" width="46" height="26" rx="10" fill="#3b4256" stroke="#2a3350" strokeWidth="4" />
      <rect x="162" y="356" width="46" height="26" rx="10" fill="#3b4256" stroke="#2a3350" strokeWidth="4" />
      <path d="M120 330h34M166 330h34" stroke="#2d6cdf" strokeWidth="8" />
      {/* Body */}
      <rect x="98" y="170" width="124" height="140" rx="40" fill={g('suit')} stroke="#2a3350" strokeWidth="4" />
      <rect x="128" y="214" width="64" height="44" rx="10" fill="#1d2640" stroke="#2a3350" strokeWidth="3" />
      <circle cx="146" cy="236" r="7" fill="#ff8a3d" />
      <circle cx="168" cy="230" r="5" fill="#3ddc84" />
      <circle cx="178" cy="244" r="5" fill="#5ad1ff" />
      <path d="M100 280h120" stroke="#2d6cdf" strokeWidth="8" />
      {/* Left arm (down) */}
      <path d="M102 196c-26 10-38 40-34 74" fill="none" stroke="#2a3350" strokeWidth="38" strokeLinecap="round" />
      <path d="M102 196c-26 10-38 40-34 74" fill="none" stroke={g('suit')} strokeWidth="30" strokeLinecap="round" />
      <circle cx="68" cy="276" r="17" fill="#3b4256" stroke="#2a3350" strokeWidth="4" />
      {/* Right arm (waving) */}
      <path d="M218 196c28-6 46-34 50-72" fill="none" stroke="#2a3350" strokeWidth="38" strokeLinecap="round" />
      <path d="M218 196c28-6 46-34 50-72" fill="none" stroke={g('suit')} strokeWidth="30" strokeLinecap="round" />
      <path d="M232 186l14-10" stroke="#2d6cdf" strokeWidth="8" strokeLinecap="round" />
      <g transform="translate(270 112)">
        <rect x="-18" y="-22" width="36" height="36" rx="14" fill="#3b4256" stroke="#2a3350" strokeWidth="4" />
        <rect x="-15" y="-38" width="9" height="22" rx="4.5" fill="#3b4256" stroke="#2a3350" strokeWidth="3" />
        <rect x="-4" y="-42" width="9" height="24" rx="4.5" fill="#3b4256" stroke="#2a3350" strokeWidth="3" />
        <rect x="7" y="-38" width="9" height="22" rx="4.5" fill="#3b4256" stroke="#2a3350" strokeWidth="3" />
      </g>
      {/* Helmet */}
      <circle cx="160" cy="112" r="86" fill={g('suit')} stroke="#2a3350" strokeWidth="5" />
      <rect x="112" y="186" width="96" height="22" rx="11" fill="#c5cad3" stroke="#2a3350" strokeWidth="4" />
      <ellipse cx="160" cy="118" rx="64" ry="54" fill={g('visor')} stroke="#2a3350" strokeWidth="5" />
      {/* Reflections: the Earth and the station */}
      <circle cx="186" cy="100" r="13" fill="#3d86e6" opacity="0.85" />
      <ellipse cx="182" cy="96" rx="5" ry="3.5" fill="#5ecf6e" opacity="0.9" />
      <ellipse cx="191" cy="106" rx="3.5" ry="2.5" fill="#5ecf6e" opacity="0.9" />
      <path d="M118 96c10-26 38-36 62-30" fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" opacity="0.55" />
      <circle cx="122" cy="122" r="5" fill="#fff" opacity="0.6" />
      <rect x="80" y="96" width="14" height="32" rx="6" fill="#d7dbe2" stroke="#2a3350" strokeWidth="3" />
      <rect x="226" y="96" width="14" height="32" rx="6" fill="#d7dbe2" stroke="#2a3350" strokeWidth="3" />
      <circle cx="233" cy="88" r="5" fill="#ff8a3d" />
    </svg>
  )
}
