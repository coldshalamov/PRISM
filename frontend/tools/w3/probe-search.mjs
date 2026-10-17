// Calls the real local service once per fixture with a small cap and writes a trimmed summary (no row values).
// Usage: node frontend/tools/w3/probe-search.mjs [architecture|kit] [cap]
import { mkdirSync, writeFileSync } from 'node:fs';

const base = 'http://127.0.0.1:5173';
const fixture = process.argv[2] ?? 'architecture';
const cap = Number(process.argv[3] ?? 12);
mkdirSync('frontend/tools/out/w3', { recursive: true });

const demo = await (await fetch(`${base}/v1/demo${fixture === 'kit' ? '?fixture=kit' : ''}`)).json();
const qi = demo.schema.filter(c => c.role === 'quasi_identifier').map(c => c.name);
const sensitive = demo.schema.filter(c => c.role === 'sensitive').map(c => c.name);
const clean = q => Object.fromEntries(Object.entries(q).filter(([, v]) => v !== null && v !== undefined));
const body = {
  datasetId: demo.datasetId, qi, sensitive, membershipKnown: true, workload: demo.defaultWorkload.map(clean), maxCandidates: cap,
  constraints: { minK: 5, maxSuppression: 0.1, maxUnique: 0.1, maxLoss: 0.35 },
};
const started = Date.now();
const response = await fetch(`${base}/v1/search`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const result = await response.json();
console.log('status', response.status, 'ms', Date.now() - started);
if (!response.ok) { console.log(JSON.stringify(result).slice(0, 400)); process.exit(0); }
const trimmed = {
  ...result,
  candidates: result.candidates.map(c => ({
    label: c.name, recipeHash: c.recipeHash?.slice(0, 8), steps: c.recipe.steps.map(s => `${s.method}(${s.columns.join(',')})${JSON.stringify(s.params)}`),
    rowCount: c.rowCount, suppression_rate: c.suppression_rate, frontierMember: c.frontierMember, feasible: c.feasible, objectives: c.objectives,
    metrics: { sample_unique: c.risk.metrics.sample_unique, guess: c.risk.metrics.sensitive_guess_advantage, linkage: c.risk.metrics.verified_linkage_rate, k: c.risk.metrics.k_min },
    sensitive: (c.risk.sensitive ?? []).map(s => `${s.column}:${s.status}`), loss: c.utility.loss,
    constraints: c.constraints.map(k => `${k.pass ? 'PASS' : 'FAIL'} ${k.id} :: ${k.reason}`),
    queries: c.utility.queries.map(q => `${q.id} status=${q.status} pass=${q.pass} err=${q.error}`),
    linkage: c.risk.findings.filter(f => f.attackId === 'verified_exact_linkage').map(f => `${f.status} ${f.numerator}/${f.denominator}`),
  })),
};
writeFileSync(`frontend/tools/out/w3/search-${fixture}.json`, JSON.stringify(trimmed, null, 1));
const { candidates, ...rest } = trimmed;
console.log(JSON.stringify(rest, null, 1));
console.log('candidates', candidates.length, 'frontier', candidates.filter(c => c.frontierMember).length, 'feasible', candidates.filter(c => c.feasible).length);
console.log('sample', JSON.stringify(candidates.slice(0, 3), null, 1));
