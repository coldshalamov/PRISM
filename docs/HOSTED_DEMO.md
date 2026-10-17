# Hosted fictional-only demo

The public demo runs the same deterministic transformation, risk, utility,
search, and report engines as the local workbench. It accepts only the built-in
5,000-row synthetic oncology fixture and 480-row fictional kit fixture. It does
not accept research data. CSV upload and external protected-file audit routes
return HTTP 403 with `code: fictional_only` before their bodies are parsed.
Unlisted API routes are denied, so adding a future local intake route does not
make it available on the public server.

The local entry point, `app.main:app`, retains its loopback-only policy. The
separate hosted entry point is `app.hosted_demo:app`. No backend credentials,
database, model API, file path input, or external service is needed at runtime.
The calculation engine makes no external data requests. The browser uses the
same origin for both static assets and API calls.

## Run the deployment image

From the repository root:

```sh
docker build -t prism-demo .
docker run --rm -p 7860:7860 \
  -e PUBLIC_DEMO_HOST=localhost:7860 prism-demo
```

Open `http://localhost:7860`. For a public HTTPS deployment, set
`PUBLIC_DEMO_HOST` to the exact public hostname, optionally with a port, without
a scheme or path. For example, `prism-demo.example.com`. Render's
`RENDER_EXTERNAL_HOSTNAME` is accepted when `PUBLIC_DEMO_HOST` is absent. Other
platforms must set `PUBLIC_DEMO_HOST` explicitly. A Hugging Face Docker Space
would use its direct `<owner>-<space>.hf.space` hostname and URL; framing the
app from another origin is intentionally disabled.

The container listens on `0.0.0.0:${PORT:-7860}`. Its default is port 7860; a
platform-provided `PORT` overrides it. It builds the frontend with Node 24 and
installs the Python 3.11 backend after copying the built assets into
`app/static`. Packaged fictional fixtures, catalog, MIT/Apache licenses, and
notices remain included. The runtime runs as an unprivileged user.

For a Python host with an already built frontend:

```sh
cd backend
PUBLIC_DEMO_HOST=prism-demo.example.com \
  uvicorn app.hosted_demo:app --host 0.0.0.0 --port 7860 \
  --workers 1 --no-access-log
```

Use **one worker and one replica**. Session state is intentionally memory-only
and not distributed. A restart loses all temporary visitor state. Horizontal
scaling requires a separate session design rather than increasing worker count.

## Public boundary and visitor state

The adapter validates the exact configured `Host` and, whenever present, exact
`Origin` before forwarding a request to a visitor's isolated local handler.
POST, PATCH, and DELETE additionally require that Origin. Browser requests
marked `same-site` or `cross-site` are rejected; a sibling subdomain is not an
authorized origin. Forwarded headers do not establish trust. There is no
wildcard CORS. HTTPS is required for public browser use: cookies are always
`Secure` for non-loopback configured hosts, independent of proxy headers.
Loopback development uses HTTP cookies. Configuration accepts one hostname,
not a URL or wildcard.

An opaque random 256-bit, host-only `HttpOnly; SameSite=Strict` cookie identifies
each visitor. Each visitor has independent datasets, candidates, jobs,
pseudonymization secret, and session-clear epoch. Refreshing preserves that
visitor's state until expiry; clearing affects only that visitor. Another
visitor's dataset or candidate IDs resolve to 404. No rows are stored in cookies.

Default hard resource bounds are:

| Resource | Limit |
| --- | --- |
| Admitted visitor sessions | 4 |
| Idle lifetime / cookie renewal | 30 minutes |
| Built-in datasets per visitor | 2 |
| Saved candidates per visitor | 40 |
| Candidates per search | 24, also the default |
| Saved search jobs per visitor | 4 |
| Concurrent calculation/API operations | 1 |
| JSON configuration body | 64 KiB |

Expired sessions are removed on the next session request. Busy sessions cannot
be evicted. A full server returns 503; a busy server returns 429, both with
`Retry-After`. Existing visitors can clear their own state when their candidate
or search-job capacity is reached. These are demo admission bounds, not a
guarantee of availability under abusive traffic; platform request limits can
provide additional protection. Health and the coverage registry remain
accessible without allocating a session, even at capacity.

`GET /health` reports:

```json
{
  "status": "ok",
  "version": "0.1.0",
  "deploymentMode": "synthetic_demo",
  "uploadsAllowed": false,
  "sessionTtlSeconds": 1800,
  "maxSearchCandidates": 24
}
```

The frontend should use these fields to label the public fictional-data mode
and disable both CSV import and external-file audit controls. Server rejection
remains authoritative. API clients that change state must include, for example,
`Origin: https://prism-demo.example.com` and retain the returned session cookie.
Use the matching configured Host for health checks behind a reverse proxy.

## Focused verification

From the repository root, using the project Python environment:

```sh
python -m pytest backend/tests/test_hosted_demo.py -q
```

The tests cover two visitors, refresh persistence, clear isolation, inaccessible
foreign IDs, blocked uploads/audits, host/origin and sibling-site denial,
cookie attributes, unchanged local trust, candidate/search/body limits,
session expiry/admission and busy responses. They also execute the real kit
engines: default protection gives 75 verified unique correct matches; removing
ZIP gives 20 while preserving the protected research answers. The existing
release-clearance warning and strict request validation remain in force.

A container definition or passing in-process checks does not establish a
working public URL. Publication still requires a successful platform build and
a direct public-page/API check against the actual deployed hostname.
