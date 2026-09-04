import { useMemo, useState } from 'react'
import { levelAt } from '../game/levels'
import {
  DOORS,
  EXTRACTION_TILES,
  FLOOR_ROWS,
  MAP_H,
  MAP_W,
  findPath,
  openDoorTiles,
  sameTile,
  tileKey,
} from '../game/map'
import { isGated, useGame } from '../game/store'
import type { Station, Vec } from '../game/types'
import { CharacterAvatar } from './CharacterAvatar'

const T = 26 // tile size in viewBox units

function px(n: number): number {
  return n * T
}

/** A compact glyph per checkpoint kind, drawn on its lock tile. */
const LOCK_GLYPH: Record<Station['kind'], string> = {
  skill: '✦',
  keypad: '⌨',
  pattern: '⛁',
  terminal: '▮',
}

interface FloorMapProps {
  className?: string
}

export function FloorMap({ className = '' }: FloorMapProps) {
  const players = useGame((s) => s.players)
  const mode = useGame((s) => s.mode)
  const positions = useGame((s) => s.positions)
  const moverId = useGame((s) => s.moverId)
  const deviceHolderId = useGame((s) => s.deviceHolderId)
  const walking = useGame((s) => s.walking)
  const clearedStations = useGame((s) => s.clearedStations)
  const stations = useGame((s) => s.stations)
  const levelIndex = useGame((s) => s.levelIndex)
  const activeStationId = useGame((s) => s.activeStationId)
  const extractionPending = useGame((s) => s.extractionPending)
  const walkTo = useGame((s) => s.walkTo)
  const selectStation = useGame((s) => s.selectStation)

  const [hover, setHover] = useState<Vec | null>(null)

  const level = levelAt(levelIndex)
  const openDoors = useMemo(() => openDoorTiles(clearedStations), [clearedStations])
  const controlledId = mode === 'hotseat' ? deviceHolderId : moverId
  const controlled = players.find((p) => p.id === controlledId)
  const origin = controlledId ? positions[controlledId] : undefined

  const preview = useMemo(() => {
    if (!hover || !origin || walking) return null
    return findPath(origin, hover, openDoors)
  }, [hover, origin, walking, openDoors])

  /**
   * Several checkpoints can share a tile — all three terminal commands live at
   * the same desk — so markers are grouped per tile. The representative is the
   * one you could actually act on, never a gated sibling that would hide the
   * lock behind a "locked" notice.
   */
  const marks = useMemo(() => {
    interface Mark {
      at: Vec
      station: Station
      role: 'lock' | 'clue'
      solved: boolean
      pending: number
    }
    const groups = new Map<string, Station[]>()
    const roleOf = new Map<string, 'lock' | 'clue'>()

    for (const station of level.stations) {
      const lockKey = `${tileKey(station.lockAt)}|lock`
      groups.set(lockKey, [...(groups.get(lockKey) ?? []), station])
      roleOf.set(lockKey, 'lock')
      if (station.clueAt) {
        const clueKey = `${tileKey(station.clueAt)}|clue`
        groups.set(clueKey, [...(groups.get(clueKey) ?? []), station])
        roleOf.set(clueKey, 'clue')
      }
    }

    const out: Mark[] = []
    for (const [key, group] of groups) {
      const role = roleOf.get(key) ?? 'lock'
      const unsolved = group.filter((st) => !stations[st.id]?.solved)
      const representative =
        unsolved.find((st) => !isGated(st, stations)) ?? unsolved[0] ?? group[0]!
      const at = role === 'lock' ? representative.lockAt : representative.clueAt!
      out.push({
        at,
        station: representative,
        role,
        solved: unsolved.length === 0,
        pending: unsolved.length,
      })
    }
    return out
  }, [level, stations])

  const occupancy = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const player of players) {
      const pos = positions[player.id]
      if (!pos) continue
      const key = tileKey(pos)
      map.set(key, [...(map.get(key) ?? []), player.id])
    }
    return map
  }, [players, positions])

  return (
    <div className={className}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="label-caps">Bay 4B floor</span>
        {controlled ? (
          <span
            className="font-mono text-[10px] uppercase tracking-[0.14em]"
            style={{ color: controlled.accent }}
          >
            moving {controlled.name}
          </span>
        ) : null}
        <span className="ml-auto font-mono text-[10px] text-ink-faint">
          tap a tile to walk · 1s per step
        </span>
      </div>

      <div className="max-w-full overflow-x-auto rounded-xl border border-hairline bg-void p-2">
        <svg
          viewBox={`0 0 ${px(MAP_W)} ${px(MAP_H)}`}
          className="block w-full min-w-[560px]"
          role="img"
          aria-label="Floor plan of Bay 4B with the crew's positions and this stage's checkpoints."
          onPointerLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="mapFloor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1b2131" />
              <stop offset="100%" stopColor="#141a27" />
            </linearGradient>
          </defs>

          {/* ---- terrain ---- */}
          {FLOOR_ROWS.map((row, y) =>
            row.split('').map((cell, x) => {
              const pos = { x, y }
              const key = tileKey(pos)
              const isOpenDoor = cell === 'D' && openDoors.has(key)
              const walkable = cell === '.' || cell === 'E' || isOpenDoor
              const onPath = preview?.some((step) => sameTile(step, pos)) ?? false

              if (cell === '#') {
                return (
                  <rect
                    key={key}
                    x={px(x)}
                    y={px(y)}
                    width={T}
                    height={T}
                    fill="#080a11"
                    stroke="#1b2030"
                    strokeWidth="0.5"
                  />
                )
              }

              if (cell === '=') {
                return (
                  <g key={key}>
                    <rect
                      x={px(x)}
                      y={px(y)}
                      width={T}
                      height={T}
                      fill="#0e121b"
                    />
                    <rect
                      x={px(x) + 2.5}
                      y={px(y) + 4}
                      width={T - 5}
                      height={T - 8}
                      rx={2}
                      fill="#2c3446"
                    />
                  </g>
                )
              }

              if (cell === 'D') {
                const door = DOORS.find((d) => sameTile(d.at, pos))
                return (
                  <g key={key} className={isOpenDoor ? '' : 'animate-flicker'}>
                    <rect
                      x={px(x)}
                      y={px(y)}
                      width={T}
                      height={T}
                      fill={isOpenDoor ? '#0f1a18' : '#1c1016'}
                      onPointerEnter={() => (isOpenDoor ? setHover(pos) : undefined)}
                      onClick={() => (isOpenDoor ? walkTo(pos) : undefined)}
                      style={{ cursor: isOpenDoor ? 'pointer' : 'not-allowed' }}
                    />
                    <rect
                      x={px(x) + 3}
                      y={px(y) + 6}
                      width={T - 6}
                      height={T - 12}
                      rx={1.5}
                      fill="none"
                      stroke={isOpenDoor ? '#35f2c0' : '#ff4d6d'}
                      strokeWidth="1.6"
                      strokeDasharray={isOpenDoor ? '3 3' : undefined}
                    />
                    <title>
                      {door ? `${door.label} door — ` : ''}
                      {isOpenDoor ? 'open' : 'sealed'}
                    </title>
                  </g>
                )
              }

              // floor or extraction pad
              return (
                <rect
                  key={key}
                  x={px(x) + 0.5}
                  y={px(y) + 0.5}
                  width={T - 1}
                  height={T - 1}
                  rx={2}
                  fill={
                    cell === 'E'
                      ? extractionPending
                        ? '#123a30'
                        : '#111a20'
                      : onPath
                        ? '#16302b'
                        : 'url(#mapFloor)'
                  }
                  stroke={
                    cell === 'E'
                      ? extractionPending
                        ? '#35f2c0'
                        : '#25505f'
                      : onPath
                        ? '#35f2c0'
                        : '#1a2030'
                  }
                  strokeWidth={onPath || cell === 'E' ? 1.2 : 0.6}
                  onPointerEnter={() => setHover(pos)}
                  onClick={() => walkTo(pos)}
                  style={{ cursor: walkable ? 'pointer' : 'default' }}
                />
              )
            }),
          )}

          {/* ---- extraction pad markers ---- */}
          {extractionPending
            ? EXTRACTION_TILES.map((tile) => (
                <text
                  key={`pad-${tileKey(tile)}`}
                  pointerEvents="none"
                  x={px(tile.x) + T / 2}
                  y={px(tile.y) + T / 2 + 4}
                  textAnchor="middle"
                  fill="#35f2c0"
                  fontFamily="monospace"
                  fontSize="11"
                  opacity="0.55"
                >
                  ▲
                </text>
              ))
            : null}

          {/* ---- checkpoints ---- */}
          {marks.map((mark) => {
            const active = mark.station.id === activeStationId
            const colour = mark.solved
              ? '#35f2c0'
              : mark.role === 'lock'
                ? '#ffb43a'
                : '#45d0ff'
            return (
              <g
                key={`${mark.station.id}-${mark.role}-${tileKey(mark.at)}`}
                onPointerEnter={() => setHover(mark.at)}
                onClick={() => {
                  // Tapping a checkpoint both focuses it and walks the
                  // controlled token there — the marker must never swallow
                  // the movement click on its own tile.
                  walkTo(mark.at)
                  selectStation(mark.station.id)
                }}
                style={{ cursor: 'pointer' }}
              >
                <rect
                  x={px(mark.at.x) + 1.5}
                  y={px(mark.at.y) + 1.5}
                  width={T - 3}
                  height={T - 3}
                  rx={3}
                  fill={`${colour}1f`}
                  stroke={colour}
                  strokeWidth={active ? 2 : 1.1}
                  strokeDasharray={mark.role === 'clue' ? '3 2.5' : undefined}
                />
                <text
                  x={px(mark.at.x) + T / 2}
                  y={px(mark.at.y) + T / 2 + 4}
                  textAnchor="middle"
                  fill={colour}
                  fontFamily="monospace"
                  fontSize="12"
                >
                  {mark.solved
                    ? '✓'
                    : mark.role === 'clue'
                      ? '🔎'
                      : LOCK_GLYPH[mark.station.kind]}
                </text>
                {mark.pending > 1 ? (
                  <text
                    x={px(mark.at.x) + T - 4}
                    y={px(mark.at.y) + 8}
                    textAnchor="end"
                    fill={colour}
                    fontFamily="monospace"
                    fontSize="7.5"
                    fontWeight="bold"
                  >
                    ×{mark.pending}
                  </text>
                ) : null}
                <title>
                  {mark.role === 'lock'
                    ? `${mark.station.title} — operator stands here${
                        mark.pending > 1 ? ` (${mark.pending} commands left here)` : ''
                      }`
                    : `${mark.station.clueLabel ?? 'Reference'} — a second player stands here`}
                </title>
              </g>
            )
          })}

          {/* ---- crew tokens ---- */}
          {players.map((player) => {
            const pos = positions[player.id]
            if (!pos) return null
            const stack = occupancy.get(tileKey(pos)) ?? []
            const slot = stack.indexOf(player.id)
            const crowded = stack.length > 1
            const spread = crowded ? (slot - (stack.length - 1) / 2) * 11 : 0
            const isControlled = player.id === controlledId
            const isWalking = walking?.playerId === player.id
            return (
              <g
                key={player.id}
                transform={`translate(${px(pos.x) + T / 2 + spread}, ${px(pos.y) + T / 2})`}
                // Tokens never swallow a click: two people often need the same
                // tile, so the floor underneath has to stay reachable.
                pointerEvents="none"
                style={{ transition: isWalking ? 'none' : 'transform 140ms ease-out' }}
              >
                {isControlled ? (
                  <circle r={13} fill="none" stroke={player.accent} strokeWidth="1.6">
                    <animate
                      attributeName="r"
                      values="11;14;11"
                      dur="1.8s"
                      repeatCount="indefinite"
                    />
                  </circle>
                ) : null}
                <circle r={10} fill="#080a11" opacity="0.85" />
                <g transform="translate(-11, -12)">
                  <CharacterAvatar
                    appearance={player.appearance}
                    accent={player.accent}
                    size="token"
                    title={player.name}
                  />
                </g>
                <text
                  // Names on a shared tile stagger downward instead of being
                  // truncated: "Mar" and "Mat" are not worth telling apart.
                  y={20 + (crowded ? slot * 7 : 0)}
                  textAnchor="middle"
                  fill={player.accent}
                  fontFamily="monospace"
                  fontSize={crowded ? 6.5 : 7.5}
                  fontWeight="bold"
                >
                  {player.name.slice(0, 8)}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] text-ink-faint">
        <span>
          <span className="text-amber-signal">▨</span> checkpoint
        </span>
        <span>
          <span className="text-cyan-signal">🔎</span> look-here tile
        </span>
        <span>
          <span className="text-neon">✓</span> cleared
        </span>
        <span>
          <span className="text-flare">▯</span> sealed door
        </span>
        {extractionPending ? (
          <span className="text-neon">▲ get everyone to the lift lobby</span>
        ) : null}
      </div>
    </div>
  )
}
