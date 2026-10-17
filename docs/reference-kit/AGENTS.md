# Instructions for agents working on PRISM

Read `README.md`, `docs/CRITIQUE.md`, `docs/EVALUATION.md`, then your assignment under `docs/agents/`. The controlling product brief is `docs/PRODUCT_BRIEF.md`; requests are defined by `backend/prism/models.py` and `docs/api/openapi.json`.

Non-negotiable invariants:
1. No “percent anonymous,” automatic legal approval, all-attacks guarantee, or maximum-slider safety claim.
2. Missing, inapplicable, skipped, unverified, and failed evaluations are distinct states. None becomes zero risk.
3. Use synthetic/authorized test data only. No raw data, rows, free text, secrets, or exact private audit outputs in remote agents, telemetry, public fixtures, logs, or analytics.
4. No cloud model/API requirement. No third-party fonts, CDN scripts, remote image fetches, or service-worker data caching.
5. Keep protected-data export separate from owner-confidential audit export; never include linkage lineage or transformation secrets with the candidate.
6. A new attack needs an applicability predicate, source, threat assumptions, baseline/control plan, counterexample, regression test, limits, and cancellation/performance bounds.
7. Do not describe adapter code as integrated until its real package version and end-to-end tests are recorded.
8. Run pytest before and after changes. Keep statistical semantics stable during frontend rewrites. Regenerate OpenAPI only after reviewed API changes.
9. Synthetic-only screenshots and test artifacts are acceptable. Never record a real patient-data screen.
10. ARX already offers risk/utility-aware optimization. Do not invent novelty claims to flatter the project.

See `docs/agents/00_ORCHESTRATOR.md` for ownership and merge order. Agents should finish an executable vertical slice, not create an impressive count of unconnected components.
