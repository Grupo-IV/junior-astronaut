import { crewNeeds, gameContent, getMission, stateBatteryCapacity, SUPPLY_STOCKS, type SupplyStock } from '../../game'
import type { MissionState } from '../../types/game'
import { fmt, Meter, Panel, StatusTag, type Level } from '../ui/ui'
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
  const env = gameContent.environment
  const report = mission.lastReport
  const capacity = stateBatteryCapacity(gameContent, mission)
  const energyFraction = mission.stocks.energy / Math.max(1, capacity)
  const powerLevel: Level = report?.habitatUnpowered || energyFraction < 0.1 ? 'critical' : energyFraction < 0.3 || (report?.shed.length ?? 0) > 0 ? 'warn' : 'good'
  const doseLevel: Level = mission.crewDoseMsv >= env.doseWarningMsv ? 'critical' : mission.crewDoseMsv >= 100 ? 'warn' : 'good'

  return (
    <Panel title="Resources" id="resources-title">
      <ul className="space-y-3 p-3">
        {SUPPLY_STOCKS.map((stock) => {
          const s = supplyStatus(mission, stock)
          const meta = STOCK_META[stock]
          return (
            <li key={stock}>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-semibold">
                  <span aria-hidden>{meta.icon}</span> {meta.label}
                </span>
                <StatusTag level={s.level} />
              </div>
              <Meter value={s.amount} max={s.capacity} color={meta.color} label={`${meta.label} stored`} />
              <div className="mt-0.5 flex justify-between text-xs text-ink-3">
                <span>
                  {fmt(s.amount, 1)} / {fmt(s.capacity)} kg
                </span>
                <span>
                  {s.net > 0.01 ? `−${fmt(s.net, 1)}/day · ${fmt(Math.min(s.daysLeft, 999))} days left` : `+${fmt(-s.net, 1)}/day · stable`}
                </span>
              </div>
              <Why text={meta.why} />
            </li>
          )
        })}

        <li>
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="font-semibold">
              <span aria-hidden>🔋</span> Power
            </span>
            <StatusTag level={powerLevel} word={report?.habitatUnpowered ? 'EMERGENCY' : undefined} />
          </div>
          <Meter value={mission.stocks.energy} max={capacity} color="var(--color-warn)" label="Battery charge" />
          <div className="mt-0.5 flex justify-between text-xs text-ink-3">
            <span>
              {fmt(mission.stocks.energy)} / {fmt(capacity)} kWh
            </span>
            {report && (
              <span>
                ☀ {fmt(report.generationKwh)} in · {fmt(report.servedKwh)} used
              </span>
            )}
          </div>
          <Why text="Solar arrays charge the batteries in sunlight. In shadow the base lives on stored energy. When it runs out, systems are switched off — greenhouse first, habitat last." />
        </li>

        <li>
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="font-semibold">
              <span aria-hidden>☢️</span> Radiation dose
            </span>
            <StatusTag level={doseLevel} word={doseLevel === 'good' ? 'SAFE' : doseLevel === 'warn' ? 'ELEVATED' : 'DANGER'} />
          </div>
          <Meter value={mission.crewDoseMsv} max={env.doseLimitMsv} color="var(--color-serious)" marker={100} label="Crew radiation dose" />
          <div className="mt-0.5 flex justify-between text-xs text-ink-3">
            <span>
              {fmt(mission.crewDoseMsv, 1)} / {env.doseLimitMsv} mSv limit
            </span>
            {report && <span>+{fmt(report.doseMsv, 1)} today</span>}
          </div>
          <Why text="Cosmic rays give about 1.4 mSv per day on the Moon's surface. A solar storm can add dozens per day. NASA's short-term limit is 250 mSv; the white mark is the 100 mSv 'radiation safe' goal." />
        </li>
      </ul>
    </Panel>
  )
}

function Why({ text }: { text: string }) {
  return (
    <details className="text-xs text-ink-3">
      <summary className="cursor-pointer text-accent-2/80 hover:text-accent-2">Why?</summary>
      <p className="mt-1">{text}</p>
    </details>
  )
}
