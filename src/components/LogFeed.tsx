import type { LogEntry, LogTone } from '../game/types'

const TONE: Record<LogTone, { colour: string; mark: string }> = {
  info: { colour: 'text-ink-soft', mark: '·' },
  good: { colour: 'text-neon', mark: '✓' },
  bad: { colour: 'text-flare', mark: '✕' },
  skill: { colour: 'text-magenta-signal', mark: '✦' },
  system: { colour: 'text-cyan-signal', mark: '▸' },
}

interface LogFeedProps {
  log: LogEntry[]
  className?: string
}

export function LogFeed({ log, className = '' }: LogFeedProps) {
  return (
    <div className={`flex flex-col ${className}`}>
      <div className="label-caps mb-2">Ops feed</div>
      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {log.length === 0 ? (
          <p className="font-mono text-[11px] text-ink-faint">awaiting activity…</p>
        ) : null}
        {log.map((entry) => {
          const tone = TONE[entry.tone]
          return (
            <div
              key={entry.id}
              className="animate-slide-in flex gap-2 font-mono text-[11px] leading-relaxed"
            >
              <span className={`shrink-0 ${tone.colour}`}>{tone.mark}</span>
              <span className={tone.colour}>{entry.text}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
