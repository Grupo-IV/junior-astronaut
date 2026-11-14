/**
 * @file
 * @brief The game's icon set: original inline SVGs that replace emoji.
 *
 * Emoji look different on every device and some are missing on older systems.
 * These icons share one style (24×24, 1.8px rounded stroke, `currentColor`),
 * scale with text and inherit the colour of their context.
 *
 * Content files (buildings, events, options) refer to icons by name.
 */
import type { ReactNode, SVGProps } from 'react'

const P: Record<string, ReactNode> = {
  // Structures and supplies
  sun: (
    <>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.3M12 19.2v2.3M2.5 12h2.3M19.2 12h2.3M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
    </>
  ),
  solar: (
    <>
      <path d="M3.5 5h17l-2 9h-13z" />
      <path d="M7.7 5l-.9 9M12 5v9M16.3 5l.9 9M4.6 9.5h14.8" />
      <path d="M12 14v4M8 21h8M12 18l-3 3M12 18l3 3" />
    </>
  ),
  battery: (
    <>
      <rect x="6.5" y="4.5" width="11" height="17" rx="2" />
      <path d="M10 2.5h4" />
      <path d="M12.8 8.5l-2.6 4.2h3.6l-2.6 4.3" />
    </>
  ),
  recycle: (
    <>
      <path d="M12 3.5l2.6 4.4M12 3.5L9.2 8.3M14.6 7.9l-2.9.2M7 18.5h5M7 18.5l-2.7-4.7M7 18.5l1.4-2.6" />
      <path d="M17 18.5l2.7-4.7-2.6-4.4M17 18.5h-2.9M17.1 9.4l-2.9 1.1" />
      <path d="M8 11l-2.8.6" />
    </>
  ),
  sprout: (
    <>
      <path d="M12 21v-9" />
      <path d="M12 12c0-4 2.6-6.5 7-6.5 0 4.2-2.7 6.5-7 6.5z" />
      <path d="M12 14.5c0-3.3-2.2-5.4-6-5.4 0 3.5 2.3 5.4 6 5.4z" />
      <path d="M7 21h10" />
    </>
  ),
  oxygen: (
    <>
      <circle cx="9" cy="13" r="5" />
      <circle cx="17" cy="7" r="3" />
      <circle cx="17.5" cy="16.5" r="2" />
      <path d="M7.2 11.3a2.4 2.4 0 013.3-.5" />
    </>
  ),
  shield: (
    <>
      <path d="M12 2.8l7.5 3v5.6c0 4.8-3.2 8.3-7.5 9.8-4.3-1.5-7.5-5-7.5-9.8V5.8z" />
      <path d="M8.5 12l2.4 2.4 4.6-4.8" />
    </>
  ),
  water: <path d="M12 3c3.8 4.6 6 8 6 10.8A6 6 0 016 13.8C6 11 8.2 7.6 12 3z" />,
  food: (
    <>
      <path d="M4 11h16a8 8 0 01-16 0z" />
      <path d="M8 7.5c0-1.2 1-1.4 1-2.6M12 7.5c0-1.2 1-1.4 1-2.6M16 7.5c0-1.2 1-1.4 1-2.6" />
      <path d="M9 21h6" />
    </>
  ),
  toolbox: (
    <>
      <rect x="3" y="8" width="18" height="12" rx="1.8" />
      <path d="M9 8V5.5A1.5 1.5 0 0110.5 4h3A1.5 1.5 0 0115 5.5V8M3 13h18M10 13v2h4v-2" />
    </>
  ),
  bolt: <path d="M13.5 2.5L5 13.5h6l-1.5 8 8.5-11h-6z" />,
  radiation: (
    <>
      <circle cx="12" cy="12" r="1.6" />
      <path d="M12 9.5L9.3 4.8A8 8 0 0117 6.2l-2.7 4.6M14.2 13.3l5.4.1a8 8 0 01-3.6 6.8l-2.7-4.6M9.8 13.3l-5.4.1A8 8 0 008 20.2l2.7-4.6" />
    </>
  ),
  habitat: (
    <>
      <path d="M3 17V12a5 5 0 015-5h8a5 5 0 015 5v5z" />
      <path d="M2 17h20M7 17v3M17 17v3M8 7V5M12 11h0M8.5 11h0M15.5 11h0" />
    </>
  ),
  // Events and choices
  flare: (
    <>
      <circle cx="9" cy="15" r="4" />
      <path d="M12 12c2-3 4.5-4 8-3.5M13 15.5c2.5-.5 4.5.5 6.5 3M10 11c.5-3 2-5 5-6.5" />
      <path d="M3 21l1.5-1.5M5.5 10.5L4 9" />
    </>
  ),
  dust: (
    <>
      <path d="M3 9h11a3 3 0 10-3-3M3 13h15a3 3 0 11-3 3M3 17h7" />
      <circle cx="19" cy="9" r=".6" />
      <circle cx="6" cy="20" r=".6" />
    </>
  ),
  leak: (
    <>
      <path d="M3 6h9a3 3 0 013 3v1" />
      <path d="M15 13c1.6 2 2.5 3.4 2.5 4.6a2.5 2.5 0 01-5 0c0-1.2.9-2.6 2.5-4.6z" />
      <path d="M8 11c.9 1.1 1.4 1.9 1.4 2.6a1.4 1.4 0 01-2.8 0c0-.7.5-1.5 1.4-2.6z" />
    </>
  ),
  warning: (
    <>
      <path d="M12 3.5l9.5 16.5h-19z" />
      <path d="M12 10v4.5M12 17.3h0" />
    </>
  ),
  wilt: (
    <>
      <path d="M12 21v-7c0-3-1.5-5-4.5-6" />
      <path d="M7.5 8C5 8 3.5 9.5 3 12c2.5.3 4.2-.8 4.5-4z" />
      <path d="M12 14c1-3.5 3.5-5 7-4.5-.5 3-2.7 4.6-7 4.5z" />
      <path d="M8 21h8" />
    </>
  ),
  plug: (
    <>
      <path d="M9 3v4M15 3v4M7 7h10v4a5 5 0 01-10 0zM12 16v5" />
    </>
  ),
  play: <path d="M7 4.5v15l12-7.5z" />,
  pause: <path d="M8 4.5v15M16 4.5v15" />,
  skip: <path d="M5 5v14l9-7zM18 5v14" />,
  astronaut: (
    <>
      <circle cx="12" cy="9" r="6" />
      <path d="M8.5 8.5a3.5 2.8 0 017 0v1a3.5 2.8 0 01-7 0z" />
      <path d="M5 21v-1.5A4.5 4.5 0 019.5 15h5a4.5 4.5 0 014.5 4.5V21" />
    </>
  ),
  robot: (
    <>
      <rect x="5" y="8" width="14" height="10" rx="2" />
      <path d="M12 8V5M9 13h0M15 13h0M9.5 15.5h5M3 12v3M21 12v3M8 18v3M16 18v3" />
      <circle cx="12" cy="4" r="1" />
    </>
  ),
  bandage: (
    <>
      <rect x="2.8" y="8" width="18.4" height="8" rx="4" transform="rotate(-45 12 12)" />
      <path d="M10.6 10.6h0M13.4 13.4h0M10.6 13.4h0M13.4 10.6h0" />
    </>
  ),
  valve: (
    <>
      <path d="M3 14h5M16 14h5M8 11h8v6H8z" />
      <path d="M12 11V7M8.5 7h7" />
      <path d="M4 4l16 16" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  wrench: <path d="M14.7 6.3a4 4 0 015 5L11 20a2.1 2.1 0 01-3-3l8.7-8.7a4 4 0 01-2-2z" />,
  pill: (
    <>
      <rect x="2.5" y="8.5" width="19" height="7" rx="3.5" transform="rotate(-45 12 12)" />
      <path d="M8.6 8.6l6.8 6.8" />
    </>
  ),
  stop: (
    <>
      <path d="M8.3 3h7.4L21 8.3v7.4L15.7 21H8.3L3 15.7V8.3z" />
      <path d="M8 12h8" />
    </>
  ),
  // Interface
  rocket: (
    <>
      <path d="M12 2.5c3.5 2.3 5 6 5 10l-2.2 3.5H9.2L7 12.5c0-4 1.5-7.7 5-10z" />
      <circle cx="12" cy="9" r="1.8" />
      <path d="M7 12.5L4 15v3l3.5-1.5M17 12.5l3 2.5v3l-3.5-1.5M10 19c0 1.2.8 2 2 2.5 1.2-.5 2-1.3 2-2.5" />
    </>
  ),
  flag: (
    <>
      <path d="M5 21V4" />
      <path d="M5 4h11l-2 3.5L16 11H5" />
    </>
  ),
  report: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V2.8h6V4M8.5 10h7M8.5 13.5h7M8.5 17h4" />
    </>
  ),
  fail: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </>
  ),
  retry: (
    <>
      <path d="M4 12a8 8 0 0113.7-5.6L20 8.7" />
      <path d="M20 4v4.7h-4.7M20 12a8 8 0 01-13.7 5.6L4 15.3" />
      <path d="M4 20v-4.7h4.7" />
    </>
  ),
  satellite: (
    <>
      <path d="M4.5 19.5a10 10 0 0115-15" />
      <path d="M8 16a5 5 0 017-7" />
      <circle cx="18" cy="18" r="2" />
      <path d="M11.5 12.5L16.5 17.5" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.3a2.6 2.6 0 015 .9c0 1.7-2.5 2.2-2.5 3.8M12 17h0" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.8h0" />
    </>
  ),
  volume: (
    <>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      <path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11" />
    </>
  ),
  volumeOff: (
    <>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      <path d="M16 9.5l5 5M21 9.5l-5 5" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.4" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r=".8" />
    </>
  ),
  check: <path d="M4.5 12.5l4.8 4.8L19.5 7" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  arrowLeft: <path d="M19 12H5M11 6l-6 6 6 6" />,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  chevronRight: <path d="M9 6l6 6-6 6" />,
  dot: <circle cx="12" cy="12" r="2.5" />,
  power: (
    <>
      <path d="M12 3v8" />
      <path d="M7 6.3a7.5 7.5 0 1010 0" />
    </>
  ),
  star: <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />,
  crew: (
    <>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M3.5 19.5a5.5 5.5 0 0111 0M14.5 14.6a4.5 4.5 0 016 4.4" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  lander: (
    <>
      <path d="M8 4h8l1.5 6h-11z" />
      <path d="M6.5 10h11v4h-11zM7 14l-3 6M17 14l3 6M2.5 20h3M18.5 20h3M10 14l-.7 3.5h5.4L14 14" />
    </>
  ),
  moon: <path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z" />
    </>
  ),
  thermometer: (
    <>
      <path d="M10 14.5V5a2 2 0 014 0v9.5a4 4 0 11-4 0z" />
      <path d="M12 9v7" />
    </>
  ),
  sparkle: <path d="M12 3c.7 4.3 2.7 6.3 7 7-4.3.7-6.3 2.7-7 7-.7-4.3-2.7-6.3-7-7 4.3-.7 6.3-2.7 7-7z" />,
  mass: (
    <>
      <path d="M7 9h10l2.5 11.5h-15z" />
      <circle cx="12" cy="6" r="2.5" />
    </>
  ),
  chart: (
    <>
      <path d="M4 4v16h16" />
      <path d="M7.5 14.5l3.5-4 3 2.5 5-6.5" />
    </>
  ),
  science: (
    <>
      <path d="M9.5 3h5M10 3v6L4.8 18.2A2 2 0 006.5 21h11a2 2 0 001.7-2.8L14 9V3" />
      <path d="M7.5 14h9" />
    </>
  ),
}

export type IconName = keyof typeof P

export const ICON_NAMES = Object.keys(P) as IconName[]

export function isIconName(name: string): name is IconName {
  return Object.prototype.hasOwnProperty.call(P, name)
}

/** Fills that read better solid (play, star, dot). */
const SOLID = new Set<string>(['play', 'star', 'dot', 'bolt'])

export function Icon({
  name,
  size = '1.15em',
  className = '',
  label,
  ...rest
}: { name: IconName | string; size?: number | string; label?: string } & Omit<SVGProps<SVGSVGElement>, 'name'>) {
  const path = isIconName(name) ? P[name] : P.dot
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={SOLID.has(name) ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`inline-block shrink-0 align-[-0.18em] ${className}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      {...rest}
    >
      {path}
    </svg>
  )
}
