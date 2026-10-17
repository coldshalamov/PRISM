import assert from "node:assert/strict";
import test from "node:test";
import { BODY_LIMIT, COMPUTE_ORIGIN, DEMO_COOKIE, proxyDemo } from "../lib/proxy.ts";

const origin = "https://prism.example";
const token = "a".repeat(43);
const headers = {Host: "prism.example", Origin: origin, "Sec-Fetch-Site": "same-origin"};

test("fixed upstream, isolated cookie, safe response headers, and reviewed JSON", async () => {
  let called = false;
  const response = await proxyDemo(new Request(`${origin}/v1/candidates`, {
    method: "POST", headers: {...headers, "Content-Type": "application/json", Authorization: "DO_NOT_FORWARD",
      Cookie: `archie_auth=DO_NOT_FORWARD; ${DEMO_COOKIE}=${token}`}, body: '{"steps":[]}',
  }), {publicOrigin: origin, fetchImpl: async (url, options) => {
    called = true;
    assert.equal(url, `${COMPUTE_ORIGIN}/v1/candidates`);
    assert.equal(options.headers.get("origin"), COMPUTE_ORIGIN);
    assert.equal(options.headers.get("cookie"), `${DEMO_COOKIE}=${token}`);
    assert.equal(options.headers.get("authorization"), null);
    assert.equal(options.headers.get("x-forwarded-host"), null);
    assert.equal(options.redirect, "manual");
    const output = new Headers({"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"});
    output.append("Set-Cookie", "archie_auth=DO_NOT_RETURN; Path=/");
    output.append("Set-Cookie", `${DEMO_COOKIE}=${token}; Domain=vercel.app; Path=/; Max-Age=1800; HttpOnly; Secure; SameSite=Strict`);
    return new Response('{"ok":true}', {headers: output});
  }});
  assert.ok(called);
  assert.equal(response.status, 200);
  assert.deepEqual(response.headers.getSetCookie(), [`${DEMO_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=1800`]);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("rejects cross-origin, hostile host, uploads, unknown routes and oversized bodies before fetch", async () => {
  const never = async () => { throw new Error("Forbidden request reached compute"); };
  for (const [path, method, overrides, body, expected] of [
    ["/v1/demo", "GET", {Host: "evil.example", "X-Forwarded-Host": "prism.example"}, undefined, 403],
    ["/v1/demo", "GET", {Origin: "https://evil.example"}, undefined, 403],
    ["/v1/demo", "GET", {"Sec-Fetch-Site": "same-site"}, undefined, 403],
    ["/v1/datasets/import", "POST", {}, "PRIVATE_ROWS", 403],
    ["/v1/audits/import-pair", "POST", {}, "PRIVATE_ROWS", 403],
    ["/v1/unlisted", "GET", {}, undefined, 403],
    ["/v1/candidates", "POST", {"Content-Type": "application/json"}, "x".repeat(BODY_LIMIT + 1), 413],
    ["/v1/candidates", "POST", {"Content-Type": "multipart/form-data"}, "PRIVATE_ROWS", 415],
  ]) {
    const response = await proxyDemo(new Request(`${origin}${path}`, {method, headers: {...headers, ...overrides}, body}), {publicOrigin: origin, fetchImpl: never});
    assert.equal(response.status, expected, path);
  }
  const noOrigin = await proxyDemo(new Request(`${origin}/v1/session`, {method: "DELETE", headers: {Host: "prism.example"}}), {publicOrigin: origin, fetchImpl: never});
  assert.equal(noOrigin.status, 403);
});

test("session deletion cookie survives and compute failure has no fallback", async () => {
  const response = await proxyDemo(new Request(`${origin}/v1/session`, {method: "DELETE", headers}), {
    publicOrigin: origin, fetchImpl: async () => new Response('{"cleared":true}', {headers: {
      "Set-Cookie": `${DEMO_COOKIE}=""; expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Max-Age=0; Path=/; SameSite=strict; Secure`,
    }}),
  });
  assert.deepEqual(response.headers.getSetCookie(), [`${DEMO_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`]);
  const unavailable = await proxyDemo(new Request(`${origin}/v1/demo`, {headers}), {publicOrigin: origin, fetchImpl: async () => {throw new Error();}});
  assert.equal(unavailable.status, 503);
});
