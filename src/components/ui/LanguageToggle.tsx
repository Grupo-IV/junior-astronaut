/**
 * @file
 * @brief Interface language switch (PT / EN). Changes texts only, never the simulation.
 */
import { LOCALES, setLocale } from '../../i18n/locale'
import { useI18n } from '../../i18n/useI18n'

export function LanguageToggle({ className = '' }: { className?: string }) {
  const { locale, t } = useI18n()
  return (
    <div role="group" aria-label={t('lang.label')} className={`inline-flex rounded-lg border border-line p-0.5 ${className}`}>
      {LOCALES.map((l) => (
        <button
          key={l.id}
          type="button"
          lang={l.id}
          aria-pressed={locale === l.id}
          aria-label={l.label}
          title={locale === l.id ? l.label : t('lang.switchTo', { language: l.label })}
          onClick={() => setLocale(l.id)}
          className={`rounded-md px-2 py-1 text-xs font-bold tracking-wide transition ${locale === l.id ? 'bg-accent text-space' : 'text-ink-2 hover:bg-panel-2 hover:text-ink'}`}
        >
          {l.short}
        </button>
      ))}
    </div>
  )
}
