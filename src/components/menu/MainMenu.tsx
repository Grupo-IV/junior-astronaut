/**
 * @file
 * @brief Title screen: a cinematic first impression of a space mission, friendly for young players.
 */
import { lazy, Suspense } from 'react'
import { useApp } from '../../app/state/AppContext'
import { useI18n } from '../../i18n/useI18n'
import { AstronautMascot } from '../art/AstronautMascot'
import { MissionEmblem } from '../art/MissionEmblem'
import { RankInsignia } from '../art/RankInsignia'
import { Icon, type IconName } from '../ui/Icon'
import { LanguageToggle } from '../ui/LanguageToggle'
import { SoundToggle } from '../ui/SoundToggle'
import { SpaceBackdrop } from '../ui/SpaceBackdrop'
import { Button } from '../ui/ui'

const MenuMoon = lazy(() => import('./MenuMoon'))

const LOOP: { key: 'plan' | 'build' | 'operate' | 'event' | 'decide' | 'consequence' | 'learn' | 'adapt'; icon: IconName }[] = [
  { key: 'plan', icon: 'report' },
  { key: 'build', icon: 'wrench' },
  { key: 'operate', icon: 'power' },
  { key: 'event', icon: 'warning' },
  { key: 'decide', icon: 'target' },
  { key: 'consequence', icon: 'chart' },
  { key: 'learn', icon: 'science' },
  { key: 'adapt', icon: 'retry' },
]

export function MainMenu() {
  const { state, dispatch } = useApp()
  const { t } = useI18n()
  const stats: { icon: IconName; label: string; value: string }[] = [
    { icon: 'pin', label: t('menu.stat.destination'), value: t('menu.stat.destinationValue') },
    { icon: 'crew', label: t('menu.stat.crew'), value: t('menu.stat.crewValue') },
    { icon: 'science', label: t('menu.stat.science'), value: t('menu.stat.scienceValue') },
  ]

  return (
    <main className="relative min-h-full overflow-hidden">
      <SpaceBackdrop />

      {/* The Moon fills the right side; on small screens it sits behind the title. */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-end">
        <Suspense fallback={null}>
          <MenuMoon className="h-[105vmin] w-[105vmin] translate-x-[38%] opacity-50 md:translate-x-[30%] md:opacity-100" />
        </Suspense>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#04060d] to-transparent" />

      <div className="relative mx-auto flex min-h-full w-full max-w-7xl flex-col px-4 py-5 sm:px-8">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <MissionEmblem size={52} ringText={t('menu.emblem')} />
            <span className="hidden font-display text-sm font-bold tracking-[0.25em] text-ink-2 uppercase sm:inline">{t('menu.title')}</span>
          </div>
          <div className="hud-frame flex items-center gap-1 rounded-xl p-1">
            <SoundToggle />
            <LanguageToggle />
          </div>
        </header>

        <section className="grid flex-1 items-center gap-8 py-8 md:grid-cols-[1.1fr_1fr]">
          <div className="animate-rise min-w-0 max-w-xl">
            <p className="chip text-[11px] font-bold tracking-[0.25em] text-hud uppercase">
              <Icon name="satellite" /> {t('menu.kicker')}
            </p>
            <h1 className="mt-5 font-display text-[2.6rem] leading-[0.95] font-bold tracking-tight sm:text-7xl">
              <span className="text-gradient block">{t('menu.title')}</span>
            </h1>
            <p className="mt-3 font-display text-lg tracking-[0.25em] text-accent uppercase sm:text-2xl sm:tracking-[0.3em]">{t('menu.subtitle')}</p>
            <p className="mt-6 text-base leading-relaxed text-ink-2 sm:text-lg">{t('menu.intro')}</p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button variant="primary" className="px-8 py-4 text-lg" onClick={() => dispatch({ type: 'navigate', screen: 'select' })}>
                <Icon name="rocket" size="1.35em" /> {t('menu.start')}
              </Button>
              <span className="chip text-sm text-ink-2">
                <RankInsignia rank={state.rank} size={22} />
                {t('menu.continueAs', { rank: t(`rank.${state.rank}.name`) })}
              </span>
            </div>

            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-2 sm:gap-3">
              {stats.map((s) => (
                <div key={s.label} className="hud-frame min-w-0 rounded-lg px-2.5 py-2.5 sm:px-3">
                  <dt className="flex items-center gap-1 truncate text-[9px] font-bold tracking-[0.12em] text-hud uppercase sm:gap-1.5 sm:text-[10px] sm:tracking-[0.18em]">
                    <Icon name={s.icon} /> {s.label}
                  </dt>
                  <dd className="mt-1 font-display text-xs font-semibold text-ink sm:text-base">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative hidden h-full min-h-[420px] md:block">
            <AstronautMascot className="animate-float absolute bottom-[4%] left-[-6%] w-[50%] max-w-[300px] drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)]" />
          </div>
        </section>

        <footer className="pb-2">
          <ol className="hud-frame flex flex-wrap items-center justify-center gap-x-1 gap-y-2 rounded-xl px-3 py-3 text-xs text-ink-2" aria-label={t('menu.loopLabel')}>
            {LOOP.map((step, i) => (
              <li key={step.key} className="flex items-center gap-1">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-hud-dim bg-space/60 px-3 py-1">
                  <Icon name={step.icon} className="text-hud" />
                  {t(`menu.loop.${step.key}`)}
                </span>
                {i < LOOP.length - 1 && <Icon name="chevronRight" className="text-ink-3" />}
              </li>
            ))}
          </ol>
          <p className="mt-3 text-center text-xs text-ink-3">{t('menu.credits')}</p>
        </footer>
      </div>
    </main>
  )
}
