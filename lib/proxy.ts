/** Fixed upstream, fictional-only routes, and one explicitly filtered cookie. */
export const COMPUTE_ORIGIN = "https://prism-healthcare-taupe.vercel.app";
export const DEMO_COOKIE = "prism_demo_session";
export const BODY_LIMIT = 64 * 1024;

const routes: Array<[string, RegExp]> = [
  ["GET", /^\/health$/], ["HEAD", /^\/health$/],
  ["GET", /^\/v1\/(demo|registry|lab)$/],
  ["GET", /^\/v1\/datasets\/[A-Za-z0-9_-]+\/preview$/],
  ["PATCH", /^\/v1\/datasets\/[A-Za-z0-9_-]+\/schema$/],
  ["POST", /^\/v1\/(candidates|assessments|search)$/],
  ["GET", /^\/v1\/search\/[A-Za-z0-9_-]+$/],
  ["GET", /^\/v1\/candidates\/[A-Za-z0-9_-]+\/comparison$/],
  ["POST", /^\/v1\/reports\/export$/],
  ["DELETE", /^\/v1\/session$/],
];

export class BoundaryProblem extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function problem(code: string, message: string, status: number): Response {
  return Response.json({code, message, details: {}}, {status, headers: {
    "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer", "X-Frame-Options": "DENY",
  }});
}

export function validateBoundary(request: Request, configured = process.env.PUBLIC_ARCHIE_ORIGIN): URL {
  let origin: URL;
  try {
    origin = new URL(configured ?? "");
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname);
    if ((origin.protocol !== "https:" && !(local && origin.protocol === "http:")) ||
        origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash ||
        origin.origin !== configured) throw new Error();
  } catch {
    throw new BoundaryProblem("host_unconfigured", "The public Archie origin is not configured.", 503);
  }
  // Never use Forwarded/X-Forwarded-* headers as a trust source.
  if (request.headers.get("host")?.toLowerCase() !== origin.host.toLowerCase()) {
    throw new BoundaryProblem("host_denied", "This hostname is not configured for the demo.", 403);
  }
  const caller = request.headers.get("origin");
  if (caller !== null && caller !== origin.origin) {
    throw new BoundaryProblem("origin_denied", "Use the demo's own origin.", 403);
  }
  const site = request.headers.get("sec-fetch-site");
  if (site !== null && site !== "same-origin" && site !== "none") {
    throw new BoundaryProblem("cross_site_denied", "Use the demo's own origin.", 403);
  }
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && caller !== origin.origin) {
    throw new BoundaryProblem("origin_required", "Changing demo state requires its exact same-origin Origin header.", 403);
  }
  return origin;
}

function demoCookie(header: string | null): string | null {
  const matches = (header ?? "").split(";").map(item => item.trim())
    .filter(item => item.startsWith(`${DEMO_COOKIE}=`));
  if (matches.length !== 1) return null;
  const token = matches[0].slice(DEMO_COOKIE.length + 1);
  return /^[A-Za-z0-9_-]{43}$/.test(token) ? `${DEMO_COOKIE}=${token}` : null;
}

function responseDemoCookie(value: string): string | null {
  const parts = value.split(";").map(item => item.trim());
  if (!parts[0].startsWith(`${DEMO_COOKIE}=`)) return null;
  let token = parts[0].slice(DEMO_COOKIE.length + 1);
  if (token === '""') token = "";
  if (token && !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const age = parts.find(item => /^max-age=/i.test(item))?.split("=")[1];
  if (age === undefined || !/^\d+$/.test(age) || Number(age) > 1800 || (!token && age !== "0")) return null;
  // Host-only cookie at the frontend origin. Never forward Domain or any
  // unrelated upstream cookie; always retain the required browser protections.
  return `${DEMO_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`;
}

async function boundedBody(request: Request): Promise<Uint8Array<ArrayBuffer> | undefined> {
  const length = request.headers.get("content-length");
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > BODY_LIMIT)) {
    throw new BoundaryProblem("request_too_large", "Demo configuration is limited to 64 KiB.", 413);
  }
  if (!request.body) return undefined;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const {value, done} = await reader.read();
      if (done) break;
      size += value.length;
      if (size > BODY_LIMIT) {
        await reader.cancel();
        throw new BoundaryProblem("request_too_large", "Demo configuration is limited to 64 KiB.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.length;
  }
  return body;
}

export async function proxyDemo(request: Request, options: {
  fetchImpl?: typeof fetch;
  publicOrigin?: string;
} = {}): Promise<Response> {
  try {
    validateBoundary(request, options.publicOrigin);
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "");
    if (path.startsWith("/v1/datasets/import") || path.startsWith("/v1/audits")) {
      throw new BoundaryProblem("fictional_only", "Uploads and external audits are disabled in this fictional demo.", 403);
    }
    if (!routes.some(([method, pattern]) => request.method === method && pattern.test(path))) {
      throw new BoundaryProblem("fictional_only", "This route is not available in the fictional-only demo.", 403);
    }
    if (url.search.length > 2048) {
      throw new BoundaryProblem("invalid_request", "The demo query is too long.", 422);
    }
    const body = await boundedBody(request);
    if (body?.length && request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
      throw new BoundaryProblem("fictional_only", "Only JSON demo configuration is accepted.", 415);
    }
    const headers = new Headers({
      "Accept": "application/json", "Origin": COMPUTE_ORIGIN,
      "Sec-Fetch-Site": "same-origin",
    });
    if (body?.length) headers.set("Content-Type", "application/json");
    const cookie = demoCookie(request.headers.get("cookie"));
    if (cookie) headers.set("Cookie", cookie);
    const upstream = await (options.fetchImpl ?? fetch)(`${COMPUTE_ORIGIN}${path}${url.search}`, {
      method: request.method, headers, body,
      cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(60_000),
    });
    if (upstream.status >= 300 && upstream.status < 400) {
      await upstream.body?.cancel();
      throw new Error("Unexpected compute redirect");
    }
    const output = new Headers({
      "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer", "X-Frame-Options": "DENY",
    });
    for (const name of ["content-type", "content-disposition", "retry-after"]) {
      const value = upstream.headers.get(name);
      if (value) output.set(name, value);
    }
    for (const value of upstream.headers.getSetCookie()) {
      const approved = responseDemoCookie(value);
      if (approved) output.append("Set-Cookie", approved);
    }
    return new Response(upstream.body, {status: upstream.status, headers: output});
  } catch (error) {
    if (error instanceof BoundaryProblem) return problem(error.code, error.message, error.status);
    return problem("compute_unavailable", "The calculation service is temporarily unavailable. Retry shortly.", 503);
  }
}
