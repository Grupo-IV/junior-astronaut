/**
 * @file
 * @brief The console of a habitat station, opened by tapping it in first person.
 *
 * Same actions and rules as the Systems panel (switch on/off, repair with a
 * spare kit or by improvising), but carried out by the astronaut's hands: the
 * order reaches the mission when the hand presses the control.
 */
import { useState } from 'react'
import { canRepair, gameContent, getMission, shelterProtection, shelterStatus, stateBatteryCapacity } from '../../game'
import { hasTag, leakState, STATION_BUILDINGS } from '../../immersive/staging'
import type { StationId } from '../../immersive/types'
import { useI18n } from '../../i18n/useI18n'
import type { MissionState } from '../../types/game'
import { buildingStatus } from '../hud/SystemsPanel'
import { STOCK_META } from '../resources/stockMeta'
import { ScienceObjective } from '../science/ScienceObjective'
import { Icon } from '../ui/Icon'
import { GlossaryText } from '../ui/Term'
import { Button, Meter, StatusTag } from '../ui/ui'

export type StationAction =
  | { kind: 'toggle'; uid: string }
  | { kind: 'repair'; uid: string; withSpare: boolean }
  | { kind: 'inspect'; uid: string }
  /** Through the airlock to the shelter (taking the crew there if a storm is on). */
  | { kind: 'toShelter' }
  /** Back to the habitat (taking the crew out of the shelter if they are in it). */
  | { kind: 'toHabitat' }
  /** Out through the airlock to collect a sample (science goal). */
  | { kind: 'eva' }

export function StationPanel({
  mission,
  station,
  busy,
  onAct,
  onClose,
}: {
  mission: MissionState
  station: StationId
  busy: boolean
  onAct: (action: StationAction) => void
  onClose: () => void
}) {
  const { t, m, n, content } = useI18n()
  const [inspected, setInspected] = useState<string | null>(null)
  const canAct = mission.status === 'running' && !busy
  const buildings = mission.buildings.filter((b) => STATION_BUILDINGS[station].includes(b.defId))
  const missionDef = getMission(gameContent, mission.missionId)
  const leak = leakState(mission)
  const sealed = hasTag(mission, 'bay_sealed')
  const capacity = stateBatteryCapacity(gameContent, mission)
  const hasShelter = mission.buildings.some((b) => b.defId === 'radiation_shelter')
  const shelter = shelterStatus(gameContent, mission)
  const percent = Math.round(shelterProtection(gameContent) * 100)
  const outsideRate = mission.modifiers.filter((m) => m.kind === 'storm_dose' && m.remainingDays > 0).reduce((acc, m) => acc + m.value, 0)
  const storm = outsideRate > 0

  return (
    <section
      role="dialog"
      aria-labelledby="station-title"
      className="cine-panel animate-rise pointer-events-auto max-h-[60vh] w-full overflow-y-auto rounded-2xl p-4 sm:max-h-[70vh] sm:w-96"
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-[0.25em] text-hud uppercase">{t('fp.station')}</p>
          <h2 id="station-title" className="font-display text-lg leading-tight font-bold">
            {t(`station.${station}`)}
          </h2>
          <p className="mt-0.5 text-xs text-ink-3">{t(`station.${station}.about`)}</p>
        </div>
        <Button variant="ghost" className="min-h-11 min-w-11 px-2" onClick={onClose} aria-label={t('panel.close')}>
          <Icon name="close" />
        </Button>
      </header>

      {station === 'lifeSupport' && (
        <ul className="mt-3 space-y-1 text-sm">
          <li className={sealed ? 'text-critical' : 'text-ink-2'}>
            <Icon name="valve" className="mr-1.5" />
            {sealed ? t('panel.bay.sealed') : t('panel.bay.open')}
          </li>
          {leak !== 'none' && (
            <li className="font-semibold text-critical">
              <Icon name="airLeak" className="mr-1.5" />
              {leak === 'active' ? t('panel.leak.active') : t('panel.leak.slow')}
            </li>
          )}
          <li className="text-ink-2">
            <Icon name="toolbox" className="mr-1.5" />
            {t('panel.spares', { count: mission.spareParts })}
          </li>
        </ul>
      )}

      {station === 'storage' && (
        <ul className="mt-3 space-y-2 text-sm">
          {(['oxygen', 'water', 'food'] as const).map((stock) => (
            <li key={stock}>
              <div className="flex justify-between">
                <span>
                  <Icon name={STOCK_META[stock].icon} style={{ color: STOCK_META[stock].color }} /> {t(`stock.${stock}`)}
                </span>
                <span className="text-xs text-ink-3">{t('res.amount', { amount: n(mission.stocks[stock], 1), capacity: n(missionDef.storageCapacity[stock]) })}</span>
              </div>
              <Meter value={mission.stocks[stock]} max={missionDef.storageCapacity[stock]} color={STOCK_META[stock].color} label={t('res.stored', { stock: t(`stock.${stock}`) })} />
            </li>
          ))}
          <li className="text-ink-2">
            <Icon name="toolbox" className="mr-1.5" />
            {t('panel.spares', { count: mission.spareParts })}
          </li>
        </ul>
      )}

      {station === 'power' && (
        <div className="mt-3 text-sm">
          <div className="flex justify-between">
            <span>
              <Icon name="battery" className="text-warn" /> {t('res.power')}
            </span>
            <span className="text-xs text-ink-3">{t('res.energy', { energy: n(mission.stocks.energy), capacity: n(capacity) })}</span>
          </div>
          <Meter value={mission.stocks.energy} max={capacity} color="var(--color-warn)" label={t('res.batteryMeter')} />
          {mission.lastReport && (
            <p className="mt-1 text-xs text-ink-3">
              <Icon name="sun" className="text-warn" /> {t('res.flow', { generated: n(mission.lastReport.generationKwh), used: n(mission.lastReport.servedKwh) })}
            </p>
          )}
        </div>
      )}

      {station === 'command' && (
        <div className="mt-3 space-y-1.5 text-sm">
          <p className="text-ink-2">
            <Icon name="calendar" className="mr-1.5 text-hud" />
            {t('panel.missionDay', { day: mission.day, days: missionDef.durationDays })}
          </p>
          <Meter value={mission.crewDoseMsv} max={gameContent.environment.doseLimitMsv} color="var(--color-serious)" marker={100} label={t('res.doseMeter')} />
          <p className="text-xs text-ink-3">
            <GlossaryText text={t('res.doseLine', { dose: n(mission.crewDoseMsv, 1), limit: gameContent.environment.doseLimitMsv })} />
          </p>
          <div className="mt-2 rounded-xl bg-white/[0.03] p-2.5">
            <ScienceObjective mission={mission} bare busy={busy} onEva={() => onAct({ kind: 'eva' })} />
          </div>
          {hasShelter ? (
            <div className={`mt-2 rounded-xl p-2.5 ${storm && !shelter.inside ? 'bg-critical/10' : 'bg-white/[0.03]'}`}>
              {storm && !shelter.inside && <p className="mb-1.5 text-xs font-semibold text-critical">{t('panel.shelter.exposed')}</p>}
              {shelter.inside && <p className="mb-1.5 text-xs font-semibold text-good-ink">{t('alert.sheltered', { percent })}</p>}
              <Button variant={shelter.canEnter ? 'primary' : 'secondary'} className="min-h-11" disabled={busy} onClick={() => onAct({ kind: 'toShelter' })}>
                <Icon name="shield" /> {shelter.canEnter ? t('panel.shelter.take') : t('panel.shelter.go')}
              </Button>
              {shelter.canEnter && <p className="mt-1 text-xs text-ink-3">{t('panel.shelter.walls', { percent })}</p>}
            </div>
          ) : (
            <p className="text-xs text-ink-3">{t('panel.shelter.none')}</p>
          )}
        </div>
      )}

      {station === 'shelter' && (
        <div className="mt-3 space-y-2 text-sm">
          <p className={`font-semibold ${shelter.inside ? 'text-good-ink' : storm ? 'text-critical' : 'text-ink-2'}`}>
            <Icon name={shelter.inside ? 'shield' : storm ? 'radiation' : 'check'} className="mr-1.5" />
            {shelter.inside ? t('panel.shelter.protected') : storm ? t('panel.shelter.exposed') : t('panel.shelter.calm')}
          </p>
          {storm && (
            <dl className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-critical/10 p-2">
                <dt className="text-ink-3">{t('panel.shelter.outside')}</dt>
                <dd className="font-display text-base font-bold text-critical">{t('panel.shelter.rate', { rate: n(outsideRate, 0) })}</dd>
              </div>
              <div className="rounded-lg bg-good/10 p-2">
                <dt className="text-ink-3">{t('panel.shelter.inside')}</dt>
                <dd className="font-display text-base font-bold text-good-ink">{t('panel.shelter.rate', { rate: n(outsideRate * (1 - percent / 100), 1) })}</dd>
              </div>
            </dl>
          )}
          <p className="text-xs text-ink-3">{t('panel.shelter.walls', { percent })}</p>
          <div className="flex flex-wrap gap-2">
            {shelter.canEnter && (
              <Button variant="primary" className="min-h-11" disabled={busy} onClick={() => onAct({ kind: 'toShelter' })}>
                <Icon name="shield" /> {t('panel.shelter.take')}
              </Button>
            )}
            <Button
              variant={shelter.inside && storm ? 'danger' : 'secondary'}
              className="min-h-11"
              disabled={busy || (!shelter.canLeave && !!shelter.reason && hasTag(mission, 'crew_sheltered'))}
              onClick={() => onAct({ kind: 'toHabitat' })}
            >
              <Icon name="habitat" /> {shelter.inside ? t('panel.shelter.leave') : t('panel.shelter.back')}
            </Button>
          </div>
          {shelter.inside && storm && <p className="text-xs text-warn">{t('panel.shelter.leaveWarn')}</p>}
          {!shelter.inside && shelter.reason && hasTag(mission, 'crew_sheltered') && <p className="text-xs text-ink-3">{m(shelter.reason)}</p>}
        </div>
      )}

      {STATION_BUILDINGS[station].length > 0 && (
        <ul className="mt-3 space-y-2 border-t border-line pt-3">
          {buildings.length === 0 && <li className="text-xs text-ink-3">{t('panel.none')}</li>}
          {buildings.map((b) => {
            const def = content.buildings[b.defId]
            const status = buildingStatus(t, mission, b)
            const repair = canRepair(mission, b.uid)
            const kwh = def.powerDemandKwhPerDay
            const several = mission.buildings.filter((x) => x.defId === b.defId).length > 1
            return (
              <li key={b.uid} className="rounded-xl bg-white/[0.03] p-2.5">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-semibold">
                    <Icon name={def.icon} className="text-hud" /> {def.name}
                    {several ? ` #${b.uid.split('-').at(-1)}` : ''}
                  </span>
                  <StatusTag level={status.level} word={status.word} />
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {kwh > 0 && (
                    <Button className="min-h-11" disabled={!canAct} onClick={() => onAct({ kind: 'toggle', uid: b.uid })}>
                      {b.enabled ? t('sys.switchOff', { kwh }) : t('sys.switchOn', { kwh })}
                    </Button>
                  )}
                  {b.status === 'failed' && (
                    <Button
                      variant="primary"
                      className="min-h-11"
                      disabled={!canAct || !repair.possible}
                      onClick={() => onAct({ kind: 'repair', uid: b.uid, withSpare: repair.withSpare })}
                    >
                      <Icon name={repair.withSpare ? 'toolbox' : 'wrench'} /> {repair.withSpare ? t('sys.repairSpare') : t('sys.repairImprovised')}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    className="min-h-11"
                    disabled={busy}
                    aria-expanded={inspected === b.uid}
                    onClick={() => {
                      setInspected(inspected === b.uid ? null : b.uid)
                      if (inspected !== b.uid) onAct({ kind: 'inspect', uid: b.uid })
                    }}
                  >
                    <Icon name="eye" /> {t('panel.inspect')}
                  </Button>
                </div>
                {repair.reason && <p className="mt-1 text-xs text-ink-3">{m(repair.reason)}</p>}
                {b.defId === 'greenhouse' && b.enabled && b.growth > 0 && (
                  <p className="mt-1 flex gap-1.5 text-xs text-warn">
                    <Icon name="warning" /> {t('sys.greenhouseWarning')}
                  </p>
                )}
                {inspected === b.uid && (
                  <div className="mt-2 text-xs text-ink-2">
                    <p>
                      <GlossaryText text={def.summary} />
                    </p>
                    <p className="mt-1 text-good-ink">
                      + <GlossaryText text={def.benefit} />
                    </p>
                    <p className="text-serious">
                      − <GlossaryText text={def.tradeoff} />
                    </p>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
