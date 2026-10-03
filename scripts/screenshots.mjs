// README gallery screenshots. Needs a running dev server and playwright-core with a Chromium.
// Usage: BASE=http://localhost:5174 TOKEN=... CHROME=/path/to/chrome node scripts/screenshots.mjs
import { chromium } from 'playwright-core'
import { execFileSync } from 'node:child_process'
const BASE = process.env.BASE ?? 'http://localhost:5174'
const OUT = new URL('../docs/screenshots/', import.meta.url).pathname
const browser = await chromium.launch({ executablePath: process.env.CHROME })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()
await page.goto(`${BASE}/login`)
await page.evaluate((t) => fetch('/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: t }) }), process.env.TOKEN)
const shot = async (name, path, act) => {
  await page.goto(BASE + path); await page.waitForTimeout(1800)
  if (act) await act(); await page.waitForTimeout(700)
  await page.screenshot({ path: `${OUT}${name}.png` })
  execFileSync('python3', ['-c', `from PIL import Image; Image.open('${OUT}${name}.png').save('${OUT}${name}.webp','WEBP',quality=80)`]); execFileSync('rm', [`${OUT}${name}.png`])
  console.log('ok', name)
}
await shot('journey', '/')
await shot('question', '/quest/2/0', () => page.locator('.choice, .choices button').first().click())
await shot('scene', '/scenes/kitchen-intruder')
await shot('map', '/map', () => page.locator('.word').filter({ hasText: /^Kuleshov Effect$/ }).click())
await shot('card', '/cards', () => page.locator('.card .title').first().click())
await shot('lab', '/lab')
await shot('gallery', '/gallery')
await shot('search', '/', async () => { await page.keyboard.press('Control+k'); await page.keyboard.type('dolly') })
await shot('hikari', '/quest/1/0', async () => { await page.locator('.kon-fab').click() })
const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, storageState: await ctx.storageState() })
const p2 = await phone.newPage(); await p2.goto(BASE + '/'); await p2.waitForTimeout(1800)
await p2.screenshot({ path: `${OUT}phone.png` })
execFileSync('python3', ['-c', `from PIL import Image; im=Image.open('${OUT}phone.png'); im.thumbnail((520,2000)); im.save('${OUT}phone.webp','WEBP',quality=80)`]); execFileSync('rm', [`${OUT}phone.png`])
await browser.close()
