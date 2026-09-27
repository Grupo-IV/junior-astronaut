// Infrastructure management: see each structure's status, switch it on/off, repair it.
import { useApp } from '../../app/state/AppContext'
import { canRepair, gameContent, isGreenhouseProductive, wantsToRun } from '../../game'
import type { BuildingInstance, MissionState } from '../../types/game'
import { Button, Panel, SourceLink, StatusTag, type Level } from '../ui/ui'

function statusOf(mission: MissionState, b: BuildingInstance): { level: Level; word: string } {
  const def = gameContent.buildings[b.defId]
  if (b.status === 'failed') return { level: 'critical', word: 'BROKEN' }
  if (!b.enabled) return { level: 'neutral', word: 'OFF' }
  if (!wantsToRun(mission, b)) return { level: 'warn', word: 'SAFE MODE' }
  if (def.powerDemandKwhPerDay > 0 && !b.powered && mission.day > 0) return { level: 'warn', word: 'NO POWER' }
  if (b.defId === 'greenhouse' && !isGreenhouseProductive(gameContent, b)) {
    return { level: 'good', word: `GROWING ${b.growth}/${def.growthDays}d` }
  }
  return { level: 'good', word: def.powerDemandKwhPerDay > 0 ? 'RUNNING' : 'OK' }
}

export function SystemsPanel({ mission, selectedUid, onSelect }: { mission: MissionState; selectedUid: string | null; onSelect: (uid: string | null) => void }) {
  const { dispatch } = useApp()
  const selected = mission.buildings.find((b) => b.uid === selectedUid)
  const canAct = mission.status === 'running'

  return (
    <Panel title={`Systems · 🧰 ${mission.spareParts} spare kit${mission.spareParts === 1 ? '' : 's'}`} id="systems-title">
      <div className="p-2">
        <div className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm">
          <span>
            <span aria-hidden>🏠</span> Habitat <span className="text-xs text-ink-3">{gameContent.environment.habitat.powerDemandKwhPerDay} kWh/day</span>
          </span>
          <StatusTag level={mission.lastReport?.habitatUnpowered ? 'critical' : 'good'} word={mission.lastReport?.habitatUnpowered ? 'NO POWER' : 'ONLINE'} />
        </div>
        {mission.buildings.length === 0 && <p className="px-2 py-2 text-xs text-ink-3">No structures launched.</p>}
        <ul>
          {mission.buildings.map((b) => {
            const def = gameContent.buildings[b.defId]
            const st = statusOf(mission, b)
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
                    <span aria-hidden>{def.icon}</span> {def.name}
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
            const def = gameContent.buildings[selected.defId]
            const repair = canRepair(mission, selected.uid)
            return (
              <>
                <p className="font-display text-base font-bold">
                  {def.icon} {def.name}
                </p>
                <p className="mt-1 text-ink-2">{def.summary}</p>
                <p className="mt-1 text-xs">
                  <span className="text-good-ink">+ {def.benefit}</span>
                  <br />
                  <span className="text-serious">− {def.tradeoff}</span>
                </p>
                <p className="mt-2 text-xs text-ink-3">
                  {def.science.text} <SourceLink sourceKey={def.science.source} sources={gameContent.science.sources} />
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {def.powerDemandKwhPerDay > 0 && (
                    <Button disabled={!canAct} onClick={() => dispatch({ type: 'toggleBuilding', uid: selected.uid })}>
                      {selected.enabled ? '⏻ Switch off' : '⏻ Switch on'} ({def.powerDemandKwhPerDay} kWh/day)
                    </Button>
                  )}
                  {selected.status === 'failed' && (
                    <Button variant="primary" disabled={!canAct || !repair.possible} onClick={() => dispatch({ type: 'repairBuilding', uid: selected.uid })}>
                      {repair.withSpare ? '🧰 Repair with spare kit' : '🔧 Try improvised repair (50%)'}
                    </Button>
                  )}
                </div>
                {selected.defId === 'greenhouse' && selected.enabled && selected.growth > 0 && (
                  <p className="mt-2 text-xs text-warn">▲ Switching the greenhouse off kills the plants: growth restarts from zero.</p>
                )}
                {repair.reason && <p className="mt-2 text-xs text-ink-3">{repair.reason}</p>}
              </>
            )
          })()}
        </div>
      )}
    </Panel>
  )
}
