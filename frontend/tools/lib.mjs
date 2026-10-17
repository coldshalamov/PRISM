// Shared helpers for driving the running app in headless Edge (screenshots and interaction checks).
// The dev server (127.0.0.1:5173) and the API (127.0.0.1:8000) are already running; never start another.
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { chromium } from 'playwright-core';

export const BASE = 'http://127.0.0.1:5173';

export async function launch({ width = 1440, height = 900, reducedMotion = false } = {}) {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({
    viewport: { width, height }, reducedMotion: reducedMotion ? 'reduce' : 'no-preference', deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const problems = { console: [], failed: [], external: [] };
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) problems.console.push(`${message.type()}: ${message.text()}`); });
  page.on('pageerror', error => problems.console.push(`pageerror: ${error.message}`));
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.protocol.startsWith('http') && !['127.0.0.1', 'localhost'].includes(url.hostname)) problems.external.push(request.url());
  });
  page.on('requestfailed', request => problems.failed.push(`${request.method()} ${request.url()}`));
  return { browser, context, page, problems };
}

/** Opens a view and waits until the fictional demo dataset has loaded. kit=true opens the 480-record benchmark. */
export async function openApp(page, { view = 'workbench', kit = false } = {}) {
  await page.goto(`${BASE}/#/${view}`);
  await page.waitForFunction(() => {
    const name = document.querySelector('.doc-name')?.textContent ?? 'PRISM';
    return name !== 'PRISM';
  }, null, { timeout: 30000 });
  if (kit) {
    await page.getByRole('menuitem', { name: 'File' }).click();
    await page.getByRole('menuitem', { name: /Open fictional benchmark/ }).click();
    const replace = page.getByRole('button', { name: /^Open the fictional benchmark/ });
    if (await replace.isVisible().catch(() => false)) await replace.click();
    await page.waitForFunction(() => /benchmark|kit/i.test(document.querySelector('.doc-name')?.textContent ?? ''), null, { timeout: 30000 });
  }
}

/** Confirms the classification review so the first candidate is created automatically. */
export async function createFirstCandidate(page) {
  await page.getByRole('button', { name: /Review classifications/ }).first().click();
  await page.getByRole('checkbox', { name: /I reviewed/ }).check();
  await page.getByRole('button', { name: /Confirm and create first candidate/ }).click();
  // The top bar shows the active snapshot label ("... · C1") at every width and in every view.
  await page.waitForFunction(() => /· C\d/.test(document.querySelector('.doc-meta')?.textContent ?? ''), null, { timeout: 90000 });
}

export async function shot(page, file, { full = false } = {}) {
  const target = resolve(file);
  mkdirSync(dirname(target), { recursive: true });
  await page.screenshot({ path: target, fullPage: full });
  return target;
}

export function report(problems) {
  const lines = [];
  lines.push(`console problems: ${problems.console.length}`);
  problems.console.slice(0, 8).forEach(line => lines.push(`  ${line.slice(0, 220)}`));
  lines.push(`failed requests: ${problems.failed.length}`);
  problems.failed.slice(0, 5).forEach(line => lines.push(`  ${line.slice(0, 200)}`));
  lines.push(`external (non-loopback) requests: ${problems.external.length}`);
  problems.external.slice(0, 5).forEach(line => lines.push(`  ${line}`));
  return lines.join('\n');
}
