// Summarises the live local API shapes (keys and sizes only; never prints row values).
// Usage: node frontend/tools/probe.mjs [path ...]
const base = 'http://127.0.0.1:5173';
// Bare names (registry, lab, demo, "demo?fixture=kit") expand to /v1/<name>; Git Bash rewrites leading slashes.
const paths = process.argv.slice(2).map(arg => (arg.startsWith('/') || arg.startsWith('C:') ? arg.replace(/^.*\/v1\//, '/v1/') : arg === 'health' ? '/health' : `/v1/${arg}`));
const targets = paths.length ? paths : ['/health', '/v1/registry', '/v1/demo', '/v1/demo?fixture=kit', '/v1/lab'];

function shape(value, depth = 0, maxDepth = 3) {
  if (Array.isArray(value)) return depth >= maxDepth ? `array(${value.length})` : [`array(${value.length})`, value.length ? shape(value[0], depth + 1, maxDepth) : null];
  if (value && typeof value === 'object') {
    if (depth >= maxDepth) return `{${Object.keys(value).join(',')}}`;
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shape(v, depth + 1, maxDepth)]));
  }
  return typeof value === 'string' && value.length > 60 ? `string(${value.length})` : value === null ? null : typeof value === 'string' ? value : typeof value;
}

for (const path of targets) {
  try {
    const response = await fetch(base + path);
    const body = await response.json();
    console.log(`== ${path} -> ${response.status}`);
    console.log(JSON.stringify(shape(body), null, 1).slice(0, 6000));
  } catch (error) {
    console.log(`== ${path} failed: ${error.message}`);
  }
}
