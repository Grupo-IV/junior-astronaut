import { useApp } from '../../app/state/AppContext'
import { Button } from '../ui/ui'

const LOOP = ['Plan', 'Build', 'Operate', 'Event', 'Decide', 'Consequence', 'Learn', 'Adapt']

export function MainMenu() {
  const { dispatch } = useApp()
  return (
    <main className="starfield flex min-h-full flex-col items-center justify-center px-4 py-12 text-center">
      <div className="relative mb-8 size-28 rounded-full bg-gradient-to-br from-[#d9dbe0] to-[#6d717b] shadow-[0_0_80px_rgba(200,210,255,0.25)]" aria-hidden>
        <span className="absolute top-6 left-7 size-5 rounded-full bg-black/15" />
        <span className="absolute right-6 bottom-7 size-7 rounded-full bg-black/15" />
        <span className="absolute top-12 right-9 size-3 rounded-full bg-black/15" />
      </div>
      <p className="font-display text-sm tracking-[0.3em] text-accent uppercase">NASA Space Apps Challenge 2026</p>
      <h1 className="mt-3 font-display text-4xl font-bold sm:text-6xl">Junior Astronaut</h1>
      <h2 className="font-display text-2xl text-ink-2 sm:text-3xl">Mission Trainer</h2>
      <p className="mt-6 max-w-xl text-ink-2">
        Command a lunar outpost. Balance power, water, oxygen, food and radiation protection — and discover why keeping a crew alive
        in space is an engineering problem.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button variant="primary" className="px-8 py-3 text-base" onClick={() => dispatch({ type: 'navigate', screen: 'select' })}>
          🚀 Start mission
        </Button>
      </div>
      <ol className="mt-12 flex max-w-2xl flex-wrap justify-center gap-2 text-xs text-ink-3" aria-label="How the game works">
        {LOOP.map((step, i) => (
          <li key={step} className="flex items-center gap-2">
            <span className="rounded-full border border-line px-3 py-1">{step}</span>
            {i < LOOP.length - 1 && <span aria-hidden>→</span>}
          </li>
        ))}
      </ol>
      <p className="mt-10 text-xs text-ink-3">Grupo IV · Built with React, Three.js and science from NASA sources</p>
    </main>
  )
}
