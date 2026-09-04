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

  // L1 — skill station, then the sticky-note keypad
  await page.getByRole('heading', { name: 'Standup Sync' }).waitFor()
  await passGate(page)
  await page.getByRole('button', { name: /spend the charge/i }).click()
  await passGate(page)
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
  check('level 01 clears on the whiteboard code', true, true)
  await page.getByRole('button', { name: /Advance to the next stage/i }).click()

  // L2 — skill station, then the mug-order pattern lock
  await page.getByRole('heading', { name: 'Cold Brew Protocol' }).waitFor()
  await passGate(page)
  await page.getByRole('button', { name: /spend the charge/i }).click()
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

  // L3 — terminal chain, including prerequisite gating
  await page.getByRole('heading', { name: 'Afterhours Terminal' }).waitFor()
  await passGate(page)
  await page.getByRole('button', { name: /spend the charge/i }).click()

  async function run(cmd, expect) {
    await passGate(page)
    const input = page.locator('input[placeholder*="command"]')
    await input.click()
    await input.fill(cmd)
    await input.press('Enter')
    if (expect) await page.getByText(expect).first().waitFor({ timeout: 4000 })
  }
  await run('HELP', /available commands/)
  await run('EXEC 95', /refused/)
  step('EXEC is refused before AUTH and MOUNT complete')
  await run('AUTH NB-4417', /accepted/)
  await run('MOUNT 12', /accepted/)
  await run('EXEC 95', null)
  await page.getByRole('heading', { name: 'STAGE CLEARED' }).waitFor({ timeout: 5000 })
  check('level 03 clears on the chained checksum', true, true)

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
  await page.getByRole('button', { name: /spend the charge/i }).click()
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
