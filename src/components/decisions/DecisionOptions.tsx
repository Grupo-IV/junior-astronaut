import { eventDef, gameContent, optionAvailability } from '../../game'
import { useI18n } from '../../i18n/useI18n'
import type { MissionState } from '../../types/game'
import { Icon } from '../ui/Icon'
import { GlossaryText } from '../ui/Term'

export function DecisionOptions({ mission, eventId, onChoose }: { mission: MissionState; eventId: string; onChoose: (optionId: string) => void }) {
  const { t, m, content } = useI18n()
  // Availability is decided with the original rules; only the words come from the translated content.
  const rules = eventDef(gameContent, eventId)
  const text = eventDef(content, eventId)
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {rules.options.map((rule, i) => {
        const o = text.options[i]
        const a = optionAvailability(gameContent, mission, rule)
        return (
          <li key={rule.id}>
            <button
              type="button"
              disabled={!a.available}
              onClick={() => onChoose(rule.id)}
              className="flex h-full w-full flex-col rounded-xl border border-hud-dim bg-space/60 p-3 text-left transition hover:border-accent hover:bg-accent/10 hover:shadow-[0_0_24px_-8px_rgba(255,138,61,0.7)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-line disabled:hover:bg-panel-2"
            >
              <span className="font-semibold">
                <Icon name={o.icon} className="mr-1.5 text-hud" size="1.3em" />
                {o.label}
              </span>
              <span className="mt-2 text-xs text-good-ink">
                <Icon name="plus" className="mr-1" />
                <span className="sr-only">{t('decision.benefit')} </span>
                <GlossaryText text={o.benefit} />
              </span>
              <span className="mt-1 text-xs text-serious">
                <Icon name="minus" className="mr-1" />
                <span className="sr-only">{t('decision.cost')} </span>
                <GlossaryText text={o.cost} />
              </span>
              {!a.available && a.reason && (
                <span className="mt-2 text-xs font-semibold text-critical">
                  <Icon name="close" className="mr-1" />
                  {t('decision.unavailable', { reason: m(a.reason) })}
                </span>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
