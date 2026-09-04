import type { Calibration } from './types'

/**
 * The drawn workspace bay doubles as the "photo" the crew inspects. Every value
 * below is rendered somewhere in WorkspaceScene, so a crew with no real office
 * to walk (or no photo to hand) can still solve the campaign by looking.
 */
export const DEFAULT_CALIBRATION: Calibration = {
  keypadCode: '7309',
  patternCells: [0, 1, 4, 7, 8],
  badgeId: 'NB-4417',
  tileCount: '12',
  photoDataUrl: null,
  photoName: null,
}

export const ROOM_PLATE = '4B-217'

/** Colour order printed on the whiteboard legend. */
export const NOTE_ORDER = [
  'magenta',
  'cyan',
  'lime',
  'amber',
  'violet',
  'coral',
] as const
export type NoteColour = (typeof NOTE_ORDER)[number]

export const NOTE_SWATCH: Record<NoteColour, string> = {
  magenta: '#ff5cc8',
  cyan: '#45d0ff',
  lime: '#b6f24a',
  amber: '#ffb43a',
  violet: '#9d7bff',
  coral: '#ff7a5c',
}

export interface StickyNote {
  colour: NoteColour
  /** Scene viewBox units, top-left of the note. */
  x: number
  y: number
  rotate: number
}

/**
 * Slots are deliberately out of legend order: reading the notes by position
 * gives the wrong code, which is the whole puzzle.
 */
export const STICKY_NOTES: StickyNote[] = [
  { colour: 'magenta', x: 248, y: 192, rotate: 4 },
  { colour: 'cyan', x: 348, y: 126, rotate: -6 },
  { colour: 'lime', x: 174, y: 130, rotate: -3 },
  { colour: 'amber', x: 322, y: 192, rotate: 7 },
  { colour: 'violet', x: 174, y: 194, rotate: -5 },
  { colour: 'coral', x: 250, y: 128, rotate: 6 },
]

export const MIN_CODE_LENGTH = 3
export const MAX_CODE_LENGTH = NOTE_ORDER.length
export const MIN_PATTERN_LENGTH = 3
export const MIN_TILES = 4
export const MAX_TILES = 24

/** The note slots actually stuck on the board for this calibration. */
export function notesFor(keypadCode: string): Array<StickyNote & { digit: string }> {
  return keypadCode.split('').flatMap((digit, i) => {
    const slot = STICKY_NOTES[i]
    return slot ? [{ ...slot, digit }] : []
  })
}

/** Legend colours, in the order the board prints them. */
export function legendFor(keypadCode: string): NoteColour[] {
  return NOTE_ORDER.slice(0, Math.min(keypadCode.length, NOTE_ORDER.length)).map(
    (c) => c,
  )
}

/** Rack cell -> the wash-order number stencilled on that mug's base. */
export function mugLabels(patternCells: number[]): Map<number, number> {
  const map = new Map<number, number>()
  patternCells.forEach((cell, i) => map.set(cell, i + 1))
  return map
}

export function digitSum(value: string): number {
  return value
    .split('')
    .reduce((sum, ch) => (/[0-9]/.test(ch) ? sum + Number(ch) : sum), 0)
}

/**
 * The finale checksum is derived from the two earlier puzzles. That is what
 * chains the levels together — and what keeps the campaign self-consistent
 * after a facilitator recalibrates it to a real room.
 */
export function checksumFor(cal: Calibration): string {
  return String(digitSum(cal.keypadCode) * cal.patternCells.length)
}

export function checksumFormula(cal: Calibration): string {
  return `Σ(code digits) × (mugs) = ${digitSum(cal.keypadCode)} × ${
    cal.patternCells.length
  }`
}

export function expectedAnswer(
  cal: Calibration,
  key: 'keypadCode' | 'badgeId' | 'tileCount' | 'checksum',
): string {
  switch (key) {
    case 'keypadCode':
      return cal.keypadCode
    case 'badgeId':
      return cal.badgeId
    case 'tileCount':
      return cal.tileCount
    case 'checksum':
      return checksumFor(cal)
  }
}

export function normalise(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '')
}

export interface CalibrationIssue {
  field: keyof Calibration
  message: string
}

/** Guards the Reality Check panel so a facilitator cannot build a dead campaign. */
export function validateCalibration(cal: Calibration): CalibrationIssue[] {
  const issues: CalibrationIssue[] = []
  if (!/^[0-9]+$/.test(cal.keypadCode)) {
    issues.push({ field: 'keypadCode', message: 'Digits only.' })
  } else if (
    cal.keypadCode.length < MIN_CODE_LENGTH ||
    cal.keypadCode.length > MAX_CODE_LENGTH
  ) {
    issues.push({
      field: 'keypadCode',
      message: `Needs ${MIN_CODE_LENGTH}–${MAX_CODE_LENGTH} digits — one sticky note per digit.`,
    })
  }
  if (cal.patternCells.length < MIN_PATTERN_LENGTH) {
    issues.push({
      field: 'patternCells',
      message: `Trace at least ${MIN_PATTERN_LENGTH} cells.`,
    })
  }
  if (new Set(cal.patternCells).size !== cal.patternCells.length) {
    issues.push({ field: 'patternCells', message: 'A cell cannot repeat.' })
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9-]{1,15}$/.test(cal.badgeId.trim())) {
    issues.push({
      field: 'badgeId',
      message: '2–16 characters: letters, digits and dashes.',
    })
  }
  const tiles = Number(cal.tileCount)
  if (!/^[0-9]+$/.test(cal.tileCount) || tiles < MIN_TILES || tiles > MAX_TILES) {
    issues.push({
      field: 'tileCount',
      message: `A whole number between ${MIN_TILES} and ${MAX_TILES}.`,
    })
  }
  return issues
}
