import type { Vec } from './types'

/**
 * Bay 4B as one persistent floor plan. All three stages play out on this map —
 * clearing a checkpoint opens the door to the next area, so the map is the
 * campaign's progress bar.
 *
 *   #  wall            .  floor
 *   =  furniture       D  door (blocked until its checkpoint clears)
 *   E  extraction pad (the lift lobby)
 */
export const FLOOR_ROWS = [
  '##########################',
  '#.===..#.===....#...===..#',
  '#......#........#........#',
  '#......#........#........#',
  '#......#=.......#........#',
  '#......#=.......#.==.....#',
  '#......#........#........#',
  '#......#........#........#',
  '###D#######D########D#####',
  '#....................#...#',
  '#.......=........=...#...#',
  '#.......=........=...DEEE#',
  '#....................#EEE#',
  '##########################',
] as const

export const MAP_W = FLOOR_ROWS[0].length
export const MAP_H = FLOOR_ROWS.length

export type Terrain = '#' | '.' | '=' | 'D' | 'E'

export interface DoorSpec {
  at: Vec
  /** Station id whose completion unseals this door. */
  opensWith: string
  label: string
}

export const DOORS: DoorSpec[] = [
  { at: { x: 3, y: 8 }, opensWith: 'standup-keypad', label: 'Standup room' },
  { at: { x: 11, y: 8 }, opensWith: 'standup-keypad', label: 'Kitchen' },
  { at: { x: 20, y: 8 }, opensWith: 'coldbrew-pattern', label: 'Desk bay' },
  { at: { x: 21, y: 11 }, opensWith: 'afterhours-exec', label: 'Lift lobby' },
]

/** Named areas, used for the map legend and "you are in…" read-outs. */
export const AREAS = [
  { label: 'Standup room', x: 1, y: 1, w: 6, h: 7 },
  { label: 'Kitchen', x: 8, y: 1, w: 8, h: 7 },
  { label: 'Desk bay', x: 17, y: 1, w: 8, h: 7 },
  { label: 'Main corridor', x: 1, y: 9, w: 20, h: 4 },
  { label: 'Lift lobby', x: 22, y: 9, w: 3, h: 4 },
] as const

export function terrainAt(pos: Vec): Terrain {
  if (pos.x < 0 || pos.y < 0 || pos.x >= MAP_W || pos.y >= MAP_H) return '#'
  return (FLOOR_ROWS[pos.y]?.[pos.x] ?? '#') as Terrain
}

export function sameTile(a: Vec | undefined, b: Vec | undefined): boolean {
  return Boolean(a && b && a.x === b.x && a.y === b.y)
}

export function tileKey(pos: Vec): string {
  return `${pos.x},${pos.y}`
}

export function areaAt(pos: Vec): string {
  const area = AREAS.find(
    (a) => pos.x >= a.x && pos.x < a.x + a.w && pos.y >= a.y && pos.y < a.y + a.h,
  )
  return area?.label ?? 'Bay 4B'
}

/** Doors are the only terrain whose passability changes during a run. */
export function isWalkable(pos: Vec, openDoors: Set<string>): boolean {
  const t = terrainAt(pos)
  if (t === '#' || t === '=') return false
  if (t === 'D') return openDoors.has(tileKey(pos))
  return true
}

export function openDoorTiles(clearedStations: readonly string[]): Set<string> {
  const cleared = new Set(clearedStations)
  return new Set(
    DOORS.filter((d) => cleared.has(d.opensWith)).map((d) => tileKey(d.at)),
  )
}

const STEPS: Vec[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
]

/**
 * Breadth-first walk. Players never block each other — six coworkers crowding
 * one terminal is the point — so only terrain matters.
 */
export function findPath(from: Vec, to: Vec, openDoors: Set<string>): Vec[] | null {
  if (sameTile(from, to)) return []
  if (!isWalkable(to, openDoors)) return null

  const cameFrom = new Map<string, string | null>([[tileKey(from), null]])
  const queue: Vec[] = [from]
  const target = tileKey(to)

  while (queue.length > 0) {
    const current = queue.shift()!
    for (const step of STEPS) {
      const next = { x: current.x + step.x, y: current.y + step.y }
      const key = tileKey(next)
      if (cameFrom.has(key) || !isWalkable(next, openDoors)) continue
      cameFrom.set(key, tileKey(current))
      if (key === target) {
        const path: Vec[] = []
        let cursor: string | null = key
        while (cursor && cursor !== tileKey(from)) {
          const [x, y] = cursor.split(',').map(Number)
          path.unshift({ x: x!, y: y! })
          cursor = cameFrom.get(cursor) ?? null
        }
        return path
      }
      queue.push(next)
    }
  }
  return null
}

export function reachableFrom(origins: Vec[], openDoors: Set<string>): Set<string> {
  const seen = new Set<string>()
  const queue: Vec[] = []
  for (const origin of origins) {
    if (!isWalkable(origin, openDoors)) continue
    seen.add(tileKey(origin))
    queue.push(origin)
  }
  while (queue.length > 0) {
    const current = queue.shift()!
    for (const step of STEPS) {
      const next = { x: current.x + step.x, y: current.y + step.y }
      const key = tileKey(next)
      if (seen.has(key) || !isWalkable(next, openDoors)) continue
      seen.add(key)
      queue.push(next)
    }
  }
  return seen
}

/** Every extraction pad on the floor. */
export const EXTRACTION_TILES: Vec[] = FLOOR_ROWS.flatMap((row, y) =>
  row
    .split('')
    .flatMap((cell, x) => (cell === 'E' ? [{ x, y }] : [])),
)

/**
 * Authoring guard: a map typo that strands a checkpoint should fail loudly at
 * import time, not halfway through somebody's game night.
 */
export function assertReachable(
  label: string,
  spawns: Vec[],
  required: Vec[],
  openDoors: Set<string>,
): void {
  for (const spawn of spawns) {
    if (!isWalkable(spawn, openDoors)) {
      throw new Error(`${label}: spawn ${tileKey(spawn)} is not walkable`)
    }
  }
  const reachable = reachableFrom(spawns, openDoors)
  for (const tile of required) {
    if (!isWalkable(tile, openDoors)) {
      throw new Error(`${label}: tile ${tileKey(tile)} is not walkable`)
    }
    if (!reachable.has(tileKey(tile))) {
      throw new Error(`${label}: tile ${tileKey(tile)} is unreachable from spawn`)
    }
  }
}

if (FLOOR_ROWS.some((row) => row.length !== MAP_W)) {
  throw new Error('FLOOR_ROWS: every row must be the same width')
}
