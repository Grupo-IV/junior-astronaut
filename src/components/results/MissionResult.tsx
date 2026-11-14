/**
 * @file
 * @brief Displays the mission outcome and the educational mission analysis.
 */
import { useApp } from '../../app/state/AppContext'
import { analyzeMission, crewNeeds, gameContent, getMission, scoreMission, stateBatteryCapacity, SUPPLY_STOCKS } from '../../game'
import { useI18n } from '../../i18n/useI18n'
import type { MissionState } from '../../types/game'
import { STOCK_META } from '../resources/stockMeta'
import { LanguageToggle } from '../ui/LanguageToggle'
import { Button, fmt, Panel, Stars, StatusTag } from '../ui/ui'
import { GlossaryText } from '../ui/Term'
import { LineChart } from './LineChart'

export function MissionResult({ mission }: { mission: MissionState }) {
  const { dispatch } = useApp()
  const { t, m, content } = useI18n()
  const def = getMission(gameContent, mission.missionId)
  const text = getMission(content, mission.missionId)
  const score = scoreMission(gameContent, mission)
  const analysis = analyzeMission(gameContent, mission)
  const lesson = analysis.lessonCause ? content.science.lessons[analysis.lessonCause] : content.science.successLesson
  const needs = crewNeeds(gameContent, def)
  const env = gameContent.environment
  const success = mission.status === 'success'
  const days = mission.history.map((h) => h.day)
  const shadowBands = def.illumination
    .filter((p) => p.factor < 0.5 && p.fromDay <= mission.day)
    .map((p) => ({ from: p.fromDay, to: Math.min(p.toDay, mission.day), label: t('chart.band.shadow') }))
  const stormBands = mission.decisions
    .filter((d) => d.eventId === 'solar_storm')
    .map((d) => ({ from: d.day, to: Math.min(d.day + 1, mission.day), label: t('chart.band.storm') }))
    .filter((b) => b.from <= mission.day)

  const consequence = success
    ? t('result.consequenceSuccess', { crew: def.crew, days: def.durationDays, dose: fmt(mission.crewDoseMsv) })
    : t('result.consequenceFailure', { day: mission.failure!.day, days: def.durationDays })

  return (
    <main className="starfield min-h-full px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex justify-end">
          <LanguageToggle />
        </div>
        <header className={`rounded-2xl border p-6 text-center ${success ? 'border-good/40 bg-good/10' : 'border-critical/40 bg-critical/10'}`}>
          <p className="text-xs font-bold tracking-widest text-ink-3 uppercase">{t('result.kicker', { mission: text.name })}</p>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{lesson.title}</h1>
          <div className="mt-3">
            <Stars count={score.stars} />
          </div>
          <ul className="mt-3 flex flex-wrap justify-center gap-2 text-xs">
            {score.badges.map((b) => {
              const detail = m(b.detail)
              return (
                <li key={b.id} className="rounded-full border border-line bg-panel px-3 py-1" title={detail}>
                  <StatusTag level={b.earned ? 'good' : 'neutral'} word={t(`badge.${b.id}`)} />{' '}
                  <span className="text-ink-3">
                    — <GlossaryText text={detail} />
                  </span>
                </li>
              )
            })}
          </ul>
        </header>

        <Panel title={t('result.analysis')} id="analysis">
          <dl className="grid gap-4 p-5 text-sm md:grid-cols-2">
            <Block term={t('result.what')} text={lesson.what} />
            <Block term={t('result.why')} text={lesson.why} />
            <Block term={t('result.consequence')} text={consequence} />
            <Block term={t('result.principle')} text={lesson.principle} accent />
          </dl>
        </Panel>

        <div className="grid gap-4 md:grid-cols-2">
          <Panel title={success ? t('result.decisionsMade') : t('result.decisionsContributed')} id="decisions">
            <ul className="space-y-2 p-4 text-sm">
              {mission.decisions.length === 0 && <li className="text-ink-3">{t('result.noDecisions')}</li>}
              {mission.decisions.map((d, i) => {
                const contributed = analysis.contributingDecisions.includes(d)
                const event = content.events[d.eventId]
                const option = event.options.find((o) => o.id === d.optionId)
                return (
                  <li key={i} className={`rounded-lg border p-2 ${contributed ? 'border-critical/50 bg-critical/10' : 'border-line bg-panel-2'}`}>
                    <p className="text-xs text-ink-3">{t('result.decisionDay', { day: d.day, event: event.title })}</p>
                    <p>{option?.label}</p>
                    {contributed && <StatusTag level="critical" word={t('result.putAtRisk', { cause: t(`cause.${mission.failure!.cause}`) })} />}
                    {d.notes.map((n, j) => (
                      <p key={j} className="text-xs text-ink-3">
                        → {m(n)}
                      </p>
                    ))}
                  </li>
                )
              })}
            </ul>
          </Panel>
          <Panel title={t('result.numbers')} id="insights">
            <ul className="space-y-2 p-4 text-sm text-ink-2">
              {analysis.insights.map((insight, i) => (
                <li key={i} className="flex gap-2">
                  <span aria-hidden className="text-accent-2">▸</span>
                  <span>
                    <GlossaryText text={m(insight)} />
                  </span>
                </li>
              ))}
            </ul>
            <div className="border-t border-line p-4">
              <p className="font-display text-sm font-bold text-accent">{success ? t('result.tryNext') : t('result.tryInstead')}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-2">
                {lesson.alternatives.map((a) => (
                  <li key={a}>
                    <GlossaryText text={a} />
                  </li>
                ))}
              </ul>
            </div>
          </Panel>
        </div>

        <section aria-label={t('result.charts')} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <LineChart
              title={t('chart.supply')}
              unit={t('chart.unit.days')}
              days={days}
              bands={shadowBands}
              series={SUPPLY_STOCKS.map((s) => ({
                key: s,
                label: t(`stock.${s}`),
                color: STOCK_META[s].color,
                values: mission.history.map((h) => h[s] / needs[s]),
              }))}
            />
          </div>
          <LineChart
            title={t('chart.dose')}
            unit="mSv"
            days={days}
            bands={stormBands}
            yMax={env.doseLimitMsv * 1.1}
            threshold={{ value: env.doseLimitMsv, label: t('chart.limit') }}
            series={[{ key: 'dose', label: t('chart.series.dose'), color: 'var(--color-serious)', values: mission.history.map((h) => h.dose) }]}
          />
          <LineChart
            title={t('chart.battery')}
            unit="kWh"
            days={days}
            bands={shadowBands}
            yMax={stateBatteryCapacity(gameContent, mission)}
            series={[{ key: 'energy', label: t('chart.series.battery'), color: 'var(--color-warn)', values: mission.history.map((h) => h.energy) }]}
          />
        </section>

        <div className="flex flex-wrap justify-center gap-3 pb-8">
          <Button variant="primary" className="px-6 py-3 text-base" onClick={() => dispatch({ type: 'retry' })}>
            {t('result.retry')}
          </Button>
          <Button onClick={() => dispatch({ type: 'navigate', screen: 'select' })}>{t('result.another')}</Button>
          <Button variant="ghost" onClick={() => dispatch({ type: 'navigate', screen: 'menu' })}>
            {t('result.menu')}
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
      <dd className="mt-1 text-ink-2">
        <GlossaryText text={text} />
      </dd>
    </div>
  )
}
