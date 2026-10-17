import { cp, mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Archie currently builds a static Vite SPA. Keep the reviewed application
// intact and pin its exact public JS/CSS artifacts instead of regenerating UI.
const origin = 'https://prism-healthcare-taupe.vercel.app';
const revision = process.argv[2];
if (!revision || !/^[a-z0-9-]{3,50}$/.test(revision)) throw new Error('Provide a new release revision, e.g. r20261017a.');
const frontend = new URL('../../frontend/', import.meta.url);
const output = new URL('../../artifacts/archie-static-build/', import.meta.url);
const published = new URL(`public/archie-assets/${revision}/`, frontend);
try { await access(published); throw new Error('This release revision already exists. Use a new revision; existing Archie pages must keep working.'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
execFileSync(process.execPath, [fileURLToPath(new URL('node_modules/vite/bin/vite.js', frontend)), 'build',
  `--base=${origin}/archie-assets/${revision}/`, '--outDir', fileURLToPath(output), '--emptyOutDir'],
  { cwd: fileURLToPath(frontend), stdio: 'inherit' });
let entry = await readFile(new URL('index.html', output), 'utf8');
if (!entry.includes(`${origin}/archie-assets/${revision}/`)) throw new Error('Missing versioned asset origin.');
// Only this fictional hosted entry permits our fixed public CDN/compute
// origin. The local application's own-origin policy remains unchanged.
for (const directive of ['script-src', 'style-src', 'font-src', 'connect-src']) {
  entry = entry.replace(`${directive} 'self'`, `${directive} 'self' ${origin}`);
}
await mkdir(published, { recursive: true });
await cp(new URL('assets/', output), new URL('assets/', published), { recursive: true });
await cp(new URL('public/THIRD_PARTY_LICENSES.txt', frontend), new URL('THIRD_PARTY_LICENSES.txt', published));
await writeFile(new URL('./index.html', import.meta.url), entry);
console.log(`Prepared immutable ${revision} assets and the exact static Archie entry. Deploy Vercel before saving index.html in Archie.`);
