// Compare the client preview directly with the real Python transform engine.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const python = process.env.PRISM_PYTHON || path.join(root, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const fixtures = JSON.parse(execFileSync(python, [path.join(root, 'backend/tests/draft_preview_fixture.py')], {
  cwd: root, env: { ...process.env, PYTHONPATH: path.join(root, 'backend') }, encoding: 'utf8',
}));
const temp = await mkdtemp(path.join(os.tmpdir(), 'prism-preview-'));
try {
  const output = path.join(temp, 'preview.mjs');
  await build({ entryPoints: [path.join(root, 'frontend/src/draftPreview.ts')], bundle: true, format: 'esm', outfile: output });
  const { draftPreview } = await import(pathToFileURL(output).href);
  for (const fixture of fixtures) {
    const frozenSource = JSON.stringify(fixture.source);
    const preview = draftPreview(fixture.source, fixture.steps, fixture.schema);
    assert.equal(preview.supported, true, JSON.stringify(fixture.steps));
    assert.deepEqual(preview.rows, fixture.expected);
    assert.deepEqual(preview.columns, fixture.columns);
    assert.equal(JSON.stringify(fixture.source), frozenSource, 'original must stay unchanged');
  }
  for (const method of ['rare_group', 'noise', 'date_shift', 'permute', 'redact', 'suppress_rows']) {
    const fixture = fixtures[0];
    const preview = draftPreview(fixture.source, [{ method, columns: ['age'], params: {} }], fixture.schema);
    assert.equal(preview.supported, false);
    assert.deepEqual(preview.rows, fixture.source, 'partial recipes must not impersonate a full preview');
  }
  const fixture = fixtures[0];
  const invalidSteps = [
    { method: 'drop', columns: ['id'], params: { unexpected: true } },
    { method: 'mask', columns: ['id'], params: { value: null } },
    { method: 'band', columns: ['age'], params: { width: 5, origin: null } },
    { method: 'round', columns: ['value'], params: { decimals: 0, unexpected: true } },
    { method: 'centered_interval', columns: ['age'], params: { radius: null } },
    { method: 'round', columns: ['value', 'value'], params: { decimals: 0 } },
  ];
  for (const step of invalidSteps) {
    const preview = draftPreview(fixture.source, [step], fixture.schema);
    assert.equal(preview.supported, false, `invalid draft must abstain: ${JSON.stringify(step)}`);
    assert.deepEqual(preview.rows, fixture.source);
  }
  const allNull = fixture.source.map(row => ({ ...row, age: null }));
  assert.equal(draftPreview(allNull, [{ method: 'centered_interval', columns: ['age'], params: { radius: 1.5 } }], fixture.schema).supported, false);
  const nullWeights = fixture.source.map(row => ({ ...row, weight: null }));
  assert.equal(draftPreview(nullWeights, [{ method: 'band', columns: ['weight'], params: { width: 5 } }], fixture.schema).supported, false, 'all-null preview must still require reviewed kg units or explicit pounds conversion');
  for (const DOS of ['2026-02-30', '2026-01-01T24:00:00Z']) {
    const invalidDates = fixture.source.map(row => ({ ...row, DOS }));
    const preview = draftPreview(invalidDates, [{ method: 'date_generalize', columns: ['DOS'], params: { precision: 'day' } }], fixture.schema);
    assert.equal(preview.supported, false, 'invalid calendar values must not be normalized into invented dates');
    assert.deepEqual(preview.rows, invalidDates);
  }
  console.log(`PASS: ${fixtures.length} preview recipes match Python, source immutable; six unavailable methods and ten invalid recipes abstain.`);
} finally { await rm(temp, { recursive: true, force: true }); }
