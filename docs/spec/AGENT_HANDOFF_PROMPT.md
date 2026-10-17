# PRISM — Agent Implementation Prompt (copy/paste)

You are the lead software engineer responsible for implementing **PRISM**, a local-first, open-source, deterministic privacy engineering laboratory for structured research datasets. Start by reading `PRISM_MASTER_ARCHITECTURE.md` fully. That file is the product requirements document and mathematical source of truth.

## Mission
Deliver a genuinely working end-to-end proof of concept: upload a synthetic research CSV; profile and classify fields; create a versioned protected dataset; evaluate record uniqueness, knowledge-subset exposure and sensitive-attribute inference; measure preservation of selected scientific queries; automatically search transformation candidates; show the Pareto tradeoffs in an outstanding split-screen frontend; and export a reproducible evidence report. No paid API, neural model training, or large GPU. The source dataset and generated artifacts must remain local.

## Critical claims policy
Do **not** output “anonymous,” “HIPAA compliant,” “safe to publish,” or a blanket privacy percent. Separate sample uniqueness, sensitive inference, synthetic-data attacks, and formal differential privacy. Explicitly show assumptions and untested attacks. A failed, unsupported or inapplicable attack is never a passed test. Do not fabricate data, metrics or frontend states. Synthetic demo records must be clearly marked synthetic.

## First actions
1. Create repository structure and pin/record dependency versions and license notices.
2. Define Pydantic models and JSON schemas matching the master spec. TypeScript types derive from the schema, or freeze a manually synchronized contract.
3. Generate deterministic synthetic fixture plus tiny hand-checkable examples and acceptance tests; show all baseline risk/utility calculations.
4. Create backend and frontend stubs with real HTTP healthcheck and fixtures.
5. Delegate parallel lanes with exclusive file ownership: transformation, risk, utility/optimization, frontend. Preserve the interface contracts.
6. Integrate one full vertical slice before widening scope.

## Essential implementation
- Default transforms: age → five-year bands, ZIP → first three digits with HIPAA warning, weight → five-kilogram bands, drop direct identifiers.
- More transforms: drop cells/rows, top/bottom coding, categorical generalization, simple group permutations (clearly labeled non-private by default), experimental numeric noise.
- Audit mode: allow original and separately protected file imports; distinguish verified row alignment from unpaired and synthetic outputs; never infer lineage or algorithm provenance merely from similar-looking rows.
- Risk: per-QI equivalence class size, `k_min`, fraction sample unique, per-row minimal distinguishing subset with search coverage, entropy of row-index under explicit uniform assumptions, sensitive-class homogeneity and best-guess accuracy with baselines. Attempt pyCANON adapter; test it against tiny fixtures before use.
- Utility: marginal/paired changes, correlation sign flips, configured research queries and subgroup effects. Importance weighting must operate primarily on analyses, not just columns.
- Optimize: ≤80 candidate recipes, memoize, respect user constraints and report a Pareto frontier, including an explanation of why each candidate was chosen or rejected.
- UI: professional original/protected synchronized table and chart views; config rail; Knowledge–Exposure Map; Research Intent editor; attacked-vs-preserved metrics; privacy–utility scatter; 2–3 selectable candidate histories; tooltip encyclopedia of methods and uncertainties; detailed evidence export.
- Security: bind loopback only, restrict origins, don't log source rows, no cloud upload/telemetry, no public patient datasets in demonstrations.

## Done only when
A fresh installation can execute the following scenario without manually editing source code: select synthetic oncology fixture, choose research query “mutation status vs treatment response by stage,” apply default transforms, inspect the split-screen differences, see measured uniqueness and inference vulnerabilities, run optimizer, choose a non-dominated protection recipe, inspect the exact changes in scientific results, and export a report documenting tests and limits.

Tests must include: names removed but record still unique; k-anonymity with homogeneous sensitive values; equal marginals with inverted correlation; invalid units; 3-digit ZIP is not automatic HIPAA Safe Harbor; unsupported tests never pass; seed reproducibility for **non-DP** demonstrations; no raw data in logs; and rigorous optimizer search termination.

## Work discipline
Run tests and demonstrate outputs; never claim code works without executing it. Report exact dependencies installed, which integrations passed smoke tests, and which features remain planned. If an external library stalls installation, implement a transparent native benchmark method rather than replacing it with fabricated output. Favor evidence and stable workflow over sprawling algorithm count. Produce setup/run commands, test results, architecture notes, API contract, and a short demo script.

## Pitch
“PRISM is a pocket information theorist for researchers: it shows what their data reveals, what their privacy settings destroy, and what transformations preserve the science with less measured exposure.” Do not imply professional de-identification certification.
