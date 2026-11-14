import { useApp } from '../../app/state/AppContext'
import { useI18n } from '../../i18n/useI18n'
import { LanguageToggle } from '../ui/LanguageToggle'
import { Button } from '../ui/ui'

export function MissionSelect() {
  const { dispatch } = useApp()
  const { t, content, n } = useI18n()
  return (
    <main className="starfield min-h-full px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => dispatch({ type: 'navigate', screen: 'menu' })}>
            {t('select.back')}
          </Button>
          <LanguageToggle />
        </div>
        <h1 className="mt-4 font-display text-3xl font-bold">{t('select.title')}</h1>
        <p className="mt-1 text-ink-2">{t('select.intro')}</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {content.missions.map((m) => (
            <article key={m.id} className="flex flex-col rounded-xl border border-line bg-panel p-5">
              <p className={`text-xs font-bold tracking-widest uppercase ${m.difficulty === 'Cadet' ? 'text-accent-2' : 'text-accent'}`}>
                {m.difficulty === 'Cadet' ? '★' : '★★'} {t(`difficulty.${m.difficulty}`)}
              </p>
              <h2 className="mt-2 font-display text-xl font-bold">{m.name}</h2>
              <p className="mt-1 text-sm text-ink-3">{m.location}</p>
              <p className="mt-3 flex-1 text-sm text-ink-2">{m.briefing.tagline}</p>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-panel-2 p-2">
                  <dt className="text-ink-3">{t('select.crew')}</dt>
                  <dd className="font-display text-lg">{m.crew}</dd>
                </div>
                <div className="rounded-lg bg-panel-2 p-2">
                  <dt className="text-ink-3">{t('select.days')}</dt>
                  <dd className="font-display text-lg">{m.durationDays}</dd>
                </div>
                <div className="rounded-lg bg-panel-2 p-2">
                  <dt className="text-ink-3">{t('select.lander')}</dt>
                  <dd className="font-display text-lg">{t('select.landerValue', { tonnes: n(m.launchMassBudgetKg / 1000, 1) })}</dd>
                </div>
              </dl>
              <Button variant="primary" className="mt-4" onClick={() => dispatch({ type: 'chooseMission', missionId: m.id })}>
                {t('select.read')}
              </Button>
            </article>
          ))}
          <article className="flex flex-col rounded-xl border border-dashed border-line p-5 opacity-60" aria-disabled>
            <p className="text-xs font-bold tracking-widest text-ink-3 uppercase">{t('select.soon')}</p>
            <h2 className="mt-2 font-display text-xl font-bold">{t('select.mars.title')}</h2>
            <p className="mt-3 flex-1 text-sm text-ink-2">{t('select.mars.text')}</p>
          </article>
        </div>
      </div>
    </main>
  )
}
