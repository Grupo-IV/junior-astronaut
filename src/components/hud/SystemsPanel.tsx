/**
 * @file
 * @brief Displays infrastructure status and maintenance actions.
 */
import { useApp } from '../../app/state/AppContext'
import { canRepair, gameContent, isGreenhouseProductive, wantsToRun } from '../../game'
import type { I18n } from '../../i18n/useI18n'
import { useI18n } from '../../i18n/useI18n'
import type { BuildingInstance, MissionState } from '../../types/game'
import { Button, Panel, SourceLink, StatusTag, type Level } from '../ui/ui'
import { Icon } from '../ui/Icon'
import { GlossaryText } from '../ui/Term'

function statusOf(t: I18n['t'], mission: MissionState, b: BuildingInstance): { level: Level; word: string } {
  const def = gameContent.buildings[b.defId]
  if (b.status === 'failed') return { level: 'critical', word: t('sys.broken') }
  if (!b.enabled) return { level: 'neutral', word: t('sys.off') }
  if (!wantsToRun(mission, b)) return { level: 'warn', word: t('sys.safeMode') }
  if (def.powerDemandKwhPerDay > 0 && !b.powered && mission.day > 0) return { level: 'warn', word: t('sys.noPower') }
  if (b.defId === 'greenhouse' && !isGreenhouseProductive(gameContent, b)) {
    return { level: 'good', word: t('sys.growing', { growth: b.growth, days: def.growthDays ?? 0 }) }
  }
  return { level: 'good', word: def.powerDemandKwhPerDay > 0 ? t('sys.running') : t('status.ok') }
}

export function SystemsPanel({ mission, selectedUid, onSelect }: { mission: MissionState; selectedUid: string | null; onSelect: (uid: string | null) => void }) {
  const { dispatch } = useApp()
  const { t, m, content } = useI18n()
  const selected = mission.buildings.find((b) => b.uid === selectedUid)
  const canAct = mission.status === 'running'
  const unpowered = mission.lastReport?.habitatUnpowered

  return (
    <Panel title={t('sys.title', { count: mission.spareParts })} id="systems-title" icon="toolbox">
      <div className="p-2">
        <div className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm">
          <span>
            <Icon name="habitat" className="text-hud" /> {t('sys.habitat')}{' '}
            <span className="text-xs text-ink-3">
              <GlossaryText text={t('sys.perDay', { kwh: gameContent.environment.habitat.powerDemandKwhPerDay })} />
            </span>
          </span>
          <StatusTag level={unpowered ? 'critical' : 'good'} word={unpowered ? t('sys.noPower') : t('sys.online')} />
        </div>
        {mission.buildings.length === 0 && <p className="px-2 py-2 text-xs text-ink-3">{t('sys.none')}</p>}
        <ul>
          {mission.buildings.map((b) => {
            const def = content.buildings[b.defId]
            const st = statusOf(t, mission, b)
            const isSel = b.uid === selectedUid
            return (
              <li key={b.uid}>
                <button
                  type="button"
                  aria-pressed={isSel}
                  onClick={() => onSelect(isSel ? null : b.uid)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-panel-2 ${isSel ? 'bg-panel-2 ring-1 ring-accent-2' : ''}`}
                >
                  <span>
                    <Icon name={def.icon} className="text-hud" /> {def.name}
                    {mission.buildings.filter((x) => x.defId === b.defId).length > 1 ? ` #${b.uid.split('-').at(-1)}` : ''}
                  </span>
                  <StatusTag level={st.level} word={st.word} />
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {selected && (
        <div className="border-t border-line p-3 text-sm">
          {(() => {
            const def = content.buildings[selected.defId]
            const repair = canRepair(mission, selected.uid)
            const kwh = def.powerDemandKwhPerDay
            return (
              <>
                <p className="font-display text-base font-bold">
                  <Icon name={def.icon} className="text-hud" /> {def.name}
                </p>
                <p className="mt-1 text-ink-2">
                  <GlossaryText text={def.summary} />
                </p>
                <p className="mt-1 text-xs">
                  <span className="text-good-ink">
                    + <GlossaryText text={def.benefit} />
                  </span>
                  <br />
                  <span className="text-serious">
                    − <GlossaryText text={def.tradeoff} />
                  </span>
                </p>
                <p className="mt-2 text-xs text-ink-3">
                  <GlossaryText text={def.science.text} /> <SourceLink sourceKey={def.science.source} sources={content.science.sources} />
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {kwh > 0 && (
                    <Button disabled={!canAct} onClick={() => dispatch({ type: 'toggleBuilding', uid: selected.uid })}>
                      <Icon name="power" /> {selected.enabled ? t('sys.switchOff', { kwh }) : t('sys.switchOn', { kwh })}
                    </Button>
                  )}
                  {selected.status === 'failed' && (
                    <Button variant="primary" disabled={!canAct || !repair.possible} onClick={() => dispatch({ type: 'repairBuilding', uid: selected.uid })}>
                      <Icon name={repair.withSpare ? 'toolbox' : 'wrench'} /> {repair.withSpare ? t('sys.repairSpare') : t('sys.repairImprovised')}
                    </Button>
                  )}
                </div>
                {selected.defId === 'greenhouse' && selected.enabled && selected.growth > 0 && (
                  <p className="mt-2 flex gap-1.5 text-xs text-warn">
                    <Icon name="warning" /> {t('sys.greenhouseWarning')}
                  </p>
                )}
                {repair.reason && <p className="mt-2 text-xs text-ink-3">{m(repair.reason)}</p>}
              </>
            )
          })()}
        </div>
      )}
    </Panel>
  )
}
