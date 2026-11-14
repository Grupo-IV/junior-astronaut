/**
 * @file
 * @brief "No time pressure" preference: urgent decisions in first person can run
 * without a countdown. Remembered per browser, like the sound setting.
 *
 * With no countdown, an urgent event simply waits for the player; nothing in
 * the simulation changes (the countdown only exists in the first-person view).
 */
import { useSyncExternalStore } from 'react'

const KEY = 'junior-astronaut:no-time-pressure'
const listeners = new Set<() => void>()

function read(): boolean {
  try {
    return globalThis.localStorage?.getItem(KEY) === '1'
  } catch {
    return false
  }
}

let relaxed = read()

export function isRelaxed(): boolean {
  return relaxed
}

export function setRelaxed(value: boolean) {
  relaxed = value
  try {
    globalThis.localStorage?.setItem(KEY, value ? '1' : '0')
  } catch {
    // Storage blocked: the choice still applies for this session.
  }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useRelaxed(): boolean {
  return useSyncExternalStore(subscribe, isRelaxed, isRelaxed)
}
