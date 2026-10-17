# Open-source integration plan and actual status

The package contains original glue/evaluation code and dependency declarations, not vendored engines or model weights. Installation and runtime verification are separate from writing an adapter. External pip/npm package retrieval was unavailable in the build environment.

| Component | Role | Delivery status | Next acceptance gate |
|---|---|---|---|
| pandas + NumPy + SciPy | Tables, transformations, statistics, distances | **Running and covered by tests** | Lock exact validated dependency versions for each supported platform |
| FastAPI + Pydantic + Uvicorn | Local typed API and static serving | **Running; in-process API tests** | Live-browser HTTP/security-header checks on permitted machine |
| Vanilla ES modules + SVG | Connected frontend starter | **Offline-browser exercised with real in-process backend** | Componentize, polish controls, run actual HTTP browser suite |
| SDMetrics | Additional fidelity metrics | **Adapter source only; not installed/runtime-verified** | Pin package, compare KS/TV results with official examples and edge cases |
| Anonymeter | Synthetic inference evaluation | **Adapter source only; not installed/runtime-verified** | License/patent review, independent-control workflow, end-to-end inference tests |
| OpenDP | Bounded binary-count mechanism demonstration | **Experimental adapter source only; not installed/runtime-verified** | Validate map/calibration, contribution bound, budget behavior; keep away from recipient service |
| ARX | Mature generalization, suppression, group/privacy models and quality optimization | **Researched integration design, no worker implemented** | Local JVM bridge and native-output comparison tests |
| Presidio | Local field/text entity recognition | **Researched integration design, no adapter implemented** | Pattern-only integration first; explicit model setup if later needed; realistic omission tests |
| SDNist | Larger research-oriented evaluation reports | **Reference only** | Decide overlap versus maintenance cost before adding a dependency |

## ARX: the highest-value mature-engine addition

Use a local JVM worker with a strict JSON job contract, not a brittle GUI automation or web service. Inputs: schema, quasi/sensitive field roles, explicit hierarchy files, model configuration, suppression cap, and declared quality objective. Outputs: transformed data, exact engine version, achieved constraints, suppression, quality diagnostics, and typed failure reasons.

Do not assume equal field names mean equal hierarchy semantics. A three-character ZIP hierarchy is not geographic population validation. Compare at least three fixtures directly against native ARX: a valid k model, an infeasible suppression cap, and a sensitive-homogeneity case. Keep ARX model guarantees separate from PRISM empirical attacks. Use resource limits and a secure temporary workspace with cleanup; data must not appear in process arguments or debug logs.

ARX is Apache-2.0 according to its official project notice [S4]. Its existing functionality includes workload-aware quality and iterative adjustment; do not claim PRISM invented those.

## Anonymeter: correct data protocol before a pretty score

The current adapter covers **inference only**, not all three Anonymeter attack classes. It asks for original, synthetic, and comparable independent control data; selected known/secret fields; and explicit acknowledgments about fitting exclusion. It suppresses package debug output and uses one worker. No UI path yet collects those controls.

Before calling it integrated: create the control split before generator fitting, document subjects/populations, pin the exact package version, expose main/control/baseline success and uncertainty, test a copied-data leak, and test a non-leaking population-data comparison. Add singling-out/linkability only with their own prerequisites and outputs. A threshold of 30 targets in the adapter is a prototype refusal policy, not a scientific minimum establishing adequate power.

The official project uses Clear BSD and states a patent-pending code notice [S5]. Keep optional and obtain appropriate review; do not silently relicense upstream code under PRISM's Apache license.

## SDMetrics: fidelity is not privacy

The adapter invokes per-column KS/TV complements where applicable. These metrics should enrich a detailed utility panel; do not turn them into “percent scientifically valid” or “percent anonymous.” Nulls, bands, changed categorical domains, different sample sizes and removed columns need explicit handling. Verify behavior against installed-package examples. MIT license [S6].

## OpenDP: a separate boundary, not a table-noise button

The adapter uses a binary contribution count and declared add/remove-one-person adjacency, with a mechanism-derived charge. It stores budget only in a Python object; restarting the process resets it. It therefore cannot support a valid multi-user repeated-release deployment.

The next build must supply durable transactional accounting, bounded contributions, protected-data access control, query canonicalization, concurrent-release tests, budget-exhaustion behavior, and review of all other outputs. Do not expose exact cohort sizes, data-dependent errors, raw previews or the owner audit through the recipient interface. No fixed RNG seed. OpenDP itself is MIT; PRISM still bears responsibility for its overall system design [S7].

## Presidio and AI-assisted methods

Start with deterministic patterns/custom recognizers for the schema. An optional local NLP recognizer can improve entity detection but still miss personal context and clinical identifiers. An “AI available” label does not make redaction comprehensive. Explicitly display recognition confidence, supported languages/formats, and redaction review; no automatic external model downloads or patient-text API calls.

Large synthetic generators, neural membership attacks and model-heavy anonymization methods belong in the educational catalog as optional future workflows. The core experience must remain useful without them.

## What must be in every adapter result

`engine_id`, exact `engine_version`, `status`, `applicability`, `assumptions`, `metrics`, baseline/control details where required, uncertainty, computation limits, owner-only evidence classification, and runtime. Missing dependencies return `unavailable`, not a mock result. Every adapter gets at least one deliberately vulnerable fixture and one relevant control before a green capability status is allowed.

Source index: [SOURCES.md](SOURCES.md). See `THREAT_REGISTER.md` for attack-by-attack coverage.
