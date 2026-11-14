/**
 * @file
 * @brief One decision as a short story: expected → chosen → observed → what to try next.
 */
import type { DecisionStory as Story } from '../../game'
import { useI18n } from '../../i18n/useI18n'
import { Icon, type IconName } from '../ui/Icon'
import { GlossaryText } from '../ui/Term'
import { StatusTag } from '../ui/ui'

const EFFECT_ICON: Record<string, IconName> = { oxygen: 'oxygen', water: 'water', food: 'food', energy: 'battery', spares: 'toolbox', dose: 'radiation' }

export function DecisionStoryCard({ story, contributed, cause }: { story: Story; contributed: boolean; cause?: string }) {
  const { t, m, n, content } = useI18n()
  const { record } = story
  const event = content.events[record.eventId]
  const option = event.options.find((o) => o.id === record.optionId)!
  const effect = Object.entries(record.effect ?? {}) as [string, number][]
  const days = story.to - story.from + 1
  const unit = (k: string) => (k === 'energy' ? 'kWh' : k === 'dose' ? 'mSv' : k === 'spares' ? '' : 'kg')
  const name = (k: string) => (k === 'dose' ? t('res.dose') : t(`stock.${k as 'oxygen'}`))
  const signed = (v: number, digits: number) => `${v > 0 ? '+' : '−'}${n(Math.abs(v), digits)}`

  return (
    <li className={`rounded-xl border p-3 ${contributed ? 'border-critical/50 bg-critical/10' : 'border-line bg-panel-2'}`}>
      <p className="text-xs text-ink-3">{t('result.decisionDay', { day: record.day, event: event.title })}</p>
      <p className="mt-0.5 font-semibold">
        <Icon name={option.icon} className="mr-1 text-hud" /> {option.label}
      </p>
      {contributed && cause && <StatusTag level="critical" word={t('result.putAtRisk', { cause })} />}
      {record.timedOut && <p className="mt-1 text-xs text-warn">{t('result.timedOut')}</p>}

      <dl className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
        <div>
          <dt className="font-bold tracking-wide text-accent uppercase">{t('result.expected')}</dt>
          <dd className="mt-0.5 text-good-ink">
            + <GlossaryText text={option.benefit} />
          </dd>
          <dd className="text-serious">
            − <GlossaryText text={option.cost} />
          </dd>
        </div>
        <div>
          <dt className="font-bold tracking-wide text-accent-2 uppercase">{t('result.observed')}</dt>
          {effect.length > 0 && (
            <dd className="mt-0.5 text-ink-2">
              {t('result.rightAway')}:{' '}
              {effect.map(([k, v]) => (
                <span key={k} className="mr-2 whitespace-nowrap">
                  <Icon name={EFFECT_ICON[k]} /> {k === 'spares' ? t('cine.delta.spares', { delta: signed(v, 0) }) : `${name(k)} ${signed(v, 1)} ${unit(k)}`}
                </span>
              ))}
            </dd>
          )}
          {record.notes.map((note, i) => (
            <dd key={i} className="mt-0.5 text-ink-2">
              <Icon name="chevronRight" /> <GlossaryText text={m(note)} />
            </dd>
          ))}
          {(story.dose !== null || story.lowest.length > 0) && (
            <dd className="mt-0.5 text-ink-2">
              {t('result.window', { count: days })}:{' '}
              {story.dose !== null && <span className="mr-2">{t('result.doseInWindow', { dose: n(story.dose, 1) })}</span>}
              {story.lowest.map((l) => (
                <span key={l.stock} className="mr-2">
                  {t('result.lowest', { stock: t(`stock.${l.stock}.lower`), days: n(l.days, 1) })}
                </span>
              ))}
            </dd>
          )}
        </div>
      </dl>
      {story.alternatives.length > 0 && (
        <p className="mt-2 text-xs text-ink-3">
          {t('result.otherOptions')}: {story.alternatives.map((id) => event.options.find((o) => o.id === id)!.label).join(' · ')}
        </p>
      )}
    </li>
  )
}
