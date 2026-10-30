/**
 * @file
 * @brief Finds glossary terms (mSv, kWh, regolith, electrolysis) inside interface text.
 */
import glossaryData from '../../data/glossary.json'

export type GlossaryId = keyof typeof glossaryData.terms

export const GLOSSARY: Record<GlossaryId, { name: string; text: string }> = glossaryData.terms

const PATTERNS: Record<GlossaryId, RegExp> = {
  msv: /\bmSv\b/,
  kwh: /\bkWh\b/,
  regolith: /\bregolith\b/i,
  electrolysis: /\belectrolysis\b/i,
}

export type GlossaryPart = string | { id: GlossaryId; text: string }

/** Splits text so that only the first occurrence of each term becomes a glossary part. */
export function splitGlossary(text: string): GlossaryPart[] {
  const hits = (Object.keys(PATTERNS) as GlossaryId[])
    .map((id) => ({ id, match: PATTERNS[id].exec(text) }))
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
