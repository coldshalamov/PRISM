// Revision fingerprint for the audit loop: SHA-256 over every file in frontend/src, public/, index.html,
// vite.config.ts, package.json and tsconfig.json (sorted by path). Tools, dist and node_modules are excluded.
// Usage: node frontend/tools/hash.mjs
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = resolve('frontend');
const files = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else files.push(full);
  }
}
walk(join(root, 'src'));
walk(join(root, 'public'));
for (const name of ['index.html', 'vite.config.ts', 'package.json', 'tsconfig.json']) files.push(join(root, name));
files.sort();
const hash = createHash('sha256');
for (const file of files) {
  hash.update(relative(root, file).replaceAll('\\', '/'));
  hash.update('\0');
  hash.update(readFileSync(file));
  hash.update('\0');
}
console.log(`${hash.digest('hex')}  (${files.length} files)`);
