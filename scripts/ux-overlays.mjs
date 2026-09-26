#!/usr/bin/env node
/**
 * The parts of the UI that are not routes: the notifications dropdown, the
 * Messenger panel and the onboarding wizard. Each has to be opened by
 * interaction, so the route sweep in ux-audit.mjs never sees them.
 *
 * Read-only: it opens panels and screenshots them. It never sends a message.
 */
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE || 'http://localhost:4200'
const OUT = 'docs/screenshots/phase3/overlays'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()

async function check(name, width, theme, open) {
  const ctx = await browser.newContext({
    storageState: 'auth-student-local.json',
    viewport: { width, height: width < 500 ? 844 : 900 },
  })
  const page = await ctx.newPage()
  const errs = []
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)) })
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message.slice(0, 120)))
  await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 60000 })
  await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme)
  await page.waitForTimeout(800)

  let opened = false
  try { opened = await open(page) } catch (e) { errs.push('OPEN ' + e.message.slice(0, 90)) }

  const audit = await page.evaluate((vw) => {
    const de = document.documentElement
    const small = []
    for (const el of document.querySelectorAll('[class*="dropdown"],[class*="messenger"],[class*="sheet"],[class*="scrim"]')) {
      for (const t of el.querySelectorAll('a,button,input,textarea,[role="button"]')) {
        const r = t.getBoundingClientRect()
        if (!r.width && !r.height) continue
        // OFFSCREEN_HIDDEN: a 1x1 visually-hidden input is not the target; its label is
        if (r.width <= 2 && r.height <= 2) continue
        if (vw < 500 && (r.width < 44 || r.height < 44)) small.push(t.tagName.toLowerCase() + '.' + (t.className || '').toString().trim().split(/\s+/)[0] + ' ' + Math.round(r.width) + 'x' + Math.round(r.height))
      }
    }
    return { overflowX: de.scrollWidth > vw + 1, small: [...new Set(small)].slice(0, 5) }
  }, width)

  await page.screenshot({ path: `${OUT}/${name}-${theme}-${width}.png` })
  const ok = opened && !audit.overflowX && !audit.small.length && !errs.length
  console.log(`${ok ? 'ok  ' : 'CHECK'} ${name.padEnd(14)} ${theme} ${String(width).padEnd(5)} opened=${opened} overflowX=${audit.overflowX} tap<44=${audit.small.length} errs=${errs.length}`)
  if (audit.small.length) console.log('       small:', audit.small.join(', '))
  if (errs.length) console.log('       errs :', errs.slice(0, 2).join(' | '))
  await ctx.close()
}

const openNotifs = async (page) => {
  const b = page.locator('button[aria-label*="notification" i]').first()
  if (!await b.count()) return false
  await b.click(); await page.waitForTimeout(1200); return true
}
const openMessenger = async (page) => {
  const b = page.locator('.qz-messenger-launcher').first()
  if (!await b.count()) return false
  await b.click(); await page.waitForTimeout(1600); return true
}

for (const w of [390, 1280]) for (const t of ['dark', 'light']) await check('notifications', w, t, openNotifs)
for (const w of [390, 1280]) for (const t of ['dark', 'light']) await check('messenger', w, t, openMessenger)

await browser.close()
