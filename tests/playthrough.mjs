/**
 * End-to-end smoke test: plays the whole campaign, then exercises the failure,
 * shared-screen and mobile paths. Run it against a preview server:
 *
 *   npm run build && npm run preview &
 *   npm run verify
 *
 * Set BASE to point at a different origin (defaults to the preview port).
 */
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

/**
 * Prefer whatever Chromium is already on the machine (CI images often ship one
 * that does not match this Playwright build's expected revision). Falls back to
 * Playwright's own download, and CHROME_PATH overrides both.
 */
function resolveChromium() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH
  if (!root || !existsSync(root)) return undefined
  for (const entry of readdirSync(root)) {
    if (!entry.startsWith('chromium-')) continue
    const candidate = join(root, entry, 'chrome-linux', 'chrome')
    if (existsSync(candidate)) return candidate
  }
  return undefined
}

const BASE = process.env.BASE ?? 'http://127.0.0.1:4173'
const CREW = [
  ['Priya', 'QA Lead', 'Never misses a typo', 'Steady Hands'],
  ['Marcus', 'Eng Manager', 'Gets deadlines moved', 'Override'],
  ['Ada', 'Data Analyst', 'Reads a spreadsheet like a novel', 'Networker'],
]

const failures = []
const errors = []

function check(label, actual, expected) {
  const ok = actual === expected
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : ` — got ${actual}, expected ${expected}`}`)
  if (!ok) failures.push(label)
}

function step(msg) {
  console.log(`  ....  ${msg}`)
}

const executablePath = resolveChromium()
const browser = await chromium.launch(executablePath ? { executablePath } : {})
console.log(`chromium: ${executablePath ?? 'playwright default'}`)

async function newPage(options = {}) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, ...options })
  // Keep every wait short: a hang should surface as a fast, named failure.
  page.setDefaultTimeout(10_000)
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`)
  })
  return page
}

async function buildRoster(page, crew = CREW) {
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /Assemble the crew/i }).click()
  for (const [name, role, skill, archetype] of crew) {
    await page.getByPlaceholder('e.g. Priya').fill(name)
    await page.getByPlaceholder('e.g. QA Lead').fill(role)
    await page.getByPlaceholder(/Fixes the printer/).fill(skill)
    await page.getByRole('button', { name: new RegExp(archetype, 'i') }).click()
    await page.getByRole('button', { name: /Add to roster/i }).click()
  }
  await page.getByRole('button', { name: /Enter Bay 4B/i }).click()
  await page.getByRole('heading', { name: /Bay 4B, three stages/i }).waitFor()
}

const TILE = 26
const MAP_W = 26
const MAP_H = 14

/** Click a map tile by its grid coordinate. */
async function clickTile(page, { x, y }) {
  const map = page.locator('svg[aria-label^="Floor plan"]')
  // page.mouse works in viewport coordinates and does not auto-scroll.
  await map.scrollIntoViewIfNeeded()
  const box = await map.boundingBox()
  await page.mouse.click(
    box.x + ((x * TILE + TILE / 2) / (MAP_W * TILE)) * box.width,
    box.y + ((y * TILE + TILE / 2) / (MAP_H * TILE)) * box.height,
  )
}

/**
 * Take control of a crew member and walk them to a tile, then prove they got
 * there — a click that never registered must not pass as a completed walk.
 * A move that can END the stage is driven inline instead (the map unmounts).
 */
async function walk(page, name, tile) {
  await page.getByRole('button', { name: `Control ${name}` }).click()
  await clickTile(page, tile)

  // The token walks a tile every 95ms; settle once its label stops moving.
  const label = page
    .locator('svg[aria-label^="Floor plan"] text')
    .filter({ hasText: new RegExp(`^${name.slice(0, 8)}$`) })
    .first()
  const map = page.locator('svg[aria-label^="Floor plan"]')
  let previous = null
  let stable = 0
  for (let i = 0; i < 90; i += 1) {
    await page.waitForTimeout(100)
    const box = await label.boundingBox().catch(() => null)
    const still =
      box && previous && Math.abs(box.x - previous.x) < 0.5 && Math.abs(box.y - previous.y) < 0.5
    // Three still samples span 300ms — comfortably longer than one 95ms step,
    // so a slow frame mid-walk cannot read as arrival.
    stable = still ? stable + 1 : 0
    previous = box
    if (stable >= 3) {
      // Settled — now prove the token is actually on the requested tile, so a
      // click that never registered cannot pass as a completed walk.
      const mapBox = await map.boundingBox()
      const scale = mapBox.width / (MAP_W * TILE)
      const cellX = Math.floor((box.x + box.width / 2 - mapBox.x) / (TILE * scale))
      const cellY = Math.floor((box.y - mapBox.y) / (TILE * scale))
      if (cellX !== tile.x || Math.abs(cellY - tile.y) > 1) {
        throw new Error(
          `${name} did not reach ${tile.x},${tile.y} — token is around ${cellX},${cellY}`,
        )
      }
      return
    }
  }
  throw new Error(`${name} never finished walking to ${tile.x},${tile.y}`)
}

async function passGate(page) {
  const gate = page.getByRole('button', { name: /I have the device/i })
  if (await gate.isVisible().catch(() => false)) await gate.click()
}

// ---------------------------------------------------------------- full clear
console.log('\nfull campaign clear')
{
  const page = await newPage()
  await buildRoster(page)
  await page.getByRole('button', { name: /Start Level 01/i }).click()

  // ---- L1: skill panel, then one player at the board and one at the keypad
  await page.getByRole('heading', { name: 'Standup Sync' }).waitFor()
  await walk(page, 'Priya', { x: 5, y: 7 })          // skill panel operator
  await passGate(page)
  await page.getByRole('button', { name: /spend the charge/i }).click()

  // Focus advances to the keypad on its own once the skill station clears.
  await page.getByRole('heading', { name: 'Door Keypad' }).waitFor()
  await walk(page, 'Ada', { x: 3, y: 2 })            // reads the whiteboard
  await walk(page, 'Marcus', { x: 3, y: 7 })         // types at the keypad
  await passGate(page)
  step('two players split between the board and the keypad')

  for (const d of ['1', '1', '1', '1']) {
    await page.getByRole('button', { name: d, exact: true }).click()
  }
  await page.getByRole('button', { name: /Submit code/i }).click()
  await page.getByText(/rejected that/).first().waitFor()
  step('a wrong code is rejected and penalised')

  for (const d of ['7', '3', '0', '9']) {
    await page.getByRole('button', { name: d, exact: true }).click()
  }
  await page.getByRole('button', { name: /Submit code/i }).click()
  await page.getByRole('heading', { name: 'STAGE CLEARED' }).waitFor({ timeout: 5000 })
  check('level 01 clears with the crew split across two tiles', true, true)
  await page.getByRole('button', { name: /Advance to the next stage/i }).click()

  // ---- L2: rack across the kitchen from the pattern panel
  await page.getByRole('heading', { name: 'Cold Brew Protocol' }).waitFor()
  await walk(page, 'Priya', { x: 8, y: 7 })          // kitchen panel operator
  await passGate(page)
  await page.getByRole('button', { name: /spend the charge/i }).click()

  await page.getByRole('heading', { name: 'Rack Pattern Lock' }).waitFor()
  await walk(page, 'Ada', { x: 10, y: 2 })           // reads the mug bases
  await walk(page, 'Marcus', { x: 14, y: 7 })        // traces the pattern
  await passGate(page)

  const box = await page.locator('svg.touch-none').boundingBox()
  for (const cell of [0, 1, 4, 7, 8]) {
    await page.mouse.click(
      box.x + ((26 + (cell % 3) * 92) / 236) * box.width,
      box.y + ((26 + Math.floor(cell / 3) * 92) / 236) * box.height,
    )
  }
  await page.getByRole('button', { name: /Lock pattern/i }).click()
  await page.getByRole('heading', { name: 'STAGE CLEARED' }).waitFor({ timeout: 5000 })
  check('level 02 clears on the traced mug order', true, true)
  await page.getByRole('button', { name: /Advance to the next stage/i }).click()

  // ---- L3: terminal plus a runner for each command, then extraction
  await page.getByRole('heading', { name: 'Afterhours Terminal' }).waitFor()
  await walk(page, 'Priya', { x: 23, y: 7 })         // bay panel operator
  await passGate(page)
  await page.getByRole('button', { name: /spend the charge/i }).click()

  async function run(cmd, expect) {
    await passGate(page)
    const input = page.getByLabel('Terminal command')
    await input.click()
    await input.fill(cmd)
    await input.press('Enter')
    if (expect) await page.getByText(expect).first().waitFor({ timeout: 4000 })
  }

  // AUTH: Marcus at the terminal, Priya reading the badge
  await page.getByRole('heading', { name: 'AUTH' }).waitFor()
  await walk(page, 'Marcus', { x: 21, y: 2 })
  await run('EXEC 95', /no session|refused|unverified/)
  step('EXEC is refused before its prerequisites')
  await run('AUTH NB-4417', /unverified/)
  step('AUTH is refused while nobody is at the badge')
  await walk(page, 'Priya', { x: 18, y: 6 })
  await run('AUTH NB-4417', /accepted/)
  check('AUTH lands once a runner covers the badge', true, true)

  // MOUNT: Ada at the terminal, Marcus out counting tiles in the corridor
  await walk(page, 'Ada', { x: 21, y: 2 })
  await walk(page, 'Marcus', { x: 12, y: 11 })
  await run('MOUNT 12', /accepted/)
  check('MOUNT lands once a runner reaches the tile run', true, true)

  // EXEC: back to Priya at the terminal, no runner needed
  await walk(page, 'Priya', { x: 21, y: 2 })
  await run('EXEC 95', null)
  await page.getByText(/does not close until/i).waitFor({ timeout: 4000 })
  check('all locks open but the stage stays live for extraction', true, true)

  // ---- extraction: everybody onto a pad
  await walk(page, 'Priya', { x: 22, y: 11 })
  await walk(page, 'Ada', { x: 23, y: 11 })
  await page.getByRole('button', { name: 'Control Marcus' }).click()
  await clickTile(page, { x: 24, y: 12 })
  await page.getByRole('heading', { name: 'STAGE CLEARED' }).waitFor({ timeout: 15000 })
  check('stage 03 clears only when the whole crew reaches the lift', true, true)

  await page.getByRole('button', { name: /Walk out of the building/i }).click()
  await page.getByRole('heading', { name: 'ALARM DISARMED' }).waitFor()
  const score = Number((await page.locator('.tabular-nums').first().textContent()).trim())
  check('final score is positive', score > 0, true)
  console.log(`  ....  final score ${score}`)
  await page.close()
}

// ------------------------------------------------------- timeouts and refills
console.log('\nclock expiry, refills and continue')
{
  const page = await newPage()
  await page.clock.install()
  await buildRoster(page, CREW.slice(0, 2))
  await page.getByRole('button', { name: /Start Level 01/i }).click()
  await passGate(page)

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await page.clock.runFor(305_000)
    await page.getByRole('heading', { name: /CLOCK EXPIRED|LOCKDOWN HELD/ }).waitFor({ timeout: 5000 })
    const heading = (await page.locator('h1').first().textContent()).trim()
    check(
      `timeout ${attempt} → ${attempt < 3 ? 'debrief' : 'game over'}`,
      heading,
      attempt < 3 ? 'CLOCK EXPIRED' : 'LOCKDOWN HELD',
    )
    if (attempt < 3) {
      await page.getByRole('button', { name: /Retry LEVEL 01/i }).click()
      await passGate(page)
    }
  }
  await page.getByRole('button', { name: /Insert coin/i }).click()
  await page.getByRole('heading', { name: 'Standup Sync' }).waitFor()
  check('insert-coin continue restarts the stage', true, true)
  await page.close()
}

// -------------------------------------------------- shared screen and mobile
console.log('\nshared-screen mode and mobile layout')
{
  const page = await newPage()
  await buildRoster(page)
  await page.getByRole('button', { name: /◂ Crew/i }).click()
  await page.getByRole('button', { name: /Shared screen/i }).click()
  await page.getByRole('button', { name: /Enter Bay 4B/i }).click()
  await page.getByRole('button', { name: /Start Level 01/i }).click()
  const gated = await page
    .getByRole('button', { name: /I have the device/i })
    .isVisible()
    .catch(() => false)
  check('shared-screen mode skips the pass-device gate', gated, false)
  await page.close()
}
{
  const page = await newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  })
  await buildRoster(page)
  await page.getByRole('button', { name: /Start Level 01/i }).click()
  await passGate(page)
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  check('no horizontal overflow at 390px', overflow, 0)
  await page.close()
}

await browser.close()

console.log('\n' + '─'.repeat(52))
if (errors.length) {
  console.log('page/console errors:')
  for (const e of errors) console.log('  ' + e)
}
if (failures.length || errors.length) {
  console.log(`FAILED — ${failures.length} assertion(s), ${errors.length} runtime error(s)`)
  process.exit(1)
}
console.log('ALL CHECKS PASSED — no runtime or console errors')
