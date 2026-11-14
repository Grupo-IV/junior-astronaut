/**
 * @file
 * @brief Procedural canvas textures: regolith, solar cells, gold foil, panel seams, glows.
 *
 * Generated once at start-up, so the game ships no image files and every
 * texture tiles seamlessly.
 */
import * as THREE from 'three'
import { fbm, seededRandom, valueNoise } from './noise'

function canvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas')
  c.width = c.height = size
  return [c, c.getContext('2d')!]
}

function texture(c: HTMLCanvasElement, repeat = 1, color = true): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(repeat, repeat)
  t.anisotropy = 8
  if (color) t.colorSpace = THREE.SRGBColorSpace
  return t
}

/**
 * Lunar regolith: albedo (grey, speckled, with small crater rings) plus a
 * matching normal map so the low Sun picks out every bump.
 */
export function regolithTextures(size = 512, seed = 7): { map: THREE.CanvasTexture; normalMap: THREE.CanvasTexture } {
  const height = new Float32Array(size * size)
  const rand = seededRandom(seed)
  const period = 8
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * period
      const v = (y / size) * period
      height[y * size + x] = fbm(u, v, 5, seed, period) * 0.6 + (valueNoise(u * 6, v * 6, seed + 3, period * 6) - 0.5) * 0.25
    }
  }
  // Micro-craters: bowls with a raised rim, wrapped at the edges so the tile stays seamless.
  for (let i = 0; i < 22; i++) {
    const cx = rand() * size
    const cy = rand() * size
    const r = 3 + rand() ** 3 * 20
    const depth = 0.15 + rand() * 0.25
    const reach = Math.ceil(r * 1.6)
    for (let dy = -reach; dy <= reach; dy++) {
      for (let dx = -reach; dx <= reach; dx++) {
        const d = Math.hypot(dx, dy) / r
        if (d > 1.6) continue
        const x = (Math.floor(cx + dx) + size) % size
        const y = (Math.floor(cy + dy) + size) % size
        const h = d < 1 ? -depth * (1 - d * d) : depth * 0.35 * Math.cos(((d - 1) / 0.6) * (Math.PI / 2)) ** 2
        height[y * size + x] += h
      }
    }
  }

  const [ac, actx] = canvas(size)
  const albedo = actx.createImageData(size, size)
  const [nc, nctx] = canvas(size)
  const normal = nctx.createImageData(size, size)
  const at = (x: number, y: number) => height[((y + size) % size) * size + ((x + size) % size)]
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const h = at(x, y)
      const speck = rand() < 0.04 ? (rand() - 0.3) * 60 : 0
      const g = 132 + h * 38 + (rand() - 0.5) * 16 + speck * 0.6
      albedo.data[i] = g
      albedo.data[i + 1] = g * 0.985
      albedo.data[i + 2] = g * 0.96
      albedo.data[i + 3] = 255
      const dx = (at(x + 1, y) - at(x - 1, y)) * 2.2
      const dy = (at(x, y + 1) - at(x, y - 1)) * 2.2
      const len = Math.hypot(dx, dy, 1)
      normal.data[i] = ((-dx / len) * 0.5 + 0.5) * 255
      normal.data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255
      normal.data[i + 2] = (1 / len) * 255
      normal.data[i + 3] = 255
    }
  }
  actx.putImageData(albedo, 0, 0)
  nctx.putImageData(normal, 0, 0)
  return { map: texture(ac, 1), normalMap: texture(nc, 1, false) }
}

/** Photovoltaic cells: dark blue squares with silver bus bars and a thin frame. */
export function solarCellTexture(cols = 6, rows = 10): THREE.CanvasTexture {
  const [c, ctx] = canvas(512)
  ctx.fillStyle = '#c9ced6'
  ctx.fillRect(0, 0, 512, 512)
  const cw = 512 / cols
  const ch = 512 / rows
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < cols; k++) {
      const x = k * cw + 3
      const y = r * ch + 3
      const g = ctx.createLinearGradient(x, y, x + cw, y + ch)
      g.addColorStop(0, '#16285e')
      g.addColorStop(0.55, '#0d1b46')
      g.addColorStop(1, '#1d3880')
      ctx.fillStyle = g
      ctx.fillRect(x, y, cw - 6, ch - 6)
      ctx.strokeStyle = 'rgba(190,205,230,0.35)'
      ctx.lineWidth = 1
      for (let l = 1; l < 4; l++) {
        ctx.beginPath()
        ctx.moveTo(x + ((cw - 6) * l) / 4, y)
        ctx.lineTo(x + ((cw - 6) * l) / 4, y + ch - 6)
        ctx.stroke()
      }
    }
  }
  return texture(c)
}

/** Crinkled multi-layer insulation (the gold foil on landers). */
export function goldFoilTexture(seed = 3): THREE.CanvasTexture {
  const [c, ctx] = canvas(256)
  const img = ctx.createImageData(256, 256)
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const n = fbm(x / 22, y / 22, 4, seed, 256 / 22) * 0.5 + 0.5
      const crease = Math.abs(Math.sin((x + fbm(x / 40, y / 40, 2, seed + 9) * 60) / 7)) * 0.25
      const v = 0.55 + n * 0.45 - crease
      const i = (y * 256 + x) * 4
      img.data[i] = 235 * v
      img.data[i + 1] = 178 * v
      img.data[i + 2] = 62 * v
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return texture(c)
}

/** Painted hull: off-white with panel seams and rivets. */
export function hullTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(512)
  ctx.fillStyle = '#e9e8e2'
  ctx.fillRect(0, 0, 512, 512)
  const rand = seededRandom(11)
  for (let i = 0; i < 2500; i++) {
    ctx.fillStyle = `rgba(0,0,0,${rand() * 0.035})`
    ctx.fillRect(rand() * 512, rand() * 512, 2 + rand() * 6, 1 + rand() * 3)
  }
  ctx.strokeStyle = 'rgba(80,85,95,0.45)'
  ctx.lineWidth = 2
  for (let x = 0; x <= 512; x += 128) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, 512)
    ctx.stroke()
  }
  for (let y = 0; y <= 512; y += 170) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(512, y)
    ctx.stroke()
  }
  ctx.fillStyle = 'rgba(70,75,85,0.55)'
  for (let x = 0; x <= 512; x += 128) for (let y = 8; y < 512; y += 21) ctx.fillRect(x - 5, y, 2, 2)
  return texture(c)
}

/** Soft radial glow for sprites (sun glare, lamps, atmosphere). */
export function glowTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)'): THREE.CanvasTexture {
  const [c, ctx] = canvas(256)
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  g.addColorStop(0, inner)
  g.addColorStop(0.25, inner.replace(/[\d.]+\)$/, '0.45)'))
  g.addColorStop(1, outer)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** Equirectangular Earth: oceans, continents with deserts and forests, ice caps; and a cloud layer. */
export function earthTextures(seed = 5): { map: THREE.CanvasTexture; clouds: THREE.CanvasTexture } {
  const w = 512
  const h = 256
  const [mc, mctx] = canvas(w)
  mc.height = h
  const [cc, cctx] = canvas(w)
  cc.height = h
  const map = mctx.createImageData(w, h)
  const clouds = cctx.createImageData(w, h)
  for (let y = 0; y < h; y++) {
    const lat = (y / h) * Math.PI - Math.PI / 2
    for (let x = 0; x < w; x++) {
      const lon = (x / w) * Math.PI * 2
      // Sample noise on the sphere so the texture wraps without a seam.
      const sx = Math.cos(lat) * Math.cos(lon) * 2.2
      const sy = Math.cos(lat) * Math.sin(lon) * 2.2
      const sz = Math.sin(lat) * 2.2
      const land = fbm(sx + sz * 0.7 + 10, sy - sz * 0.4 + 10, 6, seed)
      const moist = fbm(sx * 1.7 + 3, sy * 1.7 + sz, 3, seed + 4)
      const i = (y * w + x) * 4
      const ice = Math.abs(lat) > 1.22
      let r: number, g: number, b: number
      if (ice) [r, g, b] = [236, 242, 248]
      else if (land > 0.08) {
        const dry = moist > 0.05
        ;[r, g, b] = dry ? [176, 150, 102] : [62, 112, 58]
        const k = 0.85 + land * 0.5
        r *= k
        g *= k
        b *= k
      } else {
        const deep = Math.min(1, -land * 2.5)
        ;[r, g, b] = [22 + 20 * (1 - deep), 64 + 40 * (1 - deep), 140 + 40 * (1 - deep)]
      }
      map.data[i] = r
      map.data[i + 1] = g
      map.data[i + 2] = b
      map.data[i + 3] = 255
      const cloud = fbm(sx * 2 + 40, sy * 2 + sz * 2, 5, seed + 8)
      const a = Math.max(0, Math.min(1, (cloud - 0.02) * 3.2))
      clouds.data[i] = clouds.data[i + 1] = clouds.data[i + 2] = 255
      clouds.data[i + 3] = a * 235
    }
  }
  mctx.putImageData(map, 0, 0)
  cctx.putImageData(clouds, 0, 0)
  const mapT = new THREE.CanvasTexture(mc)
  mapT.colorSpace = THREE.SRGBColorSpace
  const cloudT = new THREE.CanvasTexture(cc)
  cloudT.colorSpace = THREE.SRGBColorSpace
  return { map: mapT, clouds: cloudT }
}

/** Faint Milky Way band for the sky dome. */
export function milkyWayTexture(seed = 21): THREE.CanvasTexture {
  const w = 1024
  const h = 512
  const [c, ctx] = canvas(w)
  c.height = h
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, w, h)
  const img = ctx.getImageData(0, 0, w, h)
  const rand = seededRandom(seed)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const band = Math.exp(-(((y - h * 0.42 - Math.sin((x / w) * Math.PI * 2) * h * 0.18) / (h * 0.09)) ** 2))
      const cloud = fbm((x / w) * 12, (y / h) * 6, 5, seed, 12) * 0.5 + 0.5
      const dust = fbm((x / w) * 30, (y / h) * 15, 3, seed + 2, 30) * 0.5 + 0.5
      const v = band * cloud * (dust > 0.55 ? 0.55 : 1)
      const i = (y * w + x) * 4
      img.data[i] = 120 * v + 8 * band
      img.data[i + 1] = 118 * v + 6 * band
      img.data[i + 2] = 150 * v + 14 * band
      img.data[i + 3] = 255
    }
  }
  for (let i = 0; i < 9000; i++) {
    const x = Math.floor(rand() * w)
    const y = Math.floor(rand() * h)
    const k = (y * w + x) * 4
    const b = 120 + rand() * 135
    img.data[k] = img.data[k + 1] = img.data[k + 2] = b
  }
  ctx.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}
