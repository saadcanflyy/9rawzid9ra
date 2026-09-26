#!/usr/bin/env node
/**
 * Phase 3 UX sweep. For each route x width x theme:
 *   - screenshot into docs/screenshots/phase3/<stage>/
 *   - horizontal overflow (document wider than viewport)
 *   - elements overflowing the viewport on the inline axis
 *   - interactive targets under 44x44 on mobile
 *   - text below 12px
 *   - console errors and failed REST calls
 *
 * Usage: node scripts/ux-audit.mjs <stage> [--auth=auth-student.json]
 */
import { chromium } from '@playwright/test'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'

const stage = process.argv[2] || 'before'
const authArg = process.argv.find(a => a.startsWith('--auth='))
const storageState = authArg && existsSync(authArg.slice(7)) ? authArg.slice(7) : undefined
const BASE = process.env.BASE || 'http://localhost:4200'
const OUT = `docs/screenshots/phase3/${stage}`
mkdirSync(OUT, { recursive: true })

const PUBLIC = [
  ['home', '/'], ['browse', '/browse'], ['login', '/login'], ['register', '/register'],
  ['forgot-password', '/forgot-password'], ['senpai', '/senpai'], ['classement', '/classement'],
  ['about', '/about'], ['contact', '/contact'], ['privacy-policy', '/privacy-policy'],
  ['terms', '/terms'], ['ai', '/ai'], ['notfound', '/nope-404'],
]
const AUTHED = [
  ['upload', '/upload'], ['profile', '/profile'], ['my-modules', '/my-modules'],
  ['admin', '/admin'], ['moderator', '/moderator'],
]
const routes = storageState ? [...PUBLIC, ...AUTHED] : PUBLIC
const WIDTHS = [390, 1280]

const browser = await chromium.launch()
const findings = []

for (const [name, route] of routes) {
  for (const width of WIDTHS) {
    for (const theme of ['dark', 'light']) {
      const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 900 }, storageState, deviceScaleFactor: 1 })
      const page = await ctx.newPage()
      const errs = [], rest = []
      page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 140)) })
      page.on('pageerror', e => errs.push('PAGEERROR ' + e.message.slice(0, 140)))
      page.on('response', async r => {
        if (r.url().includes('/rest/v1/') && !r.ok()) {
          let c = r.status(); try { c = (await r.json()).code || c } catch {}
          rest.push(`${c} ${decodeURIComponent(r.url().split('/rest/v1/')[1]).slice(0, 80)}`)
        }
      })
      try {
        await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 45000 })
        await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme)
        await page.waitForTimeout(700)
      } catch (e) { errs.push('NAV ' + e.message.slice(0, 80)) }

      const audit = await page.evaluate((vw) => {
        const out = { overflowX: false, wide: [], small: [], tiny: [] }
        const de = document.documentElement
        out.overflowX = de.scrollWidth > vw + 1
        const seen = new Set()
        for (const el of document.querySelectorAll('body *')) {
          const cs = getComputedStyle(el)
          if (cs.display === 'none' || cs.visibility === 'hidden' || !el.getClientRects().length) continue
          const r = el.getBoundingClientRect()
          if (r.width === 0 && r.height === 0) continue
          const tag = el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0,2).join('.') : '')
          // Ignore anything inside a deliberate horizontal scroller (chip bars,
          // wide tables): overflowing its container is the intended pattern.
          const inScroller = (() => { let a = el.parentElement; while (a && a !== document.body) { const s = getComputedStyle(a); if ((s.overflowX === 'auto' || s.overflowX === 'scroll') && a.scrollWidth > a.clientWidth + 1) return true; a = a.parentElement } return false })()
          if (!inScroller && (r.right > vw + 1 || r.left < -1)) { if (!seen.has('w'+tag)) { seen.add('w'+tag); out.wide.push(`${tag} [${Math.round(r.left)}..${Math.round(r.right)}]`) } }
          const interactive = el.matches('a,button,input,select,textarea,[role="button"],[tabindex]:not([tabindex="-1"])')
          if (interactive && vw < 500 && (r.width < 44 || r.height < 44)) {
            if (!seen.has('s'+tag)) { seen.add('s'+tag); out.small.push(`${tag} ${Math.round(r.width)}x${Math.round(r.height)}`) }
          }
          const fs = parseFloat(cs.fontSize)
          if (fs && fs < 12 && el.textContent && el.textContent.trim() && el.children.length === 0) {
            if (!seen.has('t'+tag)) { seen.add('t'+tag); out.tiny.push(`${tag} ${fs}px`) }
          }
        }
        return out
      }, width).catch(() => ({ overflowX: false, wide: [], small: [], tiny: [], failed: true }))

      const file = `${name}-${theme}-${width}.png`
      await page.screenshot({ path: `${OUT}/${file}`, fullPage: true }).catch(() => {})
      findings.push({ name, route, width, theme, ...audit, errs, rest: rest.filter(x => !x.startsWith('401')), rest401: rest.filter(x => x.startsWith('401')).length })
      await ctx.close()
    }
  }
  process.stdout.write(`${name} `)
}
console.log('')
await browser.close()
writeFileSync(`${OUT}/findings.json`, JSON.stringify(findings, null, 2))

// Roll up per route
const byRoute = new Map()
for (const f of findings) {
  const k = f.name
  if (!byRoute.has(k)) byRoute.set(k, { route: f.route, overflow: new Set(), wide: new Set(), small: new Set(), tiny: new Set(), errs: new Set(), rest: new Set() })
  const b = byRoute.get(k)
  if (f.overflowX) b.overflow.add(`${f.width}px`)
  f.wide.forEach(x => b.wide.add(`${f.width}: ${x}`))
  f.small.forEach(x => b.small.add(x))
  f.tiny.forEach(x => b.tiny.add(x))
  f.errs.forEach(x => b.errs.add(x))
  f.rest.forEach(x => b.rest.add(x))
}
console.log('\nroute            overflowX  offscreen  tap<44  text<12  consoleErr  restErr')
for (const [n, b] of byRoute) {
  console.log(
    n.padEnd(17) +
    (b.overflow.size ? [...b.overflow].join(',') : '-').padEnd(11) +
    String(b.wide.size).padEnd(11) + String(b.small.size).padEnd(8) +
    String(b.tiny.size).padEnd(9) + String(b.errs.size).padEnd(12) + String(b.rest.size)
  )
}
