/**
 * @file
 * @brief Animated deep-space background: layered stars, soft nebulae, the odd shooting star.
 *
 * Drawn on a 2D canvas behind the page. Stays still when the system asks for
 * reduced motion, and pauses when the tab is hidden.
 */
import { useEffect, useRef } from 'react'

interface Star {
  x: number
  y: number
  r: number
  depth: number
  phase: number
  hue: number
}

function makeStars(w: number, h: number): Star[] {
  const count = Math.round((w * h) / 2600)
  return Array.from({ length: count }, () => {
    const depth = Math.random()
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.35 + depth ** 2 * 1.5,
      depth,
      phase: Math.random() * Math.PI * 2,
      hue: [210, 220, 40, 0][Math.floor(Math.random() * 4)],
    }
  })
}

function paintNebula(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#04060d'
  ctx.fillRect(0, 0, w, h)
  const blobs: [number, number, number, string][] = [
    [0.82, 0.18, 0.55, 'rgba(76, 60, 200, 0.28)'],
    [0.95, 0.55, 0.4, 'rgba(40, 120, 220, 0.22)'],
    [0.12, 0.92, 0.5, 'rgba(255, 120, 60, 0.12)'],
    [0.35, 0.05, 0.35, 'rgba(120, 70, 220, 0.14)'],
  ]
  for (const [x, y, r, c] of blobs) {
    const g = ctx.createRadialGradient(x * w, y * h, 0, x * w, y * h, r * Math.max(w, h))
    g.addColorStop(0, c)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  }
}

export function SpaceBackdrop({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const nebula = document.createElement('canvas')
    let stars: Star[] = []
    let w = 0
    let h = 0
    let frame = 0
    let shooting: { x: number; y: number; vx: number; vy: number; life: number } | null = null

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      nebula.width = w
      nebula.height = h
      paintNebula(nebula.getContext('2d')!, w, h)
      stars = makeStars(w, h)
    }

    const draw = (time: number) => {
      ctx.drawImage(nebula, 0, 0, w, h)
      const t = time / 1000
      for (const s of stars) {
        const drift = still ? 0 : t * (2 + s.depth * 10)
        const x = (((s.x - drift) % w) + w) % w
        const tw = still ? 1 : 0.65 + Math.sin(t * (0.6 + s.depth * 1.6) + s.phase) * 0.35
        ctx.globalAlpha = (0.35 + s.depth * 0.65) * tw
        ctx.fillStyle = s.hue === 0 ? '#ffffff' : `hsl(${s.hue}, 80%, 88%)`
        ctx.beginPath()
        ctx.arc(x, s.y, s.r, 0, Math.PI * 2)
        ctx.fill()
        if (s.r > 1.5) {
          ctx.globalAlpha *= 0.25
          ctx.beginPath()
          ctx.arc(x, s.y, s.r * 3, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      ctx.globalAlpha = 1
      if (!still) {
        if (!shooting && Math.random() < 0.004) shooting = { x: Math.random() * w, y: Math.random() * h * 0.4, vx: -9 - Math.random() * 6, vy: 3 + Math.random() * 2, life: 1 }
        if (shooting) {
          const g = ctx.createLinearGradient(shooting.x, shooting.y, shooting.x - shooting.vx * 9, shooting.y - shooting.vy * 9)
          g.addColorStop(0, `rgba(255,255,255,${shooting.life})`)
          g.addColorStop(1, 'rgba(255,255,255,0)')
          ctx.strokeStyle = g
          ctx.lineWidth = 1.6
          ctx.beginPath()
          ctx.moveTo(shooting.x, shooting.y)
          ctx.lineTo(shooting.x - shooting.vx * 9, shooting.y - shooting.vy * 9)
          ctx.stroke()
          shooting.x += shooting.vx
          shooting.y += shooting.vy
          shooting.life -= 0.02
          if (shooting.life <= 0) shooting = null
        }
        frame = requestAnimationFrame(draw)
      }
    }

    resize()
    const observer = new ResizeObserver(() => {
      resize()
      if (still) draw(0)
    })
    observer.observe(canvas)
    frame = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [])

  return <canvas ref={ref} aria-hidden className={`pointer-events-none fixed inset-0 -z-10 h-full w-full ${className}`} />
}
