import { describe, expect, it } from 'vitest'
import buildingsData from '../../data/buildings.json'
import { GLOSSARY, splitGlossary } from './glossary'

describe('splitGlossary', () => {
  it('returns plain text untouched', () => {
    expect(splitGlossary('Water recycling keeps the crew alive.')).toEqual(['Water recycling keeps the crew alive.'])
  })

  it('marks only the first occurrence of each term', () => {
    expect(splitGlossary('Cosmic rays give 1.4 mSv per day. The limit is 250 mSv.')).toEqual([
      'Cosmic rays give 1.4 ',
      { id: 'msv', text: 'mSv' },
      ' per day. The limit is 250 mSv.',
    ])
  })

  it('handles units followed by /day and several terms in one text', () => {
    expect(splitGlossary('Uses +10 kWh/day and adds 60 mSv/day.')).toEqual([
      'Uses +10 ',
      { id: 'kwh', text: 'kWh' },
      '/day and adds 60 ',
      { id: 'msv', text: 'mSv' },
      '/day.',
    ])
  })

  it('keeps the original casing of the matched word', () => {
    const parts = splitGlossary('Electrolysis: 2 H₂O → 2 H₂ + O₂. Lunar soil (regolith).')
    expect(parts).toContainEqual({ id: 'electrolysis', text: 'Electrolysis' })
    expect(parts).toContainEqual({ id: 'regolith', text: 'regolith' })
    expect(parts.map((p) => (typeof p === 'string' ? p : p.text)).join('')).toBe('Electrolysis: 2 H₂O → 2 H₂ + O₂. Lunar soil (regolith).')
  })

  it('ignores lookalike words', () => {
    expect(splitGlossary('µSv, kW and msvc are not glossary terms.')).toEqual(['µSv, kW and msvc are not glossary terms.'])
  })

  it('finds every glossary term in the game content', () => {
    const text = JSON.stringify(buildingsData) + ' 45 kWh · 250 mSv'
    const found = splitGlossary(text).flatMap((p) => (typeof p === 'string' ? [] : [p.id]))
    expect(found.sort()).toEqual(Object.keys(GLOSSARY).sort())
  })
})
