/**
 * @file
 * @brief The mission's science goal: samples collected on spacewalks, and the button to go out.
 */
import { useApp } from '../../app/state/AppContext'
import { evaStatus, gameContent } from '../../game'
import { useI18n } from '../../i18n/useI18n'
import type { MissionState } from '../../types/game'
import { Icon } from '../ui/Icon'
import { Button, Meter, Panel } from '../ui/ui'

export function ScienceObjective({
  mission,
  onEva,
  busy = false,
  bare = false,
}: {
  mission: MissionState
  /** Runs the spacewalk (first person plays the hands first); defaults to doing it at once. */
  onEva?: () => void
  busy?: boolean
  /** Without the panel frame (inside another panel). */
  bare?: boolean
}) {
  const { dispatch } = useApp()
  const { t, m, n } = useI18n()
  const eva = evaStatus(gameContent, mission)
  if (eva.goal === 0) return null
  const done = eva.samples >= eva.goal
  const body = (
    <div className={bare ? 'text-sm' : 'p-3 text-sm'}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold">
          <Icon name="flag" className="text-accent-2" /> {t('science.samples', { count: eva.samples, goal: eva.goal })}
        </span>
        {done && <span className="text-xs font-bold text-good-ink">{t('science.evaDone')}</span>}
      </div>
      <Meter value={eva.samples} max={eva.goal} color="var(--color-accent-2)" label={t('science.goal')} />
      {!done && (
        <>
          <Button className="mt-2 min-h-11 w-full" disabled={!eva.possible || busy} onClick={() => (onEva ? onEva() : dispatch({ type: 'goOnEva' }))}>
            <Icon name="astronaut" /> {t('science.eva')}
          </Button>
          <p className="mt-1 text-xs text-ink-3">{eva.possible ? t('science.evaCost', { dose: n(gameContent.environment.evaDoseMsv, 1) }) : eva.reason && m(eva.reason)}</p>
        </>
      )}
    </div>
  )
  if (bare) return body
  return (
    <Panel title={t('science.goal')} id="science-goal" icon="science">
      {body}
    </Panel>
  )
}
