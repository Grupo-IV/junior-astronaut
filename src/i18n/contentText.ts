/**
 * @file
 * @brief Finds, reads and replaces the player-facing texts inside the game content.
 *
 * Texts are addressed by a stable path. Array items with an `id` use the id,
 * other array items use their index, e.g.
 *   events.solar_storm.options.shelter.label
 *   events.water_leak.options.patch.effects.2.note
 *   missions.shackleton-first-light.briefing.objectives.0
 *
 * Only string fields named in TEXT_KEYS are translated. Ids, enums, numbers,
 * icons and source keys are never touched, so a translation cannot change the
 * simulation.
 */

const TEXT_KEYS = new Set([
  'name',
  'unit',
  'range',
  'location',
  'label',
  'tagline',
  'story',
  'objectives',
  'hazards',
  'tip',
  'summary',
  'benefit',
  'tradeoff',
  'text',
  'title',
  'what',
  'why',
  'principle',
  'cost',
  'note',
  'otherwiseNote',
  'lesson',
  'alternatives',
])

/** Not shown as translatable prose: citation titles stay in their original language. */
const SKIP = new Set(['environment', 'science.sources'])

type Node = unknown

function segment(item: Node, index: number): string {
  if (item && typeof item === 'object' && 'id' in item && typeof (item as { id: unknown }).id === 'string') return (item as { id: string }).id
  return String(index)
}

const join = (path: string, key: string) => (path ? `${path}.${key}` : key)

/** Every translatable text in `root`, by path. */
export function collectTexts(root: Node): Record<string, string> {
  const out: Record<string, string> = {}
  const walk = (node: Node, path: string, isText: boolean) => {
    if (SKIP.has(path)) return
    if (typeof node === 'string') {
      if (isText) out[path] = node
    } else if (Array.isArray(node)) {
      node.forEach((item, i) => walk(item, join(path, segment(item, i)), isText))
    } else if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) walk(v, join(path, k), TEXT_KEYS.has(k))
    }
  }
  walk(root, '', false)
  return out
}

/** A copy of `root` with every text that has a translation replaced. Everything else is shared as-is. */
export function localizeTexts<T>(root: T, translations: Record<string, string>): T {
  const walk = (node: Node, path: string, isText: boolean): Node => {
    if (SKIP.has(path)) return node
    if (typeof node === 'string') return isText ? (translations[path] ?? node) : node
    if (Array.isArray(node)) return node.map((item, i) => walk(item, join(path, segment(item, i)), isText))
    if (node && typeof node === 'object') {
      return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, walk(v, join(path, k), TEXT_KEYS.has(k))]))
    }
    return node
  }
  return walk(root, '', false) as T
}

/** The text at `path`, or undefined. */
export function textAt(root: Node, path: string): string | undefined {
  let node: Node = root
  for (const key of path.split('.')) {
    if (Array.isArray(node)) {
      const byId = node.find((item, i) => segment(item, i) === key)
      node = byId
    } else if (node && typeof node === 'object') {
      node = (node as Record<string, Node>)[key]
    } else {
      return undefined
    }
  }
  return typeof node === 'string' ? node : undefined
}
