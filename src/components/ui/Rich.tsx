/**
 * @file
 * @brief Renders a translated string with <b>/<i> markup and glossary terms.
 */
import { Fragment } from 'react'
import { GlossaryText } from './Term'

const TAG = /<(b|i)>(.*?)<\/\1>/g

/** Translations keep markup in the string so word order can change between languages. */
export function Rich({ text, boldClassName = 'text-ink' }: { text: string; boldClassName?: string }) {
  const parts: { tag: 'b' | 'i' | null; text: string }[] = []
  let cursor = 0
  for (const match of text.matchAll(TAG)) {
    if (match.index > cursor) parts.push({ tag: null, text: text.slice(cursor, match.index) })
    parts.push({ tag: match[1] as 'b' | 'i', text: match[2] })
    cursor = match.index + match[0].length
  }
  if (cursor < text.length) parts.push({ tag: null, text: text.slice(cursor) })
  return (
    <>
      {parts.map((p, i) => (
        <Fragment key={i}>
          {p.tag === 'b' ? (
            <strong className={boldClassName}>
              <GlossaryText text={p.text} />
            </strong>
          ) : p.tag === 'i' ? (
            <em>
              <GlossaryText text={p.text} />
            </em>
          ) : (
            <GlossaryText text={p.text} />
          )}
        </Fragment>
      ))}
    </>
  )
}
