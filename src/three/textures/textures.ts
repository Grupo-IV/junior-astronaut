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

/**
 * Interior wall: soft off-white panels with seams, fasteners and a strip of
 * hook-and-loop fabric, like the racks lining a space station module.
 */
export function interiorPanelTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(512)
  ctx.fillStyle = '#d6d8d4'
  ctx.fillRect(0, 0, 512, 512)
  const rand = seededRandom(17)
  for (let i = 0; i < 1800; i++) {
    ctx.fillStyle = `rgba(0,0,0,${rand() * 0.03})`
    ctx.fillRect(rand() * 512, rand() * 512, 2 + rand() * 5, 1 + rand() * 2)
  }
  // Panel quilting: each panel slightly brighter at the centre, darker at the seams.
  for (let px = 0; px < 2; px++) {
    for (let py = 0; py < 2; py++) {
      const g = ctx.createRadialGradient(px * 256 + 128, py * 256 + 128, 20, px * 256 + 128, py * 256 + 128, 190)
      g.addColorStop(0, 'rgba(255,255,255,0.10)')
      g.addColorStop(1, 'rgba(0,0,0,0.10)')
      ctx.fillStyle = g
      ctx.fillRect(px * 256, py * 256, 256, 256)
    }
  }
  ctx.strokeStyle = 'rgba(60,66,78,0.6)'
  ctx.lineWidth = 3
  for (const v of [0, 256, 512]) {
    ctx.beginPath()
    ctx.moveTo(v, 0)
    ctx.lineTo(v, 512)
    ctx.moveTo(0, v)
    ctx.lineTo(512, v)
    ctx.stroke()
  }
  ctx.fillStyle = 'rgba(55,60,70,0.7)'
  for (const x of [14, 242, 270, 498]) for (const y of [14, 242, 270, 498]) {
    ctx.beginPath()
    ctx.arc(x, y, 3.5, 0, Math.PI * 2)
    ctx.fill()
  }
  // Velcro strips where loose items are stuck in low gravity.
  ctx.fillStyle = 'rgba(70,74,82,0.35)'
  ctx.fillRect(60, 120, 90, 16)
  ctx.fillRect(330, 380, 70, 16)
  return texture(c)
}

/** Interior floor: dark anti-slip plates with a raised diamond pattern and yellow edge marks. */
export function floorPlateTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(256)
  ctx.fillStyle = '#3b3f46'
  ctx.fillRect(0, 0, 256, 256)
  ctx.fillStyle = 'rgba(255,255,255,0.07)'
  for (let y = 0; y < 256; y += 16) {
    for (let x = (y / 16) % 2 ? 8 : 0; x < 256; x += 16) {
      ctx.save()
      ctx.translate(x + 4, y + 4)
      ctx.rotate(Math.PI / 4)
      ctx.fillRect(-4, -1.2, 8, 2.4)
      ctx.restore()
    }
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'
  ctx.lineWidth = 3
  ctx.strokeRect(1.5, 1.5, 253, 253)
  return texture(c)
}

/** Yellow and black hazard stripes for door frames and edges. */
export function hazardStripeTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(128)
  ctx.fillStyle = '#f2b81c'
  ctx.fillRect(0, 0, 128, 128)
  ctx.fillStyle = '#16171a'
  for (let i = -128; i < 256; i += 32) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i + 16, 0)
    ctx.lineTo(i + 16 + 128, 128)
    ctx.lineTo(i + 128, 128)
    ctx.closePath()
    ctx.fill()
  }
  return texture(c)
}

/** The radiation trefoil (ISO 361): black on yellow, understood without words. */
export function trefoilTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(256)
  ctx.fillStyle = '#f2c21c'
  ctx.beginPath()
  ctx.arc(128, 128, 124, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#16171a'
  ctx.lineWidth = 8
  ctx.stroke()
  ctx.fillStyle = '#16171a'
  ctx.beginPath()
  ctx.arc(128, 128, 18, 0, Math.PI * 2)
  ctx.fill()
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 3
    ctx.beginPath()
    ctx.arc(128, 128, 98, a - Math.PI / 6, a + Math.PI / 6)
    ctx.arc(128, 128, 30, a + Math.PI / 6, a - Math.PI / 6, true)
    ctx.closePath()
    ctx.fill()
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
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
/**
 * The Milky Way as an equirectangular map whose equator is the galactic
 * plane: a diffuse band, wider and warmer towards the galactic centre (u = 0),
 * split by dark dust lanes, with soft star clouds and a few faint emission
 * nebulae. Kept dim and desaturated, as the eye or a camera sees it; the
 * individual stars are drawn separately (see sky.ts).
 */
export function milkyWayTexture(seed = 21): THREE.CanvasTexture {
  const w = 1024
  const h = 512
  const [c, ctx] = canvas(w)
  c.height = h
  const img = ctx.createImageData(w, h)
  const nebulae = [
    { l: -0.55, b: -0.02, r: 0.05, k: 0.5 },
    { l: 0.35, b: 0.015, r: 0.035, k: 0.4 },
    { l: 1.7, b: -0.03, r: 0.06, k: 0.3 },
    { l: -2.3, b: 0.02, r: 0.045, k: 0.25 },
  ]
  for (let y = 0; y < h; y++) {
    const b = (0.5 - (y + 0.5) / h) * Math.PI
    for (let x = 0; x < w; x++) {
      const u = (x + 0.5) / w
      let l = u * Math.PI * 2
      if (l > Math.PI) l -= Math.PI * 2
      const core = Math.exp(-((l / 1.1) ** 2))
      // About 15–20° wide in most of the sky, wider and brighter towards the centre.
      const sigma = 0.12 + 0.12 * Math.exp(-((l / 0.6) ** 2))
      const band = Math.exp(-((b / sigma) ** 2))
      const bulge = Math.exp(-((l / 0.32) ** 2 + (b / 0.15) ** 2))
      const n = fbm(u * 10, (b / Math.PI + 0.5) * 5, 5, seed, 10) * 0.5 + 0.5
      const clouds = 0.35 + 1.3 * n ** 1.6
      // Dust: the dark rift splitting the band towards the centre only, and patchy dust lanes.
      const rift = Math.exp(-(((b - 0.015 - 0.03 * Math.sin(l * 3)) / (0.022 + 0.03 * core)) ** 2)) * 0.75 * Math.exp(-((l / 1.0) ** 2))
      const patchy = Math.max(0, fbm(u * 32, (b / Math.PI + 0.5) * 16, 3, seed + 7, 32)) * 0.9
      const dust = Math.max(0.2, 1 - rift - patchy * 0.5)
      let v = (band * (0.45 + 0.55 * core) * clouds + bulge * 0.8) * dust
      v = Math.min(1, v)
      // Warm (old stars) towards the centre, neutral to cool white elsewhere: low saturation.
      const warm = Math.min(1, core * 0.9 + bulge * 0.6)
      let r = v * (205 + 40 * warm)
      let g = v * (212 + 18 * warm)
      let bl = v * (232 - 22 * warm)
      for (const n of nebulae) {
        const d = ((l - n.l) / n.r) ** 2 + ((b - n.b) / n.r) ** 2
        if (d < 9) {
          const k = Math.exp(-d) * n.k * (0.6 + 0.4 * clouds)
          r += 120 * k
          g += 38 * k
          bl += 52 * k
        }
      }
      const i = (y * w + x) * 4
      // Overall level: a soft glow, never brighter than the bright stars.
      img.data[i] = Math.min(255, r * 0.42)
      img.data[i + 1] = Math.min(255, g * 0.42)
      img.data[i + 2] = Math.min(255, bl * 0.42)
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** A small round, soft-edged dot: stars are points of light, not squares. */
export function starTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(32)
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.85)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 32, 32)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}
