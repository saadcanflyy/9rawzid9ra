#!/usr/bin/env node
/**
 * Open a real browser, wait for you to sign in, then save the session.
 *
 * Why not `playwright codegen --save-storage`: it only writes the file when the
 * context closes cleanly, so closing the Inspector first, or closing the window
 * a moment too early, silently produces a file with no session in it. That
 * happened twice. This polls localStorage for the Supabase token instead and
 * saves the moment it appears -- you don't have to close anything, and it
 * cannot "succeed" without a real session.
 *
 *   node scripts/capture-auth.mjs auth-student.json
 *
 * Turnstile is on, so the sign-in has to be done by hand. Nothing is typed,
 * read or logged by this script: it only checks whether a token key exists.
 */
import { chromium } from '@playwright/test'

const out = process.argv[2]
if (!out || !/^auth-[\w-]+\.json$/.test(out)) {
  console.error('Usage: node scripts/capture-auth.mjs auth-<name>.json')
  process.exit(1)
}

const ORIGIN = 'https://www.9rawzid9ra.space'
const DEADLINE = Date.now() + 15 * 60 * 1000

const browser = await chromium.launch({ headless: false, args: ['--window-size=1280,900'] })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } })
const page = await ctx.newPage()
await page.goto(ORIGIN + '/login', { waitUntil: 'domcontentloaded', timeout: 60000 })

console.log('Browser open at ' + ORIGIN + '/login')
console.log('Sign in normally. This saves by itself the moment the session exists -- do not close the window.\n')

const hasToken = () => page.evaluate(() => {
  try {
    return Object.keys(localStorage).some(k => k.startsWith('sb-') && k.includes('auth-token'))
  } catch { return false }
}).catch(() => false)

let ok = false, closed = false
while (Date.now() < DEADLINE) {
  if (page.isClosed()) { closed = true; break }
  if (await hasToken()) { ok = true; break }
  try { await page.waitForTimeout(2000) } catch { closed = true; break }
  process.stdout.write('.')
}
console.log('')

if (!ok) {
  console.error(closed
    ? 'Browser was closed before a session existed. Nothing saved - sign in and let the script close itself.'
    : 'Timed out after 15 min with no session. Nothing saved.')
  await browser.close().catch(() => {}); process.exit(1)
}

// Confirm the token actually works for an authenticated view before trusting it.
await page.goto(ORIGIN + '/profile', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {})
await page.waitForTimeout(1500)
const landed = page.url()
if (/\/login/.test(landed)) {
  console.error('Session found but /profile still bounced to /login. Not saving.')
  await browser.close(); process.exit(1)
}

await ctx.storageState({ path: out })
await browser.close()

const j = JSON.parse((await import('node:fs')).readFileSync(out, 'utf8'))
const keys = (j.origins || []).flatMap(o => (o.localStorage || []).map(x => x.name))
console.log('Saved ' + out)
console.log('  /profile reached: ' + landed)
console.log('  auth token      : ' + (keys.some(k => k.startsWith('sb-') && k.includes('auth-token')) ? 'YES' : 'NO'))
