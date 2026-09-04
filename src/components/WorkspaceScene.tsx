import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import {
  MAX_TILES,
  MIN_TILES,
  NOTE_SWATCH,
  ROOM_PLATE,
  checksumFormula,
  legendFor,
  mugLabels,
  notesFor,
} from '../game/scene'
import type { Calibration } from '../game/types'
import { Button, Chip } from './ui/kit'

export type SceneFocus = 'notes' | 'rack' | 'badge' | 'tiles' | 'monitor' | null

interface WorkspaceSceneProps {
  calibration: Calibration
  focus?: SceneFocus
  className?: string
}

const VIEW_W = 1180
const VIEW_H = 640

/** Floor-tile band, in viewBox units. */
const TILE_TOP = 470
const TILE_H = 76
const PILLAR_A_RIGHT = 126
const PILLAR_B_LEFT = 800

const RACK_X = 484
const RACK_Y = 156
const CELL_W = 44
const CELL_H = 38
const CELL_GAP = 6

function cellRect(index: number): { x: number; y: number } {
  const col = index % 3
  const row = Math.floor(index / 3)
  return {
    x: RACK_X + col * (CELL_W + CELL_GAP),
    y: RACK_Y + row * (CELL_H + CELL_GAP),
  }
}

export function WorkspaceScene({
  calibration,
  focus = null,
  className = '',
}: WorkspaceSceneProps) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(
    null,
  )
  const [showPhoto, setShowPhoto] = useState(Boolean(calibration.photoDataUrl))

  const notes = useMemo(() => notesFor(calibration.keypadCode), [calibration.keypadCode])
  const legend = useMemo(() => legendFor(calibration.keypadCode), [calibration.keypadCode])
  const mugs = useMemo(() => mugLabels(calibration.patternCells), [calibration.patternCells])
  const tileCount = Math.min(
    MAX_TILES,
    Math.max(MIN_TILES, Number(calibration.tileCount) || MIN_TILES),
  )
  const tileWidth = (PILLAR_B_LEFT - PILLAR_A_RIGHT) / tileCount

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (zoom === 1) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag) return
    const limit = 260 * (zoom - 1)
    setPan({
      x: Math.max(-limit, Math.min(limit, drag.panX + (e.clientX - drag.x))),
      y: Math.max(-limit, Math.min(limit, drag.panY + (e.clientY - drag.y))),
    })
  }

  function onPointerUp() {
    dragRef.current = null
  }

  function setZoomLevel(next: number) {
    const clamped = Math.min(3, Math.max(1, Number(next.toFixed(2))))
    setZoom(clamped)
    if (clamped === 1) setPan({ x: 0, y: 0 })
  }

  const usingPhoto = showPhoto && Boolean(calibration.photoDataUrl)

  return (
    <div className={className}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Chip accent="#45d0ff">Bay 4B · {ROOM_PLATE}</Chip>
        {calibration.photoDataUrl ? (
          <div className="flex overflow-hidden rounded-lg border border-hairline">
            <button
              type="button"
              onClick={() => setShowPhoto(false)}
              className={`px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${
                usingPhoto ? 'text-ink-faint hover:text-ink' : 'bg-neon/15 text-neon'
              }`}
            >
              Drawn bay
            </button>
            <button
              type="button"
              onClick={() => setShowPhoto(true)}
              className={`border-l border-hairline px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${
                usingPhoto ? 'bg-neon/15 text-neon' : 'text-ink-faint hover:text-ink'
              }`}
            >
              Your photo
            </button>
          </div>
        ) : null}
        <div className="ml-auto flex items-center gap-1.5">
          <Button size="sm" tone="quiet" onClick={() => setZoomLevel(zoom - 0.5)} title="Zoom out">
            −
          </Button>
          <span className="w-12 text-center font-mono text-[10px] text-ink-faint">
            {zoom.toFixed(1)}×
          </span>
          <Button size="sm" tone="quiet" onClick={() => setZoomLevel(zoom + 0.5)} title="Zoom in">
            +
          </Button>
          <Button
            size="sm"
            tone="quiet"
            onClick={() => {
              setZoom(1)
              setPan({ x: 0, y: 0 })
            }}
          >
            Reset
          </Button>
        </div>
      </div>

      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative max-w-full overflow-hidden rounded-xl border border-hairline bg-void"
        style={{ cursor: zoom > 1 ? 'grab' : 'default', touchAction: 'none' }}
      >
        <div
          className="origin-center transition-transform duration-150 ease-out"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
        >
          {usingPhoto ? (
            <img
              src={calibration.photoDataUrl ?? ''}
              alt={calibration.photoName ?? 'Uploaded workspace photo'}
              className="block w-full select-none"
              draggable={false}
            />
          ) : (
            <svg
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              className="block w-full select-none"
              role="img"
              aria-label="Workspace bay 4B: whiteboard with sticky notes, a coffee rack of numbered mugs, a floor terminal, an access badge and a tiled floor between two pillars."
            >
              <defs>
                <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#141926" />
                  <stop offset="100%" stopColor="#0d1017" />
                </linearGradient>
                <linearGradient id="floorGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0f131c" />
                  <stop offset="100%" stopColor="#080a10" />
                </linearGradient>
                <linearGradient id="boardGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e9eef7" />
                  <stop offset="100%" stopColor="#ccd4e2" />
                </linearGradient>
                <linearGradient id="metal" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#2a3040" />
                  <stop offset="45%" stopColor="#3b4356" />
                  <stop offset="100%" stopColor="#232838" />
                </linearGradient>
                <radialGradient id="screenGlow" cx="0.5" cy="0.4" r="0.75">
                  <stop offset="0%" stopColor="#0d2a24" />
                  <stop offset="100%" stopColor="#060c0b" />
                </radialGradient>
                <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="9" />
                </filter>
              </defs>

              {/* ---- room shell ---- */}
              <rect width={VIEW_W} height={440} fill="url(#wall)" />
              <rect y={440} width={VIEW_W} height={VIEW_H - 440} fill="url(#floorGrad)" />
              <rect y={434} width={VIEW_W} height={8} fill="#1b2030" />
              <ellipse cx={590} cy={120} rx={520} ry={150} fill="#35f2c0" opacity="0.05" filter="url(#soft)" />

              {/* ---- ceiling strip lights ---- */}
              {[210, 590, 970].map((cx) => (
                <g key={`light-${cx}`}>
                  <rect x={cx - 90} y={14} width={180} height={9} rx={4} fill="#39445c" />
                  <rect x={cx - 84} y={16} width={168} height={5} rx={2} fill="#c9f7ec" opacity="0.5" />
                </g>
              ))}

              {/* ---- floor tiles: the countable run sits BETWEEN the pillars ---- */}
              <g>
                {Array.from({ length: tileCount }, (_, i) => {
                  const x = PILLAR_A_RIGHT + i * tileWidth
                  return (
                    <rect
                      key={`tile-${i}`}
                      x={x + 1.5}
                      y={TILE_TOP}
                      width={tileWidth - 3}
                      height={TILE_H}
                      rx={2}
                      fill={i % 2 === 0 ? '#161b26' : '#131822'}
                      stroke={focus === 'tiles' ? '#35f2c0' : '#212739'}
                      strokeWidth={focus === 'tiles' ? 1.6 : 1}
                    />
                  )
                })}
                {/* Off-run tiles. Counting the whole floor gives the wrong
                    number, so they are rendered dimmer and the counted run is
                    bracketed by end-caps at both pillars. */}
                {[0, 1].map((i) => (
                  <rect
                    key={`tile-left-${i}`}
                    x={PILLAR_A_RIGHT - (i + 1) * tileWidth + 1.5}
                    y={TILE_TOP}
                    width={tileWidth - 3}
                    height={TILE_H}
                    rx={2}
                    fill="#0c0f16"
                    stroke="#161b26"
                    strokeWidth={1}
                  />
                ))}
                {Array.from({ length: 7 }, (_, i) => (
                  <rect
                    key={`tile-right-${i}`}
                    x={836 + i * tileWidth + 1.5}
                    y={TILE_TOP}
                    width={tileWidth - 3}
                    height={TILE_H}
                    rx={2}
                    fill="#0c0f16"
                    stroke="#161b26"
                    strokeWidth={1}
                  />
                ))}
                {[PILLAR_A_RIGHT, PILLAR_B_LEFT].map((x) => (
                  <line
                    key={`cap-${x}`}
                    x1={x}
                    y1={TILE_TOP - 8}
                    x2={x}
                    y2={TILE_TOP + TILE_H + 8}
                    stroke={focus === 'tiles' ? '#35f2c0' : '#5d6780'}
                    strokeWidth={2}
                  />
                ))}
                <line
                  x1={PILLAR_A_RIGHT}
                  y1={TILE_TOP + TILE_H + 8}
                  x2={PILLAR_B_LEFT}
                  y2={TILE_TOP + TILE_H + 8}
                  stroke={focus === 'tiles' ? '#35f2c0' : '#39425a'}
                  strokeWidth={1.5}
                  strokeDasharray="6 5"
                />
                <text
                  x={(PILLAR_A_RIGHT + PILLAR_B_LEFT) / 2}
                  y={TILE_TOP + TILE_H + 24}
                  textAnchor="middle"
                  fill={focus === 'tiles' ? '#35f2c0' : '#4d566d'}
                  fontFamily="monospace"
                  fontSize="9"
                  letterSpacing="1.6"
                >
                  COUNTED RUN · PILLAR A → PILLAR B
                </text>
              </g>

              {/* ---- pillars ---- */}
              {[
                { x: 90, label: 'A' },
                { x: 800, label: 'B' },
              ].map((p) => (
                <g key={`pillar-${p.label}`}>
                  <rect x={p.x} y={26} width={36} height={444} fill="url(#metal)" />
                  <rect x={p.x - 6} y={26} width={48} height={12} rx={2} fill="#454f66" />
                  <rect x={p.x - 8} y={452} width={52} height={18} rx={2} fill="#3a4358" />
                  <rect x={p.x + 4} y={38} width={5} height={414} fill="#4b556e" opacity="0.55" />
                  <text
                    x={p.x + 18}
                    y={250}
                    textAnchor="middle"
                    transform={`rotate(-90 ${p.x + 18} 250)`}
                    fill="#6b7690"
                    fontFamily="monospace"
                    fontSize="11"
                    letterSpacing="4"
                  >
                    PILLAR {p.label}
                  </text>
                  <text
                    x={p.x + 18}
                    y={556}
                    textAnchor="middle"
                    fill={focus === 'tiles' ? '#35f2c0' : '#4d566d'}
                    fontFamily="monospace"
                    fontSize="14"
                    fontWeight="bold"
                  >
                    {p.label}
                  </text>
                </g>
              ))}

              {/* ---- whiteboard ---- */}
              <g>
                <rect x={152} y={46} width={306} height={230} rx={5} fill="#4a5468" />
                <rect x={160} y={54} width={290} height={214} rx={2} fill="url(#boardGrad)" />
                <rect x={166} y={272} width={278} height={9} rx={3} fill="#39425a" />
                <text
                  x={172}
                  y={76}
                  fill="#39415a"
                  fontFamily="monospace"
                  fontSize="12"
                  fontWeight="bold"
                  letterSpacing="1.6"
                >
                  SPRINT 14 · STANDUP
                </text>
                <line x1={172} y1={83} x2={438} y2={83} stroke="#9aa6bd" strokeWidth="1" />

                {/* legend: the colour order that turns the notes into a code */}
                <g>
                  <text
                    x={172}
                    y={102}
                    fill="#57608077"
                    fontFamily="monospace"
                    fontSize="9"
                    letterSpacing="1.4"
                  >
                    NOTE ORDER
                  </text>
                  {legend.map((colour, i) => {
                    const x = 172 + i * 46
                    return (
                      <g key={`legend-${colour}`}>
                        <rect
                          x={x}
                          y={107}
                          width={42}
                          height={13}
                          rx={2}
                          fill={NOTE_SWATCH[colour]}
                        />
                        <text
                          x={x + 21}
                          y={116.4}
                          textAnchor="middle"
                          fill="#151a24"
                          fontFamily="monospace"
                          fontSize="6.5"
                          fontWeight="bold"
                          letterSpacing="0.2"
                        >
                          {colour.toUpperCase()}
                        </text>
                        {i < legend.length - 1 ? (
                          <text
                            x={x + 43.5}
                            y={117}
                            fill="#6b7590"
                            fontFamily="monospace"
                            fontSize="9"
                          >
                            ›
                          </text>
                        ) : null}
                      </g>
                    )
                  })}
                </g>

                {/* the notes themselves, stuck out of order */}
                {notes.map((note) => {
                  const cx = note.x + 26
                  const cy = note.y + 26
                  return (
                    <g
                      key={`note-${note.colour}`}
                      transform={`rotate(${note.rotate} ${cx} ${cy})`}
                    >
                      <rect
                        x={note.x + 2}
                        y={note.y + 3}
                        width={52}
                        height={52}
                        fill="#00000033"
                      />
                      <rect
                        x={note.x}
                        y={note.y}
                        width={52}
                        height={52}
                        fill={NOTE_SWATCH[note.colour]}
                      />
                      <rect
                        x={note.x}
                        y={note.y}
                        width={52}
                        height={9}
                        fill="#ffffff"
                        opacity="0.22"
                      />
                      <text
                        x={cx}
                        y={cy + 11}
                        textAnchor="middle"
                        fill="#141a24"
                        fontFamily="monospace"
                        fontSize="27"
                        fontWeight="bold"
                      >
                        {note.digit}
                      </text>
                      {focus === 'notes' ? (
                        <rect
                          x={note.x - 4}
                          y={note.y - 4}
                          width={60}
                          height={60}
                          fill="none"
                          stroke="#35f2c0"
                          strokeWidth="2"
                          strokeDasharray="5 4"
                        />
                      ) : null}
                    </g>
                  )
                })}
              </g>

              {/* ---- coffee station + 3x3 mug rack ---- */}
              <g>
                <rect x={470} y={140} width={170} height={150} rx={4} fill="#1b2130" stroke="#2c3446" />
                {Array.from({ length: 9 }, (_, i) => {
                  const { x, y } = cellRect(i)
                  const mug = mugs.get(i)
                  return (
                    <g key={`cell-${i}`}>
                      <rect
                        x={x}
                        y={y}
                        width={CELL_W}
                        height={CELL_H}
                        rx={3}
                        fill="#121722"
                        stroke={focus === 'rack' ? '#2f5c52' : '#242b3b'}
                      />
                      {mug ? (
                        <g>
                          <rect
                            x={x + 9}
                            y={y + 8}
                            width={22}
                            height={22}
                            rx={3}
                            fill="#e6ecf7"
                          />
                          <path
                            d={`M ${x + 31} ${y + 14} q 8 0 8 6 q 0 6 -8 6`}
                            fill="none"
                            stroke="#e6ecf7"
                            strokeWidth="2.6"
                          />
                          <rect
                            x={x + 9}
                            y={y + 26}
                            width={22}
                            height={4}
                            fill="#aab4c6"
                          />
                          <text
                            x={x + 20}
                            y={y + 24}
                            textAnchor="middle"
                            fill="#1a1f2b"
                            fontFamily="monospace"
                            fontSize="12"
                            fontWeight="bold"
                          >
                            {mug}
                          </text>
                          {focus === 'rack' ? (
                            <circle
                              cx={x + CELL_W / 2}
                              cy={y + CELL_H / 2}
                              r={19}
                              fill="none"
                              stroke="#35f2c0"
                              strokeWidth="1.6"
                              strokeDasharray="4 4"
                            />
                          ) : null}
                        </g>
                      ) : null}
                    </g>
                  )
                })}
                <rect x={464} y={292} width={182} height={14} rx={3} fill="#39425a" />
                <rect x={464} y={306} width={182} height={62} rx={3} fill="#1a1f2c" stroke="#262d3d" />
                <text
                  x={472}
                  y={324}
                  fill="#8b94ab"
                  fontFamily="monospace"
                  fontSize="7.5"
                  letterSpacing="0.4"
                >
                  WASH ORDER ON MUG BASES
                </text>
                <text
                  x={472}
                  y={337}
                  fill="#5d6780"
                  fontFamily="monospace"
                  fontSize="7"
                  letterSpacing="0.4"
                >
                  TOP-LEFT = CELL 1
                </text>
                {/* drip machine */}
                <rect x={600} y={318} width={40} height={44} rx={3} fill="#252c3c" />
                <rect x={605} y={325} width={30} height={14} rx={2} fill="#0f1420" />
                <circle cx={620} cy={351} r={4.5} fill="#ff4d6d" opacity="0.75" />
              </g>

              {/* ---- desk, terminal, badge ---- */}
              <g>
                <rect x={640} y={296} width={250} height={13} rx={3} fill="#3d465d" />
                <rect x={652} y={309} width={12} height={58} fill="#2b3345" />
                <rect x={866} y={309} width={12} height={58} fill="#2b3345" />

                {/* monitor */}
                <rect x={650} y={118} width={202} height={148} rx={6} fill="#20263a" />
                <rect x={658} y={126} width={186} height={132} rx={3} fill="url(#screenGlow)" />
                <rect x={742} y={266} width={18} height={22} fill="#2b3345" />
                <rect x={716} y={288} width={70} height={8} rx={3} fill="#39425a" />
                {focus === 'monitor' ? (
                  <rect
                    x={654}
                    y={122}
                    width={194}
                    height={140}
                    rx={4}
                    fill="none"
                    stroke="#35f2c0"
                    strokeWidth="2"
                    strokeDasharray="6 5"
                  />
                ) : null}
                <g fontFamily="monospace" fontSize="9.2" fill="#35f2c0">
                  <text x={665} y={140} fill="#5d6780">
                    {ROOM_PLATE} — floor terminal
                  </text>
                  <text x={665} y={154}>% sudo lockdown --status</text>
                  <text x={665} y={168} fill="#ff4d6d">
                    ARMED · 3 stages remain
                  </text>
                  <text x={665} y={186} fill="#97a1b8">
                    &gt; AUTH  &lt;badge-id&gt;
                  </text>
                  <text x={665} y={199} fill="#97a1b8">
                    &gt; MOUNT &lt;tile-count&gt;
                  </text>
                  <text x={665} y={212} fill="#97a1b8">
                    &gt; EXEC  &lt;checksum&gt;
                  </text>
                  <text x={665} y={230} fill="#ffb43a" fontSize="8.6">
                    {checksumFormula(calibration).split(' = ')[0]}
                  </text>
                  <text x={665} y={242} fill="#ffb43a" fontSize="8.6">
                    tiles counted PILLAR A → B
                  </text>
                  <rect x={665} y={247} width={7} height={9} fill="#35f2c0">
                    <animate
                      attributeName="opacity"
                      values="1;0;1"
                      dur="1.1s"
                      repeatCount="indefinite"
                    />
                  </rect>
                </g>

                {/* keyboard + badge on the desk */}
                <rect x={772} y={276} width={92} height={20} rx={3} fill="#2b3345" />
                <rect x={776} y={280} width={84} height={12} rx={2} fill="#1a1f2c" />
                <g transform="rotate(-5 700 281)">
                  <rect x={662} y={264} width={78} height={32} rx={4} fill="#e8ecf6" />
                  <rect x={662} y={264} width={78} height={9} rx={4} fill="#45d0ff" />
                  <text
                    x={668}
                    y={284}
                    fill="#5d6780"
                    fontFamily="monospace"
                    fontSize="6.4"
                    letterSpacing="1"
                  >
                    ACCESS · BAY 4B
                  </text>
                  <text
                    x={668}
                    y={293}
                    fill="#141a24"
                    fontFamily="monospace"
                    fontSize="9.6"
                    fontWeight="bold"
                    letterSpacing="0.8"
                  >
                    {calibration.badgeId}
                  </text>
                  {focus === 'badge' ? (
                    <rect
                      x={658}
                      y={260}
                      width={86}
                      height={40}
                      rx={5}
                      fill="none"
                      stroke="#35f2c0"
                      strokeWidth="2"
                      strokeDasharray="5 4"
                    />
                  ) : null}
                </g>
              </g>

              {/* ---- wall clock ---- */}
              <g>
                <circle cx={700} cy={66} r={28} fill="#1c2231" stroke="#39425a" strokeWidth="3" />
                <circle cx={700} cy={66} r={2.6} fill="#97a1b8" />
                <line x1={700} y1={66} x2={700} y2={50} stroke="#e8ecf6" strokeWidth="2.4" />
                <line x1={700} y1={66} x2={714} y2={72} stroke="#35f2c0" strokeWidth="2" />
                <text
                  x={700}
                  y={108}
                  textAnchor="middle"
                  fill="#4d566d"
                  fontFamily="monospace"
                  fontSize="8"
                  letterSpacing="1.4"
                >
                  18:40 LOCKDOWN
                </text>
              </g>

              {/* ---- door, room plate, keypad ---- */}
              <g>
                <rect x={900} y={132} width={120} height={308} rx={3} fill="#232a3a" stroke="#39425a" strokeWidth="2" />
                <rect x={912} y={150} width={96} height={110} rx={2} fill="#101722" stroke="#2c3446" />
                <circle cx={1004} cy={300} r={6} fill="#8b94ab" />
                <rect x={916} y={98} width={88} height={26} rx={3} fill="#0f1420" stroke="#39425a" />
                <text
                  x={960}
                  y={116}
                  textAnchor="middle"
                  fill="#45d0ff"
                  fontFamily="monospace"
                  fontSize="13"
                  fontWeight="bold"
                  letterSpacing="2"
                >
                  {ROOM_PLATE}
                </text>

                <rect x={1046} y={196} width={82} height={116} rx={6} fill="#1c2231" stroke="#39425a" />
                <rect x={1054} y={204} width={66} height={20} rx={2} fill="#0b1018" />
                <text
                  x={1087}
                  y={218}
                  textAnchor="middle"
                  fill="#ff4d6d"
                  fontFamily="monospace"
                  fontSize="9"
                  letterSpacing="1"
                >
                  LOCKED
                </text>
                {Array.from({ length: 9 }, (_, i) => (
                  <rect
                    key={`kp-${i}`}
                    x={1054 + (i % 3) * 22}
                    y={230 + Math.floor(i / 3) * 22}
                    width={18}
                    height={18}
                    rx={2}
                    fill="#2b3345"
                  />
                ))}
                <rect x={1054} y={296} width={62} height={9} rx={2} fill="#2b3345" />
              </g>

              {/* ---- plant + chair for scale ---- */}
              <g>
                <path d="M 30 470 l 8 62 h 34 l 8 -62 z" fill="#2b3345" />
                <path
                  d="M 55 470 q -26 -30 -30 -62 q 26 8 32 40 q 4 -40 30 -54 q 2 40 -22 76 z"
                  fill="#2f6d52"
                />
                <rect x={26} y={464} width={58} height={10} rx={3} fill="#39425a" />
              </g>
              <g opacity="0.9">
                <rect x={706} y={392} width={92} height={12} rx={5} fill="#2b3345" />
                <rect x={744} y={404} width={12} height={54} fill="#232a3a" />
                <path d="M 726 458 h 48 M 750 458 v 10" stroke="#232a3a" strokeWidth="6" />
                <rect x={716} y={330} width={72} height={62} rx={8} fill="#242c3d" />
              </g>
            </svg>
          )}
        </div>
        {zoom > 1 ? (
          <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-hairline bg-void/85 px-3 py-1 font-mono text-[10px] text-ink-faint">
            drag to pan
          </div>
        ) : null}
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-ink-faint">
        Everything the locks ask for is visible here: the whiteboard legend and its
        sticky notes, the numbered mug bases on the 3×3 rack, the badge on the desk,
        the tile run between pillars A and B, and the checksum formula on the monitor.
        Swap in a photo of your own bay from the Reality Check panel and recalibrate
        the answers to match it.
      </p>
    </div>
  )
}
