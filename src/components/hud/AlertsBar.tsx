/**
 * @file
 * @brief The alerts that need attention now, as short chips. Nothing is shown when all is well.
 */
import { useApp } from '../../app/state/AppContext'
import { useI18n } from '../../i18n/useI18n'
import type { UiKey } from '../../i18n/translate'
import type { MissionState } from '../../types/game'
import { Icon } from '../ui/Icon'
import { missionAlerts, type MissionAlert } from './alerts'

const STYLE: Record<MissionAlert['level'], string> = {
  critical: 'border-critical/60 bg-critical/20 text-critical',
  warn: 'border-warn/50 bg-warn/15 text-warn',
  good: 'border-good/50 bg-good/15 text-good-ink',
}

export function AlertsBar({ mission, max = 3, className = '' }: { mission: MissionState; max?: number; className?: string }) {
  const { dispatch } = useApp()
  const { t, content } = useI18n()
  const alerts = missionAlerts(mission).slice(0, max)
  if (alerts.length === 0) return null
  const text = (a: MissionAlert) => {
    const args: Record<string, string | number> = { ...a.args }
    if (a.stock) args.stock = t(`stock.${a.stock}`)
    if (a.building) args.building = content.buildings[a.building].name
    return t(a.key as UiKey, args)
  }
  return (
    <ul className={`flex flex-wrap items-center gap-1.5 ${className}`} aria-label={t('alert.aria')} role="status">
      {alerts.map((a) => (
        <li key={`${a.id}-${a.stock ?? a.building ?? ''}`} className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${STYLE[a.level]}`}>
          <Icon name={a.icon} />
          <span>{text(a)}</span>
          {a.action === 'takeShelter' && (
            <button
              type="button"
              className="ml-1 min-h-8 rounded-full bg-critical px-2.5 py-0.5 text-[11px] font-bold text-space hover:brightness-110"
              onClick={() => dispatch({ type: 'takeShelter' })}
            >
              {t('alert.stormGo')}
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}
