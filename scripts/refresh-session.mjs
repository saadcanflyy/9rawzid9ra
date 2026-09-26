#!/usr/bin/env node
/**
 * Keep the screenshot session alive without asking for a new token.
 *
 * Supabase access tokens last about an hour, but the stored session also holds
 * a refresh_token. Rather than waiting for supabase-js to decide it is time
 * (it only refreshes close to expiry, which makes the result depend on when
 * this happens to run), redeem the refresh_token explicitly and write the new
 * session back in the same shape the client stored it in.
 *
 *   node scripts/refresh-session.mjs auth-student.json [auth-student-local.json]
 *
 * Exits 1 only if the refresh token itself is rejected -- the one case that
 * needs a human. No token value is ever printed.
 */
import { chromium } from '@playwright/test'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const [state, localState] = process.argv.slice(2)
if (!state || !existsSync(state)) {
  console.error('Missing storageState: ' + state)
  process.exit(1)
}

const REF = 'egqjyzuinoljadzxiwpb'
const ORIGIN = 'https://www.9rawzid9ra.space'
const KEY = 'sb-' + REF + '-auth-token'
const ANON = (readFileSync('src/supabase.js', 'utf8').match(/eyJ[A-Za-z0-9_.-]+/) || [])[0]

function expiryOf(file) {
  try {
    const j = JSON.parse(readFileSync(file, 'utf8'))
    const raw = j.origins?.[0]?.localStorage?.find(x => x.name === KEY)?.value || ''
    const s = JSON.parse(raw.startsWith('base64-') ? Buffer.from(raw.slice(7), 'base64').toString('utf8') : raw)
    return s.expires_at ?? s?.currentSession?.expires_at ?? null
  } catch { return null }
}

const before = expiryOf(state)
console.log('before:', before ? new Date(before * 1000).toISOString() : '(unreadable)')

const browser = await chromium.launch()
const ctx = await browser.newContext({ storageState: state })
const page = await ctx.newPage()
await page.goto(ORIGIN + '/login', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {})

const res = await page.evaluate(async (arg) => {
  const raw = localStorage.getItem(arg.key)
  if (!raw) return { ok: false, why: 'no session in localStorage' }
  const b64 = raw.startsWith('base64-')
  let sess
  try { sess = JSON.parse(b64 ? atob(raw.slice(7)) : raw) } catch (e) { return { ok: false, why: 'unparseable session' } }
  const token = sess.refresh_token || (sess.currentSession && sess.currentSession.refresh_token)
  if (!token) return { ok: false, why: 'no refresh_token in session' }

  const r = await fetch('https://' + arg.ref + '.supabase.co/auth/v1/token?grant_type=refresh_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: arg.anon, Authorization: 'Bearer ' + arg.anon },
    body: JSON.stringify({ refresh_token: token }),
  })
  if (!r.ok) return { ok: false, why: 'HTTP ' + r.status + ' ' + (await r.text()).slice(0, 140) }
  const next = await r.json()
  if (!next.access_token) return { ok: false, why: 'no access_token in response' }
  next.expires_at = Math.floor(Date.now() / 1000) + (next.expires_in || 3600)
  localStorage.setItem(arg.key, b64 ? 'base64-' + btoa(JSON.stringify(next)) : JSON.stringify(next))
  return { ok: true }
}, { key: KEY, ref: REF, anon: ANON })

if (!res.ok) {
  console.error('Refresh failed: ' + res.why)
  await browser.close()
  process.exit(1)
}

await ctx.storageState({ path: state })
await browser.close()

const after = expiryOf(state)
console.log('after :', after ? new Date(after * 1000).toISOString() : '(unreadable)')

if (localState) {
  const j = JSON.parse(readFileSync(state, 'utf8'))
  writeFileSync(localState, JSON.stringify({
    cookies: [],
    origins: [{ origin: 'http://localhost:4200', localStorage: j.origins[0].localStorage }],
  }, null, 2))
  console.log('mirrored ->', localState)
}
