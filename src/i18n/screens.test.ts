/**
 * Renders every screen of the vertical slice to HTML in each language and
 * checks that no untranslated key or English sentence leaks into Portuguese.
 */
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { afterAll, describe, expect, it } from 'vitest'
import { Router } from '../app/routes/Router'
import { AppProvider } from '../app/state/AppContext'
import { initialAppState, type AppState, type Screen } from '../app/state/appState'
import { advanceDay, createMissionState, gameContent, resolveDecision, optionAvailability, toLoadout } from '../game'
import type { MissionState } from '../types/game'
import { getLocale, setLocale } from './locale'

const MISSION = gameContent.missions[0]
const loadout = toLoadout(MISSION.recommendedLoadout)

function runUntil(stop: (s: MissionState) => boolean): MissionState {
  let s = createMissionState(gameContent, MISSION.id, loadout, 3)
  for (let i = 0; i < 100 && !stop(s); i++) {
    if (s.status === 'awaiting-decision') {
      const option = gameContent.events[s.pendingEvent!.eventId].options.find((o) => optionAvailability(gameContent, s, o).available)!
      s = resolveDecision(gameContent, s, option.id)
    } else s = advanceDay(gameContent, s)
  }
  return s
}

const atEvent = runUntil((s) => s.status === 'awaiting-decision')

/** The cadet mission with an oxygen leak on day 2 (the first fully staged emergency). */
function atLeak(): MissionState {
  const content = { ...gameContent, missions: gameContent.missions.map((m) => ({ ...m, scheduledEvents: [{ day: 2, eventId: 'oxygen_leak' }] })) }
  return advanceDay(content, createMissionState(content, MISSION.id, toLoadout({ ...MISSION.recommendedLoadout, spare_parts: 1 }), 3))
}
const finished = runUntil((s) => s.status === 'success' || s.status === 'failure')

const SCREENS: { name: string; state: () => AppState }[] = [
  { name: 'menu', state: () => ({ ...initialAppState(), screen: 'menu' }) },
  { name: 'select', state: () => ({ ...initialAppState(), screen: 'select' }) },
  { name: 'briefing', state: () => ({ ...initialAppState(), screen: 'briefing' }) },
  { name: 'setup', state: () => ({ ...initialAppState(), screen: 'setup', loadout: toLoadout({}) }) },
  { name: 'outpost', state: () => ({ ...initialAppState(), screen: 'outpost', mission: createMissionState(gameContent, MISSION.id, loadout, 3) }) },
  { name: 'event', state: () => ({ ...initialAppState(), screen: 'outpost', mission: atEvent }) },
  {
    name: 'consequence',
    state: () => {
      const mission = resolveDecision(gameContent, atEvent, gameContent.events[atEvent.pendingEvent!.eventId].options.at(-1)!.id)
      return { ...initialAppState(), screen: 'outpost' as Screen, mission, consequenceIndex: mission.decisions.length - 1 }
    },
  },
  { name: 'result', state: () => ({ ...initialAppState(), screen: 'result', mission: finished }) },
  { name: 'first person', state: () => ({ ...initialAppState(), screen: 'outpost', view: 'firstPerson', mission: createMissionState(gameContent, MISSION.id, loadout, 3) }) },
  { name: 'first person decision', state: () => ({ ...initialAppState(), screen: 'outpost', view: 'firstPerson', mission: atEvent }) },
  { name: 'first person oxygen leak', state: () => ({ ...initialAppState(), screen: 'outpost', view: 'firstPerson', mission: atLeak() }) },
]

function render(state: AppState): string {
  const html = renderToString(createElement(AppProvider, { initialState: state, children: createElement(Router) }))
  return html.replace(/<[^>]+>/g, ' ').replace(/&#x27;|&quot;|&amp;/g, ' ')
}

/** English words that should never appear in the Portuguese interface. */
const ENGLISH = /\b(the|and|with|your|day|days|mission|crew|water|food|oxygen|power|storm|next|back|choose|launch|sound)\b/i
/** Words that legitimately stay in English: product name, sources, acronyms. */
const ALLOWED = /Junior Astronaut|NASA Space Apps Challenge|Life Support Baseline Values and Assumptions|Veggie|Advanced Plant Habitat|Oxygen Generation Assembly|single-event upset|React|Three\.js|Source|Artemis|Shackleton/g

describe('every screen in Portuguese', () => {
  const previous = getLocale()
  afterAll(() => setLocale(previous))

  for (const screen of SCREENS) {
    it(`${screen.name} has no untranslated keys or English text`, () => {
      setLocale('pt')
      const text = render(screen.state())
      expect(text).not.toMatch(/\b(sim|setup|outpost|res|sys|tour|result|chart|badge|analysis|event|stock|item|menu|select|briefing)\.[a-z]/)
      expect(text).not.toMatch(/\{\w+\}/)
      // Cited publications keep their original titles.
      const prose = Object.values(gameContent.science.sources).reduce((acc, s) => acc.split(s.title).join(' '), text).replace(ALLOWED, ' ')
      const leftovers = [...prose.matchAll(new RegExp(ENGLISH, 'gi'))].map((m) => prose.slice(Math.max(0, m.index - 60), m.index + 40))
      expect(leftovers).toEqual([])
    })

    it(`${screen.name} also renders in English`, () => {
      setLocale('en')
      const text = render(screen.state())
      expect(text).not.toMatch(/\{\w+\}/)
      expect(text.length).toBeGreaterThan(100)
    })
  }
})
