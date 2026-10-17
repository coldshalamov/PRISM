// Screenshot a view of the running app.
// Usage: node frontend/tools/shot.mjs <view> <width> <outfile.png> [--candidate] [--kit] [--reduced] [--full] [--height=900]
// Views: workbench | map | lab | intent | pareto | report
import { createFirstCandidate, launch, openApp, report, shot } from './lib.mjs';

const [view = 'workbench', width = '1440', out = 'frontend/tools/out/shot.png', ...flags] = process.argv.slice(2);
const has = flag => flags.includes(flag);
const height = Number((flags.find(flag => flag.startsWith('--height=')) ?? '--height=900').split('=')[1]);

const { browser, page, problems } = await launch({ width: Number(width), height, reducedMotion: has('--reduced') });
try {
  await openApp(page, { view, kit: has('--kit') });
  if (has('--candidate')) await createFirstCandidate(page);
  await page.waitForTimeout(900);
  const file = await shot(page, out, { full: has('--full') });
  console.log(`saved ${file}`);
  console.log(report(problems));
} finally {
  await browser.close();
}
