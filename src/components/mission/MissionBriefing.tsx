import { useApp } from '../../app/state/AppContext'
import { crewNeeds, gameContent, getMission } from '../../game'
import { useI18n } from '../../i18n/useI18n'
import { LanguageToggle } from '../ui/LanguageToggle'
import { Button, Panel } from '../ui/ui'
import { GlossaryText } from '../ui/Term'

export function MissionBriefing() {
  const { state, dispatch } = useApp()
  const { t, n, content } = useI18n()
  const mission = getMission(content, state.missionId)
  const needs = crewNeeds(gameContent, getMission(gameContent, state.missionId))
  const perPerson = gameContent.environment.crewPerPersonPerDay
  return (
    <main className="starfield min-h-full px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => dispatch({ type: 'navigate', screen: 'select' })}>
            {t('briefing.back')}
          </Button>
          <LanguageToggle />
        </div>
        <p className="mt-4 text-xs font-bold tracking-widest text-accent uppercase">{t('briefing.kicker', { difficulty: t(`difficulty.${mission.difficulty}`) })}</p>
        <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">{mission.name}</h1>
        <p className="mt-1 text-ink-3">📍 {mission.location}</p>
        <p className="mt-6 text-lg leading-relaxed text-ink-2">{mission.briefing.story}</p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Panel title={t('briefing.objectives')} id="objectives">
            <ul className="space-y-2 p-4 text-sm">
              {mission.briefing.objectives.map((o) => (
                <li key={o} className="flex gap-2">
                  <span aria-hidden className="text-good-ink">◎</span>
                  <span>
                    <GlossaryText text={o} />
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title={t('briefing.hazards')} id="hazards">
            <ul className="space-y-2 p-4 text-sm">
              {mission.briefing.hazards.map((h) => (
                <li key={h} className="flex gap-2">
                  <span aria-hidden className="text-warn">⚠</span>
                  <span>
                    <GlossaryText text={h} />
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title={t('briefing.needs')} id="needs" className="md:col-span-2">
            <div className="grid grid-cols-2 gap-3 p-4 text-sm sm:grid-cols-4">
              <Need icon="🫁" label={t('stock.oxygen')} value={t('briefing.perDay', { value: n(needs.oxygen, 1) })} note={t('briefing.perPerson', { crew: mission.crew, kg: perPerson.oxygenKg })} />
              <Need icon="💧" label={t('stock.water')} value={t('briefing.perDay', { value: n(needs.water, 1) })} note={t('briefing.perPerson', { crew: mission.crew, kg: perPerson.waterKg })} />
              <Need icon="🥫" label={t('stock.food')} value={t('briefing.perDay', { value: n(needs.food, 1) })} note={t('briefing.perPerson', { crew: mission.crew, kg: perPerson.foodKg })} />
              <Need
                icon="⚡"
                label={t('briefing.power')}
                value={t('briefing.powerValue', { kwh: gameContent.environment.habitat.powerDemandKwhPerDay })}
                note={t('briefing.powerNote')}
              />
            </div>
            <p className="px-4 pb-4 text-xs text-ink-3">{t('briefing.bvad')}</p>
          </Panel>
        </div>

        <p className="mt-6 rounded-lg border border-accent-2/30 bg-accent-2/10 p-4 text-sm text-ink">
          <strong className="text-accent-2">{t('briefing.tip')} </strong>
          {mission.briefing.tip}
        </p>
        <div className="mt-8 flex justify-end">
          <Button variant="primary" className="px-6 py-3 text-base" onClick={() => dispatch({ type: 'navigate', screen: 'setup' })}>
            {t('briefing.next')}
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
      <p className="font-display text-xl">
        <GlossaryText text={value} />
      </p>
      <p className="text-xs text-ink-3">{note}</p>
    </div>
  )
}
