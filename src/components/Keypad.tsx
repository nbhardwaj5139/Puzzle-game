import { useEffect, useState } from 'react'
import { sound } from '../game/sound'
import { Button } from './ui/kit'

interface KeypadProps {
  length: number
  /** Indices already given away by a NETWORKER charge, with their digits. */
  reveals: Array<{ index: number; digit: string }>
  disabled: boolean
  onSubmit: (value: string) => boolean
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', 'OK']

export function Keypad({ length, reveals, disabled, onSubmit }: KeypadProps) {
  const [value, setValue] = useState('')
  const [shake, setShake] = useState(0)
  const [flash, setFlash] = useState(0)

  const revealMap = new Map(reveals.map((r) => [r.index, r.digit]))

  function press(key: string) {
    if (disabled) return
    sound.resume()
    if (key === 'CLR') {
      sound.play('click')
      setValue('')
      return
    }
    if (key === 'OK') {
      submit()
      return
    }
    if (value.length >= length) return
    sound.play('key')
    setValue(value + key)
  }

  function submit() {
    if (disabled || value.length === 0) return
    const ok = onSubmit(value)
    if (ok) {
      setFlash((n) => n + 1)
    } else {
      setShake((n) => n + 1)
      setValue('')
    }
  }

  useEffect(() => {
    if (disabled) return
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault()
        press(e.key)
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        sound.play('click')
        setValue((v) => v.slice(0, -1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        submit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        key={`shake-${shake}`}
        className={shake > 0 ? 'animate-shake' : undefined}
      >
        <div className="flex gap-2">
          {Array.from({ length }, (_, i) => {
            const typed = value[i]
            const hinted = revealMap.get(i)
            return (
              <div
                key={`slot-${i}`}
                className={[
                  'relative flex h-16 w-12 items-center justify-center rounded-lg border font-mono text-2xl font-bold transition-all duration-150',
                  typed
                    ? 'border-neon/70 bg-neon/10 text-neon shadow-[0_0_22px_-6px] shadow-neon/80'
                    : hinted
                      ? 'border-amber-signal/50 bg-amber-signal/5 text-amber-signal/70'
                      : 'border-hairline bg-carbon text-ink-faint',
                  i === value.length && !disabled ? 'animate-pulse-ring' : '',
                ].join(' ')}
              >
                {typed ?? hinted ?? '·'}
                {!typed && hinted ? (
                  <span className="absolute -top-2 right-1 font-mono text-[8px] uppercase tracking-widest text-amber-signal">
                    tip
                  </span>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>

      {flash > 0 ? (
        <div key={`flash-${flash}`} className="animate-pop font-mono text-xs text-neon">
          ✓ ACCEPTED
        </div>
      ) : null}

      <div className="grid w-full max-w-[248px] grid-cols-3 gap-2">
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => press(key)}
            className={[
              'h-14 rounded-lg border font-mono text-lg font-semibold transition-all duration-100',
              'active:translate-y-px disabled:opacity-30',
              key === 'OK'
                ? 'border-neon/60 bg-neon/15 text-neon text-sm hover:bg-neon hover:text-void'
                : key === 'CLR'
                  ? 'border-flare/40 bg-transparent text-flare text-sm hover:bg-flare/15'
                  : 'border-hairline bg-slate-deep text-ink hover:border-neon/60 hover:bg-neon/8 hover:text-neon',
            ].join(' ')}
          >
            {key}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button
          tone="primary"
          size="sm"
          disabled={disabled || value.length === 0}
          onClick={submit}
        >
          Submit code
        </Button>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
          or type on your keyboard
        </span>
      </div>
    </div>
  )
}
