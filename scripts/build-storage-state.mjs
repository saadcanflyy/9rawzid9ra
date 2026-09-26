#!/usr/bin/env node
/**
 * Turn a copied Supabase session into a Playwright storageState file.
 *
 * Turnstile makes an automated login impossible on purpose, so the session is
 * exported by hand from a real browser instead of being faked. Paste the value
 * of localStorage key sb-<ref>-auth-token (from https://www.9rawzid9ra.space)
 * into auth-token-<name>.txt, then:
 *
 *   node scripts/build-storage-state.mjs auth-token-student.txt auth-student.json
 *
 * The token is never printed, logged or echoed -- only its shape is reported.
 * Both files are gitignored.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const [src, dest] = process.argv.slice(2)
if (!src || !dest) {
  console.error('Usage: node scripts/build-storage-state.mjs <token.txt> <storageState.json>')
  process.exit(1)
}

const PROJECT_REF = 'egqjyzuinoljadzxiwpb'
const ORIGIN = 'https://www.9rawzid9ra.space'
const KEY = `sb-${PROJECT_REF}-auth-token`

let raw = readFileSync(src, 'utf8').trim()
if (!raw) { console.error('Token file is empty.'); process.exit(1) }

// Easy mistake: copying the key NAME out of the DevTools table instead of its
// value. Catch it here rather than producing a storageState that silently
// loads every page logged out.
if (raw === KEY) {
  console.error('That is the key NAME, not its value.')
  console.error(`DevTools > Application > Local Storage > ${ORIGIN} > click ${KEY},`)
  console.error('then copy the VALUE column (a long string starting with base64- or {).')
  process.exit(1)
}

// Accept either the bare localStorage value, or a pasted {"key": "value"} pair.
if (raw.startsWith('{') && raw.includes(KEY)) {
  try {
    const o = JSON.parse(raw)
    if (typeof o[KEY] === 'string') raw = o[KEY]
  } catch { /* fall through: it may be the session object itself */ }
}

// Supabase stores either raw JSON or a "base64-" prefixed blob. Validate we can
// see an access_token WITHOUT ever emitting it.
let session = null
try {
  session = JSON.parse(raw.startsWith('base64-')
    ? Buffer.from(raw.slice(7), 'base64').toString('utf8')
    : raw)
} catch { /* opaque to us; still usable by the app */ }

if (session && !session.access_token && !session?.currentSession?.access_token) {
  console.error('No access_token in that value. Copy the FULL value of ' + KEY + '.')
  process.exit(1)
}

const exp = session?.expires_at ?? session?.currentSession?.expires_at
if (exp) {
  const when = new Date(exp * 1000)
  if (when < new Date()) {
    console.error(`Session expired ${when.toISOString()}. Re-copy it from the browser.`)
    process.exit(1)
  }
  console.log('Session expires: ' + when.toISOString())
}

writeFileSync(dest, JSON.stringify({
  cookies: [],
  origins: [{ origin: ORIGIN, localStorage: [{ name: KEY, value: raw }] }],
}, null, 2))

console.log(`Wrote ${dest} (${raw.length} chars, value not shown)`)
