// Creates one candidate on the fictional demo and prints the shape of query results (aggregates only).
const base = 'http://127.0.0.1:5173';
const kit = process.argv.includes('--kit');
const demo = await (await fetch(`${base}/v1/demo${kit ? '?fixture=kit' : ''}`)).json();
const response = await fetch(`${base}/v1/candidates`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ datasetId: demo.datasetId, steps: demo.defaultSteps, workload: process.argv.includes('--empty') ? [] : demo.defaultWorkload, seed: 42 }),
});
const candidate = await response.json();
console.log('status', response.status, 'keys', Object.keys(candidate).join(','));
console.log('utility.loss', candidate.utility?.loss, 'warnings', JSON.stringify(candidate.utility?.warnings));
for (const q of candidate.utility?.queries ?? []) {
  const { originalDetails, protectedDetails, ...rest } = q;
  console.log(JSON.stringify(rest).slice(0, 900));
  console.log('  details', originalDetails?.length, protectedDetails?.length, JSON.stringify(originalDetails?.[0]).slice(0, 300));
}
console.log('metrics', JSON.stringify(candidate.risk?.metrics));
console.log('findings', (candidate.risk?.findings ?? []).map(f => `${f.id}:${f.attackId}:${f.status}`).join(' | '));
console.log('assumptions', candidate.risk?.assumptions?.length, 'limitations', candidate.risk?.limitations?.length);
console.log('threatModel', JSON.stringify(candidate.threatModel), 'threatContext', JSON.stringify(candidate.threatContext));
console.log('columns', candidate.columns.join(','));
console.log('recipe', JSON.stringify(candidate.recipe).slice(0, 400));
console.log('suppression_rate', candidate.suppression_rate, 'transformReport', JSON.stringify(candidate.transformReport));
