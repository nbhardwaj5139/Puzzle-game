import { useEffect, useMemo, useState } from 'react'
import { levelAt } from '../game/levels'
import { HINT_COST, MAX_STRIKES, answerFor, isGated, useGame } from '../game/store'
import { checksumFormula, digitSum } from '../game/scene'
import { getSkill } from '../game/skills'
import { sound } from '../game/sound'
import type { Level, Station } from '../game/types'
import { Button, Chip, Meter, Panel, SectionLabel } from './ui/kit'
import { Keypad } from './Keypad'
import { LogFeed } from './LogFeed'
import { PassDeviceGate } from './PassDeviceGate'
import { PatternGrid } from './PatternGrid'
import { SkillBar } from './SkillBar'
import { Terminal } from './Terminal'
import { Timer } from './Timer'
import { WorkspaceScene, type SceneFocus } from './WorkspaceScene'
import { Modal } from './ui/kit'

function focusFor(station: Station | undefined): SceneFocus {
  if (!station) return null
  if (station.kind === 'keypad') return 'notes'
  if (station.kind === 'pattern') return 'rack'
  if (station.kind === 'terminal') {
    if (station.answerKey === 'badgeId') return 'badge'
    if (station.answerKey === 'tileCount') return 'tiles'
    return 'monitor'
  }
  return null
}

function terminalBanner(level: Level): string[] {
  return [
    'floor-terminal 4b-217 — session restored',
    'lockdown daemon: ARMED · 3 stages remain',
    '',
    ...level.stations
      .filter((s) => s.kind === 'terminal')
      .map((s) => `  ${(s as Extract<Station, { kind: 'terminal' }>).usage}`),
    '  STATUS · HELP',
    '',
  ]
}

export function LevelScreen() {
  const levelIndex = useGame((s) => s.levelIndex)
  const players = useGame((s) => s.players)
  const mode = useGame((s) => s.mode)
  const calibration = useGame((s) => s.calibration)
  const stations = useGame((s) => s.stations)
  const activeStationId = useGame((s) => s.activeStationId)
  const deviceHolderId = useGame((s) => s.deviceHolderId)
  const secondsLeft = useGame((s) => s.secondsLeft)
  const clockRunning = useGame((s) => s.clockRunning)
  const charges = useGame((s) => s.charges)
  const shields = useGame((s) => s.shields)
  const doubled = useGame((s) => s.doubled)
  const hintedStations = useGame((s) => s.hintedStations)
  const strikesLeft = useGame((s) => s.strikesLeft)
  const totalScore = useGame((s) => s.totalScore)
  const levelPenalty = useGame((s) => s.levelPenalty)
  const results = useGame((s) => s.results)
  const log = useGame((s) => s.log)
  const feedback = useGame((s) => s.feedback)
  const sceneOpen = useGame((s) => s.sceneOpen)

  const selectStation = useGame((s) => s.selectStation)
  const handDeviceTo = useGame((s) => s.handDeviceTo)
  const useSkill = useGame((s) => s.useSkill)
  const submitEntry = useGame((s) => s.submitEntry)
  const submitTerminal = useGame((s) => s.submitTerminal)
  const openHint = useGame((s) => s.openHint)
  const tick = useGame((s) => s.tick)
  const toggleScene = useGame((s) => s.toggleScene)
  const hardReset = useGame((s) => s.hardReset)

  const [quitOpen, setQuitOpen] = useState(false)
  const [gateAccepted, setGateAccepted] = useState<string | null>(null)
  const [muted, setMuted] = useState(sound.isMuted)

  const level = levelAt(levelIndex)
  const activeStation = level.stations.find((s) => s.id === activeStationId)
  const activeRuntime = activeStationId ? stations[activeStationId] : undefined
  const operator = players.find((p) => p.id === activeRuntime?.playerId)
  const solvedCount = level.stations.filter((s) => stations[s.id]?.solved).length
  const hintShown = Boolean(activeStationId && hintedStations.includes(activeStationId))

  useEffect(() => {
    if (!clockRunning) return
    const id = window.setInterval(() => tick(), 1000)
    return () => window.clearInterval(id)
  }, [clockRunning, tick])

  // A new station means the device has to physically move again.
  useEffect(() => {
    setGateAccepted(null)
  }, [activeStationId])

  const gateNeeded =
    mode === 'hotseat' &&
    Boolean(operator) &&
    gateAccepted !== activeStationId &&
    !activeRuntime?.solved

  const reservedIds = useMemo(
    () =>
      level.stations
        .filter((s) => s.kind === 'skill' && !stations[s.id]?.solved)
        .map((s) => stations[s.id]?.playerId ?? '')
        .filter(Boolean),
    [level, stations],
  )

  const previewPayout = Math.max(0, 500 + secondsLeft * 5 - levelPenalty)

  const chain = useMemo(() => {
    const l1 = results.find((r) => r.levelId === 'standup')?.cleared
    const l2 = results.find((r) => r.levelId === 'coldbrew')?.cleared
    const rows: Array<{ label: string; value: string; accent: string }> = []
    if (l1) {
      rows.push({
        label: 'L01 release code',
        value: `${calibration.keypadCode}  (Σ = ${digitSum(calibration.keypadCode)})`,
        accent: '#45d0ff',
      })
    }
    if (l2) {
      rows.push({
        label: 'L02 mugs on rack',
        value: String(calibration.patternCells.length),
        accent: '#b6f24a',
      })
    }
    if (l1 && l2) {
      rows.push({
        label: 'L03 checksum',
        value: checksumFormula(calibration),
        accent: '#ffb43a',
      })
    }
    return rows
  }, [results, calibration])

  const reveals = activeRuntime?.revealed ?? []
  const answer = activeStation ? answerFor(activeStation, calibration) : ''

  function renderLock() {
    if (!activeStation || !activeRuntime || !operator) {
      return (
        <p className="py-10 text-center font-mono text-xs text-ink-faint">
          all stations resolved
        </p>
      )
    }

    if (activeRuntime.solved) {
      return (
        <div className="animate-pop py-10 text-center">
          <div className="text-4xl">✓</div>
          <p className="mt-2 font-mono text-xs uppercase tracking-[0.16em] text-neon">
            {activeStation.title} cleared by {operator.name}
          </p>
        </div>
      )
    }

    if (isGated(activeStation, stations)) {
      const blocker = level.stations.find(
        (s) => activeStation.requires.includes(s.id) && !stations[s.id]?.solved,
      )
      return (
        <p className="py-10 text-center font-mono text-xs text-flare">
          locked — {blocker?.title ?? 'a prior station'} has to complete first
        </p>
      )
    }

    if (activeStation.kind === 'skill') {
      const skill = getSkill(operator.skillId)
      const spent = !charges[operator.id]
      return (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-2xl border text-3xl"
            style={{
              borderColor: `${skill.accent}66`,
              backgroundColor: `${skill.accent}12`,
              boxShadow: `0 0 40px -14px ${skill.accent}`,
            }}
          >
            <span aria-hidden style={{ color: skill.accent }}>
              {skill.glyph}
            </span>
          </div>
          <div>
            <div
              className="font-mono text-xs font-bold uppercase tracking-[0.18em]"
              style={{ color: skill.accent }}
            >
              {skill.name}
            </div>
            <p className="mt-1 max-w-sm text-sm italic text-ink-soft">
              “{operator.skillLabel}”
            </p>
            <p className="mt-2 max-w-sm text-[12px] leading-relaxed text-ink-faint">
              {skill.effect}
            </p>
          </div>
          <Button
            tone="primary"
            size="lg"
            disabled={spent}
            onClick={() => useSkill(operator.id, activeStation.id)}
          >
            {spent ? 'Charge already spent' : `${operator.name} — spend the charge`}
          </Button>
          {spent ? (
            <p className="max-w-xs text-[11px] leading-relaxed text-flare">
              This operator has no charge left this level. Let the clock run out to
              retry the level with fresh charges.
            </p>
          ) : null}
        </div>
      )
    }

    if (activeStation.kind === 'keypad') {
      return (
        <Keypad
          length={answer.length}
          reveals={reveals.map((index) => ({
            index,
            digit: answer[index] ?? '?',
          }))}
          disabled={gateNeeded || sceneOpen}
          onSubmit={(value) => submitEntry(activeStation.id, value)}
        />
      )
    }

    if (activeStation.kind === 'pattern') {
      return (
        <PatternGrid
          length={calibration.patternCells.length}
          reveals={reveals.map((step) => ({
            step,
            cell: Number(answer[step] ?? -1),
          }))}
          disabled={gateNeeded || sceneOpen}
          onSubmit={(cells) => submitEntry(activeStation.id, cells.join(''))}
        />
      )
    }

    return (
      <Terminal
        operator={operator.name}
        banner={terminalBanner(level)}
        disabled={gateNeeded}
        onCommand={submitTerminal}
      />
    )
  }

  return (
    <div className="relative mx-auto max-w-6xl px-4 py-5 sm:px-5">
      {/* correct / wrong screen-edge flash */}
      {feedback.kind ? (
        <div
          key={feedback.nonce}
          className="animate-flash pointer-events-none fixed inset-0 z-40"
          style={{
            boxShadow: `inset 0 0 130px -24px ${
              feedback.kind === 'good'
                ? '#35f2c0'
                : feedback.kind === 'bad'
                  ? '#ff4d6d'
                  : '#ff5cc8'
            }`,
          }}
        />
      ) : null}

      {/* ---- HUD ---- */}
      <Panel className="mb-4 p-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] tracking-[0.18em] text-neon">
                {level.codename}
              </span>
              <span className="font-mono text-[10px] text-ink-faint">
                {level.location}
              </span>
            </div>
            <h1 className="text-xl font-black tracking-tight text-ink sm:text-2xl">
              {level.title}
            </h1>
            <div className="mt-1.5 flex items-center gap-2">
              <Meter
                value={solvedCount}
                max={level.stations.length}
                className="w-28"
              />
              <span className="font-mono text-[10px] text-ink-faint">
                {solvedCount}/{level.stations.length} stations
              </span>
            </div>
          </div>

          <Timer secondsLeft={secondsLeft} total={level.duration} />

          <div className="grid grid-cols-2 gap-x-5 gap-y-2 sm:grid-cols-3">
            <div>
              <div className="label-caps">Banked</div>
              <div className="font-mono text-lg font-bold tabular-nums text-ink">
                {totalScore}
              </div>
            </div>
            <div>
              <div className="label-caps">This level</div>
              <div className="font-mono text-lg font-bold tabular-nums text-neon">
                {doubled ? previewPayout * 2 : previewPayout}
                {doubled ? <span className="ml-1 text-[10px]">×2</span> : null}
              </div>
            </div>
            <div>
              <div className="label-caps">Refills</div>
              <div className="font-mono text-lg leading-none">
                {Array.from({ length: MAX_STRIKES }, (_, i) => (
                  <span
                    key={`strike-${i}`}
                    className={i < strikesLeft ? 'text-amber-signal' : 'text-hairline'}
                  >
                    ☕
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {shields > 0 ? <Chip accent="#35f2c0">⛊ shield ×{shields}</Chip> : null}
            <Button size="sm" onClick={() => toggleScene(true)}>
              Inspect bay 🔍
            </Button>
            <Button
              size="sm"
              tone="quiet"
              onClick={() => {
                sound.setMuted(!sound.isMuted)
                setMuted(sound.isMuted)
              }}
              title="Toggle sound"
            >
              {muted ? '🔇' : '🔊'}
            </Button>
            <Button size="sm" tone="danger" onClick={() => setQuitOpen(true)}>
              Abort
            </Button>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {/* ---- station rail ---- */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {level.stations.map((station, i) => {
              const rt = stations[station.id]
              const who = players.find((p) => p.id === rt?.playerId)
              const gated = isGated(station, stations)
              const active = station.id === activeStationId
              return (
                <button
                  key={station.id}
                  type="button"
                  onClick={() => selectStation(station.id)}
                  className={[
                    'group flex min-w-[164px] shrink-0 flex-col gap-1 rounded-lg border p-2.5 text-left transition-all',
                    active
                      ? 'border-neon/70 bg-neon/8 shadow-[0_0_34px_-20px] shadow-neon'
                      : rt?.solved
                        ? 'border-neon/25 bg-carbon/70'
                        : gated
                          ? 'border-hairline-soft bg-carbon/40 opacity-65'
                          : 'border-hairline bg-carbon/70 hover:border-neon/40',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[9px] text-ink-faint">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="truncate text-[12px] font-semibold text-ink">
                      {station.title}
                    </span>
                    <span className="ml-auto font-mono text-[11px]">
                      {rt?.solved ? (
                        <span className="text-neon">✓</span>
                      ) : gated ? (
                        <span className="text-ink-faint">🔒</span>
                      ) : (
                        <span className="text-amber-signal">▸</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span aria-hidden className="text-[13px]">
                      {who?.avatar ?? '·'}
                    </span>
                    <span
                      className="truncate font-mono text-[9px] uppercase tracking-[0.12em]"
                      style={{ color: who?.accent ?? '#5d6780' }}
                    >
                      {who?.name ?? 'unassigned'}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* ---- active station ---- */}
          <Panel className="relative p-5">
            <PassDeviceGate
              open={gateNeeded && Boolean(operator)}
              target={operator ?? players[0]!}
              stationTitle={activeStation?.title ?? ''}
              onConfirm={() => {
                if (operator) handDeviceTo(operator.id)
                setGateAccepted(activeStationId)
              }}
            />

            {activeStation ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <SectionLabel>{activeStation.subtitle}</SectionLabel>
                    <h2 className="mt-0.5 text-lg font-bold text-ink">
                      {activeStation.title}
                    </h2>
                  </div>
                  {operator ? (
                    <Chip accent={operator.accent}>
                      {operator.avatar} {operator.name} · {operator.role}
                    </Chip>
                  ) : null}
                </div>

                <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">
                  {activeStation.directive}
                </p>
                <p className="mt-2 flex items-start gap-2 rounded-lg border border-cyan-signal/25 bg-cyan-signal/5 p-2.5 text-[12px] leading-relaxed text-cyan-signal">
                  <span aria-hidden>🔎</span>
                  <span>
                    <strong className="font-semibold">Go and look:</strong>{' '}
                    {activeStation.lookAt}
                  </span>
                </p>

                <div className="mt-5">{renderLock()}</div>

                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-hairline pt-3">
                  <Button size="sm" disabled={hintShown} onClick={openHint}>
                    {hintShown ? 'Hint shown' : `Pull hint (−${HINT_COST})`}
                  </Button>
                  <Button size="sm" onClick={() => toggleScene(true)}>
                    Reopen the bay
                  </Button>
                  {mode === 'hotseat' && operator ? (
                    <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                      device:{' '}
                      {players.find((p) => p.id === deviceHolderId)?.name ?? '—'}
                    </span>
                  ) : null}
                </div>
                {hintShown ? (
                  <p className="animate-rise mt-3 rounded-lg border border-amber-signal/30 bg-amber-signal/5 p-3 text-[12px] leading-relaxed text-amber-signal">
                    <strong className="font-semibold">Hint:</strong> {activeStation.hint}
                  </p>
                ) : null}
              </>
            ) : null}
          </Panel>
        </div>

        {/* ---- right column ---- */}
        <div className="space-y-4">
          <Panel className="p-4">
            <SkillBar
              players={players}
              charges={charges}
              reservedIds={reservedIds}
              deviceHolderId={deviceHolderId}
              hotseat={mode === 'hotseat'}
              onUse={(playerId) => useSkill(playerId)}
            />
            {mode === 'hotseat' ? (
              <div className="mt-3 border-t border-hairline pt-3">
                <div className="label-caps mb-1.5">Hand the device over</div>
                <div className="flex flex-wrap gap-1.5">
                  {players.map((player) => (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => handDeviceTo(player.id)}
                      className={`rounded-md border px-2 py-1 font-mono text-[10px] transition-colors ${
                        deviceHolderId === player.id
                          ? 'border-neon/60 bg-neon/10 text-neon'
                          : 'border-hairline text-ink-faint hover:text-ink'
                      }`}
                    >
                      {player.avatar} {player.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </Panel>

          {chain.length > 0 ? (
            <Panel className="p-4">
              <SectionLabel>Chain — carried from earlier levels</SectionLabel>
              <div className="mt-2.5 space-y-2">
                {chain.map((row) => (
                  <div key={row.label}>
                    <div
                      className="font-mono text-[9px] uppercase tracking-[0.14em]"
                      style={{ color: row.accent }}
                    >
                      {row.label}
                    </div>
                    <div className="font-mono text-[12px] text-ink">{row.value}</div>
                  </div>
                ))}
              </div>
            </Panel>
          ) : null}

          <Panel className="flex max-h-[340px] flex-col p-4">
            <LogFeed log={log} className="min-h-0 flex-1" />
          </Panel>
        </div>
      </div>

      <Modal
        open={sceneOpen}
        onClose={() => toggleScene(false)}
        wide
        title="Bay 4B — inspection"
        subtitle="The clock is still running. The area your current station cares about is outlined."
      >
        <WorkspaceScene calibration={calibration} focus={focusFor(activeStation)} />
      </Modal>

      <Modal
        open={quitOpen}
        onClose={() => setQuitOpen(false)}
        title="Abort the shift?"
        subtitle="Progress and score for this run are discarded. Your roster and calibration are kept."
      >
        <div className="flex gap-2">
          <Button tone="danger" onClick={hardReset}>
            Abort and go to the title
          </Button>
          <Button tone="quiet" onClick={() => setQuitOpen(false)}>
            Keep playing
          </Button>
        </div>
      </Modal>
    </div>
  )
}
