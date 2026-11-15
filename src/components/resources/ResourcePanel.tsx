/**
 * @file
 * @brief The base's supplies at a glance: one line each, how many days are left.
 *
 * Technical numbers (kilograms, daily balance, kWh flows, the science) are in
 * each line's "Details". Radiation shows up when it matters: during a storm,
 * or once the dose is high; otherwise it waits in the details at the bottom.
 */
import type { ReactNode } from 'react'
import { gameContent, stateBatteryCapacity, SUPPLY_STOCKS } from '../../game'
import { useI18n } from '../../i18n/useI18n'
import type { MissionState } from '../../types/game'
import { fmt, Meter, Panel, StatusTag, type Level } from '../ui/ui'
import { Icon, type IconName } from '../ui/Icon'
import { GlossaryText } from '../ui/Term'
import { STOCK_META, supplyStatus } from './stockMeta'

function Row({
  icon,
  color,
  label,
  level,
  levelWord,
  value,
  max,
  meterLabel,
  right,
  marker,
  children,
}: {
  icon: IconName
  color: string
  label: string
  level: Level
  levelWord?: string
  value: number
  max: number
  meterLabel: string
  right: string
  marker?: number
  children: ReactNode
}) {
  const { t } = useI18n()
  return (
    <li>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-semibold">
          <Icon name={icon} style={{ color }} /> {label}
        </span>
        <span className="flex items-center gap-2">
          {level !== 'good' && <StatusTag level={level} word={levelWord} />}
          <span className={`text-xs font-bold tabular-nums ${level === 'critical' ? 'text-critical' : level === 'warn' ? 'text-warn' : 'text-ink-2'}`}>{right}</span>
        </span>
      </div>
      <Meter value={value} max={max} color={color} label={meterLabel} marker={marker} />
      <details className="mt-0.5 text-xs text-ink-3">
        <summary className="cursor-pointer text-accent-2/80 hover:text-accent-2">{t('res.details')}</summary>
        <div className="mt-1 space-y-1">{children}</div>
      </details>
    </li>
  )
}

export function ResourcePanel({ mission }: { mission: MissionState }) {
  const { t } = useI18n()
  const env = gameContent.environment
  const report = mission.lastReport
  const capacity = stateBatteryCapacity(gameContent, mission)
  const energyFraction = mission.stocks.energy / Math.max(1, capacity)
  const powerLevel: Level = report?.habitatUnpowered || energyFraction < 0.1 ? 'critical' : energyFraction < 0.3 || (report?.shed.length ?? 0) > 0 ? 'warn' : 'good'
  const doseLevel: Level = mission.crewDoseMsv >= env.doseWarningMsv ? 'critical' : mission.crewDoseMsv >= 100 ? 'warn' : 'good'
  const storm = mission.modifiers.some((m) => m.kind === 'storm_dose' && m.remainingDays > 0)
  const doseRelevant = storm || doseLevel !== 'good'

  const dose = (
    <Row
      icon="radiation"
      color="var(--color-serious)"
      label={t('res.dose')}
      level={doseLevel}
      levelWord={doseLevel === 'warn' ? t('res.doseElevated') : t('res.doseDanger')}
      value={mission.crewDoseMsv}
      max={env.doseLimitMsv}
      marker={100}
      meterLabel={t('res.doseMeter')}
      right={`${fmt(mission.crewDoseMsv)} mSv`}
    >
      <p>
        <GlossaryText text={t('res.doseLine', { dose: fmt(mission.crewDoseMsv, 1), limit: env.doseLimitMsv })} />
        {report && <> · {t('res.doseToday', { dose: fmt(report.doseMsv, 1) })}</>}
      </p>
      <p>
        <GlossaryText text={t('res.doseWhy')} />
      </p>
    </Row>
  )

  return (
    <Panel title={t('res.title')} id="resources-title" icon="chart">
      <ul className="space-y-3 p-3">
        {SUPPLY_STOCKS.map((stock) => {
          const s = supplyStatus(mission, stock)
          const meta = STOCK_META[stock]
          const label = t(`stock.${stock}`)
          const days = Math.min(999, Math.floor(s.daysLeft))
          return (
            <Row
              key={stock}
              icon={meta.icon}
              color={meta.color}
              label={label}
              level={s.level}
              value={s.amount}
              max={s.capacity}
              meterLabel={t('res.stored', { stock: label })}
              right={Number.isFinite(s.daysLeft) ? t('fp.daysLeft', { count: days }) : t('fp.stable')}
            >
              <p>
                {t('res.amount', { amount: fmt(s.amount, 1), capacity: fmt(s.capacity) })} ·{' '}
                {s.net > 0.01 ? t('res.draining', { net: fmt(s.net, 1), count: days }) : t('res.stable', { net: fmt(-s.net, 1) })}
              </p>
              <p>
                <GlossaryText text={t(`stock.${stock}.why`)} />
              </p>
            </Row>
          )
        })}

        <Row
          icon="battery"
          color="var(--color-warn)"
          label={t('res.power')}
          level={powerLevel}
          levelWord={report?.habitatUnpowered ? t('res.emergency') : undefined}
          value={mission.stocks.energy}
          max={capacity}
          meterLabel={t('res.batteryMeter')}
          right={`${Math.round(energyFraction * 100)}%`}
        >
          <p>
            <GlossaryText text={t('res.energy', { energy: fmt(mission.stocks.energy), capacity: fmt(capacity) })} />
            {report && <> · {t('res.flow', { generated: fmt(report.generationKwh), used: fmt(report.servedKwh) })}</>}
          </p>
          <p>
            <GlossaryText text={t('res.powerWhy')} />
          </p>
        </Row>

        {doseRelevant ? (
          dose
        ) : (
          <li>
            <details className="text-xs text-ink-3">
              <summary className="cursor-pointer text-accent-2/80 hover:text-accent-2">
                <Icon name="radiation" className="text-serious" /> {t('res.dose')} · {fmt(mission.crewDoseMsv)} mSv
              </summary>
              <ul className="mt-2">{dose}</ul>
            </details>
          </li>
        )}
      </ul>
    </Panel>
  )
}
