/**
 * @file
 * @brief Displays the mission outcome and the educational mission analysis.
 */
import { useApp } from '../../app/state/AppContext'
import { analyzeMission, crewNeeds, gameContent, getMission, scoreMission, stateBatteryCapacity, SUPPLY_STOCKS } from '../../game'
import type { MissionState } from '../../types/game'
import { STOCK_META } from '../resources/stockMeta'
import { Button, fmt, Panel, Stars, StatusTag } from '../ui/ui'
import { LineChart } from './LineChart'

export function MissionResult({ mission }: { mission: MissionState }) {
  const { dispatch } = useApp()
  const def = getMission(gameContent, mission.missionId)
  const score = scoreMission(gameContent, mission)
  const analysis = analyzeMission(gameContent, mission)
  const needs = crewNeeds(gameContent, def)
  const env = gameContent.environment
  const success = mission.status === 'success'
  const days = mission.history.map((h) => h.day)
  const shadowBands = def.illumination
    .filter((p) => p.factor < 0.5 && p.fromDay <= mission.day)
    .map((p) => ({ from: p.fromDay, to: Math.min(p.toDay, mission.day), label: 'shadow' }))
  const stormBands = mission.decisions
    .filter((d) => d.eventId === 'solar_storm')
    .map((d) => ({ from: d.day, to: Math.min(d.day + 1, mission.day), label: 'storm' }))
    .filter((b) => b.from <= mission.day)

  const consequence = success
    ? `Your crew of ${def.crew} completed all ${def.durationDays} days with a radiation dose of ${fmt(mission.crewDoseMsv)} mSv.`
    : `The mission ended on day ${mission.failure!.day} of ${def.durationDays}. Mission control brought the crew home early.`

  return (
    <main className="starfield min-h-full px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className={`rounded-2xl border p-6 text-center ${success ? 'border-good/40 bg-good/10' : 'border-critical/40 bg-critical/10'}`}>
          <p className="text-xs font-bold tracking-widest text-ink-3 uppercase">{def.name} · Mission report</p>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{analysis.lesson.title}</h1>
          <div className="mt-3">
            <Stars count={score.stars} />
          </div>
          <ul className="mt-3 flex flex-wrap justify-center gap-2 text-xs">
            {score.badges.map((b) => (
              <li key={b.label} className="rounded-full border border-line bg-panel px-3 py-1" title={b.detail}>
                <StatusTag level={b.earned ? 'good' : 'neutral'} word={b.label} /> <span className="text-ink-3">— {b.detail}</span>
              </li>
            ))}
          </ul>
        </header>

        <Panel title="Mission analysis" id="analysis">
          <dl className="grid gap-4 p-5 text-sm md:grid-cols-2">
            <Block term="What happened?" text={analysis.lesson.what} />
            <Block term="Why?" text={analysis.lesson.why} />
            <Block term="Consequence" text={consequence} />
            <Block term="Engineering principle" text={analysis.lesson.principle} accent />
          </dl>
        </Panel>

        <div className="grid gap-4 md:grid-cols-2">
          <Panel title={success ? 'Decisions you made' : 'Decisions that contributed'} id="decisions">
            <ul className="space-y-2 p-4 text-sm">
              {mission.decisions.length === 0 && <li className="text-ink-3">No events required a decision.</li>}
              {mission.decisions.map((d, i) => {
                const contributed = analysis.contributingDecisions.includes(d)
                return (
                  <li key={i} className={`rounded-lg border p-2 ${contributed ? 'border-critical/50 bg-critical/10' : 'border-line bg-panel-2'}`}>
                    <p className="text-xs text-ink-3">
                      Day {d.day} · {d.eventTitle}
                    </p>
                    <p>{d.optionLabel}</p>
                    {contributed && <StatusTag level="critical" word={`Put ${mission.failure!.cause} at risk`} />}
                    {d.notes.map((n) => (
                      <p key={n} className="text-xs text-ink-3">
                        → {n}
                      </p>
                    ))}
                  </li>
                )
              })}
            </ul>
          </Panel>
          <Panel title="What the numbers say" id="insights">
            <ul className="space-y-2 p-4 text-sm text-ink-2">
              {analysis.insights.map((t) => (
                <li key={t} className="flex gap-2">
                  <span aria-hidden className="text-accent-2">▸</span>
                  {t}
                </li>
              ))}
            </ul>
            <div className="border-t border-line p-4">
              <p className="font-display text-sm font-bold text-accent">{success ? 'Try next' : 'What could you try instead?'}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-2">
                {analysis.lesson.alternatives.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          </Panel>
        </div>

        <section aria-label="Mission timeline charts" className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <LineChart
              title="Days of supply left (stored amount ÷ daily crew need)"
              unit="days"
              days={days}
              bands={shadowBands}
              series={SUPPLY_STOCKS.map((s) => ({
                key: s,
                label: STOCK_META[s].label,
                color: STOCK_META[s].color,
                values: mission.history.map((h) => h[s] / needs[s]),
              }))}
            />
          </div>
          <LineChart
            title="Crew radiation dose"
            unit="mSv"
            days={days}
            bands={stormBands}
            yMax={env.doseLimitMsv * 1.1}
            threshold={{ value: env.doseLimitMsv, label: 'limit' }}
            series={[{ key: 'dose', label: 'Dose', color: 'var(--color-serious)', values: mission.history.map((h) => h.dose) }]}
          />
          <LineChart
            title="Battery charge"
            unit="kWh"
            days={days}
            bands={shadowBands}
            yMax={stateBatteryCapacity(gameContent, mission)}
            series={[{ key: 'energy', label: 'Battery', color: 'var(--color-warn)', values: mission.history.map((h) => h.energy) }]}
          />
        </section>

        <div className="flex flex-wrap justify-center gap-3 pb-8">
          <Button variant="primary" className="px-6 py-3 text-base" onClick={() => dispatch({ type: 'retry' })}>
            🔁 Try again (edit cargo)
          </Button>
          <Button onClick={() => dispatch({ type: 'navigate', screen: 'select' })}>Choose another mission</Button>
          <Button variant="ghost" onClick={() => dispatch({ type: 'navigate', screen: 'menu' })}>
            Main menu
          </Button>
        </div>
      </div>
    </main>
  )
}

function Block({ term, text, accent }: { term: string; text: string; accent?: boolean }) {
  return (
    <div>
      <dt className={`font-display text-xs font-bold tracking-widest uppercase ${accent ? 'text-accent-2' : 'text-accent'}`}>{term}</dt>
      <dd className="mt-1 text-ink-2">{text}</dd>
    </div>
  )
}
