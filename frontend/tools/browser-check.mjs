// Confirms a local Chromium-family browser can be driven for screenshots.
// Usage: node frontend/tools/browser-check.mjs
import { chromium } from 'playwright-core';

const channels = ['msedge', 'chrome'];
for (const channel of channels) {
  try {
    const browser = await chromium.launch({ channel, headless: true });
    const page = await browser.newPage();
    await page.setContent('<p>ok</p>');
    console.log(`${channel}: launched, version ${browser.version()}`);
    await browser.close();
    process.exit(0);
  } catch (error) {
    console.log(`${channel}: unavailable (${String(error.message).split('\n')[0]})`);
  }
}
process.exit(1);
