# Maintainer handoff

PRISM implements a local row-release privacy/utility workbench and a public fictional-data demonstration. The selected eMerge AI Hackathon track is **Enterprise AI**, under AI safety, trust and governance. The oncology-shaped fixtures are independently generated examples, not a sponsor challenge dataset. See [HACKATHON_REQUIREMENTS.md](HACKATHON_REQUIREMENTS.md) for the track and submission requirements.

The preserved architecture in `docs/spec/PRISM_MASTER_ARCHITECTURE.md` describes a broader program; roadmap references are not implementation claims. `IMPLEMENTATION_CONTRACT.md` freezes the engine/HTTP integration conventions. Preserve the README's supplied-kit/background-IP attribution and development-tool disclosure. Development used coding agents; the running app makes **no generative AI model calls**.

## Published entry points and current status

- [Public fictional demo](https://prism-healthcare-taupe.vercel.app/)
- [Public repository](https://github.com/coldshalamov/PRISM)
- [Web pitch](https://prism-healthcare-taupe.vercel.app/pitch/) and [pitch PDF](https://prism-healthcare-taupe.vercel.app/pitch/PRISM-Pitch.pdf)
- [Existing Archie project](https://app.archie.com/project/41d0bdfd-0065-4b0b-a973-efbe1c1a9c5e/), which requires the owner's account

The public hostname retains its original `healthcare` name; the submission track is Enterprise AI. **Archie Core Postgres/GraphQL stores isolated fictional-session replay configuration. Vercel hosts the fallback frontend, immutable Archie assets and Python computation.** Archie's actual static Vite workspace now uses the tracked `deploy/archie-static/index.html` in place of its generated prototype entry. Its authenticated preview loaded the real 5,000-row fixture. Archie assigned `https://41d0bdfd-0065-4b0b-a973-efbe1c1a9c5e.archie.site/` during publication, but its first public request returned 522 while Deploying. Keep the working Vercel URL canonical until that public application is verified. This remains a hybrid runtime; Python compute is not hosted by Archie.

Use [DELIVERY_STATUS.json](../artifacts/DELIVERY_STATUS.json) for current completion state and [verification.md](../artifacts/verification.md) for actual route checks. Sonnet's integrated frontend has all six views, and OpenCode Go `gemini-4-argon-contributor` completed the requested audit/improvement pass. Three successive independent design approvals remain pending at this checkpoint. Do not infer their completion from passing tests. Save the submission as a draft; do not submit until the user explicitly authorizes it.

## Runtime and ownership map

| Area | Files and responsibility |
|---|---|
| Application boundary | `backend/app/main.py`, `models.py`: loopback API, validated requests, process-memory state, immutable candidate IDs, export gates |
| Published demo | `backend/app/serverless_demo.py`, `archie_store.py`, `vercel.json`: fictional-only replay, restricted Archie persistence, visitor isolation and Vercel routing |
| Archie static entry | `deploy/archie-static/`, `frontend/public/archie-assets/`: exact tracked entry and immutable assets; `frontend/src/api.ts` selects the exact-origin fictional bridge |
| Optional serverful demo | `backend/app/hosted_demo.py`, `Dockerfile`: separate memory-only, single-worker deployment; not the published Vercel entrypoint |
| Data | `datasets.py`, `examples/`: bounded CSV intake, suggested roles/types, reviewed units and deterministic fixtures |
| Transform | `transforms.py`: ordered validated copy-on-write recipes; lineage returned separately; aggregate reports; no serialized secret |
| Risk | `risk.py`: exact factorized missing categories, QI partitions/subsets, categorical inference/homogeneity/TV and separate fixed-split within-release majority diagnostic |
| Utility | `utility.py`: real workload queries, loss, distributions and correlations; midpoint caveats; aggregate unpaired semantics |
| Search | `optimizer.py`: memoized deterministic finite grammar, actual evaluations, separate feasibility/frontier and evaluated ablations |
| Registry/adapters | `registry.py`, `adapters.py`: explicit implemented/partial/unsupported statuses; optional pyCANON runtime smoke checks |
| Evidence/lab | `reports.py`, `lab.py`: local reports/CSV hygiene and executable fictional counterexamples |
| Frontend | `frontend/`: React/TypeScript workspace; ordinary same-origin API plus explicit Archie fictional bridge; no imported data in localStorage |

Do not add a universal privacy percentage or release approval state. Current risk output always has `release_cleared:false`. Maintain the distinction between installation, executed API smoke test, deterministic calculation and genuine external validation.

## Reproduce a working checkout

Use Python **3.11 or 3.12**, Node.js **20.19+ or 22.12+**, and npm. From the repository root, `.\setup.ps1` installs the locked Python and frontend dependencies and builds the UI; `.\start.ps1` serves it at `http://127.0.0.1:8000`. For an explicit Python installation, pass `-Python C:\path\to\python.exe` to setup. See the root README for equivalent manual commands and frontend development on loopback port 5173.

`backend/requirements.lock.txt` records the installed Python dependency versions; npm uses `frontend/package-lock.json`. The installed-wheel check used Python 3.11.15. pyCANON is the only executed optional library integration. Native metrics work without it, while external cross-check status becomes unavailable. The local workbench requires no runtime cloud credentials. Real CSV imports and external protected-file audits belong only in this loopback application; imported rows are kept in process memory. Restart the local process after rebuilding its production assets.

Validation commands:

```powershell
.\.venv\Scripts\python.exe -m pytest -c backend\pyproject.toml backend\tests -q
npm run typecheck --prefix frontend
npm run build --prefix frontend
```

Run the [demo route](DEMO_SCRIPT.md) to check the actual browser/API workflow. The recorded backend suite passed 120 tests; nine focused hosted/health checks also passed after health metadata changes. The six focused serverless checks passed after the exact-origin Archie bridge was added, retaining ordinary cookie-flow coverage. The local browser route exercised all six views, a real 24-candidate search with six frontier candidates, adoption, workload staleness and four download formats. The deployed API reproduced 75 then 20 verified matches on the 480-row benchmark. These are bounded results; use the current verification record for final frontend/deployment acceptance rather than treating a test count as a substitute.

`scripts/package.py` builds the wheel and source handoff after the frontend production build. [LOCAL_PACKAGE_VERIFICATION.md](LOCAL_PACKAGE_VERIFICATION.md) records the independently installed-wheel checkpoint and archive-content check. Rebuild after final frontend, pitch, screenshots and metadata changes; the checkpoint hashes do not identify a later final ZIP.

## Public deployment boundary

`vercel.json` uses Vercel Services: `/v1/*` and `/health` route to **`app.serverless_demo:app`** in `backend`; other paths route to the Vite frontend. Hash routes provide the six application views. `/pitch/` and its PDF are real static paths. `api/index.py` is an alternative conventional Vercel function entrypoint, not the Services entrypoint. Never publicly deploy `app.main:app`.

Archie's current host is static Vite. It saves the exact tracked `deploy/archie-static/index.html`, loading pinned JS/CSS/fonts from the Vercel CDN and using the opt-in fictional bridge. `PUBLIC_ARCHIE_ORIGINS` contains only exact preview and published HTTPS origins, not a wildcard. Its visitor token is held only in module memory and sent in a dedicated header with credentials omitted; reload starts a fresh visitor. The same-origin Vercel cookie flow remains separate. `deploy/archie/` is an alternative Next adapter, not the current static-host entry. See [ARCHIE_DEPLOYMENT.md](ARCHIE_DEPLOYMENT.md) for the new-revision build/pin/deploy/save/publish sequence.

The public adapter allows only the bundled 5,000-row and 480-row fictional fixtures. It rejects CSV uploads and external-pair audits with 403 before parsing their bodies. Each visitor is limited to two fixtures, 40 saved candidates, four search jobs, 24 candidates per search, 64 KiB of request/configuration data and 30 minutes of inactivity. Clear affects only that visitor. Expired records cannot be replayed; abandoned expired configuration is retained until that visitor returns for lazy deletion.

Archie receives compact validated fixture/schema/recipe/workload replay specifications, not uploaded source tables or protected-row previews. The browser receives no service key. Same-origin visitor cookies are opaque, HttpOnly, Secure and SameSite=Strict. Exact Host and same-origin mutation checks remain enforced for that transport; the separate bridge requires an exact configured Origin and validated visitor header, without credentialed CORS. Archie storage failure returns 503; there is no shared or process-memory persistence fallback. Health reports the demo mode and budgets, but is not a database availability probe: verify an actual fixture request after deploying.

Archie GitHub synchronization currently reports an error. Manual Code-editor save uses the exact tracked entry; automatic pull has not been established. [ARCHIE_RECONCILIATION.md](ARCHIE_RECONCILIATION.md) records review of all six old generated exports and retained concepts. Do not regenerate the old prototype or introduce a second calculation runtime.

Follow [ARCHIE_DEPLOYMENT.md](ARCHIE_DEPLOYMENT.md) for server-only environment variable names, restricted service-role/table details, deployment commands and live API reproduction. Keep credentials outside source and `VITE_*` variables. [HOSTED_DEMO.md](HOSTED_DEMO.md) documents the alternate Docker/serverful adapter, which has different memory/session admission behavior.

## Contract details worth preserving

- `apply(frame,schema,steps,seed=42,secret=None)` returns output, original iloc offsets in output order, and aggregate transform report. Neither lineage nor secret belongs in an export.
- All engine interfaces use plain dictionaries/DataFrames. HTTP payloads use camelCase; nested scientific metric keys retain their documented engine names.
- Missing risk values form an explicit category. Never replace them with a string sentinel that could collide with real data.
- Bands use `[a,b)` and numeric utility decodes midpoints with a warning. Weight banding requires reviewed kg or explicit lb conversion.
- Row suppression is final-only, capped and rechecked. Automated search must not mutate `research_target` roles.
- External audit column mapping is original-name to protected-name. Paired mode requires explicit unique valid original offsets; provenance is an owner assertion, not an inferred attack input.
- Candidate assessments create new IDs rather than overwrite existing results. Schema changes after candidate creation do not rewrite that candidate's schema snapshot.
- The local search call is synchronous, one at a time, and can report grammar/attempt exhaustion. Search results retain failed constraints and exact evaluated recipes. Its engine budget is distinct from the public adapter's 24-candidate cap.
- CSV export rechecks identifiers and formula-like strings. Reports remove table previews and private alignment; aggregates and query definitions still need review.
- API research queries reject reviewed direct-identifier references in target, groupBy and filter fields, preventing those known identity labels from entering query result reports.
- Local session deletion clears in-memory references and rotates the HMAC key; all old IDs become invalid. It does not remove external files or promise secure RAM erasure. Public session deletion instead removes that visitor's Archie replay record and expires their cookie.

## Coverage and known boundaries

Read [RELEASE_LIMITATIONS.md](RELEASE_LIMITATIONS.md) before broadening claims. Unimplemented capabilities include real auxiliary/public-record linkage, held-out inference calibration, longitudinal/genomic attacks, trained synthetic-data generation/attacks, DP mechanisms/accounting, ARX/R bridges, l/t enforcement and production controlled/aggregate deployment modes. Attack Lab's composition/differencing examples are demonstrations, not those missing services.

Future work should extend a named evidence gap and its applicable threat model. Preserve source data locally, the owner/attacker alignment boundary, capped computation and explicit unsupported statuses. If adding a dependency or redistributing a bundle, update both locks and the notice inventory. The packager generates full license texts for the locked production npm packages; that does not constitute a complete license review of all Python transitive or bundled numerical runtimes.
