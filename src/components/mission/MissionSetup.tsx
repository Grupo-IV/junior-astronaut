/**
 * @file
 * @brief Configures the lander loadout before a mission starts.
 */
import { useMemo } from 'react'
import { useApp } from '../../app/state/AppContext'
import {
  checkLoadout,
  gameContent,
  getMission,
  itemMass,
  itemMaxCount,
  projectLoadout,
  SUPPLY_STOCKS,
  toLoadout,
} from '../../game'
import type { LoadoutItemId } from '../../types/game'
import { Button, fmt, Meter, Panel, StatusTag } from '../ui/ui'
import { STOCK_META } from '../resources/stockMeta'

const GROUPS: { title: string; items: LoadoutItemId[] }[] = [
  { title: 'Power', items: ['solar_array', 'battery'] },
  { title: 'Life support', items: ['water_recycler', 'oxygen_generator', 'greenhouse'] },
  { title: 'Protection', items: ['radiation_shelter'] },
  { title: 'Supplies & spares', items: ['oxygen_tank', 'water_crate', 'food_crate', 'spare_parts'] },
]

export function MissionSetup() {
  const { state, dispatch } = useApp()
  const content = gameContent
  const mission = getMission(content, state.missionId)
  const { loadout } = state
  const check = checkLoadout(content, mission, loadout)
  const projection = useMemo(() => projectLoadout(content, mission.id, loadout), [content, mission.id, loadout])

  const set = (id: LoadoutItemId, n: number) =>
    dispatch({ type: 'setLoadout', loadout: { ...loadout, [id]: Math.max(0, Math.min(itemMaxCount(content, id), n)) } })

  const remaining = check.budgetKg - check.massKg
  const warnings: string[] = []
  if (loadout.solar_array === 0) warnings.push('No solar arrays: nothing will recharge the batteries.')
  if (projection.daysWithShedding > 0) warnings.push(`Power runs short on ${projection.daysWithShedding} day(s) even without any accidents — systems will be switched off.`)
  if (loadout.radiation_shelter === 0) warnings.push('No radiation shelter: during solar storms you can only improvise with water.')
  if (loadout.spare_parts === 0) warnings.push('No spare parts: broken equipment can only be fixed by luck.')

  return (
    <main className="starfield min-h-full px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => dispatch({ type: 'navigate', screen: 'briefing' })}>
            ← Briefing
          </Button>
          <div className="flex gap-2">
            <Button onClick={() => dispatch({ type: 'setLoadout', loadout: toLoadout({}) })}>Clear</Button>
            <Button onClick={() => dispatch({ type: 'setLoadout', loadout: toLoadout(mission.recommendedLoadout) })}>
              Use recommended loadout
            </Button>
          </div>
        </div>
        <h1 className="mt-4 font-display text-3xl font-bold">Pack the lander</h1>
        <p className="mt-1 max-w-3xl text-ink-2">
          The lander can carry <strong className="text-ink">{fmt(mission.launchMassBudgetKg)} kg</strong> to {mission.name}. Choose
          machines that <em>make</em> resources, or supplies that <em>store</em> them. Storage space in the habitat is limited too.
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            {GROUPS.map((g) => (
              <Panel key={g.title} title={g.title} id={`group-${g.title}`}>
                <ul className="divide-y divide-line">
                  {g.items.map((id) => (
                    <ItemRow key={id} id={id} count={loadout[id]} onSet={(n) => set(id, n)} remainingKg={remaining} />
                  ))}
                </ul>
              </Panel>
            ))}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start" aria-label="Mission forecast">
            <Panel title="Lander mass" id="mass">
              <div className="space-y-2 p-4">
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-2xl">{fmt(check.massKg)} kg</span>
                  <span className="text-sm text-ink-3">of {fmt(check.budgetKg)} kg</span>
                </div>
                <Meter value={check.massKg} max={check.budgetKg} color={check.overBudget ? 'var(--color-critical)' : 'var(--color-accent)'} label="Lander mass used" />
                {check.overBudget ? (
                  <StatusTag level="critical" word={`OVER BUDGET by ${fmt(-remaining)} kg`} />
                ) : (
                  <p className="text-xs text-ink-3">{fmt(remaining)} kg still available</p>
                )}
              </div>
            </Panel>

            <Panel title="Habitat storage at launch" id="storage">
              <div className="space-y-3 p-4">
                {SUPPLY_STOCKS.map((s) => {
                  const st = check.storage[s]
                  const meta = STOCK_META[s]
                  return (
                    <div key={s}>
                      <div className="flex justify-between text-sm">
                        <span>
                          <span aria-hidden>{meta.icon}</span> {meta.label}
                        </span>
                        <span className={st.over ? 'text-critical' : 'text-ink-2'}>
                          {fmt(st.amount)} / {fmt(st.capacity)} kg · {fmt(projection.launchDaysOfSupply[s], 1)} days
                        </span>
                      </div>
                      <Meter value={st.amount} max={st.capacity} color={meta.color} label={`${meta.label} stored at launch`} />
                      {st.over && <StatusTag level="critical" word="Won't fit in storage" />}
                    </div>
                  )
                })}
              </div>
            </Panel>

            <Panel title="Forecast · calm mission" id="forecast">
              <div className="space-y-3 p-4 text-sm">
                <p className="text-xs text-ink-3">
                  The simulator runs your {mission.durationDays}-day mission with no storms or accidents. Real missions are never calm!
                </p>
                <div className="flex items-center justify-between rounded-lg bg-panel-2 p-3">
                  <span>Result</span>
                  {projection.survivesCalmMission ? (
                    <StatusTag level="good" word="CREW SURVIVES" />
                  ) : (
                    <StatusTag level="critical" word={`FAILS ON DAY ${projection.failure?.day} (${projection.failure?.cause.toUpperCase()})`} />
                  )}
                </div>
                <ul className="space-y-1">
                  {SUPPLY_STOCKS.map((s) => (
                    <li key={s} className="flex justify-between">
                      <span>
                        <span aria-hidden>{STOCK_META[s].icon}</span> {STOCK_META[s].label}
                      </span>
                      {projection.runsOutDay[s] ? (
                        <StatusTag level="critical" word={`runs out day ${projection.runsOutDay[s]}`} />
                      ) : (
                        <StatusTag level="good" word="lasts" />
                      )}
                    </li>
                  ))}
                  <li className="flex justify-between">
                    <span>⚡ Solar in full sun</span>
                    <span className={projection.fullSunGenerationKwh >= projection.fullDemandKwh ? 'text-ink-2' : 'text-critical'}>
                      {fmt(projection.fullSunGenerationKwh)} / {fmt(projection.fullDemandKwh)} kWh per day
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span>🔋 Lowest battery</span>
                    <span className={projection.lowestEnergyKwh <= 0.5 ? 'text-critical' : 'text-ink-2'}>
                      {fmt(projection.lowestEnergyKwh)} / {fmt(projection.batteryCapacityKwh)} kWh
                    </span>
                  </li>
                </ul>
                {warnings.length > 0 && (
                  <ul className="space-y-1 rounded-lg border border-warn/30 bg-warn/10 p-3 text-xs">
                    {warnings.map((w) => (
                      <li key={w} className="flex gap-2">
                        <span aria-hidden className="text-warn">▲</span>
                        {w}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Panel>

            <Button variant="primary" className="w-full py-3 text-base" disabled={!check.valid} onClick={() => dispatch({ type: 'launch' })}>
              🚀 Launch mission
            </Button>
            {!check.valid && <p className="text-center text-xs text-critical">Fix the mass or storage problems to launch.</p>}
          </aside>
        </div>
      </div>
    </main>
  )
}

function ItemRow({ id, count, onSet, remainingKg }: { id: LoadoutItemId; count: number; onSet: (n: number) => void; remainingKg: number }) {
  const content = gameContent
  const building = id in content.buildings ? content.buildings[id as keyof typeof content.buildings] : null
  const cargo = !building ? content.cargo[id as keyof typeof content.cargo] : null
  const def = building ?? cargo!
  const mass = itemMass(content, id)
  const max = itemMaxCount(content, id)
  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <div className="flex-1">
        <p className="font-semibold">
          <span aria-hidden className="mr-1">{def.icon}</span>
          {def.name} <span className="ml-1 text-xs font-normal text-ink-3">{fmt(mass)} kg each</span>
        </p>
        <p className="mt-0.5 text-sm text-ink-2">{def.summary}</p>
        {building && (
          <p className="mt-1 text-xs text-ink-3">
            <span className="text-good-ink">+ {building.benefit}</span> <span className="text-serious">− {building.tradeoff}</span>
            {building.powerDemandKwhPerDay > 0 && <span> · uses {building.powerDemandKwhPerDay} kWh/day</span>}
          </p>
        )}
        <details className="mt-1 text-xs text-ink-3">
          <summary className="cursor-pointer text-accent-2">Why? The science</summary>
          <p className="mt-1">{def.science.text}</p>
        </details>
      </div>
      <div className="flex items-center gap-2 self-end sm:self-auto" role="group" aria-label={`${def.name} quantity`}>
        <Button className="size-9 !p-0 text-lg" aria-label={`Remove one ${def.name}`} disabled={count === 0} onClick={() => onSet(count - 1)}>
          −
        </Button>
        <output className="w-10 text-center font-display text-xl" aria-live="polite">
          {count}
        </output>
        <Button
          className="size-9 !p-0 text-lg"
          aria-label={`Add one ${def.name}`}
          disabled={count >= max}
          title={mass > remainingKg ? 'This will go over the mass budget' : undefined}
          onClick={() => onSet(count + 1)}
        >
          +
        </Button>
      </div>
    </li>
  )
}
