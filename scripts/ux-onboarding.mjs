#!/usr/bin/env node
/**
 * Screenshot the onboarding wizard, every step, at 390 and 1280.
 *
 * The modal is gated on BOTH user_profiles.onboarded_at and a per-user
 * localStorage flag, so the flag is cleared in the browser context too --
 * otherwise resetting the database alone changes nothing.
 *
 * Pass --complete on the last run to let the wizard finish normally.
 */
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE || 'http://localhost:4200'
const OUT = 'docs/screenshots/phase3/onboarding'
const COMPLETE = process.argv.includes('--complete')
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()

for (const width of [390, 1280]) {
  const ctx = await browser.newContext({
    storageState: 'auth-student-local.json',
    viewport: { width, height: width < 500 ? 844 : 900 },
  })
  const page = await ctx.newPage()
  const errs = []
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)) })
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message.slice(0, 120)))

  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 })
  // The wizard also checks these; clear them or it never shows.
  await page.evaluate(() => {
    try {
      for (const k of Object.keys(localStorage)) if (k.startsWith('9rz_onboarding')) localStorage.removeItem(k)
      for (const k of Object.keys(sessionStorage)) if (k.startsWith('9rz_onboarding')) sessionStorage.removeItem(k)
    } catch {}
  })
  await page.reload({ waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(2500)

  const shot = async (n) => {
    await page.screenshot({ path: `${OUT}/step${n}-${width}.png` })
    const a = await page.evaluate((vw) => {
      const small = []
      for (const t of document.querySelectorAll('.qz-sheet a,.qz-sheet button,.qz-sheet input')) {
        const r = t.getBoundingClientRect()
        if (!r.width && !r.height) continue
        // OFFSCREEN_HIDDEN: a 1x1 visually-hidden input is not the target; its label is
        if (r.width <= 2 && r.height <= 2) continue
        if (vw < 500 && (r.width < 44 || r.height < 44)) small.push((t.className || t.tagName).toString().split(/\s+/)[0] + ' ' + Math.round(r.width) + 'x' + Math.round(r.height))
      }
      return { overflowX: document.documentElement.scrollWidth > vw + 1, small: [...new Set(small)].slice(0, 4) }
    }, width)
    console.log(`  step${n} ${width}px  overflowX=${a.overflowX} tap<44=${a.small.length}${a.small.length ? ' ' + a.small.join(', ') : ''}`)
  }

  const visible = await page.locator('.qz-sheet').count()
  if (!visible) { console.log(`${width}px: wizard did NOT appear`); await ctx.close(); continue }
  console.log(`${width}px:`)
  await shot(1)

  // Step 1 - school
  await page.locator('.qz-sheet input').first().fill('ENSA')
  await page.waitForTimeout(1200)
  const opt = page.locator('.qz-dropdown__item').first()
  if (await opt.count()) { await opt.click(); await page.waitForTimeout(500) }
  await page.locator('.qz-sheet button:has-text("Continuer")').first().click().catch(()=>{})
  await page.waitForTimeout(1500); await shot(2)

  // Step 2 - faculty then filiere
  for (let i = 0; i < 2; i++) {
    const item = page.locator('.qz-dropdown__item').first()
    if (await item.count()) { await item.click(); await page.waitForTimeout(900) }
  }
  await page.locator('.qz-sheet button:has-text("Continuer")').first().click().catch(()=>{})
  await page.waitForTimeout(1200); await shot(3)

  // Step 3 - semester
  const chip = page.locator('.qz-sheet .qz-chip').first()
  if (await chip.count()) { await chip.click(); await page.waitForTimeout(400) }
  await shot(4)

  if (COMPLETE && width === 1280) {
    await page.locator('.qz-sheet button:has-text("Continuer")').first().click().catch(()=>{})
    await page.waitForTimeout(4000); await shot(5)
    for (const label of ['Continuer', 'Voir mon espace']) {
      const b = page.locator(`.qz-sheet button:has-text("${label}")`).first()
      if (await b.count()) { await b.click(); await page.waitForTimeout(2500) }
    }
    await page.screenshot({ path: `${OUT}/done-${width}.png` })
    console.log('  completed the wizard')
  }
  if (errs.length) console.log('  errors:', errs.slice(0, 3))
  await ctx.close()
}
await browser.close()
