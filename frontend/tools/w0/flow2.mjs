// Lead's second flow check: noise on a known field, unknown membership, preset prompt with extras.
import { createFirstCandidate, launch, openApp, report, shot } from '../lib.mjs';

const { browser, page, problems } = await launch({ width: 1440, height: 900 });
const out = 'frontend/tools/out/w0';
const text = async (locator) => (await locator.first().innerText().catch(() => '(none)')).replace(/\s+/g, ' ').slice(0, 300);
try {
  await openApp(page, { kit: true });
  await createFirstCandidate(page);

  // 1. Noise on a known field (age) placed before banding.
  await page.getByRole('tab', { name: /^Steps/ }).click();
  await page.getByRole('button', { name: /Add method/ }).click();
  await page.getByRole('menuitem', { name: /Numeric noise/ }).click();
  for (let i = 0; i < 6; i += 1) {
    const up = page.getByRole('button', { name: /Move Numeric noise \(seeded\) up/ });
    if (await up.isDisabled()) break;
    await up.click();
  }
  await shot(page, `${out}/steps-noise.png`);
  await page.getByRole('button', { name: /Apply and evaluate/ }).first().click();
  await page.waitForFunction(() => document.querySelectorAll('.library-item .tile-created').length >= 2, null, { timeout: 90000 });
  await page.waitForTimeout(700);
  console.log('MEASURES (noise):', await text(page.locator('.ledger-table tbody tr:nth-child(2)')));
  await page.getByRole('tab', { name: /Findings and coverage/ }).click();
  console.log('LINKAGE (noise):', await text(page.locator('.finding.linkage')));
  await shot(page, `${out}/noise-linkage.png`);

  // 2. Unknown membership.
  await page.getByRole('tab', { name: /^Threat/ }).click();
  await page.getByRole('radio', { name: /No, membership is unknown/ }).check();
  await page.waitForTimeout(300);
  console.log('BANNER (threat):', await text(page.locator('.evidence-banner')));
  await shot(page, `${out}/threat-stale.png`);
  await page.getByRole('button', { name: /Re-evaluate this snapshot|Evaluate current recipe/ }).first().click();
  await page.waitForFunction(() => document.querySelectorAll('.library-item .tile-created').length >= 3, null, { timeout: 90000 });
  await page.waitForTimeout(700);
  await page.getByRole('tab', { name: /^Measurements/ }).click();
  console.log('MEASURES (unknown membership):', await text(page.locator('.ledger-table tbody')));
  await shot(page, `${out}/membership-unknown.png`);

  // 3. Preset prompt with extras present.
  await page.getByRole('tab', { name: /^Steps/ }).click();
  await page.getByRole('button', { name: 'Coarser data' }).click();
  console.log('PRESET DIALOG:', await text(page.getByRole('dialog')));
  await shot(page, `${out}/preset-dialog.png`);
  await page.keyboard.press('Escape');
  console.log('DIALOG AFTER ESC visible:', await page.getByRole('dialog').isVisible().catch(() => false));
  console.log(report(problems));
} finally {
  await browser.close();
}
