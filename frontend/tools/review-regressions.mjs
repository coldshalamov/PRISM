import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';
import { fileURLToPath } from 'node:url';

function loadSource(path) {
  const built = buildSync({ entryPoints: [fileURLToPath(new URL(path, import.meta.url))], bundle: true, platform: 'node', format: 'cjs', external: ['./api'], write: false });
  const module = { exports: {} };
  // These pure readings do not call transport/normalization helpers. Keep the
  // browser API module out of Node rather than simulating browser networking.
  const require = name => { if (name === './api') return {}; throw new Error(`Unexpected dependency: ${name}`); };
  new Function('module', 'exports', 'require', built.outputFiles[0].text)(module, module.exports, require);
  return module.exports;
}
const { rowsAligned } = loadSource('../src/analysis.ts');
const { candidateThreat } = loadSource('../src/threat.ts');
const source = { rowCount: 480 };
const candidate = { rowCount: 480, alignment: 'verified', recipe: { steps: [] }, risk: { qi: [], sensitive_targets: [] } };
assert.equal(rowsAligned(candidate, source), true);
// A reversed external crosswalk verifies identity for evaluation, not preview order.
assert.equal(rowsAligned({ ...candidate, auditMode: 'paired_row_preserving', recipe: { version: 'external', steps: [] } }, source), false);
assert.equal(rowsAligned({ ...candidate, recipe: { steps: [{ method: 'suppress_rows' }] } }, source), false);
const liveControls = { known: ['age'], secret: [], membershipKnown: true };
assert.equal(candidateThreat(candidate, liveControls).membershipKnown, null);
assert.equal(candidateThreat({ ...candidate, threatContext: { membershipKnown: false } }, liveControls).membershipKnown, false);
assert.equal(candidateThreat({ ...candidate, threatContext: { membershipKnown: true } }, liveControls).membershipKnown, true);
console.log('External preview order and missing frozen membership regressions passed.');
