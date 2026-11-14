/**
 * @file
 * @brief Displays the mission outcome and the educational mission analysis.
 */
import { useApp } from '../../app/state/AppContext'
import { analyzeMission, crewNeeds, decisionTimeline, gameContent, getMission, scoreMission, stateBatteryCapacity, summarizeRun, SUPPLY_STOCKS } from '../../game'
import { useI18n } from '../../i18n/useI18n'
import type { MissionState } from '../../types/game'
import { STOCK_META } from '../resources/stockMeta'
import { RankInsignia } from '../art/RankInsignia'
import { Icon } from '../ui/Icon'
import { LanguageToggle } from '../ui/LanguageToggle'
import { SpaceBackdrop } from '../ui/SpaceBackdrop'
import { Button, fmt, Panel, SourceLink, Stars, StatusTag } from '../ui/ui'
import { GlossaryText } from '../ui/Term'
import { ScienceNotesButton } from '../science/ScienceNotes'
import { DecisionStoryCard } from './DecisionStory'
import { LineChart } from './LineChart'
import { RunComparison } from './RunComparison'

export function MissionResult({ mission }: { mission: MissionState }) {
  const { state, dispatch } = useApp()
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

  const stories = decisionTimeline(gameContent, mission)
  const previous = state.compareWith && state.compareWith.missionId === mission.missionId && state.compareWith.seed === mission.seed ? state.compareWith : null
  const goal = def.scienceGoal ?? 0
  const found = content.science.samples.slice(0, Math.min(mission.science?.samples ?? 0, content.science.samples.length))
  const consequence = success
    ? t('result.consequenceSuccess', { crew: def.crew, days: def.durationDays, dose: fmt(mission.crewDoseMsv) })
    : t('result.consequenceFailure', { day: mission.failure!.day, days: def.durationDays })

  return (
    <main className="relative min-h-full px-4 py-8 sm:px-8">
      <SpaceBackdrop />
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex justify-end">
          <LanguageToggle />
        </div>
        <header className={`hud-frame rounded-2xl p-6 text-center ${success ? 'shadow-[0_0_60px_-12px_rgba(61,220,132,0.5)]' : 'shadow-[0_0_60px_-12px_rgba(255,90,90,0.5)]'}`}>
          <p className="text-xs font-bold tracking-widest text-ink-3 uppercase">{t('result.kicker', { mission: text.name })}</p>
          <p className="mt-2 inline-flex items-center gap-2 text-sm text-ink-2">
            <RankInsignia rank={mission.rank} size={24} /> {t('result.rank', { rank: t(`rank.${mission.rank}.name`) })}
          </p>
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

        {previous && <RunComparison before={previous} now={summarizeRun(gameContent, mission)} />}

        <Panel title={t('result.timeline')} id="decisions">
          <ul className="space-y-2 p-4 text-sm">
            {stories.length === 0 && <li className="text-ink-3">{t('result.noDecisions')}</li>}
            {stories.map((story, i) => (
              <DecisionStoryCard
                key={i}
                story={story}
                contributed={analysis.contributingDecisions.includes(story.record)}
                cause={mission.failure ? t(`cause.${mission.failure.cause}`) : undefined}
              />
            ))}
          </ul>
        </Panel>

        <div className="grid gap-4 md:grid-cols-2">
          {goal > 0 && (
            <Panel title={t('result.science')} id="science" icon="science">
              <div className="p-4 text-sm">
                <p className="font-semibold">{t('science.samples', { count: mission.science?.samples ?? 0, goal })}</p>
                {found.length === 0 && <p className="mt-1 text-ink-3">{t('result.noSamples')}</p>}
                {found.length > 0 && (
                  <>
                    <p className="mt-2 text-xs font-bold tracking-wide text-accent uppercase">{t('result.samplesFound')}</p>
                    <ul className="mt-1 space-y-2 text-ink-2">
                      {found.map((sample) => (
                        <li key={sample.id}>
                          <strong className="text-ink">{sample.name}.</strong> <GlossaryText text={sample.text} />{' '}
                          <SourceLink sourceKey={sample.source} sources={content.science.sources} />
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </Panel>
          )}
          <Panel title={t('result.numbers')} id="insights">
            <ul className="space-y-2 p-4 text-sm text-ink-2">
              {analysis.insights.map((insight, i) => (
                <li key={i} className="flex gap-2">
                  <Icon name="chevronRight" className="mt-0.5 text-accent-2" />
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
          <Button variant="primary" className="px-6 py-3 text-base" onClick={() => dispatch({ type: 'replay' })} title={t('result.replayAbout')}>
            <Icon name="retry" /> {t('result.replay')}
          </Button>
          <Button onClick={() => dispatch({ type: 'retry' })}>{t('result.retry')}</Button>
          <ScienceNotesButton />
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
