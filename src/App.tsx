import { useEffect, useState } from 'react'
import { useGame } from './game/store'
import { sound } from './game/sound'
import { BriefingScreen } from './components/BriefingScreen'
import { DebriefScreen } from './components/DebriefScreen'
import { EndScreen } from './components/EndScreen'
import { LevelScreen } from './components/LevelScreen'
import { RosterScreen } from './components/RosterScreen'
import { TitleScreen } from './components/TitleScreen'

export default function App() {
  const phase = useGame((s) => s.phase)
  const [muted, setMuted] = useState(sound.isMuted)

  // Any first gesture is enough to let the browser start the audio context.
  useEffect(() => {
    function unlock() {
      sound.resume()
    }
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  return (
    <div className="grid-floor relative min-h-full">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(3,4,6,0.75)_100%)]" />

      {phase !== 'level' ? (
        <button
          type="button"
          onClick={() => {
            sound.setMuted(!sound.isMuted)
            setMuted(sound.isMuted)
            if (!sound.isMuted) sound.play('click')
          }}
          title={muted ? 'Unmute sound effects' : 'Mute sound effects'}
          className="fixed right-4 top-4 z-30 rounded-lg border border-hairline bg-carbon/85 px-2.5 py-1.5 font-mono text-xs text-ink-soft backdrop-blur transition-colors hover:border-neon/50 hover:text-neon"
        >
          {muted ? '🔇' : '🔊'}
        </button>
      ) : null}

      <main className="relative">
        {phase === 'title' ? <TitleScreen /> : null}
        {phase === 'roster' ? <RosterScreen /> : null}
        {phase === 'briefing' ? <BriefingScreen /> : null}
        {phase === 'level' ? <LevelScreen /> : null}
        {phase === 'debrief' ? <DebriefScreen /> : null}
        {phase === 'victory' ? <EndScreen outcome="victory" /> : null}
        {phase === 'failure' ? <EndScreen outcome="failure" /> : null}
      </main>

      <footer className="relative px-5 pb-6 pt-2 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint/70">
          Overtime Protocol · local co-op · nothing leaves this browser
        </p>
      </footer>
    </div>
  )
}
