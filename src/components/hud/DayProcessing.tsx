/**
 * @file
 * @brief Shows the day the engine has just simulated, step by step, with its real
 * results (power, life support, radiation, events), before the next scene appears.
 *
 * The simulation itself is instant; this paces how its results are shown so
 * the player can follow them. Events wait until it is done.
 */
import { useEffect, useRef } from 'react'
import { DAY_STEPS, finishTransition, startTransition, updateTransition } from '../../immersive/transitions'
import { useI18n } from '../../i18n/useI18n'
import type { MissionState } from '../../types/game'

export function DayProcessing({ mission, duration }: { mission: MissionState; duration: number }) {
  const { t, n, content } = useI18n()
  const lastDay = useRef(mission.day)

  useEffect(() => {
    const report = mission.lastReport
    if (mission.day <= lastDay.current || !report || report.day !== mission.day) {
      lastDay.current = mission.day
      return
    }
    lastDay.current = mission.day
    const signed = (v: number) => `${v >= 0 ? '+' : '−'}${n(Math.abs(v), 1)}`
    const net = (k: 'oxygen' | 'water' | 'food') => report.flows[k].produced - report.flows[k].consumed
    const pending = mission.pendingEvent
    const results: Record<string, Record<string, string | number>> = {
      power: { in: n(report.generationKwh), out: n(report.servedKwh) },
      lifeSupport: { o2: signed(net('oxygen')), water: signed(net('water')), food: signed(net('food')) },
      radiation: { dose: n(report.doseMsv, 1) },
      events: { what: pending ? content.events[pending.eventId].title : t('transition.day.events.none') },
    }
    const id = startTransition('day', DAY_STEPS, { day: mission.day })
    const timers: number[] = []
    const each = Math.max(60, duration / DAY_STEPS.length)
    DAY_STEPS.forEach((step, i) => {
      timers.push(
        window.setTimeout(() => {
          if (i === DAY_STEPS.length - 1) {
            updateTransition(id, 1, i, { [step]: results[step] })
            finishTransition(id, 900)
          } else updateTransition(id, (i + 1) / DAY_STEPS.length, i + 1, { [step]: results[step] })
        }, each * (i + 1)),
      )
    })
    return () => {
      timers.forEach((t) => window.clearTimeout(t))
      finishTransition(id, 0)
    }
    // Only a new day starts a new report.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mission.day])

  return null
}
