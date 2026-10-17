# Frontend agent assignment — make PRISM feel like a serious instrument

## Your deliverable

Build out the modern frontend around the existing working backend. Own `frontend/**` and frontend tests. Read `docs/UX_SPEC.md`, `docs/EVALUATION.md`, `docs/api/openapi.json`, and the default examples before coding. Inspect the existing starter and screenshots. Do not change statistical meanings to make the interface simpler.

Use React + Vite + TypeScript if the environment supports installation; otherwise modularize the current ES-module implementation. The current source has no npm dependency and is deliberately replaceable. Do not leave an unbuildable migration. Serve the production build from `frontend/dist` through the existing local server, or coordinate an explicit packaged asset location.

## Build these components

1. `AppShell` / `ModeSelector`: prepare a candidate vs audit an existing release; distinguish fictional demo from uploaded data permanently.
2. `DatasetImport`: file checks, meaningful errors, preview, schema assumptions, explicit replacement of previous session data. No upload to any third party.
3. `SchemaInspector`: role/type/unit/entity key editor, identifier and quasi-identifier warnings, person-vs-row explanation. UI must cover all columns, not just automatically guessed age/ZIP/weight names.
4. `ThreatBuilder`: supported known/secret fields and membership scope, displayed as a readable sentence. Show unsupported auxiliary/trajectory assumptions as unassessed rather than pretending to implement them.
5. `RecipeComposer`: typed cards for thirteen supported transformations and capped k suppression; columns, units, parameters, ordering, exclusions and reasons. Validate before execution but preserve server validation. Keep advanced JSON export/import for power users.
6. `ComparisonWorkspace`: independently scrollable tables; shared-domain histograms; changed-field highlighting; missingness; correlation changes with accessible tables. Do not align shuffled rows as though they identify the same person.
7. `EvidencePanel`: measured result, denominator/unit, method, assumptions, baselines/control status, residual gaps, concise repair hints. Use catalog explanations; do not generate unsupported prose with an LLM.
8. `WorkloadBuilder`: count/rate/mean/correlation and filters; native-unit absolute tolerances; per-query outputs and unavailable states. Never show 100% utility when no tasks were supplied.
9. `CandidateExplorer`: real Pareto points and candidate table, keyboard access, inspector, complete recipe snapshot, row-loss objective visible. Applying a point must evaluate/freeze the actual candidate, not just move sliders.
10. `ExportReview` / `ConfidentialAudit`: separate artifact choices and warnings, correct selected candidate, three required acknowledgments, formula-protection explanation. No automatic transmission.
11. `MethodsDrawer`: searchable 26-family register, coverage status, tooltip/drawer/source; keep implemented and educational material visually distinct.
12. `SessionControls`: clear-session action, expiration recovery, in-memory retention notice, no browser persistent data caching.

## Visual direction and interaction

Keep the starter's calm light scientific surface and restrained accent, but improve spacing, typography, column density and responsive navigation. Do not add padlock theater, neon “cyber” visuals, static screenshots as controls, fake gauges, or generic AI chat panels. The data and the surprising calculation are the hero.

All columns need readable headers/tooltips and units. Avoid clipped primary controls, nested tiny cards, horizontal document overflow, and tooltip-only vital warnings. Reserve red for actionable serious issues, amber for review, neutral for unassessed. Never equate “not measured” with green.

Use cancellation/request IDs and result fingerprints. Slider movement invalidates old results; a lightweight preview may be debounced but must be distinguished from complete evaluation. Experimental randomness must not silently resample on every render. DP is not a realtime preview slider.

## Required acceptance tests

- Load default data -> observe 75/480 under 5/3/5 -> histogram -> workload details.
- Remove ZIP precision with the same fixture -> observe 20/480 and unchanged selected task answers.
- Change settings -> old results visibly stale -> export unavailable until evaluation.
- Import CSV with `02108`, nulls, quoted commas and HTML-looking strings -> preserve values and escape display.
- Audit an external candidate -> identity linkage unassessed without correspondence.
- Select noise on a known field -> exact-linkage test inapplicable, not zero-risk.
- Optimize -> actual points -> keyboard selection -> complete recipe restored.
- Empty/missing workload -> utility composite unavailable and no fabricated optimal claim.
- Deny export when acknowledgments missing; verified protected CSV contains no source IDs/lineage/secrets/audit.
- Search/expand a genomic threat -> explicit missing coverage.
- Test 390/768/1440 widths, reduced motion, focus trap/restore, Escape, labels, chart table alternatives, and contrast.
- No runtime remote requests/CDNs/fonts/telemetry, no localStorage patient data, no browser console values from imported rows.

## Do not cross these boundaries

Do not rewrite backend scores, upgrade catalog statuses yourself, apply a “HIPAA preset,” invent a confidence interval, or imply maximum strength is safe. Do not expose `api/report` to recipients. Ask the lead to approve schema changes; submit actual screenshots and test evidence with your work. This is the lane that should produce most of the final user-facing polish.
