import { useGame } from '../game/store'
import { Button, Panel, ScanOverlay } from './ui/kit'

const BEATS = [
  {
    n: '01',
    title: 'Your coworkers are the characters',
    body: 'Add 2–6 real people with their job title and the one thing they are unreasonably good at. That skill becomes a mechanic, not flavour text.',
  },
  {
    n: '02',
    title: 'Walk the floor to the checkpoints',
    body: 'Move your character around Bay 4B a tile at a time. Every step costs a second, every cleared checkpoint unseals the door to the next area.',
  },
  {
    n: '03',
    title: 'Nobody clears a checkpoint alone',
    body: 'A lock needs its operator standing on it and a second player across the room at the thing they are reading out. Then somebody has to go and actually look at it.',
  },
]

export function TitleScreen() {
  const players = useGame((s) => s.players)
  const goPhase = useGame((s) => s.goPhase)

  return (
    <div className="mx-auto flex min-h-full max-w-5xl flex-col justify-center gap-8 px-5 py-12">
      <div className="animate-rise">
        <div className="label-caps mb-3 flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-flare" />
          Local co-op · 2–6 players · one device · one floor
        </div>
        <h1 className="text-5xl leading-[0.95] font-black tracking-tight text-ink sm:text-7xl">
          OVERTIME
          <br />
          <span className="text-neon text-glow">PROTOCOL</span>
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-soft">
          It is 18:38 in Bay 4B. The building arms its lockdown in three stages, the
          lift is already dead, and the only things that can open the doors are a
          whiteboard nobody tidied, a coffee rack, and a terminal somebody left logged
          in. Get the crew out.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {BEATS.map((beat) => (
          <Panel key={beat.n} className="animate-rise p-4">
            <div className="font-mono text-2xl font-bold text-neon/25">{beat.n}</div>
            <h3 className="mt-1 text-sm font-semibold text-ink">{beat.title}</h3>
            <p className="mt-1.5 text-[12px] leading-relaxed text-ink-soft">
              {beat.body}
            </p>
          </Panel>
        ))}
      </div>

      <Panel glow className="animate-rise relative p-5">
        <ScanOverlay />
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-0 flex-1">
            <div className="label-caps">Shift briefing</div>
            <p className="mt-1 text-sm text-ink-soft">
              Three levels, three coffee refills between you. Wrong entries cost
              seconds; hints cost points; every skill charge resets each level.
            </p>
          </div>
          <Button tone="primary" size="lg" onClick={() => goPhase('roster')}>
            {players.length >= 2 ? 'Back to the crew ▸' : 'Assemble the crew ▸'}
          </Button>
        </div>
      </Panel>
    </div>
  )
}
