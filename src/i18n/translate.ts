/**
 * @file
 * @brief Translation core: dictionaries, localized content, interpolation and engine messages.
 *
 * Framework-free so it can be unit tested. React components use `useI18n()`.
 */
import glossaryData from '../data/glossary.json'
import { gameContent } from '../game/content'
import type { GameContent, Message, MessageArg } from '../types/game'
import { localizeTexts, textAt } from './contentText'
import ptContent from './content/pt.json'
import { LOCALE_TAG, type Locale } from './locale'
import { en, type MessageKey } from './messages/en'
import { pt } from './messages/pt'

/** Keys as used in code: plural variants `x_one` / `x_other` are requested as `x` with a `count` argument. */
export type UiKey = MessageKey extends infer K ? (K extends `${infer B}_${'one' | 'other'}` ? B : K) : never

export type Args = Record<string, MessageArg>

const DICTIONARIES: Record<Locale, Record<string, string>> = { en, pt }
const CONTENT_TEXTS: Record<Locale, Record<string, string>> = { en: {}, pt: ptContent }

export type LocalizedContent = GameContent & { glossary: typeof glossaryData.terms }

const textRoot: LocalizedContent = { ...gameContent, glossary: glossaryData.terms }
const contentCache = new Map<Locale, LocalizedContent>()

/** Game content with texts in `locale`. Numbers, ids and rules are identical in every language. */
export function contentFor(locale: Locale): LocalizedContent {
  let c = contentCache.get(locale)
  if (!c) {
    c = localizeTexts(textRoot, CONTENT_TEXTS[locale])
    contentCache.set(locale, c)
  }
  return c
}

const numberFormats = new Map<string, Intl.NumberFormat>()
export function formatNumber(locale: Locale, n: number, digits?: number): string {
  const id = `${locale}|${digits ?? 'auto'}`
  let f = numberFormats.get(id)
  if (!f) {
    f = new Intl.NumberFormat(
      LOCALE_TAG[locale],
      digits === undefined ? { maximumFractionDigits: 1 } : { minimumFractionDigits: digits, maximumFractionDigits: digits },
    )
    numberFormats.set(id, f)
  }
  return f.format(n)
}

function lookup(locale: Locale, key: string, count: number | undefined): string | undefined {
  const dict = DICTIONARIES[locale]
  if (count !== undefined) {
    const category = new Intl.PluralRules(LOCALE_TAG[locale]).select(count)
    const plural = dict[`${key}_${category}`] ?? dict[`${key}_other`]
    if (plural !== undefined) return plural
  }
  return dict[key]
}

function formatArg(locale: Locale, arg: MessageArg): string {
  if (typeof arg === 'number') return formatNumber(locale, arg)
  if (typeof arg === 'string') return arg
  const content = contentFor(locale)
  switch (arg.ref) {
    case 'content':
      return textAt(content, arg.path) ?? textAt(contentFor('en'), arg.path) ?? arg.path
    case 'building':
      return content.buildings[arg.id].name
    case 'buildings':
      return new Intl.ListFormat(LOCALE_TAG[locale], { type: 'conjunction' }).format(arg.ids.map((id) => content.buildings[id].name))
    case 'stock':
      return translate(locale, `stock.${arg.id}.lower`)
  }
}

/**
 * Translates a key. Falls back to English, then to the key itself so a
 * missing text is visible instead of silently blank.
 */
export function translate(locale: Locale, key: string, args?: Args): string {
  const count = typeof args?.count === 'number' ? args.count : undefined
  const template = lookup(locale, key, count) ?? lookup('en', key, count) ?? key
  if (!args) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in args ? formatArg(locale, args[name]) : match))
}

/** Renders an engine message in `locale`. */
export function renderMessage(locale: Locale, message: Message): string {
  if (message.key.startsWith('@')) {
    const path = message.key.slice(1)
    return textAt(contentFor(locale), path) ?? textAt(contentFor('en'), path) ?? path
  }
  return translate(locale, message.key, message.args)
}
