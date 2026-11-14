/**
 * @file
 * @brief Player audio preference (mute), persisted per browser.
 */
import { useSyncExternalStore } from 'react'

const KEY = 'junior-astronaut:audio-muted'
const listeners = new Set<() => void>()

function read(): boolean {
  try {
    return globalThis.localStorage?.getItem(KEY) === '1'
  } catch {
    return false
  }
}

let muted = read()

export function isMuted(): boolean {
  return muted
}

export function setMuted(value: boolean) {
  muted = value
  try {
    globalThis.localStorage?.setItem(KEY, value ? '1' : '0')
  } catch {
    // Storage can be blocked (private mode); the toggle still works for this session.
  }
  listeners.forEach((l) => l())
}

export function subscribeMuted(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useMuted(): boolean {
  return useSyncExternalStore(subscribeMuted, isMuted, isMuted)
}
