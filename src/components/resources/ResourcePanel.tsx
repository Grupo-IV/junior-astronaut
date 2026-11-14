import { crewNeeds, gameContent, getMission, stateBatteryCapacity, SUPPLY_STOCKS, type SupplyStock } from '../../game'
import { useI18n } from '../../i18n/useI18n'
import type { MissionState } from '../../types/game'
import { fmt, Meter, Panel, StatusTag, type Level } from '../ui/ui'
import { Icon } from '../ui/Icon'
import { GlossaryText } from '../ui/Term'
import { STOCK_META } from './stockMeta'

function supplyStatus(mission: MissionState, stock: SupplyStock) {
  const def = getMission(gameContent, mission.missionId)
  const report = mission.lastReport
  const net = report
    ? report.flows[stock].consumed - report.flows[stock].produced
    : crewNeeds(gameContent, def)[stock]
  const amount = mission.stocks[stock]
  const daysLeft = net > 0.01 ? amount / net : Infinity
  const level: Level = daysLeft < 2 ? 'critical' : daysLeft < 4 ? 'warn' : 'good'
  return { amount, capacity: def.storageCapacity[stock], net, daysLeft, level }
}

export function ResourcePanel({ mission }: { mission: MissionState }) {
  const { t } = useI18n()
  const env = gameContent.environment
  const report = mission.lastReport
  const capacity = stateBatteryCapacity(gameContent, mission)
  const energyFraction = mission.stocks.energy / Math.max(1, capacity)
  const powerLevel: Level = report?.habitatUnpowered || energyFraction < 0.1 ? 'critical' : energyFraction < 0.3 || (report?.shed.length ?? 0) > 0 ? 'warn' : 'good'
  const doseLevel: Level = mission.crewDoseMsv >= env.doseWarningMsv ? 'critical' : mission.crewDoseMsv >= 100 ? 'warn' : 'good'

  return (
    <Panel title={t('res.title')} id="resources-title" icon="chart">
      <ul className="space-y-3 p-3">
        {SUPPLY_STOCKS.map((stock) => {
          const s = supplyStatus(mission, stock)
          const meta = STOCK_META[stock]
          const label = t(`stock.${stock}`)
          const daysLeft = Math.min(s.daysLeft, 999)
          return (
            <li key={stock}>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-semibold">
                  <Icon name={meta.icon} style={{ color: meta.color }} /> {label}
                </span>
                <StatusTag level={s.level} />
              </div>
              <Meter value={s.amount} max={s.capacity} color={meta.color} label={t('res.stored', { stock: label })} />
              <div className="mt-0.5 flex justify-between gap-2 text-xs text-ink-3">
                <span>{t('res.amount', { amount: fmt(s.amount, 1), capacity: fmt(s.capacity) })}</span>
                <span>
                  {s.net > 0.01
                    ? t('res.draining', { net: fmt(s.net, 1), count: Math.floor(daysLeft) })
                    : t('res.stable', { net: fmt(-s.net, 1) })}
                </span>
              </div>
              <Why text={t(`stock.${stock}.why`)} />
            </li>
          )
        })}

        <li>
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="font-semibold">
              <Icon name="battery" className="text-warn" /> {t('res.power')}
            </span>
            <StatusTag level={powerLevel} word={report?.habitatUnpowered ? t('res.emergency') : undefined} />
          </div>
          <Meter value={mission.stocks.energy} max={capacity} color="var(--color-warn)" label={t('res.batteryMeter')} />
          <div className="mt-0.5 flex justify-between gap-2 text-xs text-ink-3">
            <span>
              <GlossaryText text={t('res.energy', { energy: fmt(mission.stocks.energy), capacity: fmt(capacity) })} />
            </span>
            {report && (
              <span className="flex items-center gap-1">
                <Icon name="sun" className="text-warn" /> {t('res.flow', { generated: fmt(report.generationKwh), used: fmt(report.servedKwh) })}
              </span>
            )}
          </div>
          <Why text={t('res.powerWhy')} />
        </li>

        <li>
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="font-semibold">
              <Icon name="radiation" className="text-serious" /> {t('res.dose')}
            </span>
            <StatusTag level={doseLevel} word={doseLevel === 'good' ? t('res.doseSafe') : doseLevel === 'warn' ? t('res.doseElevated') : t('res.doseDanger')} />
          </div>
          <Meter value={mission.crewDoseMsv} max={env.doseLimitMsv} color="var(--color-serious)" marker={100} label={t('res.doseMeter')} />
          <div className="mt-0.5 flex justify-between gap-2 text-xs text-ink-3">
            <span>
              <GlossaryText text={t('res.doseLine', { dose: fmt(mission.crewDoseMsv, 1), limit: env.doseLimitMsv })} />
            </span>
            {report && <span>{t('res.doseToday', { dose: fmt(report.doseMsv, 1) })}</span>}
          </div>
          <Why text={t('res.doseWhy')} />
        </li>
      </ul>
    </Panel>
  )
}

function Why({ text }: { text: string }) {
  const { t } = useI18n()
  return (
    <details className="text-xs text-ink-3">
      <summary className="cursor-pointer text-accent-2/80 hover:text-accent-2">{t('why')}</summary>
      <p className="mt-1">
        <GlossaryText text={text} />
      </p>
    </details>
  )
}
