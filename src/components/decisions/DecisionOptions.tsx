import { gameContent, optionAvailability } from '../../game'
import type { EventDef, MissionState } from '../../types/game'

export function DecisionOptions({ mission, def, onChoose }: { mission: MissionState; def: EventDef; onChoose: (optionId: string) => void }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {def.options.map((o) => {
        const a = optionAvailability(gameContent, mission, o)
        return (
          <li key={o.id}>
            <button
              type="button"
              disabled={!a.available}
              onClick={() => onChoose(o.id)}
              className="flex h-full w-full flex-col rounded-xl border border-line bg-panel-2 p-3 text-left transition hover:border-accent hover:bg-accent/5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-line disabled:hover:bg-panel-2"
            >
              <span className="font-semibold">
                <span aria-hidden className="mr-1">{o.icon}</span>
                {o.label}
              </span>
              <span className="mt-2 text-xs text-good-ink">
                <span aria-hidden>＋ </span>
                <span className="sr-only">Benefit: </span>
                {o.benefit}
              </span>
              <span className="mt-1 text-xs text-serious">
                <span aria-hidden>－ </span>
                <span className="sr-only">Cost: </span>
                {o.cost}
              </span>
              {!a.available && (
                <span className="mt-2 text-xs font-semibold text-critical">
                  <span aria-hidden>✖ </span>Unavailable: {a.reason}
                </span>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
