import { useApp } from '../../app/state/AppContext'
import { gameContent } from '../../game'
import { Button } from '../ui/ui'

export function MissionSelect() {
  const { dispatch } = useApp()
  return (
    <main className="starfield min-h-full px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <Button variant="ghost" onClick={() => dispatch({ type: 'navigate', screen: 'menu' })}>
          ← Main menu
        </Button>
        <h1 className="mt-4 font-display text-3xl font-bold">Choose your mission</h1>
        <p className="mt-1 text-ink-2">Start as a Cadet. When you're ready, take command of a long stay.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {gameContent.missions.map((m) => (
            <article key={m.id} className="flex flex-col rounded-xl border border-line bg-panel p-5">
              <p className={`text-xs font-bold tracking-widest uppercase ${m.difficulty === 'Cadet' ? 'text-accent-2' : 'text-accent'}`}>
                {m.difficulty === 'Cadet' ? '★ Cadet' : '★★ Commander'}
              </p>
              <h2 className="mt-2 font-display text-xl font-bold">{m.name}</h2>
              <p className="mt-1 text-sm text-ink-3">{m.location}</p>
              <p className="mt-3 flex-1 text-sm text-ink-2">{m.briefing.tagline}</p>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-panel-2 p-2">
                  <dt className="text-ink-3">Crew</dt>
                  <dd className="font-display text-lg">{m.crew}</dd>
                </div>
                <div className="rounded-lg bg-panel-2 p-2">
                  <dt className="text-ink-3">Days</dt>
                  <dd className="font-display text-lg">{m.durationDays}</dd>
                </div>
                <div className="rounded-lg bg-panel-2 p-2">
                  <dt className="text-ink-3">Lander</dt>
                  <dd className="font-display text-lg">{(m.launchMassBudgetKg / 1000).toFixed(1)} t</dd>
                </div>
              </dl>
              <Button variant="primary" className="mt-4" onClick={() => dispatch({ type: 'chooseMission', missionId: m.id })}>
                Read briefing
              </Button>
            </article>
          ))}
          <article className="flex flex-col rounded-xl border border-dashed border-line p-5 opacity-60" aria-disabled>
            <p className="text-xs font-bold tracking-widest text-ink-3 uppercase">Coming soon</p>
            <h2 className="mt-2 font-display text-xl font-bold">Mars Outpost</h2>
            <p className="mt-3 flex-1 text-sm text-ink-2">
              Dust storms, a thin CO₂ atmosphere and 20-minute radio delays. The same engine, a new planet.
            </p>
          </article>
        </div>
      </div>
    </main>
  )
}
