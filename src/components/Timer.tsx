interface TimerProps {
  secondsLeft: number
  total: number
}

function format(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function Timer({ secondsLeft, total }: TimerProps) {
  const pct = total <= 0 ? 0 : Math.min(1, Math.max(0, secondsLeft / total))
  const critical = secondsLeft <= 30
  const warning = !critical && secondsLeft <= 60
  const accent = critical ? '#ff4d6d' : warning ? '#ffb43a' : '#35f2c0'
  const R = 34
  const circumference = 2 * Math.PI * R

  return (
    <div className="flex items-center gap-3">
      <div className="relative h-[84px] w-[84px] shrink-0">
        <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
          <circle cx="40" cy="40" r={R} fill="none" stroke="#1b2030" strokeWidth="6" />
          <circle
            cx="40"
            cy="40"
            r={R}
            fill="none"
            stroke={accent}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct)}
            style={{
              transition: 'stroke-dashoffset 900ms linear, stroke 300ms ease',
              filter: `drop-shadow(0 0 6px ${accent}aa)`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`font-mono text-lg font-bold tabular-nums ${
              critical ? 'animate-pulse' : ''
            }`}
            style={{ color: accent }}
          >
            {format(secondsLeft)}
          </span>
        </div>
      </div>
      <div>
        <div className="label-caps">Lockdown clock</div>
        <div
          className="mt-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: accent }}
        >
          {critical ? 'critical' : warning ? 'closing' : 'nominal'}
        </div>
      </div>
    </div>
  )
}
