/**
 * @file
 * @brief Helmet display for the first-person view.
 *
 * Only the essentials stay in sight: mission day, the four supplies (days
 * left), and radiation when it matters. Everything else appears as an alert
 * when it needs attention, or lives in the console panels and the log.
 */
import { useEffect, useState, type ReactNode } from 'react'
import { gameContent, getMission, stateBatteryCapacity, SUPPLY_STOCKS } from '../../game'
import { STATION_ORDER, type StationId } from '../../immersive/types'
import { useI18n } from '../../i18n/useI18n'
import type { MissionState } from '../../types/game'
import { RankInsignia } from '../art/RankInsignia'
import { AlertsBar } from '../hud/AlertsBar'
import { STOCK_META, supplyStatus } from '../resources/stockMeta'
import { Icon, type IconName } from '../ui/Icon'
import { SoundToggle } from '../ui/SoundToggle'
import type { Level } from '../ui/ui'
import { Joystick } from './Joystick'

const LEVEL_TEXT: Record<Level, string> = { good: 'text-ink', warn: 'text-warn', critical: 'text-critical', neutral: 'text-ink-3' }
const LEVEL_FILL: Record<Level, string> = { good: '', warn: 'var(--color-warn)', critical: 'var(--color-critical)', neutral: '' }

function Gauge({ icon, color, fraction, level, value, label }: { icon: IconName; color: string; fraction: number; level: Level; value: string; label: string }) {
  return (
    <li className="hud-chip min-w-0 flex-col items-stretch gap-1 !px-2 !py-1" aria-label={label}>
      <span className="flex items-center gap-1 text-xs leading-none font-semibold">
        <Icon name={icon} style={{ color }} />
        <span className={`tabular-nums ${LEVEL_TEXT[level]}`}>{value}</span>
      </span>
      <span className="block h-1 w-full overflow-hidden rounded-full bg-white/10" aria-hidden>
        <span className="block h-full rounded-full" style={{ width: `${Math.max(2, Math.min(100, fraction * 100))}%`, background: LEVEL_FILL[level] || color }} />
      </span>
    </li>
  )
}

export interface TimeControls {
  playing: boolean
  blocked: boolean
  finished: boolean
  speedLabel: string
  togglePlay: () => void
  nextDay: () => void
  cycleSpeed: () => void
}

export function ImmersiveHud({
  mission,
  station,
  time,
  onStation,
  onUse,
  onOpenLog,
  onMenu,
  onMove,
  viewToggle,
}: {
  mission: MissionState
  station: StationId
  time: TimeControls
  onStation: (id: StationId) => void
  onUse: () => void
  onOpenLog: () => void
  onMenu: () => void
  onMove: (forward: number, strafe: number) => void
  viewToggle: ReactNode
}) {
  const { t, n } = useI18n()
  const def = getMission(gameContent, mission.missionId)
  const inHabitat = station !== 'shelter'
  const index = inHabitat ? STATION_ORDER.indexOf(station) : 0
  const prev = STATION_ORDER[(index - 1 + STATION_ORDER.length) % STATION_ORDER.length]
  const next = STATION_ORDER[(index + 1) % STATION_ORDER.length]
  const capacity = stateBatteryCapacity(gameContent, mission)
  const energy = mission.stocks.energy / Math.max(1, capacity)
  const powerLevel: Level = mission.lastReport?.habitatUnpowered || energy < 0.1 ? 'critical' : energy < 0.3 ? 'warn' : 'good'
  const env = gameContent.environment
  const storm = mission.modifiers.some((m) => m.kind === 'storm_dose' && m.remainingDays > 0)
  const doseLevel: Level = mission.crewDoseMsv >= env.doseWarningMsv ? 'critical' : mission.crewDoseMsv >= 100 ? 'warn' : 'good'
  // How to play: shown for a few seconds after stepping in, then out of the way.
  const [hint, setHint] = useState(true)
  useEffect(() => {
    const id = window.setTimeout(() => setHint(false), 9000)
    return () => window.clearTimeout(id)
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:p-3" role="region" aria-label={t('fp.hudAria')}>
      <div className="flex items-start justify-between gap-2">
        {/* Mission day and supplies. */}
        <div className="pointer-events-auto flex max-w-[min(100%,24rem)] min-w-0 flex-col gap-1.5">
          <div className="hud-chip w-fit gap-2 !py-1">
            <span title={t(`rank.${mission.rank}.name`)}>
              <RankInsignia rank={mission.rank} size={16} />
            </span>
            <span className="font-display text-xs font-bold tabular-nums">{t('fp.day', { day: mission.day, days: def.durationDays })}</span>
            <span className="h-1 w-16 overflow-hidden rounded-full bg-white/10" aria-hidden>
              <span className="block h-full bg-gradient-to-r from-hud to-accent" style={{ width: `${(mission.day / def.durationDays) * 100}%` }} />
            </span>
          </div>
          <ul className={`grid gap-1 ${storm || doseLevel !== 'good' ? 'grid-cols-5' : 'grid-cols-4'}`}>
            {SUPPLY_STOCKS.map((stock) => {
              const s = supplyStatus(mission, stock)
              const days = Math.min(999, Math.floor(s.daysLeft))
              const value = Number.isFinite(s.daysLeft) ? t('fp.daysLeft', { count: days }) : t('fp.stable')
              return (
                <Gauge
                  key={stock}
                  icon={STOCK_META[stock].icon}
                  color={STOCK_META[stock].color}
                  fraction={s.amount / s.capacity}
                  level={s.level}
                  value={value}
                  label={t('fp.suppliesAria', { stock: t(`stock.${stock}`), amount: n(s.amount, 1), status: value })}
                />
              )
            })}
            <Gauge
              icon="battery"
              color="var(--color-warn)"
              fraction={energy}
              level={powerLevel}
              value={`${Math.round(energy * 100)}%`}
              label={t('fp.powerAria', { energy: n(mission.stocks.energy), capacity: n(capacity) })}
            />
            {(storm || doseLevel !== 'good') && (
              <Gauge
                icon="radiation"
                color="var(--color-serious)"
                fraction={mission.crewDoseMsv / env.doseLimitMsv}
                level={doseLevel}
                value={n(mission.crewDoseMsv)}
                label={t('fp.doseAria', { dose: n(mission.crewDoseMsv, 1), limit: env.doseLimitMsv })}
              />
            )}
          </ul>
        </div>

        <div className="pointer-events-auto flex items-center justify-end gap-1.5">
          {viewToggle}
          <span className="hidden sm:inline-flex">
            <SoundToggle compact />
          </span>
          <button type="button" className="hud-button" onClick={onMenu} aria-label={t('fp.menuAria')}>
            <Icon name="close" />
          </button>
        </div>
      </div>

      {/* Alerts: only when something needs attention. */}
      <div className="pointer-events-auto absolute top-[calc(max(0.5rem,env(safe-area-inset-top))+5.2rem)] left-2 max-w-[calc(100%-1rem)] sm:top-[max(0.75rem,env(safe-area-inset-top))] sm:left-1/2 sm:max-w-xl sm:-translate-x-1/2">
        <AlertsBar mission={mission} max={2} className="sm:justify-center" />
      </div>

      {/* Change station: large touch targets at mid height, clear of the hands. */}
      {inHabitat && (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-between px-1 sm:px-3">
          <button type="button" className="hud-nav pointer-events-auto" onClick={() => onStation(prev)} aria-label={t('fp.prevStation', { station: t(`station.${prev}`) })}>
            <Icon name="chevronLeft" size="1.6em" />
          </button>
          <button type="button" className="hud-nav pointer-events-auto" onClick={() => onStation(next)} aria-label={t('fp.nextStation', { station: t(`station.${next}`) })}>
            <Icon name="chevronRight" size="1.6em" />
          </button>
        </div>
      )}

      {/* Walking stick on touch screens. */}
      <div className="pointer-events-auto absolute bottom-[calc(max(0.5rem,env(safe-area-inset-bottom))+8.5rem)] left-3 hidden pointer-coarse:block">
        <Joystick onMove={onMove} />
      </div>

      <div className="flex flex-col items-center gap-2 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5">
          <button type="button" className="hud-button" onClick={onOpenLog} aria-label={t('fp.logAria')}>
            <Icon name="satellite" /> <span className="hidden sm:inline">{t('fp.log')}</span>
          </button>
          <button type="button" className="hud-button hud-button-strong" onClick={onUse} aria-label={t('fp.useAria', { station: t(`station.${station}`) })}>
            <Icon name={station === 'shelter' ? 'shield' : 'hand'} /> <span className="max-w-[9rem] truncate sm:max-w-none">{t(`station.${station}`)}</span>
          </button>
          {!time.finished && (
            <span className="flex items-center gap-1" role="group" aria-label={t('fp.timeAria')}>
              <button
                type="button"
                className="hud-button"
                onClick={time.togglePlay}
                disabled={time.blocked && !time.playing}
                aria-label={time.playing ? t('outpost.pause') : t('outpost.play')}
              >
                <Icon name={time.playing ? 'pause' : 'play'} />
              </button>
              <button type="button" className="hud-button" onClick={time.nextDay} disabled={time.blocked} aria-label={t('outpost.next')}>
                <Icon name="skip" />
              </button>
              <button type="button" className="hud-button tabular-nums" onClick={time.cycleSpeed} aria-label={t('outpost.speedAria', { speed: time.speedLabel })}>
                {time.speedLabel}
              </button>
            </span>
          )}
        </div>
        {hint && (
          <p className="cine-subtitle pointer-events-none hidden text-[11px] sm:block">
            {t('fp.hint')} <span className="hidden lg:inline">{t('fp.hintKeys')}</span>
          </p>
        )}
      </div>
    </div>
  )
}
