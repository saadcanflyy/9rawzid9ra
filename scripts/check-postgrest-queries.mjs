#!/usr/bin/env node
/**
 * Replay every `.from(table).select(...)` in src/ against PostgREST and flag the
 * ones it cannot even parse.
 *
 * Why this exists: adding `universities.created_by -> user_profiles(id)` gave
 * PostgREST two ways to join user_profiles and universities, so the embed
 * `universities(name)` became ambiguous and every query using it started
 * failing with PGRST201 — the whole query, not just the embed. The build was
 * green, the tests were green, and the profile page just rendered blank. Only
 * asking the server catches this.
 *
 * A PGRST1xx/2xx code means the query is malformed or ambiguous: a real bug.
 * 42501 (permission denied) means it parsed fine and only RLS stopped us —
 * expected, since this runs with the public anon key.
 *
 *   node scripts/check-postgrest-queries.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const URL_BASE = 'https://egqjyzuinoljadzxiwpb.supabase.co/rest/v1'
const KEY = process.env.SUPABASE_ANON_KEY
  || (readFileSync('src/supabase.js', 'utf8').match(/eyJ[A-Za-z0-9_.-]+/) || [])[0]

if (!KEY) { console.error('No anon key found.'); process.exit(1) }

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.jsx?$/.test(n)) out.push(p)
  }
  return out
}

// from('table') ... .select('cols')  — the select must be within a short window
// so we don't pair a table with some unrelated later select.
const PAIR = /\.from\(\s*'([a-z_]+)'\s*\)[\s\S]{0,400}?\.select\(\s*'([^']*)'/g

const seen = new Map()
for (const file of walk('src')) {
  const src = readFileSync(file, 'utf8')
  for (const m of src.matchAll(PAIR)) {
    const [, table, cols] = m
    if (!cols.includes('(')) continue          // no embed: nothing to disambiguate
    const key = table + '|' + cols
    if (!seen.has(key)) {
      seen.set(key, { table, cols, file: file.split(String.fromCharCode(92)).join('/'), line: src.slice(0, m.index).split(String.fromCharCode(10)).length })
    }
  }
}

console.log(`Probing ${seen.size} distinct embedded queries…\n`)
let bad = 0
for (const { table, cols, file, line } of seen.values()) {
  const url = `${URL_BASE}/${table}?select=${encodeURIComponent(cols)}&limit=1`
  let code = 'ok'
  try {
    const r = await fetch(url, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })
    if (!r.ok) code = (await r.json()).code || String(r.status)
  } catch (e) { code = 'fetch failed: ' + e.message }

  // 42501 = RLS/grant only; the query itself parsed. Anything PGRST* is a bug.
  const isBug = code.startsWith?.('PGRST')
  if (isBug) {
    bad++
    console.log(`BROKEN  ${code}  ${file}:${line}`)
    console.log(`        ${table}.select('${cols.slice(0, 110)}${cols.length > 110 ? '…' : ''}')\n`)
  }
}

console.log(bad ? `\n${bad} broken quer${bad === 1 ? 'y' : 'ies'}.` : 'All embedded queries parse.')
process.exit(bad ? 1 : 0)
