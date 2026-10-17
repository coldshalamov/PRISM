# Public fictional demo: Archie + Vercel

The deployment configuration in the [PRISM repository](https://github.com/coldshalamov/PRISM)
targets Vercel project `prism-healthcare`. Vercel serves the React/Vite frontend
and runs the real Python privacy/utility calculations. Archie Core Postgres
provides durable fictional visitor configuration through its tenant GraphQL
API. Archie Logic is not used. Vercel Services is currently Beta and builds
the frontend and backend together.

**Public origin:** https://prism-healthcare-taupe.vercel.app/ . The deployed API
has reproduced 75 then 20 verified correct matches, exact comparison replay,
and rejected intake with 403. The live Archie storage path has also been
checked separately, as described below. Frontend acceptance is recorded in
`artifacts/verification.md`.

`vercel.json` routes `/v1/*` and `/health` to `app.serverless_demo:app`. The local
`app.main:app` remains the loopback workbench; it is never the public entrypoint.
`api/index.py` is an alternate ASGI entrypoint for a conventional Vercel Python
function deployment, but is not used by the Services configuration.

## Server environment

Set these as server environment variables, never `VITE_*` variables:

| Variable | Value |
| --- | --- |
| `ARCHIE_GRAPHQL_ENDPOINT` | `https://archie-core.services.archie.com/graphql` |
| `ARCHIE_PROJECT_ID` | The configured Archie project's ID |
| `ARCHIE_ENVIRONMENT` | `master` |
| `ARCHIE_API_KEY` | One key assigned only to `prism_demo_service` |
| `ARCHIE_AUTH_PREFIX` | `Bearer` for the UI-created key's configured alias |
| `PRISM_SESSION_SECRET` | Random stable secret of at least 32 characters |
| `PUBLIC_DEMO_HOST` | Exact production hostname, without scheme or path |

Vercel's exact `VERCEL_URL` and `VERCEL_PROJECT_PRODUCTION_URL` values are also
accepted as Host authorities. No wildcard, forwarded-host trust, external CORS
origin, or cross-site request is accepted. State-changing requests require the
exact same-origin Origin header. The visitor cookie is Secure, HttpOnly, and
SameSite=Strict in production.

The configured key's UI required the `Bearer` alias. Direct verification found
that its raw key alone returns 401, while `Bearer <key>` succeeds. The client
therefore supports the explicit prefix above; keys configured without an alias
can leave it empty. This differs from the MCP's generic raw-key instructions.

## Configure and deploy

From this repository's root, with the current Vercel CLI and access to the
existing project:

```powershell
npx vercel link --project prism-healthcare
$demoEnvNames = @(
  "ARCHIE_GRAPHQL_ENDPOINT", "ARCHIE_PROJECT_ID", "ARCHIE_ENVIRONMENT",
  "ARCHIE_API_KEY", "ARCHIE_AUTH_PREFIX", "PRISM_SESSION_SECRET", "PUBLIC_DEMO_HOST"
)
foreach ($demoEnvName in $demoEnvNames) {
  npx vercel env add $demoEnvName production
}
npx vercel deploy --prod
```

Enter each value at the CLI prompt; do not put credentials in source files,
frontend environment variables, command history, or Git. Use the existing
restricted service key, keep the session secret stable across deployments,
and set `PUBLIC_DEMO_HOST` to the exact hostname configured on the project.
Changing the session secret changes reconstructed HMAC pseudonyms.
Configure the same variables separately for `preview` if preview deployments
need the backend. A successful build alone does not verify a usable public app.

## Archie data boundary

Dedicated table `prism_demo_record` has `id`, `visitor_id`, `kind`, `data` (TEXT),
and `expires_at` (DOUBLE_PRECISION), plus Archie's audit columns. The API key's
only role, `prism_demo_service`, has Read/Write/Update/Delete on this table and
no other table grants. The browser never receives this key.

One visitor record contains bounded JSON replay specifications: bundled fixture
names, reviewed schema, recipes, seed, threat assumptions, research workload,
candidate IDs/timestamps, and search frontier/constraint metadata. It contains
no uploaded datasets, pandas frames, raw candidate previews, or private uploads.
Every candidate comparison, reassessment, and export reconstructs its fictional
source and protected frame through the existing real engine. A stable
server-held secret derives a visitor-specific HMAC key, keeping pseudonyms
consistent across cold starts. Candidate schema snapshots preserve earlier
results when a visitor later edits the source schema.

Limits are two built-in fixtures, 40 candidates, four search jobs, 24 candidates
per search, 64 KiB per request/configuration record, and 30 minutes of inactivity.
Expired records cannot be replayed and are deleted when that visitor returns;
abandoned expired metadata is not proactively purged by this adapter. Session
clear deletes only the current visitor's record and expires their cookie.
Optimistic compare-and-swap prevents parallel requests from losing updates or
resurrecting a cleared record. A concurrent change returns 409 for refresh/retry.

All upload and external-pair audit routes are rejected before parsing a body.
Archie outages return an explicit 503; there is no process-memory fallback.
Health identifies `deploymentMode: synthetic_demo`, `uploadsAllowed: false`, and
`backendProvider: Archie`; health is a boundary/configuration indicator, not a
database availability check. Verify a fictional fixture request after deployment.

## Direct verification

From the repository root:

```powershell
.venv/Scripts/python.exe -m pytest backend/tests/test_serverless_demo.py -q
```

These focused checks use a fake persistence transport and the real Python
engines. They cover separate cold adapter instances, the KIT linkage change
from 75 to 20, exact 24-candidate search replay, reviewed schema, assessments,
HTML/JSON/recipe/protected-CSV downloads, visitor isolation, clear/expiry,
stable pseudonyms, public boundary rejection, budgets, and storage failure.
Live Archie connectivity and the public deployment require a separate fixture
request with the deployed server key. These checks provide no formal privacy,
medical, regulatory, release-clearance, or security certification.

The initial live tenant check passed fixture creation, real KIT linkage 75,
exact replay in a fresh adapter, cross-visitor candidate isolation, and own
session deletion while the other visitor remained intact. Both probe records
were removed afterward. A query of `researchDataset` using the restricted key
was denied (HTTP 401). This validates the actual configured key and persistence
path; the public Vercel route is verified separately after deployment.

Set `PRISM_DEMO_URL` to `https://prism-healthcare-taupe.vercel.app`
(without a trailing slash). This PowerShell example loads a fictional
fixture, computes both recipes, checks their comparison, and clears only that
visitor's session. It sends no files or private rows:

```powershell
$demoOrigin = $env:PRISM_DEMO_URL.TrimEnd("/")
$demoHeaders = @{ Origin = $demoOrigin }
Invoke-RestMethod "$demoOrigin/health"
$demoData = Invoke-RestMethod "$demoOrigin/v1/demo?fixture=kit" -SessionVariable demoVisitor
$baselineBody = @{ datasetId = $demoData.datasetId; steps = $demoData.defaultSteps } | ConvertTo-Json -Depth 20
$baseline = Invoke-RestMethod "$demoOrigin/v1/candidates" -Method Post -Headers $demoHeaders -WebSession $demoVisitor -ContentType "application/json" -Body $baselineBody
$protectedSteps = @($demoData.defaultSteps) + @(@{ method = "drop"; columns = @("zip"); params = @{} })
$protectedBody = @{ datasetId = $demoData.datasetId; steps = $protectedSteps } | ConvertTo-Json -Depth 20
$protected = Invoke-RestMethod "$demoOrigin/v1/candidates" -Method Post -Headers $demoHeaders -WebSession $demoVisitor -ContentType "application/json" -Body $protectedBody
$baseline.risk.metrics.verified_unique_correct_matches  # 75
$protected.risk.metrics.verified_unique_correct_matches # 20
Invoke-RestMethod "$demoOrigin/v1/candidates/$($protected.candidateId)/comparison" -WebSession $demoVisitor
Invoke-RestMethod "$demoOrigin/v1/session" -Method Delete -Headers $demoHeaders -WebSession $demoVisitor
```

Also open all six views in the browser, run a 24-candidate search, and download
HTML/JSON evidence, recipe JSON, and the reviewed protected CSV. Upload and
external-audit requests must return 403; a session from another browser profile
must not access this visitor's candidate IDs. Storage failures must return 503,
not silently switch to shared or process-local state. Public health identifies
the adapter but does not assert that Archie is reachable.
