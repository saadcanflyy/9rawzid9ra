#!/usr/bin/env node
/**
 * Post-build step: give Sentry the source maps, then take them off the site.
 *
 * Why both halves matter:
 *   - Without maps, every Sentry stack frame reads `main.635e9ef9.js:1:48210`.
 *     Useless. With them uploaded, you get Upload.js:212 and the real code.
 *   - CRA writes build/static/js/*.map and deploys them, so until now anyone
 *     could fetch https://<site>/static/js/main.<hash>.js.map and read the
 *     whole unminified source. This script deletes them after the upload, so
 *     Sentry has them and the public does not.
 *
 * Matching is done with debug IDs (`sentry-cli sourcemaps inject` stamps the
 * same id into the bundle and its map), not filenames or release names, so it
 * keeps working even though the maps are gone by the time an error fires.
 *
 * Runs on every `npm run build`. If the Sentry env vars are missing it skips
 * the upload and only deletes the maps — a build must never fail over this.
 *
 * Vercel -> Settings -> Environment Variables (Production), not public:
 *   SENTRY_AUTH_TOKEN   org auth token, scope `project:releases`
 *   SENTRY_ORG          org slug
 *   SENTRY_PROJECT      project slug
 * SENTRY_AUTH_TOKEN has no REACT_APP_ prefix on purpose: CRA only inlines
 * REACT_APP_* into the bundle, so the token cannot leak into the JS.
 */
import { spawnSync } from 'node:child_process'
import { readdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const BUILD = 'build'
const JS = join(BUILD, 'static', 'js')

if (!existsSync(JS)) {
  console.error(`sentry-sourcemaps: ${JS} not found — did the build run?`)
  process.exit(0)
}

const { SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT } = process.env
const release = process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA

function cli(...args) {
  const r = spawnSync('sentry-cli', args, {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, SENTRY_LOG_LEVEL: 'warn' },
  })
  return r.status === 0
}

if (SENTRY_AUTH_TOKEN && SENTRY_ORG && SENTRY_PROJECT) {
  const target = ['--org', SENTRY_ORG, '--project', SENTRY_PROJECT]
  const upload = ['sourcemaps', 'upload', ...target, ...(release ? ['--release', release] : []), JS]

  // A failed upload costs readable stack traces, not the deploy.
  if (cli('sourcemaps', 'inject', JS) && cli(...upload)) {
    console.log(`sentry-sourcemaps: uploaded${release ? ` (release ${release.slice(0, 7)})` : ''}`)
  } else {
    console.warn('sentry-sourcemaps: upload failed — continuing, traces will be minified')
  }
} else {
  console.log('sentry-sourcemaps: SENTRY_AUTH_TOKEN/ORG/PROJECT not set, skipping upload')
}

// Strip the maps from what gets served, whether or not the upload happened.
// Walks the whole build: CRA emits a map for the CSS bundle too.
let removed = 0
function clean(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      clean(path)
    } else if (entry.name.endsWith('.map')) {
      rmSync(path)
      removed++
    } else if (entry.name.endsWith('.js') || entry.name.endsWith('.css')) {
      // Leave no dangling sourceMappingURL pointing at a 404.
      const src = readFileSync(path, 'utf8')
      const stripped = src.replace(/\n?\/\*# sourceMappingURL=.*?\*\/\s*$|\n?\/\/# sourceMappingURL=.*$/, '')
      if (stripped !== src) writeFileSync(path, stripped)
    }
  }
}
clean(BUILD)
console.log(`sentry-sourcemaps: removed ${removed} .map file(s) from the deployed build`)
