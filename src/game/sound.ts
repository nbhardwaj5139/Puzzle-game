type Cue =
  | 'click'
  | 'key'
  | 'node'
  | 'correct'
  | 'wrong'
  | 'unlock'
  | 'skill'
  | 'tick'
  | 'alarm'
  | 'win'
  | 'lose'
  | 'pass'

interface Blip {
  freq: number
  dur: number
  type: OscillatorType
  gain?: number
  /** Optional glide target. */
  to?: number
  /** Delay from cue start, in seconds. */
  at?: number
}

const CUES: Record<Cue, Blip[]> = {
  click: [{ freq: 420, dur: 0.045, type: 'square', gain: 0.1 }],
  key: [{ freq: 660, dur: 0.04, type: 'square', gain: 0.09 }],
  node: [{ freq: 520, dur: 0.06, type: 'triangle', gain: 0.11, to: 720 }],
  correct: [
    { freq: 660, dur: 0.09, type: 'square', gain: 0.12 },
    { freq: 880, dur: 0.09, type: 'square', gain: 0.12, at: 0.08 },
    { freq: 1320, dur: 0.16, type: 'triangle', gain: 0.11, at: 0.16 },
  ],
  wrong: [
    { freq: 220, dur: 0.12, type: 'sawtooth', gain: 0.11, to: 150 },
    { freq: 150, dur: 0.18, type: 'square', gain: 0.09, at: 0.1, to: 90 },
  ],
  unlock: [
    { freq: 300, dur: 0.1, type: 'triangle', gain: 0.11, to: 600 },
    { freq: 700, dur: 0.12, type: 'triangle', gain: 0.1, at: 0.1, to: 1000 },
    { freq: 1200, dur: 0.24, type: 'sine', gain: 0.12, at: 0.2 },
  ],
  skill: [
    { freq: 880, dur: 0.08, type: 'sine', gain: 0.1, to: 1400 },
    { freq: 1400, dur: 0.22, type: 'sine', gain: 0.09, at: 0.07, to: 700 },
  ],
  tick: [{ freq: 1500, dur: 0.025, type: 'square', gain: 0.05 }],
  alarm: [
    { freq: 740, dur: 0.16, type: 'square', gain: 0.1 },
    { freq: 560, dur: 0.16, type: 'square', gain: 0.1, at: 0.18 },
  ],
  win: [
    { freq: 523, dur: 0.12, type: 'square', gain: 0.11 },
    { freq: 659, dur: 0.12, type: 'square', gain: 0.11, at: 0.11 },
    { freq: 784, dur: 0.12, type: 'square', gain: 0.11, at: 0.22 },
    { freq: 1046, dur: 0.34, type: 'triangle', gain: 0.13, at: 0.33 },
  ],
  lose: [
    { freq: 392, dur: 0.18, type: 'sawtooth', gain: 0.1 },
    { freq: 311, dur: 0.18, type: 'sawtooth', gain: 0.1, at: 0.17 },
    { freq: 233, dur: 0.42, type: 'sawtooth', gain: 0.11, at: 0.34, to: 140 },
  ],
  pass: [
    { freq: 500, dur: 0.07, type: 'triangle', gain: 0.1 },
    { freq: 760, dur: 0.1, type: 'triangle', gain: 0.1, at: 0.07 },
  ],
}

const MUTE_KEY = 'overtime-protocol:muted'

class SoundEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private muted = false

  constructor() {
    if (typeof window !== 'undefined') {
      this.muted = window.localStorage.getItem(MUTE_KEY) === '1'
    }
  }

  get isMuted(): boolean {
    return this.muted
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
    }
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.9, this.ctx.currentTime, 0.02)
    }
  }

  /** Browsers require a gesture before audio starts; call from any click. */
  resume(): void {
    const ctx = this.ensure()
    if (ctx && ctx.state === 'suspended') void ctx.resume()
  }

  private ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (this.ctx) return this.ctx
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!Ctor) return null
    this.ctx = new Ctor()
    this.master = this.ctx.createGain()
    this.master.gain.value = this.muted ? 0 : 0.9
    this.master.connect(this.ctx.destination)
    return this.ctx
  }

  play(cue: Cue): void {
    if (this.muted) return
    const ctx = this.ensure()
    if (!ctx || !this.master) return
    if (ctx.state === 'suspended') void ctx.resume()

    const t0 = ctx.currentTime
    for (const blip of CUES[cue]) {
      const start = t0 + (blip.at ?? 0)
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = blip.type
      osc.frequency.setValueAtTime(blip.freq, start)
      if (blip.to !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(40, blip.to),
          start + blip.dur,
        )
      }
      const peak = blip.gain ?? 0.1
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(peak, start + 0.008)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + blip.dur)
      osc.connect(gain)
      gain.connect(this.master)
      osc.start(start)
      osc.stop(start + blip.dur + 0.02)
    }
  }
}

export const sound = new SoundEngine()
export type { Cue }
