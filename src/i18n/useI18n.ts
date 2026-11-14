/**
 * @file
 * @brief React access to the current language: `t` for UI keys, `m` for engine messages.
 */
import { useMemo } from 'react'
import type { Message } from '../types/game'
import { useLocale, type Locale } from './locale'
import { contentFor, formatNumber, renderMessage, translate, type Args, type LocalizedContent, type UiKey } from './translate'

export interface I18n {
  locale: Locale
  /** Translates a UI key. Pass `count` in `args` for plural keys. */
  t: (key: UiKey, args?: Args) => string
  /** Renders a message produced by the simulation engine. */
  m: (message: Message) => string
  /** Game content with texts in the current language (display only). */
  content: LocalizedContent
  /** Formats a number for the current language (decimal comma in Portuguese). */
  n: (value: number, digits?: number) => string
}

export function useI18n(): I18n {
  const locale = useLocale()
  return useMemo(
    () => ({
      locale,
      t: (key, args) => translate(locale, key, args),
      m: (message) => renderMessage(locale, message),
      content: contentFor(locale),
      n: (value, digits) => formatNumber(locale, value, digits),
    }),
    [locale],
  )
}
