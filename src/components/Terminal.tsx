import { useEffect, useRef, useState } from 'react'
import { sound } from '../game/sound'
import type { TerminalReply } from '../game/store'
import { ScanOverlay } from './ui/kit'

interface TerminalLine {
  id: number
  kind: 'input' | 'ok' | 'err' | 'note'
  text: string
}

interface TerminalProps {
  /** Prompt owner, shown before the caret. */
  operator: string
  banner: string[]
  disabled: boolean
  onCommand: (raw: string) => TerminalReply
}

let lineSeq = 0

function makeLines(
  kind: TerminalLine['kind'],
  text: string,
): TerminalLine[] {
  return text.split('\n').map((row) => {
    lineSeq += 1
    return { id: lineSeq, kind, text: row }
  })
}

const KIND_CLASS: Record<TerminalLine['kind'], string> = {
  input: 'text-ink',
  ok: 'text-neon',
  err: 'text-flare',
  note: 'text-ink-soft',
}

export function Terminal({ operator, banner, disabled, onCommand }: TerminalProps) {
  const [lines, setLines] = useState<TerminalLine[]>(() =>
    banner.flatMap((row) => makeLines('note', row)),
  )
  const [draft, setDraft] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [historyAt, setHistoryAt] = useState(-1)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lines])

  function run() {
    const raw = draft.trim()
    if (!raw || disabled) return
    sound.resume()
    const reply = onCommand(raw)
    setLines((current) => [
      ...current,
      ...makeLines('input', `${operator.toLowerCase().replace(/\s+/g, '')}@4b-217 % ${raw}`),
      ...(reply.message ? makeLines(reply.ok ? 'ok' : 'err', reply.message) : []),
    ])
    setHistory((h) => [raw, ...h].slice(0, 30))
    setHistoryAt(-1)
    setDraft('')
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      run()
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const next = Math.min(history.length - 1, historyAt + 1)
      if (next >= 0 && history[next] !== undefined) {
        setHistoryAt(next)
        setDraft(history[next])
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = historyAt - 1
      setHistoryAt(next)
      setDraft(next >= 0 ? history[next] ?? '' : '')
    }
  }

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-neon/25 bg-[#050807] shadow-[inset_0_0_60px_-20px] shadow-neon/40"
      onClick={() => inputRef.current?.focus()}
    >
      <ScanOverlay />
      <div className="flex items-center gap-2 border-b border-neon/15 bg-neon/5 px-3 py-1.5">
        <span className="h-2 w-2 rounded-full bg-flare" />
        <span className="h-2 w-2 rounded-full bg-amber-signal" />
        <span className="h-2 w-2 rounded-full bg-neon" />
        <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.16em] text-neon/70">
          floor-terminal · bay 4b
        </span>
      </div>

      <div
        ref={scrollRef}
        className="animate-flicker h-64 overflow-y-auto px-3 py-3 font-mono text-[12px] leading-relaxed"
      >
        {lines.map((line) => (
          <div key={line.id} className={`whitespace-pre-wrap ${KIND_CLASS[line.kind]}`}>
            {line.text}
          </div>
        ))}
        <div className="mt-1 flex items-center gap-2">
          <span className="shrink-0 text-neon/80">
            {operator.toLowerCase().replace(/\s+/g, '')}@4b-217 %
          </span>
          <input
            ref={inputRef}
            value={draft}
            disabled={disabled}
            spellCheck={false}
            autoComplete="off"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={disabled ? 'terminal asleep' : 'type a command — HELP for the list'}
            className="w-full min-w-0 flex-1 border-none bg-transparent p-0 font-mono text-[12px] text-ink caret-neon placeholder:text-ink-faint/60 focus:outline-none"
          />
        </div>
      </div>
    </div>
  )
}
