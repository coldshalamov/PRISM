/** One actual fixture/candidate path through the running adapter, then clear. */
import assert from "node:assert/strict";

const origin = new URL(process.env.PRISM_ADAPTER_URL ?? "http://127.0.0.1:3088").origin;
let cookie = "";
async function call(path, options = {}) {
  const headers = new Headers(options.headers);
  headers.set("Origin", origin);
  if (cookie) headers.set("Cookie", cookie);
  const response = await fetch(origin + path, {...options, headers, redirect: "manual"});
  const cookies = response.headers.getSetCookie();
  if (cookies.length) {
    assert.equal(cookies.length, 1);
    assert.match(cookies[0], /^prism_demo_session=/);
    for (const flag of ["HttpOnly", "Secure", "SameSite=Strict", "Path=/"]) assert.ok(cookies[0].includes(flag));
    assert.ok(!/domain=/i.test(cookies[0]));
    cookie = cookies[0].split(";")[0];
  }
  assert.equal(response.status, 200, `${path}: ${response.status} ${await response.clone().text()}`);
  return response;
}
try {
  const page = await call("/");
  const html = await page.text();
  assert.match(page.headers.get("content-type"), /text\/html/);
  const asset = html.match(/src="(\/assets\/[^\"]+\.js)"/)[1];
  assert.match((await call(asset)).headers.get("content-type"), /javascript/);
  assert.match((await call("/pitch/")).headers.get("content-type"), /text\/html/);
  const health = await (await call("/health")).json();
  assert.equal(health.deploymentMode, "synthetic_demo");
  assert.equal(health.backendProvider, "Archie");
  assert.equal(health.uploadsAllowed, false);
  const data = await (await call("/v1/demo?fixture=kit")).json();
  assert.equal(data.rowCount, 480);
  assert.ok(cookie);
  const candidate = await (await call("/v1/candidates", {method: "POST", headers: {"Content-Type": "application/json"},
    body: JSON.stringify({datasetId: data.datasetId, steps: data.defaultSteps})})).json();
  assert.equal(candidate.risk.metrics.verified_unique_correct_matches, 75);
  console.log("Adapter HTML/assets/pitch + real Archie-backed fixture 480/candidate linkage 75: passed; protected cookie preserved.");
} finally {
  if (cookie) {
    await call("/v1/session", {method: "DELETE"});
    console.log("Own live visitor session cleared.");
  }
}
