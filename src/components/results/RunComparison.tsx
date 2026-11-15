/**
 * @file
 * @brief This try next to the previous one with the same start: what changed, and what it did.
 */
import { compareRuns, gameContent, type RunSummary } from '../../game'
import { useI18n } from '../../i18n/useI18n'
import { Icon } from '../ui/Icon'
import { Panel } from '../ui/ui'

export function RunComparison({ before, now }: { before: RunSummary; now: RunSummary }) {
  const { t, n, content } = useI18n()
  const diff = compareRuns(before, now)
  const outcome = (r: RunSummary) => (r.success ? t('result.compare.survived') : t('result.compare.failed', { day: r.failure?.day ?? 0 }))
  const rows: [string, string, string][] = [
    [t('result.compare.outcome'), outcome(before), outcome(now)],
    [t('result.compare.dose'), `${n(before.dose)} mSv`, `${n(now.dose)} mSv`],
    [t('result.compare.reserve'), t('fp.daysLeft', { count: Math.floor(before.worstReserveDays) }), t('fp.daysLeft', { count: Math.floor(now.worstReserveDays) })],
    [t('result.compare.stars'), String(before.stars), String(now.stars)],
  ]
  if (gameContent.missions.find((m) => m.id === now.missionId)?.scienceGoal) rows.push([t('result.compare.samples'), String(before.samples), String(now.samples)])
  const label = (eventId: string, optionId: string | null) =>
    optionId ? content.events[eventId].options.find((o) => o.id === optionId)?.label ?? optionId : t('result.compare.none')

  return (
    <Panel title={t('result.compare')} id="compare" icon="retry">
      <div className="p-4 text-sm">
        <table className="w-full text-left">
          <thead className="text-xs text-ink-3">
            <tr>
              <th scope="col" className="py-1" />
              <th scope="col" className="py-1">{t('result.compare.before')}</th>
              <th scope="col" className="py-1">{t('result.compare.now')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([name, b, a]) => (
              <tr key={name} className="border-t border-line">
                <th scope="row" className="py-1.5 pr-2 font-normal text-ink-2">{name}</th>
                <td className="py-1.5">{b}</td>
                <td className={`py-1.5 font-semibold ${a !== b ? 'text-accent-2' : ''}`}>{a}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {diff.cargo.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-bold tracking-wide text-accent uppercase">{t('result.compare.cargo')}</p>
            <ul className="mt-1 flex flex-wrap gap-1.5 text-xs">
              {diff.cargo.map((c) => (
                <li key={c.item} className="hud-chip">
                  {(content.buildings as Record<string, { name: string }>)[c.item]?.name ?? (content.cargo as Record<string, { name: string }>)[c.item]?.name}: {c.before} → {c.now}
                </li>
              ))}
            </ul>
          </div>
        )}
        {diff.decisions.length > 0 ? (
          <div className="mt-3">
            <p className="text-xs font-bold tracking-wide text-accent uppercase">{t('result.compare.decisions')}</p>
            <ul className="mt-1 space-y-1 text-xs text-ink-2">
              {diff.decisions.map((d) => (
                <li key={`${d.day}-${d.eventId}`}>
                  {t('result.decisionDay', { day: d.day, event: content.events[d.eventId].title })}: {label(d.eventId, d.before)} <Icon name="arrowRight" /> {label(d.eventId, d.now)}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-ink-3">{t('result.compare.diverge')}</p>
          </div>
        ) : (
          diff.cargo.length === 0 && <p className="mt-3 text-xs text-ink-3">{t('result.compare.same')}</p>
        )}
      </div>
    </Panel>
  )
}
