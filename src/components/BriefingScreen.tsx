import { useState } from 'react'
import { LEVELS } from '../game/levels'
import { MAX_STRIKES, useGame } from '../game/store'
import { Button, Chip, Panel, SectionLabel } from './ui/kit'
import { PlayerTag } from './PlayerTag'
import { RealityCheckPanel } from './RealityCheckPanel'
import { WorkspaceScene } from './WorkspaceScene'
import { FloorMap } from './FloorMap'

const RULES = [
  ['Walk the floor', 'Tap a tile to move the crew member you are holding the device for. Every step costs a second off the clock, so plan the route.'],
  ['Two operators minimum', 'A checkpoint needs its operator standing on it AND a second player out at the look-here tile. Nobody clears one alone.'],
  ['Look before you type', 'Each lock names a physical thing to inspect. Read it off the bay below, or off your own office if you calibrated it.'],
  ['One charge each, per level', 'Skills reset every level. Unspent charges are worth nothing at the end, so spend them.'],
  ['Misses cost', 'A wrong entry is −50 points and −10 seconds. Hints are −150. Steady Hands absorbs one miss for free.'],
]

export function BriefingScreen() {
  const players = useGame((s) => s.players)
  const mode = useGame((s) => s.mode)
  const calibration = useGame((s) => s.calibration)
  const startLevel = useGame((s) => s.startLevel)
  const goPhase = useGame((s) => s.goPhase)
  const [calibrationOpen, setCalibrationOpen] = useState(false)

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <SectionLabel>Mission briefing · 18:38</SectionLabel>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-ink sm:text-4xl">
            Bay 4B, three stages, {MAX_STRIKES} refills.
          </h1>
        </div>
        <div className="flex gap-2">
          <Button tone="quiet" onClick={() => goPhase('roster')}>
            ◂ Crew
          </Button>
          <Button onClick={() => setCalibrationOpen(true)}>Reality Check ⚙</Button>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0 space-y-5">
          <Panel className="p-4">
            <SectionLabel>The floor — where you will be walking</SectionLabel>
            <p className="mt-1.5 mb-3 text-[12px] leading-relaxed text-ink-soft">
              One floor, three stages. Each checkpoint you clear unseals the door to
              the next area, so the map is also the progress bar. Solid markers are
              checkpoints; dashed ones are the look-here tiles a second player has to
              cover.
            </p>
            <FloorMap />
          </Panel>

          <Panel className="p-4">
            <SectionLabel>The bay — this is your inspection surface</SectionLabel>
            <p className="mt-1.5 mb-3 text-[12px] leading-relaxed text-ink-soft">
              Zoom in and get familiar. You can reopen this at any point during a stage,
              but the clock keeps running while you look.
            </p>
            <WorkspaceScene calibration={calibration} />
          </Panel>

          <div className="grid gap-3 sm:grid-cols-3">
            {LEVELS.map((level) => (
              <Panel key={level.id} className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] tracking-[0.16em] text-neon">
                    {level.codename}
                  </span>
                  <span className="font-mono text-[10px] text-ink-faint">
                    {Math.floor(level.duration / 60)}:
                    {String(level.duration % 60).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="mt-1 text-base font-bold text-ink">{level.title}</h3>
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                  {level.location}
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">
                  {level.premise}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Chip accent="#45d0ff">
                    {level.stations.length} checkpoints
                  </Chip>
                  <Chip accent="#ffb43a">↦ {level.carryLabel}</Chip>
                </div>
              </Panel>
            ))}
          </div>
        </div>

        <div className="min-w-0 space-y-5">
          <Panel className="p-4">
            <SectionLabel>On shift ({players.length})</SectionLabel>
            <div className="mt-3 space-y-3">
              {players.map((player) => (
                <PlayerTag key={player.id} player={player} showSkill />
              ))}
            </div>
            <div className="mt-4 border-t border-hairline pt-3">
              <Chip accent="#35f2c0">
                {mode === 'hotseat' ? 'Pass-the-device enforced' : 'Shared screen'}
              </Chip>
            </div>
          </Panel>

          <Panel className="p-4">
            <SectionLabel>House rules</SectionLabel>
            <dl className="mt-3 space-y-3">
              {RULES.map(([title, body]) => (
                <div key={title}>
                  <dt className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ink">
                    {title}
                  </dt>
                  <dd className="mt-0.5 text-[11px] leading-relaxed text-ink-soft">
                    {body}
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel glow className="p-4">
            <p className="text-[12px] leading-relaxed text-ink-soft">
              The lockdown starts the moment you press this. Get everyone within arm's
              reach of the screen first.
            </p>
            <Button
              tone="primary"
              size="lg"
              full
              className="mt-3"
              onClick={() => startLevel(0)}
            >
              Start Level 01 ▸
            </Button>
          </Panel>
        </div>
      </div>

      <RealityCheckPanel
        open={calibrationOpen}
        onClose={() => setCalibrationOpen(false)}
      />
    </div>
  )
}
