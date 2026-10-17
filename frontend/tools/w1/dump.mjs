// Dumps live registry and lab responses (no row values) to tools/out/w1 for inspection.
import { mkdirSync, writeFileSync } from 'node:fs';
const base = 'http://127.0.0.1:5173';
mkdirSync('frontend/tools/out/w1', { recursive: true });
for (const name of ['registry', 'lab']) {
  const body = await (await fetch(`${base}/v1/${name}`)).json();
  writeFileSync(`frontend/tools/out/w1/${name}.json`, JSON.stringify(body, null, 1));
  console.log(name, 'saved');
}
