import { describe, expect, it } from 'vitest'
import glossaryData from '../data/glossary.json'
import {
  advanceDay,
  analyzeMission,
  createMissionState,
  gameContent,
  optionAvailability,
  repairBuilding,
  resolveDecision,
  scoreMission,
  toggleBuilding,
  toLoadout,
} from '../game'
import { random } from '../game/simulation/rng'
import type { GameContent, Message, MissionState } from '../types/game'
import { collectTexts, localizeTexts } from './contentText'
import ptContent from './content/pt.json'
import { LOCALES } from './locale'
import { en } from './messages/en'
import { pt } from './messages/pt'
import { contentFor, formatNumber, renderMessage, translate } from './translate'

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
const tags = (s: string) => [...s.matchAll(/<\/?[bi]>/g)].map((m) => m[0])

describe('UI dictionaries', () => {
  it('Portuguese has every English key, with text', () => {
    expect(Object.keys(pt).sort()).toEqual(Object.keys(en).sort())
    for (const [key, value] of Object.entries(pt)) expect(value.trim(), key).not.toBe('')
  })

  it('translations keep the same placeholders and markup', () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(placeholders(pt[key]), key).toEqual(placeholders(en[key]))
      expect(tags(pt[key]), key).toEqual(tags(en[key]))
    }
  })

  it('every plural key has both forms', () => {
    for (const dict of [en, pt]) {
      for (const key of Object.keys(dict)) {
        if (key.endsWith('_one')) expect(dict, key).toHaveProperty(key.replace(/_one$/, '_other'))
        if (key.endsWith('_other')) expect(dict, key).toHaveProperty(key.replace(/_other$/, '_one'))
      }
    }
  })
})

describe('game content', () => {
  const root = { ...gameContent, glossary: glossaryData.terms }
  const english = collectTexts(root)

  it('Portuguese translates every player-facing text, and nothing else', () => {
    expect(Object.keys(ptContent).sort()).toEqual(Object.keys(english).sort())
    for (const [path, value] of Object.entries(ptContent)) expect(value.trim(), path).not.toBe('')
  })

  it('a translation only changes texts: putting the English texts back gives the original content', () => {
    expect(localizeTexts(contentFor('pt'), english)).toEqual(root)
  })
})

/** Plays a mission with random but reproducible choices and collects every engine message. */
function playthrough(content: GameContent, missionId: string, seed: number, sink?: Message[]): MissionState {
  const mission = content.missions.find((m) => m.id === missionId)!
  let s = createMissionState(content, missionId, toLoadout(mission.recommendedLoadout), seed)
  const dice = { rng: seed * 7919 + 1 } as MissionState
  for (let guard = 0; guard < 200 && (s.status === 'running' || s.status === 'awaiting-decision'); guard++) {
    if (s.status === 'awaiting-decision') {
      const options = content.events[s.pendingEvent!.eventId].options
      for (const o of options) {
        const a = optionAvailability(content, s, o)
        if (a.reason) sink?.push(a.reason)
      }
      const open = options.filter((o) => optionAvailability(content, s, o).available)
      s = resolveDecision(content, s, open[Math.floor(random(dice) * open.length)].id)
      continue
    }
    const broken = s.buildings.find((b) => b.status === 'failed')
    if (broken && random(dice) < 0.5) s = repairBuilding(content, s, broken.uid)
    if (random(dice) < 0.1 && s.buildings.length > 0) s = toggleBuilding(content, s, s.buildings[Math.floor(random(dice) * s.buildings.length)].uid)
    s = advanceDay(content, s)
  }
  if (sink) {
    sink.push(...s.log.map((l) => l.msg), ...s.decisions.flatMap((d) => d.notes), ...s.modifiers.map((m) => m.label))
    sink.push(...analyzeMission(content, s).insights, ...scoreMission(content, s).badges.map((b) => b.detail))
  }
  return s
}

describe('switching language does not change the simulation', () => {
  it('the same seed and choices give the same mission with English or Portuguese content', () => {
    for (const mission of gameContent.missions) {
      for (const seed of [1, 2, 3]) {
        expect(playthrough(contentFor('pt'), mission.id, seed)).toEqual(playthrough(gameContent, mission.id, seed))
      }
    }
  })

  it('engine messages are keys, never sentences in one language', () => {
    const messages: Message[] = []
    playthrough(gameContent, gameContent.missions[1].id, 5, messages)
    for (const m of messages) expect(m.key).toMatch(/^(@[\w.-]+|(sim|analysis|badge)\.[\w.]+)$/)
  })
})

describe('engine messages', () => {
  const messages: Message[] = []
  for (const mission of gameContent.missions) for (let seed = 1; seed <= 25; seed++) playthrough(gameContent, mission.id, seed, messages)

  it('cover many different situations', () => {
    expect(new Set(messages.map((m) => m.key)).size).toBeGreaterThan(40)
  })

  for (const { id } of LOCALES) {
    it(`all render in ${id} without missing keys or placeholders`, () => {
      for (const m of messages) {
        const text = renderMessage(id, m)
        expect(text, m.key).not.toMatch(/\{\w+\}/)
        expect(text, m.key).not.toBe(m.key)
        expect(text, m.key).not.toMatch(/^(sim|analysis|badge)\.|^@|events\.|missions\./)
      }
    })
  }

  it('Portuguese messages use Portuguese content names', () => {
    const m: Message = { key: 'sim.shed', args: { buildings: { ref: 'buildings', ids: ['greenhouse', 'water_recycler'] } } }
    expect(renderMessage('pt', m)).toBe('⚡ Energia insuficiente — desligados automaticamente: Estufa e Reciclador de Água.')
    expect(renderMessage('en', m)).toBe('⚡ Not enough power — automatically switched off: Greenhouse and Water Recycler.')
  })
})

describe('formatting', () => {
  it('uses the decimal comma in Portuguese', () => {
    expect(formatNumber('pt', 12.5, 1)).toBe('12,5')
    expect(formatNumber('en', 12.5, 1)).toBe('12.5')
  })

  it('chooses plural forms by language', () => {
    expect(translate('pt', 'outpost.storm', { dose: '6', count: 1 })).toContain('· 1 dia')
    expect(translate('pt', 'outpost.storm', { dose: '6', count: 2 })).toContain('· 2 dias')
    expect(translate('en', 'outpost.storm', { dose: '6', count: 1 })).toContain('· 1 day')
  })

  it('falls back to English, then to the key', () => {
    expect(translate('pt', 'not.a.key')).toBe('not.a.key')
  })
})

describe('no hard-coded interface text', () => {
  const sources = import.meta.glob('../components/**/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

  it('components put visible words through t()', () => {
    const problems: string[] = []
    for (const [file, src] of Object.entries(sources)) {
      // JSX text between tags with at least one word of 3+ letters.
      for (const m of src.matchAll(/>\s*([^<>{}]*\p{L}{3,}[^<>{}]*)\s*</gu)) {
        // Skip code that only looks like text: comparisons (`a < b.c > d`), arrows, property access.
        if (/^\s*(=>|&&|\|\||\?)/.test(m[1]) || /[=;()]/.test(m[1]) || /\w\.\w/.test(m[1])) continue
        problems.push(`${file}: "${m[1].trim()}"`)
      }
      // Literal accessibility labels and tooltips.
      for (const m of src.matchAll(/(aria-label|title|placeholder|alt)="([^"]*\p{L}{3,}[^"]*)"/gu)) problems.push(`${file}: ${m[1]}="${m[2]}"`)
    }
    expect(problems).toEqual([])
  })
})
