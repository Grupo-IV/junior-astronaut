/**
 * @file
 * @brief Switches between the management view of the outpost and first person inside the habitat.
 */
import { useApp } from '../../app/state/AppContext'
import { useI18n } from '../../i18n/useI18n'
import { Icon } from '../ui/Icon'

export function ViewToggle({ variant = 'header' }: { variant?: 'header' | 'hud' }) {
  const { state, dispatch } = useApp()
  const { t } = useI18n()
  const inside = state.view === 'firstPerson'
  const style =
    variant === 'hud'
      ? 'hud-button hud-button-strong'
      : 'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-accent-2/60 bg-accent-2/10 px-4 py-2 text-sm font-semibold text-accent-2 transition hover:bg-accent-2/20'
  return (
    <button
      type="button"
      className={style}
      aria-pressed={inside}
      aria-label={inside ? t('view.toManagementAria') : t('view.toImmersiveAria')}
      title={inside ? t('view.toManagementAria') : t('view.toImmersiveAria')}
      onClick={() => dispatch({ type: 'setView', view: inside ? 'orbit' : 'firstPerson' })}
    >
      <Icon name={inside ? 'overview' : 'helmet'} />
      <span className={variant === 'hud' ? 'hidden sm:inline' : ''}>{inside ? t('view.toManagement') : t('view.toImmersive')}</span>
    </button>
  )
}
