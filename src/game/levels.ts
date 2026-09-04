import { EXTRACTION_TILES, assertReachable, openDoorTiles } from './map'
import type { Level, Vec } from './types'

/**
 * Three stages on one floor, chained: L1 produces the keypad digits, L2 the mug
 * count, and L3's checksum is the product — so the finale cannot be brute
 * forced. Each stage's checkpoint also unseals the door to the next area, which
 * is why the map doubles as the progress bar.
 */
export const LEVELS: Level[] = [
  {
    id: 'standup',
    index: 0,
    codename: 'LEVEL 01',
    title: 'Standup Sync',
    location: 'Standup room · Bay 4B',
    premise:
      'The 18:40 lockdown has already armed and it sealed the standup room with the crew inside. The keypad by the door wants a release code; the sprint board across the room is the only thing that still knows it.',
    duration: 300,
    carryLabel: 'Release code',
    spawns: [
      { x: 2, y: 4 },
      { x: 3, y: 4 },
      { x: 4, y: 4 },
      { x: 5, y: 4 },
      { x: 2, y: 5 },
      { x: 4, y: 5 },
    ],
    payoff:
      'The door slides back and the kitchen unseals with it. One lock down — the code you just typed is also half of the finale checksum, so keep it written down.',
    stations: [
      {
        id: 'standup-skill',
        kind: 'skill',
        title: 'Board Access',
        subtitle: 'Walk to the wall panel and spend a charge',
        directive:
          'The keypad by the door is dark. Its operator walks to the wall panel and burns their workplace skill to bring it up — the charge fires its own effect too, so pick the moment.',
        lookAt: 'The grey wall panel in the south-east corner of the standup room.',
        hint: 'Any archetype works here. If the clock is the problem, an Override charge pays for itself immediately.',
        decrypted:
          'Mechanically: one skill actuation from this station’s operator, standing on the panel tile. Nothing to find in the room yet.',
        requires: [],
        lockAt: { x: 5, y: 7 },
      },
      {
        id: 'standup-keypad',
        kind: 'keypad',
        answerKey: 'keypadCode',
        title: 'Door Keypad',
        subtitle: 'One reads the board, one types the code',
        directive:
          'The keypad cannot see the board and the board cannot reach the keypad. Someone has to stand at the whiteboard and call out the digits while the operator types them here, in the colour order the legend prints.',
        lookAt: 'Whiteboard legend + the sticky notes stuck around it.',
        hint: 'The legend reads MAGENTA → CYAN → LIME → AMBER. The notes are stuck in a different order on purpose — sort by colour, not by position.',
        decrypted:
          'Ignore where the notes sit on the board. Order them by the legend colours, left to right, and read off one digit per note.',
        requires: ['standup-skill'],
        lockAt: { x: 3, y: 7 },
        clueAt: { x: 3, y: 2 },
        clueLabel: 'Whiteboard',
      },
    ],
  },
  {
    id: 'coldbrew',
    index: 1,
    codename: 'LEVEL 02',
    title: 'Cold Brew Protocol',
    location: 'Kitchen · rack and service panel',
    premise:
      'The corridor lights run on a motion timer the kitchen governs. The service panel by the kitchen door is a 3×3 pattern lock wired to the mug rack across the room, and the mugs were left in the order they were washed.',
    duration: 330,
    carryLabel: 'Mug count',
    spawns: [
      { x: 10, y: 9 },
      { x: 11, y: 9 },
      { x: 12, y: 9 },
      { x: 10, y: 10 },
      { x: 11, y: 10 },
      { x: 12, y: 10 },
    ],
    payoff:
      'The corridor stays lit and the desk bay unseals. Note how many mugs were on that rack — the finale multiplies it against your release code.',
    stations: [
      {
        id: 'coldbrew-skill',
        kind: 'skill',
        title: 'Rack Priming',
        subtitle: 'Walk to the service panel and spend a charge',
        directive:
          'The rack contacts are cold. Their operator spends a skill charge at the kitchen’s inner panel before any pattern will register.',
        lookAt: 'The panel just inside the kitchen door.',
        hint: 'A Networker charge spent here lights up one correct node on the grid — worth it if the mug numbers are hard to read from across the room.',
        decrypted:
          'Mechanically: one skill actuation from this station’s operator, standing on the panel tile. The pattern grid stays inert until it lands.',
        requires: [],
        lockAt: { x: 8, y: 7 },
      },
      {
        id: 'coldbrew-pattern',
        kind: 'pattern',
        answerKey: 'patternCells',
        title: 'Rack Pattern Lock',
        subtitle: 'One reads the mugs, one traces the path',
        directive:
          'The lock panel is at the far end of the kitchen from the rack. Someone stands at the rack and reads out the number stencilled on each mug base; the operator traces those cells here in ascending order. The grid matches the rack’s own geometry.',
        lookAt: 'The mug bases on the 3×3 rack. Count them while you are there.',
        hint: 'Start at the lowest-numbered mug and finish at the highest. Empty cells are never part of the path.',
        decrypted:
          'The path is the mug numbers in ascending order, mapped onto the rack’s 3×3 geometry: top-left is cell 1, bottom-right is cell 9.',
        requires: ['coldbrew-skill'],
        lockAt: { x: 14, y: 7 },
        clueAt: { x: 10, y: 2 },
        clueLabel: 'Mug rack',
      },
    ],
  },
  {
    id: 'afterhours',
    index: 2,
    codename: 'LEVEL 03',
    title: 'Afterhours Terminal',
    location: 'Desk bay · floor terminal',
    premise:
      'The floor terminal is still logged in. Three commands stand between the crew and an unarmed building — each one needs a runner out on the floor confirming something the terminal cannot see — and then everybody still has to reach the lift.',
    duration: 360,
    carryLabel: 'Building disarmed',
    requiresExtraction: true,
    spawns: [
      { x: 18, y: 9 },
      { x: 19, y: 9 },
      { x: 20, y: 9 },
      { x: 18, y: 10 },
      { x: 19, y: 10 },
      { x: 20, y: 10 },
    ],
    payoff:
      'ALARM DISARMED. The lift lobby unseals — now get every last person through the door before the building notices.',
    stations: [
      {
        id: 'afterhours-skill',
        kind: 'skill',
        title: 'Operator Credentials',
        subtitle: 'Walk to the bay panel and spend a charge',
        directive:
          'The screen is asleep behind a credential prompt. Its operator wakes the shell from the panel in the corner of the desk bay.',
        lookAt: 'The panel in the south-east corner of the desk bay.',
        hint: 'Last stage — unspent charges are worth nothing. Amplify here doubles everything the finale pays out.',
        decrypted:
          'Mechanically: one skill actuation wakes the shell. The three commands below then unlock in order.',
        requires: [],
        lockAt: { x: 23, y: 7 },
      },
      {
        id: 'afterhours-auth',
        kind: 'terminal',
        answerKey: 'badgeId',
        command: 'AUTH',
        usage: 'AUTH <badge-id>',
        title: 'AUTH',
        subtitle: 'A runner reads the badge on the desk',
        directive:
          'Somebody left their badge face-up on the desk across the bay. A second player has to stand over it and read the ID out while the operator types it at the terminal.',
        lookAt: 'The access badge lying next to the keyboard on the far desk.',
        hint: 'The badge ID is two letters, a dash, then four digits. Type it exactly as printed — the shell is not case sensitive.',
        decrypted: 'Command: AUTH followed by the badge ID, e.g. AUTH XX-0000.',
        requires: ['afterhours-skill'],
        lockAt: { x: 21, y: 2 },
        clueAt: { x: 18, y: 6 },
        clueLabel: 'Badge on the desk',
      },
      {
        id: 'afterhours-mount',
        kind: 'terminal',
        answerKey: 'tileCount',
        command: 'MOUNT',
        usage: 'MOUNT <tile-count>',
        title: 'MOUNT',
        subtitle: 'A runner counts tiles out in the corridor',
        directive:
          'The sensor array is indexed by floor tile. Send someone out to the corridor to stand in the run between the two pillars and count the whole tiles, then mount that many.',
        lookAt: 'The floor between pillars A and B in the main corridor.',
        hint: 'Count only the whole tiles in the single run between the pillars — not the whole floor, and not the cut edges.',
        decrypted:
          'Command: MOUNT followed by the number of whole tiles in the pillar-to-pillar run.',
        requires: ['afterhours-auth'],
        lockAt: { x: 21, y: 2 },
        clueAt: { x: 12, y: 11 },
        clueLabel: 'Tile run, corridor',
      },
      {
        id: 'afterhours-exec',
        kind: 'terminal',
        answerKey: 'checksum',
        command: 'EXEC',
        usage: 'EXEC <checksum>',
        title: 'EXEC',
        subtitle: 'The operator finishes it alone',
        directive:
          'The formula is on the monitor in front of you — no runner needed. It wants the digits of your release code added together, multiplied by the number of mugs that were on the rack.',
        lookAt: 'The formula on this monitor, plus your notes from stages 01 and 02.',
        hint: 'Add the release-code digits into a single number first, then multiply by the mug count. The chain panel carries both values for you.',
        decrypted:
          'Command: EXEC followed by digitSum(release code) × mug count. Both operands are in the chain panel.',
        requires: ['afterhours-mount'],
        lockAt: { x: 21, y: 2 },
      },
    ],
  },
]

/**
 * Fail loudly at import time if a stage's checkpoints or extraction pads cannot
 * be walked to from its spawn tiles.
 */
for (const level of LEVELS) {
  const clearedBefore = LEVELS.slice(0, level.index).flatMap((l) =>
    l.stations.map((s) => s.id),
  )
  const openNow = openDoorTiles([
    ...clearedBefore,
    ...level.stations.map((s) => s.id),
  ])
  const required: Vec[] = level.stations.flatMap((s) =>
    s.clueAt ? [s.lockAt, s.clueAt] : [s.lockAt],
  )
  if (level.requiresExtraction) required.push(...EXTRACTION_TILES)
  assertReachable(level.codename, level.spawns, required, openNow)
}

export function levelAt(index: number): Level {
  const level = LEVELS[index]
  if (!level) throw new Error(`No level at index ${index}`)
  return level
}

export const TOTAL_LEVELS = LEVELS.length

export const ALL_STATION_IDS = LEVELS.flatMap((l) => l.stations.map((s) => s.id))
