import { useApp } from '../../app/state/AppContext'
import { crewNeeds, gameContent, getMission } from '../../game'
import { Button, fmt, Panel } from '../ui/ui'

export function MissionBriefing() {
  const { state, dispatch } = useApp()
  const mission = getMission(gameContent, state.missionId)
  const needs = crewNeeds(gameContent, mission)
  return (
    <main className="starfield min-h-full px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <Button variant="ghost" onClick={() => dispatch({ type: 'navigate', screen: 'select' })}>
          ← Missions
        </Button>
        <p className="mt-4 text-xs font-bold tracking-widest text-accent uppercase">Mission briefing · {mission.difficulty}</p>
        <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">{mission.name}</h1>
        <p className="mt-1 text-ink-3">📍 {mission.location}</p>
        <p className="mt-6 text-lg leading-relaxed text-ink-2">{mission.briefing.story}</p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Panel title="Objectives" id="objectives">
            <ul className="space-y-2 p-4 text-sm">
              {mission.briefing.objectives.map((o) => (
                <li key={o} className="flex gap-2">
                  <span aria-hidden className="text-good-ink">◎</span>
                  {o}
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Known hazards" id="hazards">
            <ul className="space-y-2 p-4 text-sm">
              {mission.briefing.hazards.map((h) => (
                <li key={h} className="flex gap-2">
                  <span aria-hidden className="text-warn">⚠</span>
                  {h}
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="What your crew needs every day" id="needs" className="md:col-span-2">
            <div className="grid grid-cols-2 gap-3 p-4 text-sm sm:grid-cols-4">
              <Need icon="🫁" label="Oxygen" value={`${fmt(needs.oxygen, 1)} kg`} note={`${mission.crew} × 0.84 kg`} />
              <Need icon="💧" label="Water" value={`${fmt(needs.water, 1)} kg`} note={`${mission.crew} × 3.5 kg`} />
              <Need icon="🥫" label="Food" value={`${fmt(needs.food, 1)} kg`} note={`${mission.crew} × 1.8 kg`} />
              <Need icon="⚡" label="Habitat power" value={`${gameContent.environment.habitat.powerDemandKwhPerDay} kWh`} note="heat, air, comms" />
            </div>
            <p className="px-4 pb-4 text-xs text-ink-3">
              Numbers from NASA's Life Support Baseline Values and Assumptions Document (BVAD).
            </p>
          </Panel>
        </div>

        <p className="mt-6 rounded-lg border border-accent-2/30 bg-accent-2/10 p-4 text-sm text-ink">
          <strong className="text-accent-2">Commander's tip: </strong>
          {mission.briefing.tip}
        </p>
        <div className="mt-8 flex justify-end">
          <Button variant="primary" className="px-6 py-3 text-base" onClick={() => dispatch({ type: 'navigate', screen: 'setup' })}>
            Plan the lander cargo →
          </Button>
        </div>
      </div>
    </main>
  )
}

function Need({ icon, label, value, note }: { icon: string; label: string; value: string; note: string }) {
  return (
    <div className="rounded-lg bg-panel-2 p-3">
      <p className="text-ink-3">
        <span aria-hidden>{icon}</span> {label}
      </p>
      <p className="font-display text-xl">{value}</p>
      <p className="text-xs text-ink-3">{note}</p>
    </div>
  )
}
