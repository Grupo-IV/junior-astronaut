import { useI18n } from '../../i18n/useI18n'
import type { LogKind, MissionState } from '../../types/game'
import { Panel } from '../ui/ui'

const KIND_CLASS: Record<LogKind, string> = {
  info: 'text-ink-2',
  success: 'text-good-ink',
  warning: 'text-warn',
  danger: 'text-critical',
  science: 'text-accent-2',
}

export function MissionLog({ mission }: { mission: MissionState }) {
  const { t, m } = useI18n()
  const entries = mission.log.slice(-40).reverse()
  return (
    <Panel title={t('log.title')} id="log-title" className="flex min-h-0 flex-col">
      <ol className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3 text-xs" aria-live="polite" aria-relevant="additions">
        {entries.map((e, i) => (
          <li key={`${mission.log.length - i}`} className={KIND_CLASS[e.kind]}>
            <span className="mr-2 font-mono text-ink-3">D{String(e.day).padStart(2, '0')}</span>
            <span className="sr-only">{t(`log.kind.${e.kind}`)}: </span>
            {m(e.msg)}
          </li>
        ))}
      </ol>
    </Panel>
  )
}
