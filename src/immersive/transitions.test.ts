import { describe, expect, it } from 'vitest'
import { activeTransitions, cancelTransition, finishTransition, isBusy, startTransition, updateTransition } from './transitions'

describe('transition status', () => {
  it('reports steps and progress, and never goes backwards', () => {
    const id = startTransition('day', ['power', 'lifeSupport', 'radiation', 'events'], { day: 3 })
    updateTransition(id, 0.5, 2, { power: { in: 90 } })
    updateTransition(id, 0.3, 1)
    const t = activeTransitions().find((x) => x.id === id)!
    expect(t).toMatchObject({ progress: 0.5, step: 2, results: { power: { in: 90 } } })
    expect(isBusy('day')).toBe(true)
    finishTransition(id, 0)
    expect(isBusy('day')).toBe(false)
    expect(activeTransitions().some((x) => x.id === id)).toBe(false)
  })

  it('a new transition of the same kind replaces the old one', () => {
    const a = startTransition('eva', ['walkOut'])
    const b = startTransition('eva', ['walkOut'])
    expect(activeTransitions().filter((t) => t.kind === 'eva').map((t) => t.id)).toEqual([b])
    expect(a).not.toBe(b)
    cancelTransition(b)
    expect(isBusy('eva')).toBe(false)
  })
})
