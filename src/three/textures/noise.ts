/**
 * @file
 * @brief Small deterministic noise helpers for procedural terrain and textures.
 *
 * Seeded, so the Moon looks the same every time the game opens.
 */

/** Mulberry32: tiny, fast, good enough for scenery. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hash(x: number, y: number, seed: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 2147483647)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

const fade = (t: number) => t * t * (3 - 2 * t)

/** Smooth value noise in [0, 1]. `period` (in cells) makes it tile seamlessly. */
export function valueNoise(x: number, y: number, seed = 1, period = 0): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const wrap = (v: number) => (period > 0 ? ((v % period) + period) % period : v)
  const a = hash(wrap(xi), wrap(yi), seed)
  const b = hash(wrap(xi + 1), wrap(yi), seed)
  const c = hash(wrap(xi), wrap(yi + 1), seed)
  const d = hash(wrap(xi + 1), wrap(yi + 1), seed)
  const u = fade(xf)
  const v = fade(yf)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

/** Fractal (fBm) noise in roughly [-1, 1]. */
export function fbm(x: number, y: number, octaves = 5, seed = 1, period = 0): number {
  let sum = 0
  let amp = 0.5
  let freq = 1
  let norm = 0
  for (let i = 0; i < octaves; i++) {
    sum += (valueNoise(x * freq, y * freq, seed + i * 17, period > 0 ? period * freq : 0) * 2 - 1) * amp
    norm += amp
    amp *= 0.5
    freq *= 2
  }
  return sum / norm
}

/** Ridged noise for sharp mountain crests, in [0, 1]. */
export function ridged(x: number, y: number, octaves = 5, seed = 1): number {
  let sum = 0
  let amp = 0.5
  let freq = 1
  let norm = 0
  for (let i = 0; i < octaves; i++) {
    const n = 1 - Math.abs(valueNoise(x * freq, y * freq, seed + i * 31) * 2 - 1)
    sum += n * n * amp
    norm += amp
    amp *= 0.5
    freq *= 2.1
  }
  return sum / norm
}
