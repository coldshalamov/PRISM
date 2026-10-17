# PRISM v3 engine reconciliation

Reviewed 17 October 2026 against the existing application at `44de58b` (application source freeze `9f40ec1`). Scope: backend execution, transforms, evidence snapshots, record grain, local intake and release bytes. The supplied documents are design input, not an instruction to replace working code or a certificate of implementation.

## Input reconciliation

The standalone `PRISM_Complete_Specification_v3.md` exactly matches the Markdown inside `PRISM_Agent_Handoff_v3.zip`. The pack also contains proposed 144-type and 60-rule JSON catalogs, a specification-validation receipt and a small arithmetic/catalog validator. Its own README correctly distinguishes these from application tests. The current 145-type/24-category implementation should not be mechanically replaced to match proposed counts.

## Substantive contracts already implemented

- `main.make_candidate` retains a deep-copied actual frame and reviewed schema, frozen semantic revision/provider receipt, exact recipe and recipe hash. Later semantic changes do not rewrite the candidate; reassessment creates a new snapshot.
- `semantic_rules.evaluate` measures the candidate representation. Unknown meanings and Jev abstention retain independent identifier profiling, declared-QI measurement and explicit unsupported prerequisites. Meaning routes a hypothesis, rather than proving identity linkage.
- `utility` runs named queries on recipient-visible candidate values. Fixed bands are approximate or yield uncertain filter membership; centered `CI[...]` values decode to their recoverable integer center. There is no hidden-source substitution to preserve output means.
- External paired audits require explicit unique source offsets; unpaired audits do not infer correspondence from row order. Unknown external mechanisms do not acquire a fabricated recipe or verified-identity-linkage rate.
- Local intake supports strict CSV, rectangular JSON and one-sheet XLSX. ZIP padding is preserved where declared. Workbook formulas are rejected, rather than evaluated. Public demo routes accept fictional fixtures only.
- Unconfirmed record grain/repeated declared entity keys disable person-level verified linkage and add explicit record-level warnings. Subject-disjoint inference/trajectory analyses remain unimplemented; no person-level assurance follows from duplicate appointment rows.
- Suppression/retention and query cohort consequences are reported. Optimizer feasibility explicitly rejects an empty retained frame (`min-k` requires rows).
- CSV serialization excludes DataFrame indexes and escapes formula-leading strings. Owner reports exclude raw preview rows, private row correspondence and keys, and are labeled confidential because aggregate/workload details may still be sensitive. Specialized workbook metadata auditing is not claimed.

## Reproduced useful v3 deltas

1. **Recoverability explanation was absent from findings.** An external `age` column containing `CI[41,45]`, `CI[42,46]`, `CI[43,47]` is decoded by the existing utility engine to 43, 44, 45 exactly, but the semantic finding list contained no recovery finding. The known transform already warns correctly and receives no uniqueness/linkage improvement. A narrow output-only finding for the explicitly declared PRISM `CI[...]` encoding would explain this distinction, without pretending arbitrary external ranges were source-centered.
2. **Empty-release handling was checked and requires no product repair.** Direct low-level `risk.evaluate` on a zero-row frame uses zero-valued metrics and `k_min=0`. Following the supported entry paths showed that intake rejects zero-row tables and `transforms.suppress_rows` explicitly rejects suppression of every row before candidate assessment. The optimizer also requires a nonempty frame for minimum-k feasibility. The low-level convention is therefore not a reachable favorable empty-release result; no speculative guard or nullable-metric migration was added.
3. **Typed empty-string/missing distinction is not implemented.** JSON/XLSX normalize through CSV; null and empty string therefore merge. Missing is safely distinct from literal sentinel labels in existing risk groups, but the richer v3 missingness-reason ontology is not present. This is a documented intake boundary, rather than a claim that those causes were distinguished.
4. **Full serialized artifact re-assessment is future work.** Protected CSVs are escaped and constructed from the frozen output only, but the exact serialized bytes are not automatically re-imported and re-assessed. In particular, spreadsheet formula escaping is a representation change. Current exports correctly carry no release clearance; a later export manifest should bind serialization policy and byte hash to a re-import assessment.

## Deliberate limits retained

The v3 proposed relation graph, 60-rule DSL, subject-count observer model, prior-release intersection, exact aggregate reconstruction, standalone inspect-only path and population/synthetic attack adapters are not all implemented. Existing unsupported/unknown states should remain visible. They should not be relabeled as completed tests, or rushed in as nominal catalog entries. There is no universal privacy score, formal DP guarantee from before/after files, or claim of legal authorization.

## Verification boundary

This reconciliation used narrow executable reproductions of CI recovery and low-level empty metrics, then followed the actual empty-release entry paths and inspected the implementation paths listed. It did not repeat the already-passing integrated test campaign or execute the pack validator as if that would validate the product. Repairs and focused checks are recorded below.

## Implemented v3 delta

`semantic_rules.py` now exposes version 1.1 and a real 25th category, `recoverable_value_encoding`. It scans actual output cells for the explicit public `CI[lower,upper]` integer encoding, validates ordered bounds and an integer midpoint, and reports aggregate recoverable/invalid-cell counts. The finding explains the readable exact center, separates naming from value recovery, and recommends evaluating fixed shared bins. An external output never acquires source-mechanism provenance or a claim that its midpoint equals an unknown original value. Known-transform provenance is field-specific. Plain shared `[lower,upper)` bins do not activate this finding. Invalid/overlong/half-integer encodings abstain rather than throwing or leaking raw cell values. Existing candidate coverage is derived from executed findings; the registry now truthfully has 25 categories. The previously unreachable duplicate centered-interval lineage branch was removed.

Focused checks: `test_semantic_v3.py` **7 passed** (external output-only recovery, actual known transform, shared-bin negative case, field-specific provenance, malformed/long encoding, registry/coverage consistency, and external extra columns absent from original semantics). The existing two precision-extension tests also passed in the focused run. The initial combined pipeline run had 12 passing tests and one expected consent-contract failure while the parallel metadata-approval change was landing; that test is owned by the metadata integration and must be updated there before final integration acceptance. `git diff --check` found no whitespace errors on owned implementation paths.

No changes were made to `main.py`, low-level risk conventions, existing subject-level claims, or deployment controls. Final deployment/public-browser acceptance belongs to the integrating controller.

## Hosted upload integration after user steering

A later explicit user instruction enabled real table upload in the hosted workbench. The frontend now consumes `deploymentMode=hosted_workbench`, `uploadsAllowed=true` and the service's `maxUploadBytes` limit. The hosted chooser accepts CSV/JSON/XLSX up to the reported 3 MiB limit, while local 50 MiB intake remains available. Original import and external protected-table audit actions use the existing engine flows. Fictional labeling depends on `dataset.synthetic`, and external audits do not inherit a fictional label merely because their original reference was a built-in fixture.

Import/privacy/session copy accurately describes uploaded table bytes in Archie Core, Python computation through Vercel, session-scoped storage and cleanup, and the separate approved metadata-only Jev request. Session clear retains the existing service-confirmation requirement. A normal reload starts a new browser visitor token; inactivity expiry makes old data inaccessible and deletion is lazy on that session's revisit, rather than an invented background sweep.

Frontend paths owned for this change: `deployment.ts`, the `ApiHealth` fields in `types.ts`, `shell/Dialogs.tsx`, `shell/Sidebar.tsx`, `shell/Shell.tsx`, display-only `views/Report.tsx`, workspace comments/clear notification, and the bridge comment in `api.ts`. Product-agent banner/workbench/ledger/styles and backend upload storage remain separate ownership.

Direct checks: frontend TypeScript check passed after these edits; six narrow capability/provenance checks passed for hosted enabled, unknown remote blocked, fictional-only disabled, local capability, imported-not-fictional and fixture-fictional cases. Final public upload, audit, cleanup and deployment acceptance remain the controller's task.

## Actual Archie Core upload acceptance

The completed upload backend was exercised through `ServerlessDemo` HTTP with the real restricted Archie Core service role and a new owned visitor cookie, rather than an in-memory fake store. This check used the current adapter in a local TestClient; it is distinct from the controller's public Archie browser acceptance. Credentials were read into process environment from the existing external deployment configuration and never printed or embedded in artifacts.

Results in 17.03 seconds:

- Imported the committed semantic example as CSV, JSON and XLSX: each returned 480 rows, nine columns, `synthetic=false`, and identical previews. Uploaded inputs are correctly treated as imported files even when their content is a published fictional example.
- Reviewed the explicit schema/person key and executed the committed recipe: 96 combination-unique rows from 480; both selected research-query errors zero. The candidate carries 25 semantic findings and a stable recipe hash.
- Imported the separately protected CSV and ran the real unpaired two-file audit: zero sample-unique rows, response-query error zero, height-mean error 1.2 cm, verified linkage unavailable, and external mechanism unknown.
- Created a fresh adapter instance with the same owned cookie: ordinary candidate JSON and external-audit JSON were exactly equal after reconstruction; owner JSON reports matched except generation timestamp. No model calls/remote-attempt reservations occurred. Persisted session configuration was 25,811 bytes.
- Clear session confirmed deletion of the owned session and all four uploaded blob records. The `finally` cleanup checked that both the session and all four records remained absent.

The sanitized result is retained locally in ignored `artifacts/v3-real-core-receipt.json`; its probe source contains no credentials. This check establishes actual Archie storage permission, typed-file persistence, reconstructed computations, snapshot/report binding and owned-session deletion. It does not replace the public file-chooser/deployment check or imply that unsupported specialist attacks were run.

## Direct CSV export after user clarification

The hosted desktop proof of concept now downloads a measured protected CSV directly, without an authority/limitations/review checklist. `main.export` no longer authorizes CSV through those three flags. Its optional legacy request field remains accepted for compatibility but is ignored; the server does not invent or record human approval. Frozen candidate bytes, formula-safe serialization and the recognized-direct-identifier block remain unchanged.

Three focused API checks passed: the normal four-format workflow sends no acknowledgment flags, direct CSV returns identical bytes with flags omitted or any legacy subset, and an unchanged identifying candidate still returns the concrete direct-identifier block. Frontend direct-download wiring and public browser acceptance are integrated separately by their owners.
