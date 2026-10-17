// Prints schema and default workload (definitions only, never row values) for both fictional datasets.
for (const path of ['/v1/demo', '/v1/demo?fixture=kit']) {
  const body = await (await fetch(`http://127.0.0.1:5173${path}`)).json();
  console.log(`== ${path}: ${body.name}, rows ${body.rowCount}, rowUnit ${JSON.stringify(body.rowUnit)}`);
  for (const c of body.schema) console.log(`  ${c.name}\t${c.dtype}\t${c.role}\t${c.unit ?? ''}`);
  console.log('  defaultWorkload:');
  for (const q of body.defaultWorkload) console.log(`  ${JSON.stringify(q)}`);
}
