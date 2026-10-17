# Independent review of the semantic pipeline

Reviewed October 17, 2026 against `docs/SEMANTIC_SPEC.md`. Scope: the added semantic/data-intake pipeline and its changes to existing candidate creation, reassessment, hosted replay, transformations, utility, linkage and exports. This is a targeted implementation review, not a certification or an unrelated repository audit.

## Findings and disposition

1. **Fixed: recognized identifiers could bypass the research-query guard.** The initial query guard consulted only declared schema roles, while semantic confirmation and CSV export also recognized semantic identifier roles. A narrow reproduction imported `X,value`, confirmed `X → legal_name`, requested a count grouped by `X`, and obtained a JSON report containing the fictional names. Both candidate creation and export returned 200. The final guard includes semantic direct-identifier suggestions; the added regression receives `400 identifier_query_blocked` before producing the candidate.
2. **Fixed: reassessment needed one local/hosted policy.** Local reassessment used the current dataset interpretation with the candidate's frozen reviewed schema and recipe. Hosted replay initially reconstructed the old candidate's interpretation, producing inconsistent reassessment after corrections. New reassessments now use the current dataset interpretation; existing candidates and exports retain their original interpretation snapshot. The hosted regression checks the corrected revision and equality after a subsequent cold replay.
3. **Fixed: two small registry/measurement mismatches.** Sequence routing now uses the actual ontology IDs `event_sequence` and `geographic_trajectory`. Repeated-entity counts exclude missing entity values and report `missingEntityRows` separately.

**Disposition: approved for integration within this reviewed scope.** Final source changes were inspected. The pipeline owner ran the six focused pipeline tests after the fixes; all passed in 6.69 seconds. No unresolved finding from this review remains. Deployment/browser acceptance remains a separate release check.

## Dataflow reviewed

- Imported data and schema are not mutated by semantic classification. The semantic fixture is explicitly fictional. CSV, JSON records and one-sheet XLSX share the existing normalization path; ZIP strings and explicit zero-padded Excel codes are preserved. Formula cells and hidden/additional sheets are rejected explicitly.
- Offline classification runs on intake; remote metadata interpretation requires an explicit request. Provider requests are constrained to recognized ontology choices and minimized schema metadata. Corrections are applied last. Unknown and uncertain interpretations remain reviewable and cannot remove independent format/cardinality checks.
- Candidate semantic rules measure the **current transformed frame**. Labels route finite-table partition, conditional entropy, homogeneity, residual-pattern and related measurements; a semantic match is not represented as an external attack success. Unsupported population, membership, external-artifact and other categories retain `measured: null` and Needs Assessment status.
- Source meaning is retained separately from transformed representation. Removed fields are inactive; external audit history is empty and the external generating mechanism is marked unknown. Centered intervals retain exact recoverable midpoints, receive no uniqueness credit and remain replayable in the public-recipe linkage experiment. UTC-hour and ISO-week boundaries are defined explicitly.
- Candidate interpretation/provenance is copied into the assessment and report. Hosted state stores normalized semantic results by content hash and references them from frozen snapshots. Later corrections do not mutate older candidates or exports. Replay runs the deterministic engine without another approved remote inference.
- Hosted remote attempts are reserved durably before calling the provider, with compare-and-swap conflict handling and a two-attempt visitor limit. The provider's separate $0.10 budget remains process scoped; these controls do not constitute a global account-wide spend guarantee.
- Ontology JSON is explicitly included in the Python package data, and `openpyxl` is pinned consistently for the added XLSX reader.

## Evidence boundary

The owner's existing focused tests were inspected rather than repeated. They exercise the real 480-row fictional fixture: exact event/place/demographic unique rows change from **480 to 96** after concrete transformations, and the selected response-by-diagnosis query has **zero error**. This is a finite-table sample result, not population risk or a universal privacy score. Existing tests also cover unchanged source previews, frozen report revisions, externally protected data with unknown mechanism, unknown-membership abstention and cold hosted replay without provider calls.

The independent additional check was the focused recognized-identifier query reproduction described above. Broader live frontend acceptance and final deployment verification belong to the release owner; this source review does not substitute for them.
