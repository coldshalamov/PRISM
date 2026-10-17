// Run from the repository root: node pitch/render.mjs
// Uses the project's existing playwright-core and installed Chrome. No download.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'frontend', 'package.json'));
const { chromium } = require('playwright-core');
const output = path.join(root, 'pitch', 'renders');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
const externalRequests = [];
page.on('request', request => { if (/^https?:/.test(request.url())) externalRequests.push(request.url()); });
await page.goto(pathToFileURL(path.join(root, 'frontend', 'public', 'pitch', 'index.html')).href);
await page.evaluate(() => document.fonts.ready);
for (let i = 1; i <= 7; i++) {
  await page.evaluate(index => { history.replaceState(null, '', `#slide-${index}`); window.dispatchEvent(new HashChangeEvent('hashchange')); }, i);
  await page.locator(`#slide-${i}`).screenshot({ path: path.join(output, `web-slide-${i}.png`) });
}
await page.emulateMedia({ media: 'print' });
await page.pdf({ path: path.join(root, 'frontend', 'public', 'pitch', 'PRISM-Pitch.pdf'), preferCSSPageSize: true, printBackground: true });
await page.emulateMedia({ media: 'screen' });
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(pathToFileURL(path.join(root, 'frontend', 'public', 'pitch', 'index.html')).href);
await page.evaluate(() => document.fonts.ready);
const mobile = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, slides: [...document.querySelectorAll('.slide')].filter(s => getComputedStyle(s).display !== 'none').length }));
await page.screenshot({ path: path.join(output, 'mobile-cover.png') });
await page.locator('#slide-4').screenshot({ path: path.join(output, 'mobile-result.png') });
await browser.close();
console.log(JSON.stringify({ pdf: 'frontend/public/pitch/PRISM-Pitch.pdf', slides: 7, externalRequests, mobile }, null, 2));
