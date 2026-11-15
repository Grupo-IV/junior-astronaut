/**
 * @file
 * @brief Collisions for people walking on the ground plane (x, z).
 *
 * Nothing in the game falls or tumbles: people walk on level floors around
 * fixed hardware. So bodies are vertical cylinders (circles on the floor plan)
 * and the world is made of:
 * - obstacles: circles and (rotated) boxes a body cannot enter;
 * - walkable areas: rectangles and discs a body must stay inside (rooms,
 *   doorways). A door is an area that is switched off while it is closed.
 *
 * Moving is done in small sub-steps and every step is pushed back to the
 * nearest free spot, so a body slides along walls and round corners and can
 * never tunnel through a thin wall, whatever its speed or the frame rate.
 */

export interface Point {
  x: number
  z: number
}

export type Obstacle =
  | { kind: 'circle'; x: number; z: number; r: number; id?: string }
  | { kind: 'box'; x: number; z: number; hx: number; hz: number; rot?: number; id?: string }

export type Area =
  | { kind: 'rect'; minX: number; maxX: number; minZ: number; maxZ: number; id?: string }
  | { kind: 'disc'; x: number; z: number; r: number; id?: string }

const EPS = 1e-4

export class CollisionWorld {
  private obstacles: Obstacle[] = []
  private areas: Area[] = []
  private disabled = new Set<string>()

  addObstacle(o: Obstacle) {
    this.obstacles.push(o)
    return this
  }

  addArea(a: Area) {
    this.areas.push(a)
    return this
  }

  /** Switches a named obstacle or area on or off (a door opening, a door closing). */
  setEnabled(id: string, enabled: boolean) {
    if (enabled) this.disabled.delete(id)
    else this.disabled.add(id)
  }

  clearObstacles(id: string) {
    this.obstacles = this.obstacles.filter((o) => o.id !== id)
  }

  private on(item: { id?: string }) {
    return !item.id || !this.disabled.has(item.id)
  }

  /** Is a body of `radius` at (x, z) overlapping anything, or outside every walkable area? */
  blocked(x: number, z: number, radius: number): boolean {
    for (const o of this.obstacles) if (this.on(o) && penetration(o, x, z, radius)) return true
    const areas = this.areas.filter((a) => this.on(a))
    if (areas.length === 0) return false
    return !areas.some((a) => insideArea(a, x, z, radius))
  }

  /** The nearest free position to (x, z). */
  resolve(x: number, z: number, radius: number): Point {
    let px = x
    let pz = z
    for (let i = 0; i < 12; i++) {
      let moved = false
      for (const o of this.obstacles) {
        if (!this.on(o)) continue
        const push = penetration(o, px, pz, radius)
        if (push) {
          px += push.x
          pz += push.z
          moved = true
        }
      }
      const areas = this.areas.filter((a) => this.on(a))
      if (areas.length > 0 && !areas.some((a) => insideArea(a, px, pz, radius))) {
        let best: Point | null = null
        let bestD = Infinity
        for (const a of areas) {
          const c = closestInArea(a, px, pz, radius)
          const d = (c.x - px) ** 2 + (c.z - pz) ** 2
          if (d < bestD) {
            bestD = d
            best = c
          }
        }
        if (best) {
          px = best.x
          pz = best.z
          moved = true
        }
      }
      if (!moved) break
    }
    return { x: px, z: pz }
  }

  /** Moves a body by (dx, dz), sliding along whatever it touches. */
  move(x: number, z: number, dx: number, dz: number, radius: number): Point {
    const length = Math.hypot(dx, dz)
    const steps = Math.max(1, Math.ceil(length / (radius * 0.4)))
    let p: Point = { x, z }
    for (let i = 0; i < steps; i++) {
      const next = this.resolve(p.x + dx / steps, p.z + dz / steps, radius)
      // A gap narrower than the body: stay at the last free spot instead of squeezing in.
      if (this.blocked(next.x, next.z, radius * 0.98)) break
      p = next
    }
    return p
  }

  /** Can a body walk in a straight line from a to b? (sampled every 15 cm) */
  clearPath(a: Point, b: Point, radius: number): boolean {
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.15))
    for (let i = 0; i <= n; i++) {
      const t = i / n
      if (this.blocked(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, radius)) return false
    }
    return true
  }
}

export interface Opening {
  /** Which wall: the one at maxX (+x), minX (−x), maxZ (+z) or minZ (−z). */
  side: '+x' | '-x' | '+z' | '-z'
  /** Where along the wall the gap starts and ends (z for x walls, x for z walls). */
  from: number
  to: number
}

/**
 * Walls (thick boxes just outside the edges) around a rectangular room, with
 * gaps for doorways. Rooms joined by doorways are just several of these.
 */
export function addRoomWalls(world: CollisionWorld, minX: number, maxX: number, minZ: number, maxZ: number, openings: Opening[] = [], thickness = 0.3) {
  const t = thickness / 2
  const wall = (side: Opening['side'], a0: number, a1: number) => {
    const gaps = openings.filter((o) => o.side === side).sort((p, q) => p.from - q.from)
    let a = a0
    const segments: [number, number][] = []
    for (const g of gaps) {
      if (g.from > a) segments.push([a, g.from])
      a = Math.max(a, g.to)
    }
    if (a < a1) segments.push([a, a1])
    for (const [segStart, segEnd] of segments) {
      // Close the room's corners, but never reach into a doorway.
      const s0 = segStart === a0 && hasCorner(side, a0) ? segStart - 2 * t : segStart
      const s1 = segEnd === a1 && hasCorner(side, a1) ? segEnd + 2 * t : segEnd
      const mid = (s0 + s1) / 2
      const half = (s1 - s0) / 2
      if (side === '+x') world.addObstacle({ kind: 'box', x: maxX + t, z: mid, hx: t, hz: half })
      if (side === '-x') world.addObstacle({ kind: 'box', x: minX - t, z: mid, hx: t, hz: half })
      if (side === '+z') world.addObstacle({ kind: 'box', x: mid, z: maxZ + t, hx: half, hz: t })
      if (side === '-z') world.addObstacle({ kind: 'box', x: mid, z: minZ - t, hx: half, hz: t })
    }
  }
  /** Is there a wall on the perpendicular side where this wall ends (a real corner)? */
  const hasCorner = (side: Opening['side'], at: number) => {
    const across: Opening['side'] = side === '+x' || side === '-x' ? (at === maxZ ? '+z' : '-z') : at === maxX ? '+x' : '-x'
    const corner = side === '+x' ? maxX : side === '-x' ? minX : side === '+z' ? maxZ : minZ
    return !openings.some((o) => o.side === across && corner >= o.from - EPS && corner <= o.to + EPS)
  }
  wall('+x', minZ, maxZ)
  wall('-x', minZ, maxZ)
  wall('+z', minX, maxX)
  wall('-z', minX, maxX)
}

/** How far to push a body out of an obstacle, or null if they do not touch. */
function penetration(o: Obstacle, x: number, z: number, radius: number): Point | null {
  if (o.kind === 'circle') {
    const dx = x - o.x
    const dz = z - o.z
    const d = Math.hypot(dx, dz)
    const min = o.r + radius
    if (d >= min) return null
    if (d < EPS) return { x: min, z: 0 }
    const k = (min - d) / d
    return { x: dx * k, z: dz * k }
  }
  // Box: work in the box's own frame.
  const c = Math.cos(-(o.rot ?? 0))
  const s = Math.sin(-(o.rot ?? 0))
  const lx = (x - o.x) * c - (z - o.z) * s
  const lz = (x - o.x) * s + (z - o.z) * c
  const cx = Math.max(-o.hx, Math.min(o.hx, lx))
  const cz = Math.max(-o.hz, Math.min(o.hz, lz))
  let pushX: number
  let pushZ: number
  if (cx === lx && cz === lz) {
    // Centre inside the box: leave by the nearest side.
    const toX = o.hx - Math.abs(lx)
    const toZ = o.hz - Math.abs(lz)
    if (toX < toZ) {
      pushX = (toX + radius) * Math.sign(lx || 1)
      pushZ = 0
    } else {
      pushX = 0
      pushZ = (toZ + radius) * Math.sign(lz || 1)
    }
  } else {
    const dx = lx - cx
    const dz = lz - cz
    const d = Math.hypot(dx, dz)
    if (d >= radius) return null
    const k = (radius - d) / Math.max(d, EPS)
    pushX = dx * k
    pushZ = dz * k
  }
  // Back to the world frame.
  const wc = Math.cos(o.rot ?? 0)
  const ws = Math.sin(o.rot ?? 0)
  return { x: pushX * wc - pushZ * ws, z: pushX * ws + pushZ * wc }
}

function insideArea(a: Area, x: number, z: number, radius: number): boolean {
  if (a.kind === 'rect') return x >= a.minX + radius - EPS && x <= a.maxX - radius + EPS && z >= a.minZ + radius - EPS && z <= a.maxZ - radius + EPS
  return Math.hypot(x - a.x, z - a.z) <= a.r - radius + EPS
}

function closestInArea(a: Area, x: number, z: number, radius: number): Point {
  if (a.kind === 'rect') {
    const minX = a.minX + radius
    const maxX = a.maxX - radius
    const minZ = a.minZ + radius
    const maxZ = a.maxZ - radius
    return { x: minX > maxX ? (a.minX + a.maxX) / 2 : Math.max(minX, Math.min(maxX, x)), z: minZ > maxZ ? (a.minZ + a.maxZ) / 2 : Math.max(minZ, Math.min(maxZ, z)) }
  }
  const dx = x - a.x
  const dz = z - a.z
  const d = Math.hypot(dx, dz)
  const max = Math.max(0, a.r - radius)
  if (d <= max || d < EPS) return { x, z }
  return { x: a.x + (dx / d) * max, z: a.z + (dz / d) * max }
}

/**
 * Grid path finding (A*) over a collision world, for people who walk on their
 * own (the crewmate outside). Paths are smoothed so they do not zig-zag.
 */
export class NavGrid {
  private cols: number
  private rows: number
  private free: Uint8Array

  constructor(
    private world: CollisionWorld,
    private minX: number,
    private minZ: number,
    maxX: number,
    maxZ: number,
    private cell: number,
    private radius: number,
  ) {
    this.cols = Math.ceil((maxX - minX) / cell)
    this.rows = Math.ceil((maxZ - minZ) / cell)
    this.free = new Uint8Array(this.cols * this.rows)
    this.rebuild()
  }

  rebuild() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const p = this.centre(c, r)
        this.free[r * this.cols + c] = this.world.blocked(p.x, p.z, this.radius) ? 0 : 1
      }
    }
  }

  private centre(c: number, r: number): Point {
    return { x: this.minX + (c + 0.5) * this.cell, z: this.minZ + (r + 0.5) * this.cell }
  }

  private cellOf(p: Point): [number, number] {
    return [Math.max(0, Math.min(this.cols - 1, Math.floor((p.x - this.minX) / this.cell))), Math.max(0, Math.min(this.rows - 1, Math.floor((p.z - this.minZ) / this.cell)))]
  }

  /** The nearest free cell centre to p (p itself if it is free). */
  nearestFree(p: Point): Point | null {
    const [c0, r0] = this.cellOf(p)
    for (let ring = 0; ring < Math.max(this.cols, this.rows); ring++) {
      let best: Point | null = null
      let bestD = Infinity
      for (let r = r0 - ring; r <= r0 + ring; r++) {
        for (let c = c0 - ring; c <= c0 + ring; c++) {
          if (Math.max(Math.abs(r - r0), Math.abs(c - c0)) !== ring) continue
          if (c < 0 || r < 0 || c >= this.cols || r >= this.rows || !this.free[r * this.cols + c]) continue
          const q = this.centre(c, r)
          const d = (q.x - p.x) ** 2 + (q.z - p.z) ** 2
          if (d < bestD) {
            bestD = d
            best = q
          }
        }
      }
      if (best) return ring === 0 && !this.world.blocked(p.x, p.z, this.radius) ? p : best
    }
    return null
  }

  /** A walkable path from a to b (b is moved to the nearest free spot), or [] if there is none. */
  path(a: Point, b: Point): Point[] {
    const start = this.nearestFree(a)
    const goal = this.nearestFree(b)
    if (!start || !goal) return []
    if (this.world.clearPath(start, goal, this.radius)) return [goal]
    const [sc, sr] = this.cellOf(start)
    const [gc, gr] = this.cellOf(goal)
    const n = this.cols * this.rows
    const g = new Float32Array(n).fill(Infinity)
    const came = new Int32Array(n).fill(-1)
    const closed = new Uint8Array(n)
    const heap = new MinHeap()
    const f = (i: number, gi: number) => gi + Math.hypot(gc - (i % this.cols), gr - Math.floor(i / this.cols))
    const startI = sr * this.cols + sc
    const goalI = gr * this.cols + gc
    g[startI] = 0
    heap.push(startI, f(startI, 0))
    while (heap.size > 0) {
      const cur = heap.pop()
      if (closed[cur]) continue
      if (cur === goalI) break
      closed[cur] = 1
      const cc = cur % this.cols
      const cr = (cur - cc) / this.cols
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue
          const nc = cc + dc
          const nr = cr + dr
          if (nc < 0 || nr < 0 || nc >= this.cols || nr >= this.rows) continue
          const ni = nr * this.cols + nc
          if (!this.free[ni] || closed[ni]) continue
          // No cutting corners diagonally.
          if (dr && dc && (!this.free[cr * this.cols + nc] || !this.free[nr * this.cols + cc])) continue
          const cost = g[cur] + (dr && dc ? Math.SQRT2 : 1)
          if (cost < g[ni]) {
            g[ni] = cost
            came[ni] = cur
            heap.push(ni, f(ni, cost))
          }
        }
      }
    }
    if (came[goalI] < 0 && goalI !== startI) return []
    const cells: Point[] = []
    for (let i = goalI; i !== startI && i >= 0; i = came[i]) cells.push(this.centre(i % this.cols, Math.floor(i / this.cols)))
    cells.reverse()
    cells[cells.length - 1] = goal
    // String pulling: keep only the turns needed to stay on free cells.
    const smooth: Point[] = []
    let from = start
    let i = 0
    while (i < cells.length) {
      let j = i
      while (j + 1 < cells.length && this.lineFree(from, cells[j + 1])) j++
      smooth.push(cells[j])
      from = cells[j]
      i = j + 1
    }
    return smooth
  }

  /** Line of sight over the precomputed free cells (cheap: no obstacle tests). */
  private lineFree(a: Point, b: Point): boolean {
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / (this.cell * 0.35)))
    for (let k = 0; k <= n; k++) {
      const t = k / n
      const [c, r] = this.cellOf({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t })
      if (!this.free[r * this.cols + c]) return false
    }
    return true
  }
}

/** Binary min-heap of (index, priority) pairs for A*. */
class MinHeap {
  private items: number[] = []
  private keys: number[] = []

  get size() {
    return this.items.length
  }

  push(item: number, key: number) {
    this.items.push(item)
    this.keys.push(key)
    let i = this.items.length - 1
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (this.keys[parent] <= this.keys[i]) break
      this.swap(i, parent)
      i = parent
    }
  }

  pop(): number {
    const top = this.items[0]
    const lastItem = this.items.pop()!
    const lastKey = this.keys.pop()!
    if (this.items.length > 0) {
      this.items[0] = lastItem
      this.keys[0] = lastKey
      let i = 0
      for (;;) {
        const l = 2 * i + 1
        const r = l + 1
        let m = i
        if (l < this.items.length && this.keys[l] < this.keys[m]) m = l
        if (r < this.items.length && this.keys[r] < this.keys[m]) m = r
        if (m === i) break
        this.swap(i, m)
        i = m
      }
    }
    return top
  }

  private swap(a: number, b: number) {
    ;[this.items[a], this.items[b]] = [this.items[b], this.items[a]]
    ;[this.keys[a], this.keys[b]] = [this.keys[b], this.keys[a]]
  }
}
