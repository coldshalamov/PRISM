# Lead agent: finish PRISM without breaking its scientific contract

You are the integration lead. Read `AGENTS.md`, the product brief, evaluation contract, architecture, critique, and actual source before assigning work. This package already runs: do not throw it away and rebuild a demo with fake metrics.

## Objective

Deliver an excellent local-first researcher workflow around the working deterministic backend. Maximize useful end-to-end behavior and demonstrable evidence, not component count. Use only fictional/authorized test data. No paid APIs, GPU, public patient-data service, or unverified privacy/compliance claims.

## Establish the baseline first

1. Create a branch and run `python -m pytest -q` (delivery baseline: 61 tests).
2. Run `python scripts/evaluate_example.py` and reproduce 75/480 default verified unique matches.
3. Run the local application and `scripts/browser_smoke.py` in an environment that permits loopback browsing. The delivery's offline harness is not a substitute for this HTTP check.
4. Read `artifacts/DELIVERY_STATUS.json`; verify optional engines yourself before changing statuses.
5. Inspect the generated OpenAPI contract and default request/report examples.

## Parallel assignments and ownership

| Lane | Owner files | Do not edit without coordination |
|---|---|---|
| Frontend | `frontend/**`, new frontend tests, `docs/UX_SPEC.md` amendments | Backend statistics, request semantics, catalog capability statuses |
| Privacy integration | `backend/prism/adapters/**`, adapter tests, `docs/research/OSS_MATRIX.md` | Main UI, existing metric meanings, shared schemas without agreement |
| Evaluation/search | `backend/prism/privacy.py`, `utility.py`, `engine.py`, focused tests | API/security/session implementation |
| Security/QA | `backend/prism/security.py`, `api.py`, CLI, API/browser tests, packaging | Statistical algorithms except reported bugs |
| Lead only | `models.py`, dependency lock/config, catalog schema, generated OpenAPI, root release docs | Changes require affected lanes to review |

The optional aggregate-track lane should branch independently after the core is stable; do not let it expose the owner API remotely or derail the demonstrable microdata workflow.

## Merge order and contracts

Freeze request shapes first. Frontend consumes existing endpoints; integration adapters initially stay behind capability checks. Merge frontend structure and tests, then one proven engine at a time. Merge evaluation changes with before/after example reports. Integrate security changes throughout, but avoid broad simultaneous rewrites of `api.py`.

Any API change needs typed schema, migration notes, updated examples/OpenAPI, backend tests and frontend error-state tests. Never infer a missing risk metric as zero. Restore correct snapshots after any change to recipe, threat or data.

## Prioritized build sequence

**P0:** real local HTTP smoke; accessible field/unit/person controls; method composer; usable workload builder; stale/cancel states; known limitations visible; actual export path.

**P1:** correlation-difference and subgroup views; candidate inspector/table/keyboard interaction; owner-confidential report polish; one genuinely installed and validated OSS adapter (ARX is strategically valuable but potentially more integration effort than SDMetrics).

**P2:** independent auxiliary/control-data workflow; stronger linkage/inference tests; persistent multi-release history restricted to owner; interval-aware utility; exact frozen candidates for stochastic methods.

**P3:** distinct aggregate-recipient architecture only when challenge requirements and access are confirmed.

Do not add authentication/payments/chat agents as a distraction from these acceptance gates. Do not install every library merely for a longer sponsor slide.

## Required final evidence

Full test output, browser workflow checks, actual screenshots at 390/768/1440 widths, package versions, one default report and one useful alternative, export contents verification, capability coverage table, remaining limitations, and reproducible start commands. The pitch must distinguish core calculations, optional tested integrations, educational demos, and future work.

Stop adding breadth when the main workflow becomes unstable. A visible honest abstention is better than an impressive-looking invalid result.
