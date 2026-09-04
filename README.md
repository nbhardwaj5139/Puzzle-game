# Overtime Protocol

A local co-op office escape game for **2–6 players**, played on one device. Your
coworkers are the playable characters you walk around a floor plan, the locks are
checkpoints you have to physically reach, and the answers are not in the app —
they are in the room.

It is 18:38 in Bay 4B. The building arms its lockdown in three stages, the lift
is dead, and the only things that can open the doors are a whiteboard nobody
tidied, a coffee rack, and a terminal somebody left logged in.

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
```

```bash
npm run build    # typecheck + production bundle into dist/
npm run preview  # serve the built bundle on :4173
npm run verify   # end-to-end smoke test against the preview server
```

## How it plays

1. **Assemble the crew** — add 2–6 coworkers with a name, job title, a
   free-text "special workplace skill", an avatar and an accent colour. The
   skill is backed by an **archetype** that does something real (see below).
2. **Customise them** — skin tone, hair style and colour, outfit and accessory,
   plus a badge emoji and an accent colour. The drawn character is the token you
   move on the floor, so make them easy to tell apart across a table.
3. **Pick a mode** — *pass the device* blocks each checkpoint until the operator
   it belongs to confirms they are physically holding the screen; *shared screen*
   shows ownership without enforcing it.
4. **Walk the floor and clear three chained stages.**

### The floor

All three stages play out on one persistent floor plan of Bay 4B: a standup
room, a kitchen, a desk bay, a corridor and the lift lobby. Tap a tile to walk
the crew member you are currently controlling; every step costs **one second**
off the stage clock, so routing matters. Clearing a checkpoint unseals the door
to the next area, which makes the map the campaign's progress bar.

A checkpoint accepts input only when all of this is true:

- its assigned **operator is standing on the checkpoint tile**;
- a **second player is standing on the dashed look-here tile** across the room —
  the whiteboard, the mug rack, the badge, the tile run — reading the clue out;
- in pass-the-device mode, the **operator is holding the device**.

The checkpoint panel shows that as a live checklist with a "move them" button per
row, so nobody has to guess why a lock is refusing them. The floor terminal is
the exception: it stays typeable and refuses you in its own words
(`auth: unverified — nobody is at the Badge on the desk`).

### The three levels

| | Level | Lock | What you have to physically look at |
|---|---|---|---|
| 01 | **Standup Sync** | 4-digit keypad | The whiteboard legend prints a colour order. The sticky notes are stuck in a *different* order. Read the digits in legend order, not board order. |
| 02 | **Cold Brew Protocol** | 3×3 pattern grid | Every mug on the rack has a wash-order number on its base. Trace the grid in ascending mug order; the grid's geometry matches the rack's. |
| 03 | **Afterhours Terminal** | Terminal commands | `AUTH <badge-id>` off the badge on the desk, `MOUNT <tile-count>` from the tiles between pillars A and B, then `EXEC <checksum>`. Each command needs a different runner out on the floor. |

Stage 03 has one more beat: clearing `EXEC` disarms the alarm and unseals the
lift lobby, but the stage does not close until **every single player** is
standing on an extraction pad. Nobody gets left in the building.

The levels are genuinely chained: the finale's checksum is
`Σ(release-code digits) × (mugs on the rack)`, so level 03 cannot be brute
forced without having actually solved 01 and 02. The formula is printed on the
in-game monitor, and solved operands are carried forward in the chain panel.

### Skill archetypes

Each player gets **one charge per level**. A skill station is cleared by its
assigned operator spending theirs; anyone else can spend theirs from the skill
bar at any time. Spending elsewhere is refused if that player is holding an
unsolved skill station, so a level can never soft-lock.

| Archetype | Effect |
|---|---|
| ◈ Decrypt | Prints the plain-language version of the current directive to the feed. |
| ⧗ Override | Adds 45 seconds to the level clock. |
| ✦ Insight | Unlocks the current lock's hint with no score penalty. |
| ⇈ Amplify | Doubles the score awarded for this level. |
| ⛊ Steady Hands | Absorbs the next wrong entry — no penalty, no lost time. |
| ⌬ Networker | Reveals one correct position on the active lock. |

### Scoring

`500 + (seconds left × 5) − penalties`, doubled if Amplify was spent. A wrong
entry costs 50 points and 10 seconds; a hint costs 150; every tile walked costs
a second. The crew shares three
coffee refills — running the clock out spends one and resets the stage. Out of
refills is game over, with an insert-coin continue that grants one more.

## Playing it in your actual office

The drawn Bay 4B is fully solvable on its own, so the game works with no setup.
But the **Reality Check** panel (on the roster and briefing screens) re-points
every answer at your real room:

- **Sticky-note code** — 3–6 digits; one note is drawn per digit, in the
  whiteboard's colour order.
- **Mug wash order** — tap the 3×3 cells in the order players must trace.
- **Badge ID** and **floor-tile count** — the two terminal arguments.
- **Workspace photo** — upload a photo of your own bay and the inspection view
  switches to it. The photo stays in the browser tab; nothing is uploaded.

The finale checksum recomputes itself from the first two fields, so a
recalibrated campaign stays internally consistent. Validation refuses settings
that would produce an unsolvable game.

Nothing in this game talks to a network. The roster and calibration persist to
`localStorage`; an uploaded photo is dropped from the saved setup rather than
overflowing the storage quota.

## Tech

- **React 19** + **TypeScript** (strict), built with **Vite 7**
- **Tailwind CSS v4** via `@tailwindcss/vite`, CSS-first `@theme` tokens
- **Zustand** for game state — a single store holding roster, calibration,
  per-level runtime, scoring and the ops feed
- Sound effects are synthesised at runtime with the **Web Audio API**; the
  workspace bay is hand-authored inline **SVG**. There are no binary assets.

```
src/
  game/
    types.ts       domain types
    map.ts         the floor plan (ASCII), doors, BFS pathfinding, reachability
    levels.ts      the three stages, their checkpoints and tile placements
    scene.ts       calibration defaults, derived checksum, validation
    skills.ts      archetypes and their mechanical effects
    appearance.ts  character customisation options
    sound.ts       Web Audio cue engine
    store.ts       Zustand store: all game state and transitions
  components/
    FloorMap.tsx           the walkable floor plan and crew tokens
    CharacterAvatar.tsx    the parametric coworker (map token + portrait)
    StationRequirements.tsx  the live who-stands-where checklist
    WorkspaceScene.tsx     the inspectable bay (or your uploaded photo)
    Keypad.tsx / PatternGrid.tsx / Terminal.tsx   the three lock types
    LevelScreen.tsx        map, HUD, checkpoint rail, ops feed
    RealityCheckPanel.tsx  facilitator calibration
    ...                    title, roster, briefing, debrief, end screens
tests/
  playthrough.mjs   Playwright end-to-end smoke test
```

The floor plan is authored as an ASCII grid in `map.ts`. On import, `levels.ts`
proves that every checkpoint tile, look-here tile and extraction pad for each
stage is walkable and reachable from that stage's spawn points — a map typo
fails the build rather than stranding somebody mid-game.

## Verification

`npm run verify` drives a real browser through a full three-stage clear —
walking each crew member to their tiles, proving a checkpoint refuses input
while nobody covers the look-here tile, and finishing with the whole crew
extracting to the lift — then the timeout → refill → game-over → continue path,
shared-screen mode, and a 390px mobile layout check. It fails on any console or
page error.
