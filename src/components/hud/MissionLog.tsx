import type { LogKind, MissionState } from '../../types/game'
import { Panel } from '../ui/ui'

const KIND: Record<LogKind, { label: string; className: string }> = {
  info: { label: 'Info', className: 'text-ink-2' },
  success: { label: 'Good news', className: 'text-good-ink' },
  warning: { label: 'Warning', className: 'text-warn' },
  danger: { label: 'Alert', className: 'text-critical' },
  science: { label: 'Science', className: 'text-accent-2' },
}

export function MissionLog({ mission }: { mission: MissionState }) {
  const entries = mission.log.slice(-40).reverse()
  return (
    <Panel title="Mission log" id="log-title" className="flex min-h-0 flex-col">
      <ol className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3 text-xs" aria-live="polite" aria-relevant="additions">
        {entries.map((e, i) => (
          <li key={`${mission.log.length - i}`} className={KIND[e.kind].className}>
            <span className="mr-2 font-mono text-ink-3">D{String(e.day).padStart(2, '0')}</span>
            <span className="sr-only">{KIND[e.kind].label}: </span>
            {e.text}
          </li>
        ))}
      </ol>
    </Panel>
  )
}
