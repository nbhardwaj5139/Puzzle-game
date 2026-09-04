import { create } from 'zustand'
import { LEVELS, TOTAL_LEVELS, levelAt } from './levels'
import {
  DOORS,
  EXTRACTION_TILES,
  areaAt,
  findPath,
  openDoorTiles,
  sameTile,
} from './map'
import { normaliseAppearance } from './appearance'
import { DEFAULT_CALIBRATION, expectedAnswer, normalise } from './scene'
import { getSkill } from './skills'
import { sound } from './sound'
import type {
  Calibration,
  Level,
  Vec,
  WalkState,
  LevelResult,
  LogEntry,
  LogTone,
  Phase,
  PlayMode,
  Player,
  PlayerStat,
  SkillId,
  Station,
  StationRuntime,
} from './types'

const STORE_KEY = 'overtime-protocol:setup'

export const MAX_STRIKES = 3
export const LEVEL_BASE_SCORE = 500
export const SECOND_BONUS = 5
export const HINT_COST = 150
export const MISS_COST = 50
export const MISS_TIME_PENALTY = 10
export const OVERRIDE_SECONDS = 45
export const MAX_PLAYERS = 6
export const MIN_PLAYERS = 2
/** Seconds burned per tile walked. Routing is part of the puzzle. */
export const STEP_COST = 1
/** Milliseconds per tile while a token is walking. */
export const STEP_MS = 95

export interface Feedback {
  kind: 'good' | 'bad' | 'skill' | null
  nonce: number
}

export interface TerminalReply {
  ok: boolean
  message: string
}

interface PersistedSetup {
  players: Player[]
  mode: PlayMode
  calibration: Calibration
}

const EMPTY_STAT: PlayerStat = { solves: 0, misses: 0, skillUses: 0 }

interface GameState {
  // ---- setup ----
  phase: Phase
  players: Player[]
  mode: PlayMode
  calibration: Calibration

  // ---- active level ----
  levelIndex: number
  stations: Record<string, StationRuntime>
  activeStationId: string | null
  deviceHolderId: string | null
  secondsLeft: number
  clockRunning: boolean

  // ---- floor ----
  positions: Record<string, Vec>
  /** Whose token the map controls right now (shared-screen mode). */
  moverId: string | null
  walking: WalkState | null
  /** Station ids cleared this run; these are what unseal doors. */
  clearedStations: string[]
  /** Every lock is done but the crew still has to reach the lift. */
  extractionPending: boolean

  // ---- scoring for the level in progress ----
  levelPenalty: number
  levelMisses: number
  levelHints: number
  levelSkillsUsed: SkillId[]
  doubled: boolean
  shields: number
  /** Station ids whose hint has been unlocked. Per-station, so a paid hint
   *  cannot leak onto the next lock when focus moves. */
  hintedStations: string[]
  charges: Record<string, boolean>

  // ---- campaign ----
  totalScore: number
  lastLevelScore: number
  strikesLeft: number
  results: LevelResult[]
  stats: Record<string, PlayerStat>
  log: LogEntry[]
  feedback: Feedback
  sceneOpen: boolean

  // ---- setup actions ----
  addPlayer: (input: Omit<Player, 'id'>) => void
  updatePlayer: (id: string, patch: Partial<Omit<Player, 'id'>>) => void
  removePlayer: (id: string) => void
  setMode: (mode: PlayMode) => void
  patchCalibration: (patch: Partial<Calibration>) => void
  resetCalibration: () => void

  // ---- flow actions ----
  goPhase: (phase: Phase) => void
  beginBriefing: () => void
  startLevel: (index: number) => void
  advance: () => void
  retryLevel: () => void
  continueRun: () => void
  restart: () => void
  hardReset: () => void

  // ---- play actions ----
  selectStation: (id: string) => void
  handDeviceTo: (playerId: string) => void
  setMover: (playerId: string) => void
  walkTo: (target: Vec) => void
  advanceWalk: () => void
  useSkill: (playerId: string, stationId?: string) => void
  submitEntry: (stationId: string, raw: string) => boolean
  submitTerminal: (raw: string) => TerminalReply
  openHint: () => void
  tick: () => void
  toggleScene: (open?: boolean) => void
  pushLog: (text: string, tone?: LogTone, actor?: string) => void
}

let logSeq = 0

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `id-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`
}

function loadSetup(): PersistedSetup | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PersistedSetup>
    if (!Array.isArray(parsed.players)) return null
    return {
      players: parsed.players.slice(0, MAX_PLAYERS).map((p, i) => ({
        ...p,
        appearance: normaliseAppearance(p.appearance, i),
      })),
      mode: parsed.mode === 'shared' ? 'shared' : 'hotseat',
      calibration: { ...DEFAULT_CALIBRATION, ...(parsed.calibration ?? {}) },
    }
  } catch {
    return null
  }
}

function saveSetup(setup: PersistedSetup): void {
  if (typeof window === 'undefined') return
  const stripped: PersistedSetup = {
    ...setup,
    calibration: { ...setup.calibration, photoDataUrl: null, photoName: null },
  }
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(setup))
  } catch {
    // An uploaded photo can overflow the quota; keep the roster at least.
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(stripped))
    } catch {
      /* storage unavailable — the session just will not persist */
    }
  }
}

function emptyStats(players: Player[]): Record<string, PlayerStat> {
  const out: Record<string, PlayerStat> = {}
  for (const p of players) out[p.id] = { ...EMPTY_STAT }
  return out
}

function statOf(stats: Record<string, PlayerStat>, id: string): PlayerStat {
  return stats[id] ?? { ...EMPTY_STAT }
}

function bumpStat(
  stats: Record<string, PlayerStat>,
  id: string,
  key: keyof PlayerStat,
): Record<string, PlayerStat> {
  const current = statOf(stats, id)
  return { ...stats, [id]: { ...current, [key]: current[key] + 1 } }
}

/** Round-robin so every station belongs to a named human. */
function assignStations(
  stations: Station[],
  players: Player[],
): Record<string, StationRuntime> {
  const out: Record<string, StationRuntime> = {}
  stations.forEach((station, i) => {
    const player = players[i % players.length]
    out[station.id] = {
      playerId: player?.id ?? '',
      solved: false,
      attempts: 0,
      revealed: [],
    }
  })
  return out
}

function placeAtSpawns(players: Player[], spawns: Vec[]): Record<string, Vec> {
  const out: Record<string, Vec> = {}
  players.forEach((p, i) => {
    const spawn = spawns[i % spawns.length]
    if (spawn) out[p.id] = { ...spawn }
  })
  return out
}

function freshCharges(players: Player[]): Record<string, boolean> {
  const out: Record<string, boolean> = {}
  for (const p of players) out[p.id] = true
  return out
}

export function isGated(
  station: Station,
  runtime: Record<string, StationRuntime>,
): boolean {
  return station.requires.some((dep) => !runtime[dep]?.solved)
}

/** The next station that will actually accept input. */
function firstOpenStation(
  level: Level,
  runtime: Record<string, StationRuntime>,
): string | null {
  const open = level.stations.find(
    (s) => !runtime[s.id]?.solved && !isGated(s, runtime),
  )
  if (open) return open.id
  const unsolved = level.stations.find((s) => !runtime[s.id]?.solved)
  return unsolved?.id ?? null
}

/** The lock a DECRYPT or NETWORKER charge should aim at. */
function activeLock(
  level: Level,
  runtime: Record<string, StationRuntime>,
): Station | null {
  return (
    level.stations.find((s) => s.kind !== 'skill' && !runtime[s.id]?.solved) ?? null
  )
}

export interface Presence {
  /** The assigned operator is standing on the lock tile. */
  operatorReady: boolean
  /** A second player is covering the clue tile (or none is needed). */
  assistReady: boolean
  /** Who is currently covering the clue tile, if anyone. */
  assistId: string | null
  /** In hotseat, the device is with the operator. */
  deviceReady: boolean
  ready: boolean
}

export function presenceFor(
  station: Station,
  runtime: Record<string, StationRuntime>,
  positions: Record<string, Vec>,
  players: Player[],
  mode: PlayMode,
  deviceHolderId: string | null,
): Presence {
  const operatorId = runtime[station.id]?.playerId ?? ''
  const operatorReady = sameTile(positions[operatorId], station.lockAt)
  const assist = station.clueAt
    ? players.find(
        (p) => p.id !== operatorId && sameTile(positions[p.id], station.clueAt),
      ) ?? null
    : null
  const assistReady = station.clueAt ? assist !== null : true
  const deviceReady = mode === 'shared' || deviceHolderId === operatorId
  return {
    operatorReady,
    assistReady,
    assistId: assist?.id ?? null,
    deviceReady,
    ready: operatorReady && assistReady && deviceReady,
  }
}

export function everyoneExtracted(
  players: Player[],
  positions: Record<string, Vec>,
): boolean {
  if (players.length === 0) return false
  return players.every((p) =>
    EXTRACTION_TILES.some((tile) => sameTile(positions[p.id], tile)),
  )
}

export function answerFor(station: Station, calibration: Calibration): string {
  switch (station.kind) {
    case 'keypad':
      return calibration.keypadCode
    case 'pattern':
      return calibration.patternCells.join('')
    case 'terminal':
      return expectedAnswer(calibration, station.answerKey)
    case 'skill':
      return ''
  }
}

const boot = loadSetup()

export const useGame = create<GameState>()((set, get) => {
  /** Moves focus (and, in hotseat, the device) to whatever is open next. */
  function refocus(): void {
    const s = get()
    const level = levelAt(s.levelIndex)
    const next = firstOpenStation(level, s.stations)
    if (!next) return
    set({ activeStationId: next })
    if (s.mode === 'hotseat') {
      set({ deviceHolderId: s.stations[next]?.playerId ?? null })
    }
  }

  /** Say which doors a freshly cleared checkpoint just unsealed. */
  function announceDoors(stationId: string): void {
    const opened = DOORS.filter((d) => d.opensWith === stationId)
    for (const door of opened) {
      get().pushLog(`${door.label} door unsealed.`, 'system')
    }
  }

  function bankLevelIfCleared(): void {
    const s = get()
    const level = levelAt(s.levelIndex)
    if (!level.stations.every((st) => s.stations[st.id]?.solved)) return

    if (level.requiresExtraction && !everyoneExtracted(s.players, s.positions)) {
      if (!s.extractionPending) {
        set({ extractionPending: true })
        get().pushLog(
          'Locks are open and the lift lobby is unsealed. Get every last person onto a pad.',
          'system',
        )
        sound.play('alarm')
      }
      return
    }

    const base = Math.max(
      0,
      LEVEL_BASE_SCORE + s.secondsLeft * SECOND_BONUS - s.levelPenalty,
    )
    const award = s.doubled ? base * 2 : base
    const result: LevelResult = {
      levelId: level.id,
      cleared: true,
      secondsLeft: s.secondsLeft,
      score: award,
      attempts: s.levelMisses,
      hintsUsed: s.levelHints,
      skillsUsed: s.levelSkillsUsed,
      doubled: s.doubled,
    }
    set({
      clockRunning: false,
      phase: 'debrief',
      extractionPending: false,
      walking: null,
      totalScore: s.totalScore + award,
      lastLevelScore: award,
      results: [...s.results.filter((r) => r.levelId !== level.id), result],
    })
    get().pushLog(`${level.codename} cleared — ${award} points banked.`, 'good')
    sound.play('win')
  }

  function failLevel(): void {
    const s = get()
    const level = levelAt(s.levelIndex)
    const strikesLeft = s.strikesLeft - 1
    const result: LevelResult = {
      levelId: level.id,
      cleared: false,
      secondsLeft: 0,
      score: 0,
      attempts: s.levelMisses,
      hintsUsed: s.levelHints,
      skillsUsed: s.levelSkillsUsed,
      doubled: s.doubled,
    }
    set({
      clockRunning: false,
      walking: null,
      extractionPending: false,
      strikesLeft,
      lastLevelScore: 0,
      results: [...s.results.filter((r) => r.levelId !== level.id), result],
      phase: strikesLeft <= 0 ? 'failure' : 'debrief',
    })
    get().pushLog(
      `Clock hit zero on ${level.codename}. ${
        strikesLeft > 0
          ? `${strikesLeft} coffee refill${strikesLeft === 1 ? '' : 's'} left.`
          : 'No refills left — the lockdown wins this round.'
      }`,
      'bad',
    )
    sound.play('lose')
  }

  function resolveEntry(stationId: string, raw: string): boolean {
    const s = get()
    const level = levelAt(s.levelIndex)
    const station = level.stations.find((st) => st.id === stationId)
    const rt = s.stations[stationId]
    if (!station || !rt || rt.solved || station.kind === 'skill') return false
    if (isGated(station, s.stations)) return false

    const presence = presenceFor(
      station,
      s.stations,
      s.positions,
      s.players,
      s.mode,
      s.deviceHolderId,
    )
    if (!presence.ready) return false

    const player = s.players.find((p) => p.id === rt.playerId)
    const correct =
      normalise(raw) === normalise(answerFor(station, s.calibration))

    if (correct) {
      set({
        stations: {
          ...s.stations,
          [stationId]: { ...rt, solved: true, attempts: rt.attempts + 1 },
        },
        feedback: { kind: 'good', nonce: s.feedback.nonce + 1 },
        stats: bumpStat(s.stats, rt.playerId, 'solves'),
        clearedStations: s.clearedStations.includes(stationId)
          ? s.clearedStations
          : [...s.clearedStations, stationId],
      })
      announceDoors(stationId)
      get().pushLog(
        `${station.title} verified — ${player?.name ?? 'operator'} got it.`,
        'good',
        player?.name,
      )
      sound.play('unlock')
      refocus()
      bankLevelIfCleared()
      return true
    }

    const shielded = s.shields > 0
    set({
      stations: {
        ...s.stations,
        [stationId]: { ...rt, attempts: rt.attempts + 1 },
      },
      levelMisses: s.levelMisses + 1,
      feedback: { kind: 'bad', nonce: s.feedback.nonce + 1 },
      shields: shielded ? s.shields - 1 : s.shields,
      levelPenalty: shielded ? s.levelPenalty : s.levelPenalty + MISS_COST,
      secondsLeft: shielded
        ? s.secondsLeft
        : Math.max(1, s.secondsLeft - MISS_TIME_PENALTY),
      stats: shielded ? s.stats : bumpStat(s.stats, rt.playerId, 'misses'),
    })
    get().pushLog(
      shielded
        ? `${station.title} rejected that — STEADY HANDS absorbed it, no cost.`
        : `${station.title} rejected that. −${MISS_COST} pts, −${MISS_TIME_PENALTY}s.`,
      'bad',
      player?.name,
    )
    sound.play('wrong')
    return false
  }

  return {
    phase: 'title',
    players: boot?.players ?? [],
    mode: boot?.mode ?? 'hotseat',
    calibration: boot?.calibration ?? { ...DEFAULT_CALIBRATION },

    levelIndex: 0,
    stations: {},
    activeStationId: null,
    deviceHolderId: null,
    secondsLeft: LEVELS[0]?.duration ?? 300,
    clockRunning: false,

    positions: {},
    moverId: null,
    walking: null,
    clearedStations: [],
    extractionPending: false,

    levelPenalty: 0,
    levelMisses: 0,
    levelHints: 0,
    levelSkillsUsed: [],
    doubled: false,
    shields: 0,
    hintedStations: [],
    charges: {},

    totalScore: 0,
    lastLevelScore: 0,
    strikesLeft: MAX_STRIKES,
    results: [],
    stats: {},
    log: [],
    feedback: { kind: null, nonce: 0 },
    sceneOpen: false,

    pushLog(text, tone = 'info', actor) {
      logSeq += 1
      const entry: LogEntry = { id: logSeq, at: Date.now(), tone, text, actor }
      set((s) => ({ log: [entry, ...s.log].slice(0, 60) }))
    },

    addPlayer(input) {
      const { players, mode, calibration } = get()
      if (players.length >= MAX_PLAYERS) return
      const next = [...players, { ...input, id: newId() }]
      set({ players: next })
      saveSetup({ players: next, mode, calibration })
    },

    updatePlayer(id, patch) {
      const { players, mode, calibration } = get()
      const next = players.map((p) => (p.id === id ? { ...p, ...patch } : p))
      set({ players: next })
      saveSetup({ players: next, mode, calibration })
    },

    removePlayer(id) {
      const { players, mode, calibration } = get()
      const next = players.filter((p) => p.id !== id)
      set({ players: next })
      saveSetup({ players: next, mode, calibration })
    },

    setMode(mode) {
      const { players, calibration } = get()
      set({ mode })
      saveSetup({ players, mode, calibration })
    },

    patchCalibration(patch) {
      const { players, mode, calibration } = get()
      const next = { ...calibration, ...patch }
      set({ calibration: next })
      saveSetup({ players, mode, calibration: next })
    },

    resetCalibration() {
      const { players, mode, calibration } = get()
      const next: Calibration = {
        ...DEFAULT_CALIBRATION,
        photoDataUrl: calibration.photoDataUrl,
        photoName: calibration.photoName,
      }
      set({ calibration: next })
      saveSetup({ players, mode, calibration: next })
    },

    goPhase(phase) {
      set({ phase })
    },

    beginBriefing() {
      const { players } = get()
      if (players.length < MIN_PLAYERS) return
      set({
        phase: 'briefing',
        totalScore: 0,
        lastLevelScore: 0,
        results: [],
        strikesLeft: MAX_STRIKES,
        stats: emptyStats(players),
        log: [],
        levelIndex: 0,
        clockRunning: false,
        positions: {},
        moverId: null,
        walking: null,
        clearedStations: [],
        extractionPending: false,
      })
      get().pushLog(
        `Crew of ${players.length} clocked in. Lockdown arms in three stages.`,
        'system',
      )
    },

    startLevel(index) {
      const { players, clearedStations } = get()
      const level = levelAt(index)
      const stations = assignStations(level.stations, players)
      const first = firstOpenStation(level, stations)
      const stageIds = new Set(level.stations.map((st) => st.id))
      const operator = first ? stations[first]?.playerId ?? null : null
      set({
        phase: 'level',
        levelIndex: index,
        stations,
        activeStationId: first,
        deviceHolderId: operator,
        // Everyone is repositioned at the stage entrance, so re-locking a door
        // can never strand somebody outside the room they need.
        positions: placeAtSpawns(players, level.spawns),
        moverId: operator,
        walking: null,
        extractionPending: false,
        clearedStations: clearedStations.filter((id) => !stageIds.has(id)),
        secondsLeft: level.duration,
        clockRunning: true,
        levelPenalty: 0,
        levelMisses: 0,
        levelHints: 0,
        levelSkillsUsed: [],
        doubled: false,
        shields: 0,
        hintedStations: [],
        charges: freshCharges(players),
        sceneOpen: false,
      })
      get().pushLog(`${level.codename} · ${level.title} — clock is live.`, 'system')
      sound.play('alarm')
    },

    advance() {
      const next = get().levelIndex + 1
      if (next >= TOTAL_LEVELS) {
        set({ phase: 'victory', clockRunning: false })
        sound.play('win')
        return
      }
      get().startLevel(next)
    },

    retryLevel() {
      get().startLevel(get().levelIndex)
    },

    /** Arcade continue: one fresh refill, same stage, score kept. */
    continueRun() {
      set({ strikesLeft: 1 })
      get().pushLog('Someone found more coffee. One more refill on the board.', 'system')
      get().startLevel(get().levelIndex)
    },

    restart() {
      const { players } = get()
      set({
        phase: 'briefing',
        totalScore: 0,
        lastLevelScore: 0,
        results: [],
        strikesLeft: MAX_STRIKES,
        stats: emptyStats(players),
        log: [],
        levelIndex: 0,
        clockRunning: false,
        positions: {},
        moverId: null,
        walking: null,
        clearedStations: [],
        extractionPending: false,
      })
      get().pushLog('Shift reset. Same crew, fresh lockdown.', 'system')
    },

    hardReset() {
      set({
        phase: 'title',
        clockRunning: false,
        levelIndex: 0,
        results: [],
        totalScore: 0,
        lastLevelScore: 0,
        log: [],
        stations: {},
        activeStationId: null,
        deviceHolderId: null,
        sceneOpen: false,
        positions: {},
        moverId: null,
        walking: null,
        clearedStations: [],
        extractionPending: false,
      })
    },

    selectStation(id) {
      const { stations } = get()
      if (!stations[id]) return
      sound.play('click')
      // Focus only. Handing the device over is always an explicit act, so
      // tapping a checkpoint on the map never hijacks who you are moving.
      set({ activeStationId: id })
    },

    handDeviceTo(playerId) {
      sound.play('pass')
      // Whoever holds the device is also who the map moves.
      set({ deviceHolderId: playerId, moverId: playerId, walking: null })
    },

    setMover(playerId) {
      sound.play('click')
      set({ moverId: playerId, walking: null })
    },

    walkTo(target) {
      const s = get()
      if (s.phase !== 'level' || s.walking) return
      const moverId = s.mode === 'hotseat' ? s.deviceHolderId : s.moverId
      const from = moverId ? s.positions[moverId] : undefined
      if (!moverId || !from) return
      const path = findPath(from, target, openDoorTiles(s.clearedStations))
      if (!path || path.length === 0) {
        if (path === null) sound.play('wrong')
        return
      }
      sound.play('node')
      set({ walking: { playerId: moverId, path, index: 0 } })
    },

    advanceWalk() {
      const s = get()
      const walk = s.walking
      if (!walk || s.phase !== 'level') return
      const next = walk.path[walk.index]
      if (!next) {
        set({ walking: null })
        return
      }
      const done = walk.index + 1 >= walk.path.length
      set({
        positions: { ...s.positions, [walk.playerId]: next },
        walking: done ? null : { ...walk, index: walk.index + 1 },
        secondsLeft: Math.max(1, s.secondsLeft - STEP_COST),
      })
      if (done) {
        const after = get()
        const who = after.players.find((p) => p.id === walk.playerId)
        if (who) {
          get().pushLog(`${who.name} moved to the ${areaAt(next)}.`, 'info', who.name)
        }
        if (after.extractionPending) bankLevelIfCleared()
      }
    },

    useSkill(playerId, stationId) {
      const s = get()
      if (s.phase !== 'level') return
      const player = s.players.find((p) => p.id === playerId)
      if (!player || !s.charges[playerId]) return
      const level = levelAt(s.levelIndex)

      // Spending a skill-station operator's charge elsewhere would soft-lock
      // the level, so it is refused.
      if (!stationId) {
        const holding = level.stations.find(
          (st) =>
            st.kind === 'skill' &&
            s.stations[st.id]?.playerId === playerId &&
            !s.stations[st.id]?.solved,
        )
        if (holding) {
          get().pushLog(
            `${player.name} is holding ${holding.title} — spend the charge there.`,
            'bad',
          )
          sound.play('wrong')
          return
        }
      }

      const skill = getSkill(player.skillId)
      let stations = s.stations
      let stats = bumpStat(s.stats, playerId, 'skillUses')
      let clearedNow = s.clearedStations

      if (stationId) {
        const station = level.stations.find((st) => st.id === stationId)
        const rt = stations[stationId]
        if (!station || station.kind !== 'skill' || !rt || rt.solved) return
        if (isGated(station, stations)) return
        const presence = presenceFor(
          station,
          stations,
          s.positions,
          s.players,
          s.mode,
          s.deviceHolderId,
        )
        if (!presence.ready) return
        stations = { ...stations, [stationId]: { ...rt, solved: true } }
        stats = bumpStat(stats, playerId, 'solves')
        clearedNow = s.clearedStations.includes(stationId)
          ? s.clearedStations
          : [...s.clearedStations, stationId]
        get().pushLog(
          `${station.title} online — ${player.name} pushed it through.`,
          'good',
          player.name,
        )
      }

      let secondsLeft = s.secondsLeft
      let hintedStations = s.hintedStations
      let doubled = s.doubled
      let shields = s.shields

      switch (skill.id) {
        case 'override':
          secondsLeft = s.secondsLeft + OVERRIDE_SECONDS
          get().pushLog(
            `OVERRIDE — ${player.name} bought the crew ${OVERRIDE_SECONDS}s. "${player.skillLabel}"`,
            'skill',
            player.name,
          )
          break
        case 'insight': {
          const target = activeLock(level, stations) ?? level.stations[0]
          if (target && !hintedStations.includes(target.id)) {
            hintedStations = [...hintedStations, target.id]
          }
          get().pushLog(
            target
              ? `INSIGHT — ${player.name} has been here long enough to just know. Hint on ${target.title} unlocked, free.`
              : `INSIGHT — ${player.name} had nothing left to remember.`,
            'skill',
            player.name,
          )
          break
        }
        case 'amplify':
          doubled = true
          get().pushLog(
            `AMPLIFY — ${player.name} put this level on the all-hands screen. Payout doubled.`,
            'skill',
            player.name,
          )
          break
        case 'steady':
          shields = s.shields + 1
          get().pushLog(
            `STEADY HANDS — ${player.name} is watching the keys. Next miss is free.`,
            'skill',
            player.name,
          )
          break
        case 'decrypt': {
          const lock = activeLock(level, stations)
          get().pushLog(
            lock
              ? `DECRYPT — ${player.name}: ${lock.decrypted}`
              : `DECRYPT — ${player.name} found nothing left to untangle.`,
            'skill',
            player.name,
          )
          break
        }
        case 'network': {
          const lock = activeLock(level, stations)
          const rt = lock ? stations[lock.id] : undefined
          if (!lock || !rt) {
            get().pushLog(
              `NETWORKER — ${player.name} asked around; every lock is already open.`,
              'skill',
              player.name,
            )
            break
          }
          const answer = answerFor(lock, s.calibration)
          const taken = new Set(rt.revealed)
          let target = -1
          for (let i = 0; i < answer.length; i += 1) {
            if (!taken.has(i)) {
              target = i
              break
            }
          }
          if (target === -1) {
            get().pushLog(
              `NETWORKER — ${player.name}: that lock is fully mapped already.`,
              'skill',
              player.name,
            )
            break
          }
          stations = {
            ...stations,
            [lock.id]: { ...rt, revealed: [...rt.revealed, target] },
          }
          const detail =
            lock.kind === 'pattern'
              ? `step ${target + 1} of the path is cell ${Number(answer[target]) + 1}`
              : `position ${target + 1} is "${answer[target]}"`
          get().pushLog(
            `NETWORKER — ${player.name} knew exactly who to ask: on ${lock.title}, ${detail}.`,
            'skill',
            player.name,
          )
          break
        }
      }

      set({
        stations,
        stats,
        secondsLeft,
        hintedStations,
        doubled,
        shields,
        clearedStations: clearedNow,
        charges: { ...s.charges, [playerId]: false },
        levelSkillsUsed: [...s.levelSkillsUsed, player.skillId],
        feedback: { kind: 'skill', nonce: s.feedback.nonce + 1 },
      })
      if (stationId) announceDoors(stationId)
      sound.play('skill')
      refocus()
      bankLevelIfCleared()
    },

    submitEntry(stationId, raw) {
      return resolveEntry(stationId, raw)
    },

    submitTerminal(raw) {
      const s = get()
      const level = levelAt(s.levelIndex)
      const trimmed = raw.trim()
      if (!trimmed) return { ok: false, message: '' }

      const parts = trimmed.split(/\s+/)
      const command = (parts[0] ?? '').toUpperCase()
      const arg = parts.slice(1).join(' ')
      const terminals = level.stations.filter(
        (st): st is Extract<Station, { kind: 'terminal' }> => st.kind === 'terminal',
      )

      if (command === 'HELP' || command === '?') {
        return {
          ok: false,
          message: [
            'available commands:',
            ...terminals.map((st) => `  ${st.usage}`),
            '  STATUS   — show which commands remain and who owns them',
            '  HELP     — this list',
          ].join('\n'),
        }
      }

      if (command === 'STATUS') {
        return {
          ok: false,
          message: [
            'terminal status:',
            ...terminals.map((st) => {
              const rt = s.stations[st.id]
              const who = s.players.find((p) => p.id === rt?.playerId)
              return `  ${st.command.padEnd(6)} ${
                rt?.solved ? 'DONE   ' : 'PENDING'
              }  operator: ${who?.name ?? '—'}`
            }),
          ].join('\n'),
        }
      }

      const station = terminals.find((st) => st.command === command)
      if (!station) {
        sound.play('wrong')
        return {
          ok: false,
          message: `${command.toLowerCase()}: command not found — try HELP`,
        }
      }

      const rt = s.stations[station.id]
      if (rt?.solved) {
        return { ok: false, message: `${command.toLowerCase()}: already applied` }
      }

      const gate = station.requires.find((dep) => !s.stations[dep]?.solved)
      if (gate) {
        const blocker = level.stations.find((st) => st.id === gate)
        sound.play('wrong')
        return {
          ok: false,
          message: `${command.toLowerCase()}: refused — ${
            blocker?.title ?? gate
          } has not completed`,
        }
      }

      if (!arg) {
        return {
          ok: false,
          message: `${command.toLowerCase()}: missing argument — usage: ${station.usage}`,
        }
      }

      const presence = presenceFor(
        station,
        s.stations,
        s.positions,
        s.players,
        s.mode,
        s.deviceHolderId,
      )
      const owner = s.players.find((p) => p.id === rt?.playerId)
      if (!presence.deviceReady) {
        sound.play('wrong')
        return {
          ok: false,
          message: `${command.toLowerCase()}: permission denied — ${
            owner?.name ?? 'another operator'
          } owns this command`,
        }
      }
      if (!presence.operatorReady) {
        sound.play('wrong')
        return {
          ok: false,
          message: `${command.toLowerCase()}: no session — ${
            owner?.name ?? 'the operator'
          } is not at the terminal`,
        }
      }
      if (!presence.assistReady) {
        sound.play('wrong')
        return {
          ok: false,
          message: `${command.toLowerCase()}: unverified — nobody is at the ${
            station.clueLabel ?? 'reference point'
          }`,
        }
      }

      const ok = resolveEntry(station.id, arg)
      return {
        ok,
        message: ok
          ? `${command.toLowerCase()}: accepted — ${station.title} cleared`
          : `${command.toLowerCase()}: rejected — value did not verify`,
      }
    },

    openHint() {
      const s = get()
      const id = s.activeStationId
      if (!id || s.hintedStations.includes(id)) return
      sound.play('click')
      set({
        hintedStations: [...s.hintedStations, id],
        levelHints: s.levelHints + 1,
        levelPenalty: s.levelPenalty + HINT_COST,
      })
      get().pushLog(
        `Hint pulled — ${HINT_COST} points off this level's payout.`,
        'info',
      )
    },

    tick() {
      const s = get()
      if (!s.clockRunning || s.phase !== 'level') return
      const next = s.secondsLeft - 1
      if (next <= 0) {
        set({ secondsLeft: 0 })
        failLevel()
        return
      }
      set({ secondsLeft: next })
      if (next <= 10) sound.play('tick')
    },

    toggleScene(open) {
      sound.play('click')
      set((s) => ({ sceneOpen: open ?? !s.sceneOpen }))
    },
  }
})
