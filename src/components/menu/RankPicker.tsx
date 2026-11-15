/**
 * @file
 * @brief Rank (difficulty mode) picker: four insignia cards, a keyboard-friendly radio group.
 */
import { useRef, type KeyboardEvent } from 'react'
import { RANK_IDS, RANKS, type RankId } from '../../game/ranks'
import { useI18n } from '../../i18n/useI18n'
import { RankInsignia } from '../art/RankInsignia'
import { Icon, type IconName } from '../ui/Icon'

const EVENTS_WORD: Record<RankId, 'fewer' | 'normal' | 'more' | 'many'> = { cadet: 'fewer', specialist: 'normal', engineer: 'more', commander: 'many' }

export function RankPicker({ value, onChange }: { value: RankId; onChange: (rank: RankId) => void }) {
  const { t } = useI18n()
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = RANK_IDS.indexOf(value)
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = RANK_IDS[(i + step + RANK_IDS.length) % RANK_IDS.length]
    onChange(next)
    refs.current[RANK_IDS.indexOf(next)]?.focus()
  }

  return (
    <div role="radiogroup" aria-label={t('rank.title')} onKeyDown={onKeyDown} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {RANK_IDS.map((id, i) => {
        const r = RANKS[id]
        const selected = id === value
        const effects: { icon: IconName; label: string; value: string }[] = [
          { icon: 'mass', label: t('rank.effect.mass'), value: `${Math.round(r.massBudgetFactor * 100)}%` },
          { icon: 'warning', label: t('rank.effect.events'), value: t(`rank.events.${EVENTS_WORD[id]}`) },
          { icon: 'satellite', label: t('rank.effect.help'), value: t(r.forecast === 'full' ? 'rank.help.full' : r.forecast === 'summary' ? 'rank.help.summary' : 'rank.help.none') },
        ]
        return (
          <button
            key={id}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(id)}
            className={`hud-frame group flex flex-col rounded-xl p-4 text-left transition ${selected ? 'ring-2 ring-hud shadow-[0_0_30px_-6px_rgba(90,209,255,0.6)]' : 'opacity-80 hover:opacity-100'}`}
          >
            <div className="flex items-start gap-3">
              <RankInsignia rank={id} size={52} className="shrink-0 transition group-hover:scale-105" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold tracking-[0.2em] text-hud uppercase">
                  {t('rank.label')} {i + 1}
                </p>
                <p className="font-display text-lg leading-tight font-bold">{t(`rank.${id}.name`)}</p>
              </div>
              {selected && <Icon name="check" className="ml-auto text-hud" size="1.4em" />}
            </div>
            <p className="mt-3 flex-1 text-sm text-ink-2">{t(`rank.${id}.tagline`)}</p>
            <dl className="mt-3 space-y-1 border-t border-hud-dim pt-3 text-xs">
              {effects.map((e) => (
                <div key={e.label} className="flex items-center justify-between gap-2">
                  <dt className="flex items-center gap-1.5 text-ink-3">
                    <Icon name={e.icon} /> {e.label}
                  </dt>
                  <dd className="font-semibold text-ink">{e.value}</dd>
                </div>
              ))}
            </dl>
          </button>
        )
      })}
    </div>
  )
}
