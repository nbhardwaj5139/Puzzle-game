import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { sound } from '../game/sound'
import { Button } from './ui/kit'

interface PatternGridProps {
  /** Path length expected, used only to size the progress read-out. */
  length: number
  /** Steps already given away by a NETWORKER charge. */
  reveals: Array<{ step: number; cell: number }>
  disabled: boolean
  onSubmit: (cells: number[]) => boolean
}

const SIZE = 3
const CELL = 92
const PAD = 26
const BOX = PAD * 2 + CELL * (SIZE - 1)

function centreOf(cell: number): { cx: number; cy: number } {
  return {
    cx: PAD + (cell % SIZE) * CELL,
    cy: PAD + Math.floor(cell / SIZE) * CELL,
  }
}

export function PatternGrid({
  length,
  reveals,
  disabled,
  onSubmit,
}: PatternGridProps) {
  const [path, setPath] = useState<number[]>([])
  const [dragging, setDragging] = useState(false)
  const [shake, setShake] = useState(0)
  const svgRef = useRef<SVGSVGElement | null>(null)

  const revealMap = new Map(reveals.map((r) => [r.cell, r.step]))

  function addCell(cell: number) {
    if (disabled) return
    setPath((current) => {
      if (current.includes(cell)) return current
      sound.resume()
      sound.play('node')
      return [...current, cell]
    })
  }

  function cellFromEvent(e: ReactPointerEvent<SVGSVGElement>): number | null {
    const svg = svgRef.current
    if (!svg) return null
    const rect = svg.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * BOX
    const y = ((e.clientY - rect.top) / rect.height) * BOX
    for (let i = 0; i < SIZE * SIZE; i += 1) {
      const { cx, cy } = centreOf(i)
      if ((x - cx) ** 2 + (y - cy) ** 2 <= 30 ** 2) return i
    }
    return null
  }

  function onPointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    if (disabled) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
    // The path is never auto-cleared here: dragging and tapping node-by-node
    // both append, so a tap does not wipe the nodes already chosen. Clear is
    // explicit (the button) or automatic after a rejected submission.
    const cell = cellFromEvent(e)
    if (cell !== null) addCell(cell)
  }

  function onPointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    if (!dragging || disabled) return
    const cell = cellFromEvent(e)
    if (cell !== null) addCell(cell)
  }

  function onPointerUp() {
    setDragging(false)
  }

  function submit() {
    if (disabled || path.length === 0) return
    const ok = onSubmit(path)
    if (!ok) {
      setShake((n) => n + 1)
      setPath([])
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        key={`shake-${shake}`}
        className={`rounded-xl border border-hairline bg-carbon p-2 ${
          shake > 0 ? 'animate-shake' : ''
        }`}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${BOX} ${BOX}`}
          className="h-56 w-56 touch-none sm:h-64 sm:w-64"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ cursor: disabled ? 'not-allowed' : 'crosshair' }}
        >
          {path.length > 1 ? (
            <polyline
              points={path
                .map((c) => {
                  const { cx, cy } = centreOf(c)
                  return `${cx},${cy}`
                })
                .join(' ')}
              fill="none"
              stroke="#35f2c0"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.85"
            />
          ) : null}

          {Array.from({ length: SIZE * SIZE }, (_, i) => {
            const { cx, cy } = centreOf(i)
            const order = path.indexOf(i)
            const active = order !== -1
            const hintStep = revealMap.get(i)
            return (
              <g key={`node-${i}`}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={30}
                  fill="transparent"
                  onClick={() => addCell(i)}
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r={active ? 20 : 15}
                  fill={active ? '#35f2c0' : '#161b26'}
                  stroke={
                    active
                      ? '#9ffde6'
                      : hintStep !== undefined
                        ? '#ffb43a'
                        : '#2a3141'
                  }
                  strokeWidth={active ? 2 : 1.6}
                  style={{ transition: 'r 120ms ease-out, fill 120ms ease-out' }}
                />
                {active ? (
                  <text
                    x={cx}
                    y={cy + 4.5}
                    textAnchor="middle"
                    fill="#06070a"
                    fontFamily="monospace"
                    fontSize="13"
                    fontWeight="bold"
                  >
                    {order + 1}
                  </text>
                ) : (
                  <text
                    x={cx}
                    y={cy + 3.6}
                    textAnchor="middle"
                    fill="#4d566d"
                    fontFamily="monospace"
                    fontSize="10"
                  >
                    {i + 1}
                  </text>
                )}
                {hintStep !== undefined && !active ? (
                  <text
                    x={cx + 22}
                    y={cy - 16}
                    textAnchor="middle"
                    fill="#ffb43a"
                    fontFamily="monospace"
                    fontSize="10"
                    fontWeight="bold"
                  >
                    #{hintStep + 1}
                  </text>
                ) : null}
              </g>
            )
          })}
        </svg>
      </div>

      <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
        path: {path.length ? path.map((c) => c + 1).join(' → ') : 'empty'}
        <span className="ml-2 text-ink-faint/60">({path.length}/{length} nodes)</span>
      </div>

      <div className="flex gap-2">
        <Button
          tone="primary"
          size="sm"
          disabled={disabled || path.length === 0}
          onClick={submit}
        >
          Lock pattern
        </Button>
        <Button
          tone="danger"
          size="sm"
          disabled={disabled || path.length === 0}
          onClick={() => setPath([])}
        >
          Clear
        </Button>
      </div>
      <p className="max-w-xs text-center text-[11px] leading-relaxed text-ink-faint">
        Drag across the nodes, or tap them one at a time. Cell 1 is top-left, cell 9 is
        bottom-right — same geometry as the rack in the bay.
      </p>
    </div>
  )
}
