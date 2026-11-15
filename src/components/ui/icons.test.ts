import { describe, expect, it } from 'vitest'
import { gameContent } from '../../game'
import { en } from '../../i18n/messages/en'
import { pt } from '../../i18n/messages/pt'
import ptContent from '../../i18n/content/pt.json'
import { isIconName } from './Icon'

/** Emoji and pictographic symbols (arrows used in chemistry formulas and key hints are allowed). */
const EMOJI = /\p{Extended_Pictographic}|[☀-➿■-◿⏩-⏺＋－ⓘ★]/u

describe('icons', () => {
  it('every icon named in the game content exists in the icon set', () => {
    const names = [
      ...Object.values(gameContent.buildings).map((b) => b.icon),
      ...Object.values(gameContent.cargo).map((c) => c.icon),
      ...Object.values(gameContent.events).flatMap((e) => [e.icon, ...e.options.map((o) => o.icon)]),
    ]
    for (const name of names) expect(isIconName(name), name).toBe(true)
  })

  it('no emoji are left in interface texts or content', () => {
    for (const [key, value] of [...Object.entries(en), ...Object.entries(pt), ...Object.entries(ptContent)]) {
      expect(EMOJI.test(value), `${key}: ${value}`).toBe(false)
    }
  })

  it('no emoji are left in components', () => {
    const sources = import.meta.glob('../**/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
    for (const [file, src] of Object.entries(sources)) expect(EMOJI.test(src), file).toBe(false)
  })
})
