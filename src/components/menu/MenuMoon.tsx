/**
 * @file
 * @brief Mounts the 3D Moon on the title screen, with a CSS Moon if WebGL is unavailable.
 */
import { useEffect, useRef, useState } from 'react'

export default function MenuMoon({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let disposed = false
    let globe: { dispose: () => void } | null = null
    import('../../three/menu/MoonGlobe')
      .then(({ MoonGlobe }) => {
        if (disposed || !ref.current) return
        try {
          globe = new MoonGlobe(ref.current)
        } catch {
          setFailed(true)
        }
      })
      .catch(() => setFailed(true))
    return () => {
      disposed = true
      globe?.dispose()
    }
  }, [])

  return (
    <div ref={ref} className={className} aria-hidden>
      {failed && (
        <div className="m-auto aspect-square w-3/4 rounded-full bg-[radial-gradient(circle_at_35%_35%,#f2f2ee,#9a978f_55%,#3a3833)] shadow-[0_0_120px_rgba(150,200,255,0.25)]" />
      )}
    </div>
  )
}
