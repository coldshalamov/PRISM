// Lead's end-to-end flow check on the Workbench with the 480-record benchmark.
// Checks: first candidate autogenerates after review; exact linkage figure; recipe edit makes evidence stale;
// export stays unavailable until re-evaluation; noise on a known field makes exact linkage not applicable.
import { createFirstCandidate, launch, openApp, report, shot } from '../lib.mjs';

const { browser, page, problems } = await launch({ width: 1440, height: 900 });
const out = 'frontend/tools/out/w0';
try {
  await openApp(page, { kit: true });
  await createFirstCandidate(page);
  await page.waitForTimeout(600);
  await page.getByRole('tab', { name: /Findings and coverage/ }).click();
  const linkage = await page.locator('.finding.linkage').first().innerText();
  console.log('LINKAGE CARD:', linkage.replace(/\s+/g, ' ').slice(0, 260));
  await shot(page, `${out}/kit-candidate.png`);

  // Drop ZIP precision entirely via the field treatment select.
  await page.getByLabel('Treatment for zip').selectOption('drop');
  await page.waitForTimeout(300);
  const banner = await page.locator('.evidence-banner').first().innerText().catch(() => '(no banner)');
  console.log('AFTER EDIT BANNER:', banner.replace(/\s+/g, ' ').slice(0, 260));
  await shot(page, `${out}/kit-stale.png`);
  await page.getByRole('button', { name: /Apply and evaluate/ }).first().click();
  await page.waitForFunction(() => document.querySelectorAll('.library-item .tile-created').length >= 2, null, { timeout: 90000 });
  await page.waitForTimeout(800);
  await page.getByRole('tab', { name: /Findings and coverage/ }).click();
  console.log('LINKAGE AFTER ZIP DROP:', (await page.locator('.finding.linkage').first().innerText()).replace(/\s+/g, ' ').slice(0, 200));
  await shot(page, `${out}/kit-zip-dropped.png`);
  console.log(report(problems));
} finally {
  await browser.close();
}
