/**
 * @file
 * @brief Current interface language, persisted per browser.
 */
import { useSyncExternalStore } from 'react'

export type Locale = 'en' | 'pt'

export const LOCALES: { id: Locale; label: string; short: string }[] = [
  { id: 'pt', label: 'Português', short: 'PT' },
  { id: 'en', label: 'English', short: 'EN' },
]

/** BCP 47 tag for number formatting and `<html lang>`. Portuguese is European Portuguese. */
export const LOCALE_TAG: Record<Locale, string> = { en: 'en', pt: 'pt-PT' }

const KEY = 'junior-astronaut:locale'
const listeners = new Set<() => void>()

function isLocale(v: unknown): v is Locale {
  return v === 'en' || v === 'pt'
}

function detect(): Locale {
  try {
    const saved = globalThis.localStorage?.getItem(KEY)
    if (isLocale(saved)) return saved
  } catch {
    // Storage blocked: fall back to the browser language.
  }
  const lang = globalThis.navigator?.language?.toLowerCase() ?? ''
  return lang.startsWith('pt') ? 'pt' : 'en'
}

let current: Locale = detect()

function syncDocument() {
  if (typeof document !== 'undefined') document.documentElement.lang = LOCALE_TAG[current]
}
syncDocument()

export function getLocale(): Locale {
  return current
}

export function setLocale(locale: Locale) {
  if (locale === current) return
  current = locale
  try {
    globalThis.localStorage?.setItem(KEY, locale)
  } catch {
    // The choice still applies for this session.
  }
  syncDocument()
  listeners.forEach((l) => l())
}

export function subscribeLocale(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useLocale(): Locale {
  return useSyncExternalStore(subscribeLocale, getLocale, getLocale)
}
