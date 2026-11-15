/**
 * @file
 * @brief On-screen stick to walk on touch screens. Up walks forward, sideways steps aside.
 */
import { useRef, useState } from 'react'
import { useI18n } from '../../i18n/useI18n'

const RADIUS = 44

export function Joystick({ onMove, className = '' }: { onMove: (forward: number, strafe: number) => void; className?: string }) {
  const { t } = useI18n()
  const base = useRef<HTMLDivElement>(null)
  const pointer = useRef<number | null>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })

  const update = (clientX: number, clientY: number) => {
    const rect = base.current!.getBoundingClientRect()
    let dx = clientX - (rect.left + rect.width / 2)
    let dy = clientY - (rect.top + rect.height / 2)
    const d = Math.hypot(dx, dy)
    if (d > RADIUS) {
      dx = (dx / d) * RADIUS
      dy = (dy / d) * RADIUS
    }
    setKnob({ x: dx, y: dy })
    // A small dead zone so a resting thumb does not drift.
    const k = (v: number) => (Math.abs(v) < 6 ? 0 : v / RADIUS)
    onMove(-k(dy), k(dx))
  }
  const release = () => {
    pointer.current = null
    setKnob({ x: 0, y: 0 })
    onMove(0, 0)
  }

  return (
    <div
      ref={base}
      role="application"
      aria-label={t('fp.moveAria')}
      className={`relative h-28 w-28 touch-none rounded-full border border-hud/30 bg-space/40 backdrop-blur-sm select-none ${className}`}
      onPointerDown={(e) => {
        pointer.current = e.pointerId
        e.currentTarget.setPointerCapture(e.pointerId)
        update(e.clientX, e.clientY)
      }}
      onPointerMove={(e) => {
        if (pointer.current === e.pointerId) update(e.clientX, e.clientY)
      }}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <span
        className="absolute top-1/2 left-1/2 h-12 w-12 rounded-full border border-hud/60 bg-hud/25"
        style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
        aria-hidden
      />
    </div>
  )
}
