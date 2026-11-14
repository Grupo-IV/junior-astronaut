import { useApp } from '../../app/state/AppContext'
import { useI18n } from '../../i18n/useI18n'
import { LanguageToggle } from '../ui/LanguageToggle'
import { SoundToggle } from '../ui/SoundToggle'
import { Button } from '../ui/ui'

const LOOP = ['plan', 'build', 'operate', 'event', 'decide', 'consequence', 'learn', 'adapt'] as const

export function MainMenu() {
  const { dispatch } = useApp()
  const { t } = useI18n()
  return (
    <main className="starfield relative flex min-h-full flex-col items-center justify-center px-4 py-12 text-center">
      <LanguageToggle className="absolute top-4 right-4" />
      <div className="relative mb-8 size-28 rounded-full bg-gradient-to-br from-[#d9dbe0] to-[#6d717b] shadow-[0_0_80px_rgba(200,210,255,0.25)]" aria-hidden>
        <span className="absolute top-6 left-7 size-5 rounded-full bg-black/15" />
        <span className="absolute right-6 bottom-7 size-7 rounded-full bg-black/15" />
        <span className="absolute top-12 right-9 size-3 rounded-full bg-black/15" />
      </div>
      <p className="font-display text-sm tracking-[0.3em] text-accent uppercase">{t('menu.kicker')}</p>
      <h1 className="mt-3 font-display text-4xl font-bold sm:text-6xl">{t('menu.title')}</h1>
      <h2 className="font-display text-2xl text-ink-2 sm:text-3xl">{t('menu.subtitle')}</h2>
      <p className="mt-6 max-w-xl text-ink-2">{t('menu.intro')}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button variant="primary" className="px-8 py-3 text-base" onClick={() => dispatch({ type: 'navigate', screen: 'select' })}>
          {t('menu.start')}
        </Button>
        <SoundToggle className="px-5 py-3" />
      </div>
      <ol className="mt-12 flex max-w-2xl flex-wrap justify-center gap-2 text-xs text-ink-3" aria-label={t('menu.loopLabel')}>
        {LOOP.map((step, i) => (
          <li key={step} className="flex items-center gap-2">
            <span className="rounded-full border border-line px-3 py-1">{t(`menu.loop.${step}`)}</span>
            {i < LOOP.length - 1 && <span aria-hidden>→</span>}
          </li>
        ))}
      </ol>
      <p className="mt-10 text-xs text-ink-3">{t('menu.credits')}</p>
    </main>
  )
}
