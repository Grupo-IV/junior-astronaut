/**
 * @file
 * @brief Choose a rank (difficulty mode) and a mission.
 */
import { planRules } from '../../app/state/appState'
import { useApp } from '../../app/state/AppContext'
import { getMission, recommendedRank } from '../../game'
import { useI18n } from '../../i18n/useI18n'
import { MissionBanner } from '../art/MissionBanner'
import { RankInsignia } from '../art/RankInsignia'
import { Icon } from '../ui/Icon'
import { LanguageToggle } from '../ui/LanguageToggle'
import { SpaceBackdrop } from '../ui/SpaceBackdrop'
import { Button } from '../ui/ui'
import { RankPicker } from './RankPicker'

export function MissionSelect() {
  const { state, dispatch } = useApp()
  const { t, content, n } = useI18n()
  const rules = planRules(state)
  return (
    <main className="relative min-h-full px-4 py-6 sm:px-8">
      <SpaceBackdrop />
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => dispatch({ type: 'navigate', screen: 'menu' })}>
            <Icon name="arrowLeft" /> {t('select.back')}
          </Button>
          <LanguageToggle />
        </div>

        <section className="mt-6" aria-labelledby="rank-title">
          <h1 id="rank-title" className="font-display text-3xl font-bold sm:text-4xl">
            {t('rank.title')}
          </h1>
          <p className="mt-1 max-w-3xl text-ink-2">{t('rank.intro')}</p>
          <div className="mt-5">
            <RankPicker value={state.rank} onChange={(rank) => dispatch({ type: 'setRank', rank })} />
          </div>
        </section>

        <section className="mt-10 pb-10" aria-labelledby="missions-title">
          <h2 id="missions-title" className="font-display text-2xl font-bold">
            {t('select.missions')}
          </h2>
          <p className="mt-1 text-ink-2">{t('select.intro')}</p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {content.missions.map((m) => {
              const ranked = getMission(rules, m.id)
              const recommended = recommendedRank(m)
              return (
                <article key={m.id} className="hud-frame flex flex-col overflow-hidden rounded-xl">
                  <MissionBanner variant={recommended === 'commander' ? 'commander' : 'cadet'} className="h-32 w-full" />
                  <div className="flex flex-1 flex-col p-5">
                    <p className="flex items-center gap-2 text-xs font-bold tracking-widest text-hud uppercase">
                      <RankInsignia rank={recommended} size={20} />
                      {t('select.recommended', { rank: t(`rank.${recommended}.name`) })}
                    </p>
                    <h3 className="mt-2 font-display text-xl font-bold">{m.name}</h3>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-3">
                      <Icon name="pin" /> {m.location}
                    </p>
                    <p className="mt-3 flex-1 text-sm text-ink-2">{m.briefing.tagline}</p>
                    <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                      <Stat icon="crew" label={t('select.crew')} value={String(m.crew)} />
                      <Stat icon="calendar" label={t('select.days')} value={String(m.durationDays)} />
                      <Stat icon="lander" label={t('select.lander')} value={t('select.landerValue', { tonnes: n(ranked.launchMassBudgetKg / 1000, 1) })} />
                    </dl>
                    <Button variant="primary" className="mt-4" onClick={() => dispatch({ type: 'chooseMission', missionId: m.id })}>
                      {t('select.read')} <Icon name="arrowRight" />
                    </Button>
                  </div>
                </article>
              )
            })}
            <article className="flex flex-col overflow-hidden rounded-xl border border-dashed border-line opacity-60" aria-disabled>
              <MissionBanner variant="mars" className="h-32 w-full grayscale-[40%]" />
              <div className="p-5">
                <p className="text-xs font-bold tracking-widest text-ink-3 uppercase">{t('select.soon')}</p>
                <h3 className="mt-2 font-display text-xl font-bold">{t('select.mars.title')}</h3>
                <p className="mt-3 text-sm text-ink-2">{t('select.mars.text')}</p>
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>
  )
}

function Stat({ icon, label, value }: { icon: Parameters<typeof Icon>[0]['name']; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-hud-dim bg-space/60 p-2">
      <dt className="flex items-center justify-center gap-1 text-ink-3">
        <Icon name={icon} /> {label}
      </dt>
      <dd className="font-display text-lg">{value}</dd>
    </div>
  )
}
