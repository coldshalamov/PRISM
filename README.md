# PRISM

[Open the fictional demo](https://41d0bdfd-0065-4b0b-a973-efbe1c1a9c5e.archie.site/) · [Pitch deck](https://prism-healthcare-taupe.vercel.app/pitch/) · [Download pitch PDF](https://prism-healthcare-taupe.vercel.app/pitch/PRISM-Pitch.pdf)

PRISM is a privacy preflight workbench for structured research datasets. It understands field meanings, explains measured disclosure pathways, and compares protective recipes against the research questions you need to preserve. Original and protected tables, distributions, correlations, findings and reproducible evidence stay in one connected workflow.

Built for the **eMerge AI Hackathon, October 17, 2026**, Enterprise AI track: **AI safety, trust and governance**. Oncology is an independently generated fictional example; no sponsor or patient dataset is used.

## Background material and AI-tool disclosure

This submission incorporates a supplied PRISM research architecture and Apache-2.0 starter kit. The adapted exact-linkage module, catalogue, benchmark fixtures and selected original documentation retain their attribution in [NOTICE](NOTICE), [the baseline reconciliation](docs/KIT_BASELINE.md) and [the original kit notices](docs/reference-kit/NOTICE). They are pre-existing material, not a claim of event-day authorship. The new application, integration and evaluation work is recorded in this repository.

OpenAI Codex and parallel coding agents, Claude Sonnet5.5 through Claude Code and Devin, and OpenCode coding-agent tooling assisted implementation and review. Gemini4 Argon completed the requested frontend audit and improvement pass through OpenCode Go, using model `opencode-go/gemini-4-argon-contributor`. Current integration, independent-review and deployment status is recorded in [the delivery status](artifacts/DELIVERY_STATUS.json). These are development tools. Optional runtime semantic interpretation uses OpenRouter Decisions API model `typesafe/jev-1.14` for constrained metadata classifications. Privacy tests, transformations, utility comparisons and findings explanations remain deterministic; no model generates privacy guarantees or security narratives. Dependency names, versions and licenses are disclosed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and the lockfiles. The frontend distribution includes full runtime license texts at `/THIRD_PARTY_LICENSES.txt`.

The demonstration is a deterministic, fictional 5,000-person oncology table. PRISM calculates sample uniqueness, exact-match QI class sizes, subset exposure, categorical sensitive-value inference and research-query differences. Its bounded search evaluates actual transformation recipes and marks their measured Pareto frontier. A frontier point or a passing constraint is **not release clearance**.

## Run locally

Use Python **3.11 or 3.12**, Node.js **20.19+ or 22.12+**, and npm. From this repository in PowerShell, the helper scripts install the locked environment, build the frontend and launch the app:

```powershell
.\setup.ps1
.\start.ps1
```

`setup.ps1` discovers a compatible Python installation; use `-Python C:\path\to\python.exe` to select one explicitly. The equivalent manual setup is:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e "backend[dev,adapters]"
npm ci --prefix frontend
npm run build --prefix frontend
.\.venv\Scripts\prism.exe
```

Open [PRISM on this computer](http://127.0.0.1:8000). The Python command serves the built frontend and API on loopback only. Build the frontend before starting that process; restart it after rebuilding. The core works offline without an API key or runtime cloud service. Optional Jev classification requires a server-side OpenRouter key and an explicit metadata-sharing action; it never runs on slider movement. Package installation requires access to package registries.

For the exact recorded Python dependency set, install `backend/requirements.lock.txt` before installing the editable project. The frontend dependency set is `frontend/package-lock.json`.

```powershell
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.lock.txt
.\.venv\Scripts\python.exe -m pip install --no-deps -e "backend[dev,adapters]"
```

For frontend development, keep the backend running and use `npm run dev --prefix frontend` in a second terminal. Open [the development frontend](http://127.0.0.1:5173); Vite proxies its API requests to loopback port 8000. Do not expose either service through a public tunnel or change the server bind for real data.

## Optional semantic interpretation

The semantic pipeline is **field interpretation → controlled ontology → deterministic attack tests → transformations → reassessment → utility comparison → researcher decision**. It augments the existing engines rather than replacing them.

Set `OPENROUTER_API_KEY` and `PRISM_JEV_ENABLED=1` in the server environment to enable Jev. `PRISM_JEV_BUDGET_USD` defaults to a $0.10 **per-process** ceiling; hosted sessions also reserve at most two remote interpretation attempts durably. The workbench asks before sending minimized column labels, declared types, units, format descriptions and neighboring labels. It sends no row values. Local rules and all core statistical tests continue when the provider is disabled, times out or abstains. Confirmed corrections override suggestions and persist in the session. The key is never an export or browser configuration.

Jev answers bounded family, leaf and independent-property questions using the local vocabulary. An interpretation is a hypothesis: model probabilities do not prove field meaning or privacy. Current release measurements and transformation lineage are frozen with each candidate. Corrections mark earlier evidence stale until reassessment.

See [the integrated specification](docs/SEMANTIC_SPEC.md), [semantic engine](docs/SEMANTIC_ENGINE.md), and [specification coverage](docs/SPEC_COVERAGE.md). Centered age intervals are offered explicitly, but their midpoint reveals the source age exactly; fixed nonoverlapping bands provide a different, actually coarsened representation.

## Hosted fictional demo

The [public fictional demo](https://41d0bdfd-0065-4b0b-a973-efbe1c1a9c5e.archie.site/) opens the reviewed React interface at its published Archie origin. Archie serves the public HTML entry; immutable JavaScript, CSS and font assets and the real Python privacy/utility calculations run on Vercel project `prism-healthcare`. Archie Core PostgreSQL/GraphQL stores durable fictional-demo configuration in one dedicated table, accessed through a server-only service role. This is a split Archie/Vercel deployment. The pitch deck and PDF remain on Vercel; Archie does not serve the pitch path. Actual deployed fixture calculations reproduce 75 then 20 correct matches; the [verification record](artifacts/verification.md) distinguishes API checks from frontend acceptance.

The public adapter accepts only bundled fictional fixtures, including the ambiguous-field semantic oncology demonstration. CSV, JSON and single-sheet XLSX import and external-file audits remain available in the local workbench above. Each public visitor has an isolated session limited to 24 candidates per search, 40 candidates total, four search jobs, bounded configuration storage and 30 minutes of inactivity. Session clear removes that visitor's stored configuration. Candidate data is reconstructed from the fixtures across cold starts; source tables and protected-row previews are not stored in Archie. Abandoned expired configuration is inaccessible but remains until that visitor returns for lazy deletion.

See [Archie + Vercel deployment](docs/ARCHIE_DEPLOYMENT.md) for the architecture, exact environment-variable names, deployment commands and fixture/API reproduction. The verification record records current live checks; measured tradeoffs do not establish privacy or release clearance.

## Try the complete workflow

1. Load the synthetic oncology dataset, then review field roles and units. Direct identifiers, quasi-identifiers, sensitive attributes and research targets have different purposes. Imported generic weight has no inferred unit.
2. Keep at least two analytical questions: response rate by mutation and stage, and mutation rate by stage. Set importance, error tolerance and minimum cohort size. Mean age by stage is another supplied query.
3. Apply the baseline: remove declared direct identifiers, put age in five-year intervals, truncate ZIP to three digits and put weight in five-kg intervals. Birth dates and other retained attributes still deserve scrutiny. A ZIP prefix alone does not establish HIPAA Safe Harbor.
4. Inspect the actual candidate and its distributions, correlations, research-query results and Knowledge Map. The metrics concern the declared fields and the finite released sample.
5. Search 24 configurations. Compare several actual recipes, their failed constraints and their frontier status. A frontier candidate can still be infeasible; a small or constrained input can exhaust the available grammar before reaching the requested count.
6. Export the evidence as HTML or JSON, the recipe as JSON, and the protected table as CSV. Direct-identifier columns block CSV export. Reports exclude table previews and private row alignment; aggregate labels, query definitions and results can still require review before sharing.
7. Clear the local session when finished. This removes in-memory dataset, candidate and search references and rotates the session HMAC key. It does not delete files you imported or downloaded.

[The demo script](docs/DEMO_SCRIPT.md) includes a short presentation route and reproducible PowerShell API examples, including an external two-file audit with reversed scientific correlation.

## What runs

| Capability | Implemented behavior |
|---|---|
| Intake | CSV, JSON record tables and single-sheet XLSX; leading-zero ZIP preservation, strict rectangular shape, type/role suggestions and schema review |
| Semantic intelligence | Extensible hierarchical ontology, independent properties, local format/cardinality scans, optional typed Jev decisions, explicit unknown/abstention, researcher corrections and cached semantic lineage |
| Attack knowledge | 24 semantic attack categories connect contributing fields and prerequisites to measured current-output partitions, entropy, homogeneity, structured text patterns and explicit unsupported states |
| Protection preference | Selects actual cached evaluated candidates; exposes their measured disclosure, research loss and exact recipe rather than inventing a universal privacy percentage |
| Transformations | Drop, mask, HMAC tokens, half-open bands, explicitly recoverable centered intervals, ZIP prefix, round, top/bottom code, rare categories, UTC hour/day/ISO-week/month/quarter/year generalization and date shift, experimental noise/permutation, limited redaction, cell and capped row suppression |
| Disclosure diagnostics | Exact sample uniqueness, minimum k, present-target guessing, conditional row-index entropy, bounded QI subset map, categorical l/homogeneity, categorical total-variation distance, in-sample inference and a separate within-table held-out diagnostic |
| Research intent | Group rates/counts/means, Pearson correlation and two-cohort rate difference; weighted tolerance-normalized query loss, missing/undersized cohort and sign-flip failures |
| Search | Deterministic memoized finite grammar; default 24 candidates, hard cap 80; separate objectives and recomputable nondominance; protected research-target roles |
| External audit | Explicit original-to-protected column mapping; aggregate comparison by default; paired lineage only on an explicit owner-supplied claim |
| Attack Lab | Executable fictional examples of aggregate differencing, cross-release combination, reversed correlation and exact-match auxiliary ambiguity |
| Reports | Local JSON/HTML evidence, recipe JSON and protected CSV with identifier blocking and spreadsheet formula-cell escaping |
| Optional integration | pyCANON categorical k/l/t cross-check, with installed-package smoke-test status reported separately from installation |

The implemented release workflow is `row_release`. An imported file can be labeled synthetic for descriptive comparison, but Anonymeter attacks, trained synthetic generation, formal differential privacy, ARX/R bridges, production aggregate query services and controlled enclaves are unavailable. See the [method registry](docs/METHOD_REGISTRY.md) and the runtime `GET /v1/registry` result.

Local API limits are 50 MB per table, 100,000 rows, 80 columns, eight datasets and 160 candidates per process session. Candidate previews show at most 30 rows. The explicit dataset-preview endpoint defaults to 30 and permits up to 100. The service is intended for one trusted local user, with no multi-user authentication or durable database.

The original kit's 480-record benchmark is also available at `/v1/demo?fixture=kit`: the public-rule exact-linkage simulation reproduces 75/480 unique correct matches, and 20/480 after ZIP removal, with identical selected protected analytical answers. See [the reproduced baseline](docs/KIT_BASELINE.md). Those are modeled source-target matches, not population probabilities. Unknown external mechanisms and incompatible known-field transformations abstain. Protected CSV export requires authority, limitations and reviewed-candidate acknowledgments; owner audits remain confidential.

## Check or regenerate

```powershell
.\.venv\Scripts\python.exe -m pytest backend
npm run typecheck --prefix frontend
npm run build --prefix frontend
.\.venv\Scripts\python.exe examples/generate.py
```

Tests cover hand-calculated table metrics, homogeneous sensitive groups despite k≥5, equal marginals with reversed correlation, missing-value semantics, unit rejection/conversion, deterministic non-DP transforms, optimizer caps/frontier and HTTP boundary/export behavior. Run the commands for the current checkout; a passing unit suite alone does not establish browser acceptance, clinical validity or release safety.

## Project map

- `backend/app/`: FastAPI application; ontology, Jev semantic compiler, declarative attack rules, data intake, transformations, risk, utility, optimizer and report engines.
- `backend/tests/`: calculation, transform and API acceptance checks.
- `frontend/`: React/TypeScript workspace with local API access and Vite build.
- `examples/`: public synthetic oncology and small hand-checkable fixtures.
- `docs/spec/`: preserved source architecture and handoff specification.
- [Threat model](docs/THREAT_MODEL.md), [metric definitions](docs/METRIC_DEFINITIONS.md), [release limitations](docs/RELEASE_LIMITATIONS.md), [maintainer handoff](docs/AGENT_HANDOFF.md).

New PRISM implementation code is [MIT licensed](LICENSE). The adapted linkage module, copied benchmark fixtures/catalog and preserved original kit retain Apache-2.0; see [NOTICE](NOTICE) and [the kit baseline](docs/KIT_BASELINE.md). Dependencies retain their own terms; [third-party notices](THIRD_PARTY_NOTICES.md) record package metadata and redistribution limitations. This prototype supplies no medical, legal or publication approval.
