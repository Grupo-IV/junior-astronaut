import { useI18n } from '../../i18n/useI18n'
import type { LogKind, Message, MissionState } from '../../types/game'
import { Icon, isIconName, type IconName } from '../ui/Icon'
import { Panel } from '../ui/ui'

const KIND: Record<LogKind, { className: string; icon: IconName }> = {
  info: { className: 'text-ink-2', icon: 'info' },
  success: { className: 'text-good-ink', icon: 'check' },
  warning: { className: 'text-warn', icon: 'warning' },
  danger: { className: 'text-critical', icon: 'warning' },
  science: { className: 'text-accent-2', icon: 'science' },
}

/** Icons for engine messages that have one fixed meaning. */
const MESSAGE_ICON: Record<string, IconName> = {
  'sim.touchdown': 'lander',
  'sim.firstForecast': 'sun',
  'sim.periodStart': 'sun',
  'sim.shed': 'bolt',
  'sim.powerEmergency': 'bolt',
  'sim.greenhouseReady': 'sprout',
  'sim.leak': 'leak',
  'sim.stormDoseShielded': 'radiation',
  'sim.stormDoseUnshielded': 'radiation',
  'sim.doseWarning': 'radiation',
  'sim.missionFailed': 'fail',
  'sim.lowStock': 'warning',
  'sim.missionComplete': 'flag',
  'sim.stormForecast': 'satellite',
  'sim.greenhouseKilled': 'wilt',
  'sim.repairedSpare': 'toolbox',
  'sim.repairedImprovised': 'wrench',
  'sim.repairFailed': 'wrench',
  'sim.buildingOffline': 'power',
  'sim.buildingOnline': 'power',
  'sim.buildingSwitchedOff': 'power',
}

function iconFor(msg: Message, kind: LogKind): IconName {
  const fromContent = msg.args?.icon
  if (typeof fromContent === 'string' && isIconName(fromContent)) return fromContent
  return MESSAGE_ICON[msg.key] ?? KIND[kind].icon
}

export function MissionLog({ mission }: { mission: MissionState }) {
  const { t, m } = useI18n()
  const entries = mission.log.slice(-40).reverse()
  return (
    <Panel title={t('log.title')} id="log-title" className="flex min-h-0 flex-col" icon="satellite">
      <ol className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3 text-xs" aria-live="polite" aria-relevant="additions">
        {entries.map((e, i) => (
          <li key={`${mission.log.length - i}`} className={`flex gap-2 ${KIND[e.kind].className}`}>
            <span className="font-mono text-ink-3">D{String(e.day).padStart(2, '0')}</span>
            <Icon name={iconFor(e.msg, e.kind)} className="mt-px" />
            <span>
              <span className="sr-only">{t(`log.kind.${e.kind}`)}: </span>
              {m(e.msg)}
            </span>
          </li>
        ))}
      </ol>
    </Panel>
  )
}
