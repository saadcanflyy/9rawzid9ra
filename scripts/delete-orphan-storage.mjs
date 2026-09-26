#!/usr/bin/env node
/**
 * Delete storage objects in the `documents` bucket that no documents row
 * references any more.
 *
 * Why a script and not SQL: deleting from storage.objects only removes the
 * metadata row — the binary stays in S3 and keeps counting against your
 * storage quota. Only the Storage API deletes both, and that needs the
 * service-role key, which lives on your machine and not in this repo.
 *
 * Dry run (default — lists, deletes nothing):
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/delete-orphan-storage.mjs
 *
 * Actually delete:
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/delete-orphan-storage.mjs --confirm
 */
import { createClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_URL || 'https://egqjyzuinoljadzxiwpb.supabase.co'
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET = 'documents'
const CONFIRM = process.argv.includes('--confirm')

if (!KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is not set.')
  console.error('Supabase dashboard -> Settings -> API -> service_role key.')
  process.exit(1)
}

const db = createClient(URL, KEY, { auth: { persistSession: false } })

const fmt = (b) => b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${(b / 1024).toFixed(0)} kB`

async function listAll(prefix = '', acc = []) {
  const { data, error } = await db.storage.from(BUCKET).list(prefix, { limit: 1000 })
  if (error) throw error
  for (const entry of data) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.id === null) await listAll(path, acc)      // folder
    else acc.push({ path, size: entry.metadata?.size ?? 0 })
  }
  return acc
}

const objects = await listAll()

// Every file path still referenced by a documents row.
const referenced = new Set()
for (let from = 0; ; from += 1000) {
  const { data, error } = await db.from('documents').select('files').range(from, from + 999)
  if (error) throw error
  for (const row of data) for (const url of row.files ?? []) {
    const marker = `/${BUCKET}/`
    const i = url.indexOf(marker, url.indexOf('/storage/'))
    if (i !== -1) referenced.add(decodeURIComponent(url.slice(i + marker.length)))
  }
  if (data.length < 1000) break
}

const orphans = objects.filter(o => !referenced.has(o.path))
const bytes = orphans.reduce((s, o) => s + o.size, 0)

console.log(`bucket objects: ${objects.length}`)
console.log(`referenced by a documents row: ${referenced.size}`)
console.log(`orphans: ${orphans.length} (${fmt(bytes)})\n`)
for (const o of orphans) console.log(`  ${o.path}  ${fmt(o.size)}`)

if (!CONFIRM) {
  console.log('\nDry run. Re-run with --confirm to delete the files listed above.')
  process.exit(0)
}

// Storage caps removals per call; go in batches.
let deleted = 0
for (let i = 0; i < orphans.length; i += 50) {
  const batch = orphans.slice(i, i + 50).map(o => o.path)
  const { data, error } = await db.storage.from(BUCKET).remove(batch)
  if (error) { console.error('remove failed:', error.message); process.exit(1) }
  deleted += data.length
}
console.log(`\ndeleted ${deleted} file(s), freed ${fmt(bytes)}`)
