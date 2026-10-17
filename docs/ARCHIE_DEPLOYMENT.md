# PRISM 0.1.1: Archie entry and Core, Vercel compute

[Canonical public app](https://41d0bdfd-0065-4b0b-a973-efbe1c1a9c5e.archie.site/) · [fallback and pitch host](https://prism-healthcare-taupe.vercel.app/) · [repository](https://github.com/coldshalamov/PRISM).

Archie's actual workspace is a static Vite application. It serves the exact saved `deploy/archie-static/index.html`; Vercel serves its pinned JS/CSS/fonts and the real Python engine. Archie Core Postgres/GraphQL stores session configuration and real uploaded files. This is a hybrid deployment with meaningful Archie application/data hosting, not a claim that Python runs on Archie. Archie Logic is not used. The old generated prototype has been replaced; [reconciliation](ARCHIE_RECONCILIATION.md) records retained ideas.

The current source supports real imports and external audits. The final published immutable revision and its actual browser acceptance are in [delivery status](../artifacts/DELIVERY_STATUS.json) and [verification](../artifacts/verification.md). Earlier revision e checks are historical and do not establish publication of 0.1.1. Do not reinstate the obsolete initial 522/Deploying checkpoint or treat Vercel as the canonical submission URL.

## Server configuration

`vercel.json` routes `/v1/*` and `/health` to `app.serverless_demo:app`; static frontend/pitch paths use Vite output. `app.main:app` remains local. `app.hosted_demo:app` / Docker is a legacy fictional-only adapter, not this deployment. `deploy/archie/` is an unused alternative Next adapter.

Keep these values server-side:

| Variable | Configuration |
| --- | --- |
| `ARCHIE_GRAPHQL_ENDPOINT` | `https://archie-core.services.archie.com/graphql` |
| `ARCHIE_PROJECT_ID` | `41d0bdfd-0065-4b0b-a973-efbe1c1a9c5e` |
| `ARCHIE_ENVIRONMENT` | `master` |
| `ARCHIE_API_KEY` | Configured restricted `prism_demo_service` key |
| `ARCHIE_AUTH_PREFIX` | `Bearer` for this configured key alias |
| `PRISM_SESSION_SECRET` | Stable server secret used across workers |
| `PUBLIC_DEMO_HOST` | Exact Vercel production hostname |
| `PUBLIC_ARCHIE_ORIGINS` | Exact Archie preview and public HTTPS origins |
| `OPENROUTER_API_KEY` | Optional server-only Jev key |
| `PRISM_JEV_ENABLED` | `1` for requested interpretation |
| `PRISM_JEV_BUDGET_USD` | Per-process ceiling; hosted attempts have separate durable caps |

Vercel production and preview environments are configured separately. No service key belongs in frontend `VITE_*` variables. The configured Archie key uses its Bearer alias. GitHub synchronization has reported an error; manual exact-source Code-editor publication is the established path, not an automatic pull claim.

## Stored data and replay

The dedicated `prism_demo_record` table has `id`, `visitor_id`, `kind`, `data` and `expires_at` plus platform audit columns. The service role has CRUD on that table. Session records contain fixture/upload references, reviewed schema, ordered recipes, workload, frozen semantics and candidate/search metadata. Separate `kind: dataset` records contain gzip/base64 original input bytes and filename. This permits actual CSV/JSON/XLSX import and external-file audit across cold Python instances; it is not fictional-fixture replay only.

Hosted limits: 3 MiB per file, 100,000 rows, 80 columns, eight datasets, 40 candidates, four searches and 24 candidates per search. Local file intake is 50 MB. Clear deletes the current session and its owned uploaded records. After 30 minutes of inactivity, the session expires and returning triggers cleanup. There is no claimed proactive purge of abandoned records.

The Archie browser uses the exact-origin bridge: a single-flight `/v1/browser-session` handshake, module-memory visitor token and `X-PRISM-Demo-Session` header. Same-origin Vercel visitors use a separate cookie transport. Visitor state does not require app accounts or login. Optimistic updates prevent silently losing concurrent configuration changes; storage failure is explicit rather than switching to process-memory state.

The actual live Core probe passed all three upload formats, cold reconstruction of the candidate and external assessment, and deletion of all four owned upload records in 17.03 seconds. Its 480-row example yielded 96 unique protected rows; the independent external release had zero unique rows, zero response-query error and 1.2 cm height-query error. See `artifacts/v3-real-core-receipt.json`. This is a real data-path check, distinct from final public-browser acceptance.

## Publish a new immutable revision

1. Finish the production frontend build and prepare a **new unused** revision using `deploy/archie-static/build-entry.mjs <revision>`; follow the script's existing build sequence. Keep every already-published asset revision available.
2. Deploy to the existing Vercel `prism-healthcare` project first. Confirm the new JS/CSS URLs are available and the API reports `hosted_workbench`, `uploadsAllowed: true`, and Archie as backend provider.
3. Save the exact generated tracked HTML through Archie's Code editor / Source Control, then publish. Do not run Archie generation over the maintained UI.
4. Open the public Archie origin as a fresh visitor. Check visible source rows, import/review/evaluate, an external protected-file audit, a direct CSV download and the actual loaded immutable revision. An authenticated editor preview or successful build alone is not publication acceptance.
5. Update delivery status, verification and the release package to the actual published revision. The root release checklist owns the current completion verdict.
