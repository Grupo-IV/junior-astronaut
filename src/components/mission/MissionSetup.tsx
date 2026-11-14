/**
 * @file
 * @brief Configures the lander loadout before a mission starts.
 */
import { useMemo } from 'react'
import { useApp } from '../../app/state/AppContext'
import { planRules } from '../../app/state/appState'
import { RANKS } from '../../game/ranks'
import { RankInsignia } from '../art/RankInsignia'
import { Icon, type IconName } from '../ui/Icon'
import { SpaceBackdrop } from '../ui/SpaceBackdrop'
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
import { useI18n } from '../../i18n/useI18n'
import type { LoadoutItemId } from '../../types/game'
import { LanguageToggle } from '../ui/LanguageToggle'
import { Rich } from '../ui/Rich'
import { Button, fmt, Meter, Panel, StatusTag } from '../ui/ui'
import { GlossaryText } from '../ui/Term'
import { STOCK_META } from '../resources/stockMeta'

const GROUPS = [
  { title: 'setup.group.power', icon: 'bolt', items: ['solar_array', 'battery'] },
  { title: 'setup.group.lifeSupport', icon: 'recycle', items: ['water_recycler', 'oxygen_generator', 'greenhouse'] },
  { title: 'setup.group.protection', icon: 'shield', items: ['radiation_shelter'] },
  { title: 'setup.group.supplies', icon: 'toolbox', items: ['oxygen_tank', 'water_crate', 'food_crate', 'spare_parts'] },
] as const satisfies readonly { title: string; icon: IconName; items: readonly LoadoutItemId[] }[]

export function MissionSetup() {
  const { state, dispatch } = useApp()
  const { t, content: text } = useI18n()
  // Mass budget depends on the chosen rank; everything else is the same science.
  const content = planRules(state)
  const rank = RANKS[state.rank]
  const mission = getMission(content, state.missionId)
  const { loadout } = state
  const check = checkLoadout(content, mission, loadout)
  const projection = useMemo(() => projectLoadout(content, mission.id, loadout), [content, mission.id, loadout])

  const set = (id: LoadoutItemId, n: number) =>
    dispatch({ type: 'setLoadout', loadout: { ...loadout, [id]: Math.max(0, Math.min(itemMaxCount(content, id), n)) } })

  const remaining = check.budgetKg - check.massKg
  const warnings: string[] = []
  // Planning tips are part of mission control's help, which senior ranks do without.
  if (loadout.solar_array === 0) warnings.push(t('setup.warn.noSolar'))
  if (projection.daysWithShedding > 0) warnings.push(t('setup.warn.shedding', { count: projection.daysWithShedding }))
  if (loadout.radiation_shelter === 0) warnings.push(t('setup.warn.noShelter'))
  if (loadout.spare_parts === 0) warnings.push(t('setup.warn.noSpares'))
  if (!rank.hints) warnings.length = 0

  return (
    <main className="relative min-h-full px-4 py-8 sm:px-8">
      <SpaceBackdrop />
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => dispatch({ type: 'navigate', screen: 'briefing' })}>
            <Icon name="arrowLeft" /> {t('setup.back')}
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => dispatch({ type: 'setLoadout', loadout: toLoadout({}) })}>{t('setup.clear')}</Button>
            <Button onClick={() => dispatch({ type: 'setLoadout', loadout: toLoadout(mission.recommendedLoadout) })}>{t('setup.recommended')}</Button>
            <LanguageToggle />
          </div>
        </div>
        <h1 className="mt-4 font-display text-3xl font-bold">{t('setup.title')}</h1>
        <p className="mt-1 max-w-3xl text-ink-2">
          <Rich text={t('setup.intro', { mass: fmt(mission.launchMassBudgetKg), mission: getMission(text, mission.id).name })} />
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            {GROUPS.map((g) => (
              <Panel key={g.title} title={t(g.title)} id={`group-${g.title}`} icon={g.icon}>
                <ul className="divide-y divide-line">
                  {g.items.map((id) => (
                    <ItemRow key={id} id={id} count={loadout[id]} onSet={(n) => set(id, n)} remainingKg={remaining} />
                  ))}
                </ul>
              </Panel>
            ))}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start" aria-label={t('setup.forecastAria')}>
            <Panel title={t('setup.mass.title')} id="mass" icon="lander">
              <div className="space-y-2 p-4">
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-2xl">{t('setup.mass.value', { kg: fmt(check.massKg) })}</span>
                  <span className="text-sm text-ink-3">{t('setup.mass.of', { kg: fmt(check.budgetKg) })}</span>
                </div>
                <Meter value={check.massKg} max={check.budgetKg} color={check.overBudget ? 'var(--color-critical)' : 'var(--color-accent)'} label={t('setup.mass.meter')} />
                {check.overBudget ? (
                  <StatusTag level="critical" word={t('setup.mass.over', { kg: fmt(-remaining) })} />
                ) : (
                  <p className="text-xs text-ink-3">{t('setup.mass.left', { kg: fmt(remaining) })}</p>
                )}
              </div>
            </Panel>

            <Panel title={t('setup.storage.title')} id="storage" icon="habitat">
              <div className="space-y-3 p-4">
                {SUPPLY_STOCKS.map((s) => {
                  const st = check.storage[s]
                  const meta = STOCK_META[s]
                  return (
                    <div key={s}>
                      <div className="flex justify-between text-sm">
                        <span>
                          <Icon name={meta.icon} style={{ color: meta.color }} /> {t(`stock.${s}`)}
                        </span>
                        <span className={st.over ? 'text-critical' : 'text-ink-2'}>
                          {t('setup.storage.line', { amount: fmt(st.amount), capacity: fmt(st.capacity), days: fmt(projection.launchDaysOfSupply[s], 1) })}
                        </span>
                      </div>
                      <Meter value={st.amount} max={st.capacity} color={meta.color} label={t('setup.storage.meter', { stock: t(`stock.${s}`) })} />
                      {st.over && <StatusTag level="critical" word={t('setup.storage.over')} />}
                    </div>
                  )
                })}
              </div>
            </Panel>

            <Panel title={t('setup.forecast.title')} id="forecast" icon="chart">
              <div className="space-y-3 p-4 text-sm">
                <p className="flex items-center gap-2 text-xs text-ink-3">
                  <RankInsignia rank={state.rank} size={20} /> {t(`rank.${state.rank}.name`)}
                </p>
                {rank.forecast === 'none' ? (
                  <p className="rounded-lg border border-hud-dim bg-space/50 p-3 text-ink-2">{t('setup.forecast.none')}</p>
                ) : (
                  <>
                <p className="text-xs text-ink-3">{t(rank.forecast === 'full' ? 'setup.forecast.intro' : 'setup.forecast.summaryNote', { days: mission.durationDays })}</p>
                <div className="flex items-center justify-between rounded-lg bg-panel-2 p-3">
                  <span>{t('setup.forecast.result')}</span>
                  {projection.survivesCalmMission || !projection.failure ? (
                    <StatusTag level="good" word={t('setup.forecast.survives')} />
                  ) : (
                    <StatusTag
                      level="critical"
                      word={t('setup.forecast.fails', { day: projection.failure.day, cause: t(`cause.${projection.failure.cause}`).toLocaleUpperCase() })}
                    />
                  )}
                </div>
                {rank.forecast === 'full' && (
                <ul className="space-y-1">
                  {SUPPLY_STOCKS.map((s) => (
                    <li key={s} className="flex justify-between">
                      <span>
                        <Icon name={STOCK_META[s].icon} style={{ color: STOCK_META[s].color }} /> {t(`stock.${s}`)}
                      </span>
                      {projection.runsOutDay[s] ? (
                        <StatusTag level="critical" word={t('setup.forecast.runsOut', { day: projection.runsOutDay[s]! })} />
                      ) : (
                        <StatusTag level="good" word={t('setup.forecast.lasts')} />
                      )}
                    </li>
                  ))}
                  <li className="flex justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <Icon name="bolt" className="text-warn" /> {t('setup.forecast.solar')}
                    </span>
                    <span className={projection.fullSunGenerationKwh >= projection.fullDemandKwh ? 'text-ink-2' : 'text-critical'}>
                      <GlossaryText text={t('setup.forecast.solarValue', { generation: fmt(projection.fullSunGenerationKwh), demand: fmt(projection.fullDemandKwh) })} />
                    </span>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <Icon name="battery" className="text-warn" /> {t('setup.forecast.battery')}
                    </span>
                    <span className={projection.lowestEnergyKwh <= 0.5 ? 'text-critical' : 'text-ink-2'}>
                      <GlossaryText text={t('setup.forecast.batteryValue', { lowest: fmt(projection.lowestEnergyKwh), capacity: fmt(projection.batteryCapacityKwh) })} />
                    </span>
                  </li>
                </ul>
                )}
                  </>
                )}
                {warnings.length > 0 && (
                  <ul className="space-y-1 rounded-lg border border-warn/30 bg-warn/10 p-3 text-xs">
                    {warnings.map((w) => (
                      <li key={w} className="flex gap-2">
                        <Icon name="warning" className="text-warn" />
                        {w}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Panel>

            <Button variant="primary" className="w-full py-3 text-base" disabled={!check.valid} onClick={() => dispatch({ type: 'launch' })}>
              <Icon name="rocket" size="1.3em" /> {t('setup.launch')}
            </Button>
            {!check.valid && <p className="text-center text-xs text-critical">{t('setup.fix')}</p>}
          </aside>
        </div>
      </div>
    </main>
  )
}

function ItemRow({ id, count, onSet, remainingKg }: { id: LoadoutItemId; count: number; onSet: (n: number) => void; remainingKg: number }) {
  const { t, content } = useI18n()
  const building = id in content.buildings ? content.buildings[id as keyof typeof content.buildings] : null
  const cargo = !building ? content.cargo[id as keyof typeof content.cargo] : null
  const def = building ?? cargo!
  const mass = itemMass(gameContent, id)
  const max = itemMaxCount(gameContent, id)
  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <div className="flex-1">
        <p className="font-semibold">
          <Icon name={def.icon} className="mr-1.5 text-hud" />
          {def.name} <span className="ml-1 text-xs font-normal text-ink-3">{t('item.each', { kg: fmt(mass) })}</span>
        </p>
        <p className="mt-0.5 text-sm text-ink-2">
          <GlossaryText text={def.summary} />
        </p>
        {building && (
          <p className="mt-1 text-xs text-ink-3">
            <span className="text-good-ink">+ {building.benefit}</span> <span className="text-serious">− {building.tradeoff}</span>
            {building.powerDemandKwhPerDay > 0 && (
              <span>
                {' '}
                <GlossaryText text={t('item.uses', { kwh: building.powerDemandKwhPerDay })} />
              </span>
            )}
          </p>
        )}
        <details className="mt-1 text-xs text-ink-3">
          <summary className="cursor-pointer text-accent-2">{t('item.why')}</summary>
          <p className="mt-1">
            <GlossaryText text={def.science.text} />
          </p>
        </details>
      </div>
      <div className="flex items-center gap-2 self-end sm:self-auto" role="group" aria-label={t('item.quantity', { name: def.name })}>
        <Button className="size-9 !p-0 text-lg" aria-label={t('item.remove', { name: def.name })} disabled={count === 0} onClick={() => onSet(count - 1)}>
          −
        </Button>
        <output className="w-10 text-center font-display text-xl" aria-live="polite">
          {count}
        </output>
        <Button
          className="size-9 !p-0 text-lg"
          aria-label={t('item.add', { name: def.name })}
          disabled={count >= max}
          title={mass > remainingKg ? t('item.overBudget') : undefined}
          onClick={() => onSet(count + 1)}
        >
          +
        </Button>
      </div>
    </li>
  )
}
