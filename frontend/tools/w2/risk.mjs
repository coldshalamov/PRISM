// Prints the structure of risk results and registry statuses (no row values).
const base = 'http://127.0.0.1:5173';
const kit = process.argv.includes('--kit');
const demo = await (await fetch(`${base}/v1/demo${kit ? '?fixture=kit' : ''}`)).json();
const response = await fetch(`${base}/v1/candidates`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ datasetId: demo.datasetId, steps: demo.defaultSteps, workload: demo.defaultWorkload, seed: 42 }),
});
const candidate = await response.json();
const { risk } = candidate;
console.log('risk keys', Object.keys(risk).join(','));
console.log('sensitive', JSON.stringify(risk.sensitive?.slice(0, 2)));
console.log('assumptions', JSON.stringify(risk.assumptions));
console.log('limitations', JSON.stringify(risk.limitations));
console.log('assessment', risk.assessment, 'release_cleared', risk.release_cleared);
for (const f of risk.findings) console.log(`finding ${f.id} attack=${f.attackId} status=${f.status} sev=${f.severity} src=${f.sourceId} num=${f.numerator} den=${f.denominator} metric=${f.metricValue}`);
const registry = await (await fetch(`${base}/v1/registry`)).json();
const tally = {};
for (const a of registry.attacks) tally[a.status] = (tally[a.status] ?? 0) + 1;
console.log('registry attacks', registry.attacks.length, JSON.stringify(tally), 'familyCount', registry.familyCount, 'sources', registry.sources.length);
console.log('engineAnalyses', registry.engineAnalyses.length, JSON.stringify(registry.engineAnalyses.map(a => `${a.id}:${a.status}`)));
console.log('sources sample', JSON.stringify(registry.sources.slice(0, 3)));
console.log('attack ids', registry.attacks.map(a => `${a.id}:${a.status}`).join(' '));
