// Lead's third flow check: awkward CSV import, external audit with unknown pairing, session clearing.
// Uses fictional generated rows only (written to frontend/tools/fixtures/).
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { launch, openApp, report, shot } from '../lib.mjs';

const dir = resolve('frontend/tools/fixtures');
mkdirSync(dir, { recursive: true });
const zips = ['02108', '02109', '10001', '33101', '60601', '94103'];
const rows = ['person_id,name,age,zip,weight,notes,flag'];
for (let i = 0; i < 60; i += 1) {
  const notes = i % 7 === 0 ? '"<img src=x onerror=alert(1)>, with comma"' : i % 11 === 0 ? '=SUM(A1:A9)' : i % 5 === 0 ? '' : `note ${i}`;
  rows.push(`P${String(i).padStart(3, '0')},"Fictional, Person ${i}",${25 + (i * 7) % 50},${zips[i % zips.length]},${60 + (i * 3) % 40},${notes},${i % 3 === 0 ? 'true' : 'false'}`);
}
writeFileSync(resolve(dir, 'tricky.csv'), `${rows.join('\n')}\n`);
const released = ['age,zip,weight,flag'];
for (let i = 0; i < 60; i += 1) released.push(`"[${20 + Math.floor(((25 + (i * 7) % 50) - 20) / 10) * 10},${30 + Math.floor(((25 + (i * 7) % 50) - 20) / 10) * 10})",${zips[i % zips.length].slice(0, 3)},"[${60 + Math.floor(((i * 3) % 40) / 10) * 10},${70 + Math.floor(((i * 3) % 40) / 10) * 10})",${i % 3 === 0 ? 'true' : 'false'}`);
writeFileSync(resolve(dir, 'external-release.csv'), `${released.join('\n')}\n`);

const { browser, page, problems } = await launch({ width: 1440, height: 900 });
const out = 'frontend/tools/out/w0';
const text = async (locator) => (await locator.first().innerText().catch(() => '(none)')).replace(/\s+/g, ' ').slice(0, 320);
try {
  await openApp(page);
  await page.getByRole('menuitem', { name: 'File' }).click();
  await page.getByRole('menuitem', { name: /Import original CSV/ }).click();
  await page.locator('input[type=file]').first().setInputFiles(resolve(dir, 'tricky.csv'));
  await page.getByRole('dialog', { name: /Review classifications/ }).waitFor({ timeout: 30000 });
  console.log('REVIEW rows:', await page.locator('.review-table tbody tr').count());
  const confirm = page.getByRole('button', { name: /Confirm and create first candidate/ });
  await page.getByRole('checkbox', { name: /I reviewed/ }).check();
  console.log('CONFIRM DISABLED before unit:', await confirm.isDisabled());
  await page.getByLabel('weight unit').selectOption('kg');
  await page.getByRole('checkbox', { name: /exactly one row/ }).check();
  await shot(page, `${out}/review-import.png`);
  console.log('CONFIRM DISABLED after unit:', await confirm.isDisabled());
  await confirm.click();
  await page.waitForSelector('.library-item .tile-created', { timeout: 90000 });
  await page.waitForTimeout(600);
  const zipCells = await page.locator('.pane.original td').filter({ hasText: '02108' }).count();
  const htmlText = await page.locator('.pane.original td').filter({ hasText: '<img src=x' }).count();
  const imgElements = await page.locator('img').count();
  console.log('ZIP 02108 preserved cells:', zipCells, '| literal <img text cells:', htmlText, '| img elements in DOM:', imgElements);
  await shot(page, `${out}/import-workbench.png`);

  await page.getByRole('menuitem', { name: 'File' }).click();
  await page.getByRole('menuitem', { name: /Audit a protected CSV/ }).click();
  await page.locator('input[type=file]').first().setInputFiles(resolve(dir, 'external-release.csv'));
  await page.getByRole('radio', { name: /Unknown pairing/ }).waitFor({ timeout: 30000 });
  await shot(page, `${out}/audit-dialog.png`);
  await page.getByRole('button', { name: /Run external audit/ }).click();
  await page.waitForSelector('.library-item .tile-audit', { timeout: 90000 });
  await page.waitForTimeout(800);
  console.log('AUDIT PANE HEAD:', await text(page.locator('.pane.protected .pane-head')));
  console.log('AUDIT PANE FOOT:', await text(page.locator('.pane.protected .pane-foot')));
  await page.getByRole('tab', { name: /Findings and coverage/ }).click();
  console.log('AUDIT LINKAGE:', await text(page.locator('.finding.linkage')));
  await shot(page, `${out}/audit-workbench.png`);

  const storage = await page.evaluate(() => JSON.stringify({ ...localStorage, session: { ...sessionStorage } }));
  console.log('STORAGE:', storage.slice(0, 200));
  await page.getByRole('menuitem', { name: 'File' }).click();
  await page.getByRole('menuitem', { name: /Clear local session/ }).click();
  await page.getByRole('button', { name: /^Clear session/ }).click();
  await page.waitForSelector('.start', { timeout: 30000 });
  console.log('AFTER CLEAR:', await text(page.locator('.start')));
  console.log('STORAGE after clear:', (await page.evaluate(() => JSON.stringify({ ...localStorage }))).slice(0, 120));
  await shot(page, `${out}/after-clear.png`);
  console.log(report(problems));
} finally {
  await browser.close();
}
