/**
 * @file
 * @brief Finds glossary terms (mSv, kWh, regolith, electrolysis) inside interface text, per language.
 */
import glossaryData from '../../data/glossary.json'
import type { Locale } from '../../i18n/locale'

export type GlossaryId = keyof typeof glossaryData.terms

/** English entries. The UI reads the translated entries from `useI18n().content.glossary`. */
export const GLOSSARY: Record<GlossaryId, { name: string; text: string }> = glossaryData.terms

/** How each term is written in each language. Units are the same everywhere. */
const PATTERNS: Record<Locale, Record<GlossaryId, RegExp>> = {
  en: {
    msv: /\bmSv\b/,
    kwh: /\bkWh\b/,
    regolith: /\bregolith\b/i,
    electrolysis: /\belectrolysis\b/i,
  },
  pt: {
    msv: /\bmSv\b/,
    kwh: /\bkWh\b/,
    regolith: /\bregolito\b/i,
    // `\b` does not understand accented letters, so the end of the word is checked with \p{L}.
    electrolysis: /\beletr[óo]lise(?!\p{L})/iu,
  },
}

export type GlossaryPart = string | { id: GlossaryId; text: string }

/** Splits text so that only the first occurrence of each term becomes a glossary part. */
export function splitGlossary(text: string, locale: Locale = 'en'): GlossaryPart[] {
  const patterns = PATTERNS[locale]
  const hits = (Object.keys(patterns) as GlossaryId[])
    .map((id) => ({ id, match: patterns[id].exec(text) }))
    .filter((h): h is { id: GlossaryId; match: RegExpExecArray } => h.match !== null)
    .sort((a, b) => a.match.index - b.match.index)

  const parts: GlossaryPart[] = []
  let cursor = 0
  for (const { id, match } of hits) {
    if (match.index < cursor) continue
    if (match.index > cursor) parts.push(text.slice(cursor, match.index))
    parts.push({ id, text: match[0] })
    cursor = match.index + match[0].length
  }
  if (cursor < text.length) parts.push(text.slice(cursor))
  return parts
}
