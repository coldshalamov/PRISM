# PRISM

**See what survives the scrub.**

A local-first privacy engineering workbench for researchers preparing to share tabular data. Compare an original table with a protected candidate, test specific disclosure scenarios, and see which scientific answers change. No paid APIs, model training, or GPU is required for the working core.

This ZIP contains a **working Python backend, a connected browser starter, a research/coverage register, fictional demonstration data, tests, and parallel-agent build instructions**. It is a substantial hackathon foundation, not a production privacy certification system.

## Run it

Use Python 3.11–3.13. From this directory:

```sh
python -m venv .venv
# macOS/Linux
source .venv/bin/activate
# Windows PowerShell instead:
# .\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
python -m prism.cli
```

Open **http://127.0.0.1:8787**. The included static frontend needs no Node installation or build step. Initial dependency installation needs network access or a prepopulated wheel cache; runtime does not. Use a trusted Python environment, not a public server.

The app starts with **480 entirely fictional records** and the requested **5-year age / 3-digit ZIP / 5 kg weight** settings. Names and subject IDs are dropped, dates reduced to years, and rows shuffled. These are candidate transformations—not a safe-release preset.

With that fixture and declared exact-knowledge attacker, **75 of 480 source records still produce a verified unique correct match (15.625%)**. All three example analytical tasks remain within their declared tolerances. These are actual computed fixture results, not a population re-identification probability or clinical finding.

## What works now

- Original/candidate split-screen; table and distribution views; upload and audit an externally transformed CSV.
- Editable field roles, attacker knowledge, recipe JSON, and whitelisted analytical queries.
- **13 column transformations** plus capped row suppression for a selected-field minimum class size.
- PII heuristics; sample uniqueness/classes; exact simulated linkage with private scoring lineage; distinct-l/homogeneity and distribution-shift diagnostics; field ablations.
- Distribution, missingness, correlation, and workload utility comparisons.
- Bounded 12-candidate search in the UI, up to 18 via API; three-objective Pareto ranking.
- Three computed counterexamples: differencing, cross-release composition, and correlation destruction despite unchanged marginals.
- **26 threat families and 17 protection entries** with explicit core/partial/adapter/demo/planned/out-of-scope statuses.
- Session isolation, same-origin/host restrictions, bounded uploads, stale-result export guard, CSV formula neutralization, and separate owner-confidential reports.

The frontend is intentionally a connected starter. Most operations are available through its advanced JSON editor; the finishing agent should turn them into excellent typed controls rather than replace the backend with cosmetic simulations.

## What is not claimed

PRISM does not cover every known attack, establish authorization to share, encrypt transmission, guarantee anonymity, or certify HIPAA/GDPR compliance. “Measured” means a test ran, not that the data are safe. A zero result from one attack does not bound all others. The coarsest slider setting is not a guarantee.

**Do not use this prototype as the sole release gate for real patient data.** A trusted recipient does not remove institutional, contractual, consent, or regulatory obligations. Use fictional or properly authorized development data until the security and scientific validation gates in `docs/CRITIQUE.md` are completed.

## Open-source engines: honest status

The core executes using pandas, NumPy, SciPy, FastAPI, and Python. Opt-in adapter code is supplied for **SDMetrics, Anonymeter inference, and an experimental OpenDP count primitive**, but their dependencies could not be downloaded here and those adapters are **not runtime-verified**. ARX and Presidio integrations are designed in the handoff, not secretly represented by local placeholders.

Do not enable optional tools merely to make the capability list look longer. Follow `docs/research/OSS_MATRIX.md`, including Anonymeter's Clear BSD/patent notice, and run the acceptance gates before exposing an integration.

## Start here, depending on your job

| Reader | Document |
|---|---|
| Founder / presenter | [Product brief](docs/PRODUCT_BRIEF.md), [demo and judge questions](docs/DEMO_SCRIPT.md) |
| Lead agent | [Orchestration prompt](docs/agents/00_ORCHESTRATOR.md) |
| Frontend agent | [Frontend build prompt](docs/agents/01_FRONTEND.md), [UX specification](docs/UX_SPEC.md) |
| Privacy engineer | [Evaluation methods](docs/EVALUATION.md), [threat register](docs/research/THREAT_REGISTER.md), [OSS matrix](docs/research/OSS_MATRIX.md) |
| Backend / integration | [Architecture](docs/ARCHITECTURE.md), [OpenAPI contract](docs/api/openapi.json) |
| Reviewer | [Critique and release gates](docs/CRITIQUE.md), [security boundaries](SECURITY.md) |

## Verification

```sh
python -m pytest -q
python scripts/evaluate_example.py
python scripts/build_frontend.py  # after editing frontend/src
```

The delivery passed **61 backend/API tests**. Offline Chromium checks exercised 10 interface workflows with actual in-process FastAPI responses on fictional data, with no browser page errors. Desktop and 390px screenshots are in `artifacts/`.

**Verification boundary:** browser navigation to the local HTTP server was blocked by the build environment administrator. The offline DOM/API harness does not verify live HTTP transport or response security headers. `scripts/browser_smoke.py` is provided for the final agent to run locally against the server. Full production/browser/accessibility/security acceptance remains open. Optional packages were not installed. See `artifacts/DELIVERY_STATUS.json`.

## Troubleshooting

The prototype keeps at most four local sessions. Reloading can leave an old session until expiry; if you reach the cap, stop the server with Ctrl+C and restart it. This discards all unexported in-memory data. A robust close/restore-session UI is assigned to the finishing agent.

For browser automation, install the optional Playwright testing tools and a compatible Chromium locally. They are not required to run the app. Optional privacy adapters must be installed and tested separately, not enabled on trust.

## Project map

```
backend/prism/       transforms, privacy tests, utility, optimizer, local API
backend/tests/       deterministic unit and API regression tests
frontend/src/        editable dependency-free ES-module interface
frontend/dist/       included runnable static interface
examples/            fictional CSVs, requests, measured results
scripts/             build, fixture generation, evaluation, browser checks
docs/agents/         independent work lanes and merge gates
docs/research/       sources, threat register, OSS integration decisions
artifacts/           actual test outputs, benchmark, screenshots, delivery status
```

This source release uses Apache-2.0 for original PRISM code. Dependencies retain their own licenses. No real clinical dataset, third-party model weights, fonts, or downloaded third-party packages are bundled.
