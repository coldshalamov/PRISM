/** Actual compute call through the proxy handler; does not start an HTTP host. */
import assert from "node:assert/strict";
import { DEMO_COOKIE, proxyDemo } from "../lib/proxy.ts";

const origin = "https://prism-archie-check.example";
let cookie = "";
async function call(path, method = "GET", body) {
  const headers = new Headers({Host: "prism-archie-check.example", Origin: origin, "Sec-Fetch-Site": "same-origin"});
  if (cookie) headers.set("Cookie", `archie_auth=NOT_FORWARDED; ${cookie}`);
  if (body) headers.set("Content-Type", "application/json");
  const response = await proxyDemo(new Request(origin + path, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  }), {publicOrigin: origin});
  const cookies = response.headers.getSetCookie();
  if (cookies.length) {
    assert.equal(cookies.length, 1);
    assert.ok(cookies[0].startsWith(`${DEMO_COOKIE}=`));
    for (const flag of ["HttpOnly", "Secure", "SameSite=Strict", "Path=/"]) assert.ok(cookies[0].includes(flag));
    assert.ok(!/domain=/i.test(cookies[0]));
    cookie = cookies[0].split(";")[0];
  }
  assert.equal(response.status, 200, `${path}: ${response.status} ${await response.clone().text()}`);
  return response.json();
}
try {
  const data = await call("/v1/demo?fixture=kit");
  assert.equal(data.rowCount, 480);
  assert.ok(cookie);
  const candidate = await call("/v1/candidates", "POST", {datasetId: data.datasetId, steps: data.defaultSteps});
  assert.equal(candidate.risk.metrics.verified_unique_correct_matches, 75);
  console.log("Live proxy handler: 480 fictional rows, 75 verified matches, one protected host-only visitor cookie: passed.");
} finally {
  if (cookie) {
    assert.deepEqual(await call("/v1/session", "DELETE"), {cleared: true});
    assert.equal(cookie, `${DEMO_COOKIE}=`);
    console.log("Own live visitor session cleared; deletion cookie preserved.");
  }
}
