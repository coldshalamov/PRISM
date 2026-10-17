// Quick diagnostic: load the app, wait a few seconds, print problems and body text, save a screenshot.
import { BASE, launch, report, shot } from './lib.mjs';

const { browser, page, problems } = await launch({});
try {
  await page.goto(`${BASE}/#/workbench`);
  await page.waitForTimeout(6000);
  console.log('doc-name:', await page.locator('.doc-name').first().textContent().catch(() => '(none)'));
  console.log('body text:', (await page.locator('body').innerText()).slice(0, 600).replace(/\s+/g, ' '));
  console.log(await shot(page, 'frontend/tools/out/debug.png'));
  console.log(report(problems));
} finally {
  await browser.close();
}
