// Creates a baseline + default candidate for a fixture through the local API and saves the risk block (no row values).
// Usage: node frontend/tools/w1/candidate-dump.mjs [architecture|kit]
import { mkdirSync, writeFileSync } from 'node:fs';
const base = 'http://127.0.0.1:5173';
const fixture = process.argv[2] ?? 'kit';
mkdirSync('frontend/tools/out/w1', { recursive: true });
const demo = await (await fetch(`${base}/v1/demo${fixture === 'kit' ? '?fixture=kit' : ''}`)).json();
const known = demo.schema.filter(c => c.role === 'quasi_identifier').map(c => c.name);
const secret = demo.schema.filter(c => c.role === 'sensitive').map(c => c.name);
const post = async (path, body) => {
  const response = await fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const json = await response.json();
  if (!response.ok) throw new Error(`${path} ${response.status} ${JSON.stringify(json).slice(0, 300)}`);
  return json;
};
console.log('dataset', demo.name, demo.rowCount, 'known', known, 'secret', secret, 'rowUnit', JSON.stringify(demo.rowUnit));
const steps = demo.defaultSteps.map(s => ({ method: s.method, columns: s.columns, params: s.params }));
const common = { datasetId: demo.datasetId, qi: known, sensitive: secret, membershipKnown: true, workload: [], seed: 42 };
const strip = c => ({ candidateId: c.candidateId, name: c.name, rowCount: c.rowCount, columns: c.columns, risk: c.risk, threatModel: c.threatModel, threatContext: c.threatContext });
const protectedCandidate = await post('/v1/candidates', { ...common, steps });
const baseline = await post('/v1/candidates', { ...common, steps: [], name: 'Unprotected baseline' });
const unknownMembership = await post('/v1/candidates', { ...common, steps, membershipKnown: false });
writeFileSync(`frontend/tools/out/w1/cand-${fixture}.json`, JSON.stringify({ protectedCandidate: strip(protectedCandidate), baseline: strip(baseline), unknownMembership: strip(unknownMembership) }, null, 1));
console.log('saved; subsets', protectedCandidate.risk.exposure.subsets.length, 'baseline subsets', baseline.risk.exposure.subsets.length);
console.log('attackIds', [...new Set(protectedCandidate.risk.findings.map(f => f.attackId))].join(', '));
