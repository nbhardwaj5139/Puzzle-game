import type { Level } from './types'

/**
 * Three levels, chained: L1 produces the keypad digits, L2 produces the mug
 * count, and L3's checksum is the product of the two — so the crew cannot brute
 * force the finale without having genuinely cleared the first two.
 */
export const LEVELS: Level[] = [
  {
    id: 'standup',
    index: 0,
    codename: 'LEVEL 01',
    title: 'Standup Sync',
    location: 'Whiteboard wall · Bay 4B',
    premise:
      'The 18:40 building lockdown has already armed. The sprint board holds the first release code, but somebody re-stuck the notes out of order and the legend is the only thing that still knows the sequence.',
    duration: 300,
    carryLabel: 'Release code',
    payoff:
      'The badge reader by the door blinks amber. One lock down — the code you just typed is also the first half of the finale checksum, so keep it written down.',
    stations: [
      {
        id: 'standup-skill',
        kind: 'skill',
        title: 'Board Access',
        subtitle: 'Spend a skill charge to power the keypad',
        directive:
          'The keypad by the door is dark. Whoever is on this station burns their workplace skill to bring it up — the charge also fires its own effect, so choose the moment.',
        lookAt: 'The keypad beside the door frame.',
        hint: 'Any archetype works here. If the clock is the problem, an Override charge pays for itself.',
        decrypted:
          'Mechanically: this station only needs one skill actuation from its assigned operator. Nothing to find in the room yet.',
        requires: [],
      },
      {
        id: 'standup-keypad',
        kind: 'keypad',
        answerKey: 'keypadCode',
        title: 'Door Keypad',
        subtitle: 'Enter the release code',
        directive:
          'Read the colour order printed on the whiteboard legend, then read the digit on each sticky note in exactly that order. Type the result.',
        lookAt: 'Whiteboard legend + the four sticky notes stuck around it.',
        hint: 'The legend reads MAGENTA → CYAN → LIME → AMBER. The notes are stuck in a different order on purpose — sort by colour, not by position.',
        decrypted:
          'Take the four sticky notes. Ignore where they sit on the board. Order them by the legend colours, left to right, and read off one digit per note.',
        requires: ['standup-skill'],
      },
    ],
  },
  {
    id: 'coldbrew',
    index: 1,
    codename: 'LEVEL 02',
    title: 'Cold Brew Protocol',
    location: 'Coffee station · rack shelf',
    premise:
      'Past the door, the corridor lights are on a motion timer that the coffee station somehow governs. The rack shelf is a 3×3 pattern lock, and the mugs were left in the order they were washed.',
    duration: 270,
    carryLabel: 'Mug count',
    payoff:
      'The corridor stays lit. Note how many mugs were on that rack — the finale multiplies it against your release code.',
    stations: [
      {
        id: 'coldbrew-skill',
        kind: 'skill',
        title: 'Rack Priming',
        subtitle: 'Spend a skill charge to energise the shelf',
        directive:
          'The rack contacts are cold. Its operator spends a skill charge to prime them before any pattern will register.',
        lookAt: 'The 3×3 rack behind the coffee station.',
        hint: 'A Networker charge spent here lights up one correct node on the grid — worth it if the mug numbers are hard to read.',
        decrypted:
          'Mechanically: one skill actuation from this station’s operator. The pattern grid stays inert until it lands.',
        requires: [],
      },
      {
        id: 'coldbrew-pattern',
        kind: 'pattern',
        answerKey: 'patternCells',
        title: 'Rack Pattern Lock',
        subtitle: 'Trace the wash order',
        directive:
          'Every mug on the rack has a number stencilled on its base. Drag through the grid cells in ascending mug order — cell positions match where the mugs actually sit on the shelf.',
        lookAt: 'The mug bases on the rack. Count them while you are there.',
        hint: 'Start at the lowest-numbered mug and finish at the highest. Empty cells are never part of the path.',
        decrypted:
          'The path is the mug numbers in ascending order, mapped onto the rack’s own 3×3 geometry: top-left is cell 1, bottom-right is cell 9.',
        requires: ['coldbrew-skill'],
      },
    ],
  },
  {
    id: 'afterhours',
    index: 2,
    codename: 'LEVEL 03',
    title: 'Afterhours Terminal',
    location: 'Desk 12 · left monitor',
    premise:
      'The floor terminal is still logged in. Three commands stand between the crew and an unarmed building — and the last one wants a number that only exists if the first two levels really happened.',
    duration: 240,
    carryLabel: 'Building disarmed',
    payoff:
      'ALARM DISARMED. The lift comes back online and the whole crew walks out with their evening intact.',
    stations: [
      {
        id: 'afterhours-skill',
        kind: 'skill',
        title: 'Operator Credentials',
        subtitle: 'Spend a skill charge to wake the terminal',
        directive:
          'The screen is asleep behind a credential prompt. Its operator spends a skill charge to bring the shell up.',
        lookAt: 'The left monitor on desk 12.',
        hint: 'This is the last level — unspent charges are worth nothing. Amplify here doubles everything the finale pays out.',
        decrypted:
          'Mechanically: one skill actuation wakes the shell. The three commands below unlock in order after it.',
        requires: [],
      },
      {
        id: 'afterhours-auth',
        kind: 'terminal',
        answerKey: 'badgeId',
        command: 'AUTH',
        usage: 'AUTH <badge-id>',
        title: 'AUTH',
        subtitle: 'Authenticate with the badge on the desk',
        directive:
          'Somebody left their badge face-up on the desk. Read the ID printed on it and authenticate with it.',
        lookAt: 'The access badge lying next to the keyboard.',
        hint: 'The badge ID is two letters, a dash, then four digits. Type it exactly as printed — the shell is not case sensitive.',
        decrypted: 'Command: AUTH followed by the badge ID, e.g. AUTH XX-0000.',
        requires: ['afterhours-skill'],
      },
      {
        id: 'afterhours-mount',
        kind: 'terminal',
        answerKey: 'tileCount',
        command: 'MOUNT',
        usage: 'MOUNT <tile-count>',
        title: 'MOUNT',
        subtitle: 'Mount the floor sensor array',
        directive:
          'The sensor array is indexed by floor tile. Count the tiles in the run between the two pillars and mount that many.',
        lookAt: 'The floor between the two pillars. Count them one at a time.',
        hint: 'Count only the full tiles in the single run between the pillars — not the whole floor, and not the cut edges.',
        decrypted:
          'Command: MOUNT followed by the number of whole tiles in the pillar-to-pillar run.',
        requires: ['afterhours-auth'],
      },
      {
        id: 'afterhours-exec',
        kind: 'terminal',
        answerKey: 'checksum',
        command: 'EXEC',
        usage: 'EXEC <checksum>',
        title: 'EXEC',
        subtitle: 'Execute the disarm with the chained checksum',
        directive:
          'The monitor prints the checksum formula. It wants the digits of your release code added together, multiplied by the number of mugs that were on the rack.',
        lookAt: 'The formula on the monitor — plus your notes from levels 01 and 02.',
        hint: 'Add the release-code digits into a single number first, then multiply by the mug count. The chain panel on the right carries both values for you.',
        decrypted:
          'Command: EXEC followed by digitSum(release code) × mug count. Both operands are in the chain panel.',
        requires: ['afterhours-mount'],
      },
    ],
  },
]

export function levelAt(index: number): Level {
  const level = LEVELS[index]
  if (!level) throw new Error(`No level at index ${index}`)
  return level
}

export const TOTAL_LEVELS = LEVELS.length
