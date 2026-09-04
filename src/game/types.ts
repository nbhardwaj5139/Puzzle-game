import type {
  AccessoryId,
  HairColourId,
  HairStyleId,
  OutfitId,
  SkinToneId,
} from './appearance'

export interface Vec {
  x: number
  y: number
}

export interface Appearance {
  skin: SkinToneId
  hair: HairStyleId
  hairColour: HairColourId
  outfit: OutfitId
  accessory: AccessoryId
}

export type SkillId =
  | 'decrypt'
  | 'override'
  | 'insight'
  | 'amplify'
  | 'steady'
  | 'network'

export interface SkillArchetype {
  id: SkillId
  name: string
  glyph: string
  tagline: string
  /** What the charge actually does, in mechanical terms. */
  effect: string
  accent: string
}

export interface Player {
  id: string
  name: string
  role: string
  /** Free-text "special workplace skill" written by the player. */
  skillLabel: string
  /** Mechanical archetype backing that skill. */
  skillId: SkillId
  avatar: string
  accent: string
  /** Drawn character, used for the map token and the roster portrait. */
  appearance: Appearance
}

export type StationKind = 'skill' | 'keypad' | 'pattern' | 'terminal'

export interface StationBase {
  id: string
  kind: StationKind
  title: string
  /** Short line shown under the title on the station tab. */
  subtitle: string
  /** The physical-world instruction: what to go look at. */
  directive: string
  /** Where in the real room / photo to look. */
  lookAt: string
  /** Costed hint. */
  hint: string
  /** Revealed by a DECRYPT charge. */
  decrypted: string
  /** Station ids that must be solved before this one accepts input. */
  requires: string[]
  /** Tile the assigned operator has to be standing on. */
  lockAt: Vec
  /** Tile a second player has to occupy for the lock to accept input. */
  clueAt?: Vec
  /** What the assisting player is looking at from that tile. */
  clueLabel?: string
}

export interface SkillStation extends StationBase {
  kind: 'skill'
}

export interface KeypadStation extends StationBase {
  kind: 'keypad'
  answerKey: 'keypadCode'
}

export interface PatternStation extends StationBase {
  kind: 'pattern'
  answerKey: 'patternCells'
}

export interface TerminalStation extends StationBase {
  kind: 'terminal'
  command: string
  answerKey: 'badgeId' | 'tileCount' | 'checksum'
  /** Rendered in the terminal's usage hint. */
  usage: string
}

export type Station =
  | SkillStation
  | KeypadStation
  | PatternStation
  | TerminalStation

export interface Level {
  id: string
  index: number
  codename: string
  title: string
  location: string
  premise: string
  /** Seconds on the clock. */
  duration: number
  stations: Station[]
  /** Shown on the debrief once the level is cleared. */
  payoff: string
  /** Value this level hands forward to the next one. */
  carryLabel: string
  /** Where the crew starts this stage. */
  spawns: Vec[]
  /** When set, the stage only clears once everyone reaches an extraction pad. */
  requiresExtraction?: boolean
}

/**
 * Every answer in the game lives here so a facilitator can retune the whole
 * campaign to their actual office in the Reality Check panel.
 */
export interface Calibration {
  /** Digits on the sticky notes, read in the whiteboard's colour order. */
  keypadCode: string
  /** 3x3 rack cells (0-8) in mug wash order. */
  patternCells: number[]
  /** Badge lying on the desk. */
  badgeId: string
  /** Countable floor tiles between the pillars. */
  tileCount: string
  /** Optional photo the crew inspects instead of the drawn scene. */
  photoDataUrl: string | null
  photoName: string | null
}

export type Phase =
  | 'title'
  | 'roster'
  | 'briefing'
  | 'level'
  | 'debrief'
  | 'victory'
  | 'failure'

export type PlayMode = 'hotseat' | 'shared'

export type LogTone = 'info' | 'good' | 'bad' | 'skill' | 'system'

export interface LogEntry {
  id: number
  at: number
  tone: LogTone
  text: string
  actor?: string
}

export interface WalkState {
  playerId: string
  path: Vec[]
  index: number
}

export interface StationRuntime {
  /** Player assigned to operate this station. */
  playerId: string
  solved: boolean
  attempts: number
  /** Positions already given away by a NETWORKER charge. */
  revealed: number[]
}

export interface LevelResult {
  levelId: string
  cleared: boolean
  secondsLeft: number
  score: number
  attempts: number
  hintsUsed: number
  skillsUsed: SkillId[]
  doubled: boolean
}

export interface PlayerStat {
  solves: number
  misses: number
  skillUses: number
}
