# Supplied-kit evaluation integration

This packet reconciles the supplied `PRISM-hackathon-kit.zip` evaluation assignment with the existing PRISM engine. It implements the kit's three first improvements: interval-aware threshold queries, comparisons on a common semantic domain, and declared-subgroup diagnostics. It does not replace the existing application or imply that the reference kit's optional adapters were executed.

The original catalog and documentation remain in `docs/reference-kit/`. Attribution is **PRISM Privacy Workbench, Copyright 2026 PRISM contributors**, distributed under Apache-2.0; the original `LICENSE` and `NOTICE` are retained there. Registry descriptions are adapted to the engine's actual coverage. Source-catalog `coverage` is a catalog classification, not evidence of a passing assessment.

## Interval-aware tasks

Numeric filters evaluate every represented half-open interval. Each query exposes `filterCoverage` with definite, possible and uncertain row counts. When an interval crosses a threshold, the query returns `status: "unavailable"`, `pass: false`, `protected: null`, and aggregate `inclusionBounds`. It does not select a cohort using the midpoint. Count and rate tasks both abstain in that case. Numeric equality and finite-set membership filters also abstain when interval membership is ambiguous. Conjunction bounds are conservative outer bounds.

For fictional ages `20,21,25,26`, released as two `[20,25)` and two `[25,30)` intervals, the count task `age >= 23` actually returns:

```json
{
  "status": "unavailable",
  "protected": null,
  "inclusionBounds": {"original": [2, 2], "protected": [2, 4]},
  "pass": false
}
```

At the aligned boundary `age >= 25`, membership is exact and both tables select two rows. Mean/correlation diagnostics still disclose their interval-midpoint approximation; that approximation is never used to assert exact threshold membership. Nonnumeric values in numeric threshold fields make the query unavailable.

A positively weighted unavailable task makes composite `loss` unavailable (`null`). The existing bounded decision loss remains a weighted mean of `min(1, absolute-error/tolerance)` for available tasks; it is explicitly labeled and is not the kit's unbounded normalized-error formula. Cohort failures and undefined estimates cannot pass or earn a favorable zero.

## Common semantic domains

Each non-text distribution exposes a separate `lexicalTv` diagnostic and `semanticComparison`. Lexical TV compares literal encodings and is explicitly not a measure of scientific damage when representations change.

Supported common domains are a consistent numeric interval partition, a validated uniform ZIP/postal prefix, year/year-month date prefixes, unchanged category vocabulary, or an explicit `ColumnSpec.generalization = {type:"category_map",params:{mapping:{...}}}` hierarchy. Rules inferred from released labels are identified as inferred; their method origin is unverified. A source interval must fit wholly inside the selected common interval. Unknown pooled-category semantics remain unavailable rather than receiving an invented mapping. Missingness and retention are separate from nonmissing-frequency TV.

The fictional four-row example produces these actual aggregate comparisons:

```json
[
  {"column":"age","lexicalTv":1.0,"semanticTv":0.0,"domain":"half-open numeric intervals of width 5, origin 0"},
  {"column":"zip","lexicalTv":1.0,"semanticTv":0.0,"domain":"ZIP/postal prefix, 3 characters"}
]
```

This shows preservation at the stated coarse domain, not preservation of exact ages or five-digit geography.

## Declared subgroups

`utility.subgroups` evaluates cohorts declared in non-correlation workload `groupBy` fields. Engine callers can additionally supply `evaluate(..., subgroup_by=[...])`. The diagnostic is bounded to eight declarations and 64 cohorts; skipped coverage is returned. It does not claim to find every population subgroup.

For each cohort the engine returns source/release counts, observed-label count differences, separate field missingness, applicable task comparisons, and declared correlation-task changes. Verified owner lineage permits exact retention counts without giving that lineage to an attacker. Unpaired label-count changes are never called verified retention. Insufficient source or release support yields `insufficient_evidence`; descriptive counts and confirmed retention remain visible, while research fidelity abstains. `worstSubgroup` reports retention, missingness and query distortion separately.

The rare-cohort suppression regression has 90 common and 10 rare fictional rows. Removing all 10 rare rows with verified lineage returns:

```json
{
  "group":{"group":"rare"},
  "countOriginal":10,
  "retainedCount":0,
  "retention":0.0,
  "cohortCountDifference":-10,
  "status":"insufficient_evidence",
  "queries":[]
}
```

The global-versus-subgroup correlation counterexample keeps two widely separated cohorts globally positively correlated while reversing the association inside both cohorts. The global correlation task passes its tolerance without a sign flip; both declared subgroup correlations reverse, and the worst subgroup query has `signFlip: true` and bounded `normalizedError: 1.0`. Global averages cannot conceal that reported result.

## Units

Pound-source versus released-band comparisons require both protected-unit metadata `units[column]="kg"` and verified conversion metadata `unit_conversions[column]={from:"lb",to:"kg",factor:0.45359237,verified:true}`. Generated transforms supply these owner-side attributes. External CSVs do not acquire them from their labels.

For a verified conversion, original numerical measurements and filter thresholds are converted to kilograms; mean tolerances are scaled by the same factor. Count/rate tolerances remain unchanged. Results expose `comparisonUnit`, `inputUnit`, and `inputTolerance`; converted mean labels explicitly say `[kg; source lb converted]`. Histograms state `unit:"kg"`. Missing or incomplete provenance makes affected queries, histograms and correlations unavailable. No source values or nested source attributes are mutated.

The native-unit filter regression `weight >= 150 lb` returns inclusion bounds `original:[3,3]`, `protected:[2,3]` after verified conversion and five-kilogram banding. It does not interpret the threshold as 150 kg.

## Register and preserved boundaries

`registry.attacks` contains the kit's 26 threat families, with current implementation status, searchable text, sources and legacy engine aliases. `verified_exact_linkage` maps to the `record-linkage` family without creating a 27th family. `protectionCatalog` contains 17 kit protections mapped to current engine methods; `methods` retains the existing executable method IDs, and `engineAnalyses` retains existing finding IDs. `get_registry(search="...")` supports text filtering. Installed wheels load `app/fixtures/kit_catalog.json`; source checkouts fall back to the attributed reference catalog.

pyCANON's installed k/l/categorical-TV checks remain runtime verified. The native engine's missing-sensitive-value category semantics remain explicitly disclosed; they are not silently relabeled as the reference kit's missing-excluded formulation. Anonymeter, membership attackers, reconstruction, persistent DP accounting, synthetic generation, calibrated fuzzy linkage, and general longitudinal protection remain unsupported or separately scoped. Catalog presence is never assessment success.

The 480-row original-kit linkage benchmark and owner-only lineage integration are owned by the data/linkage lane and coordinator. These utility changes preserve source immutability and do not alter that benchmark or optimize secretly against its target counts. Candidate snapshots, search caps and objective definitions remain the existing coordinator/optimizer contract; selection and confirmation are not falsely declared independent.

## Direct verification

```powershell
.venv\Scripts\python.exe -m pytest backend/tests/test_risk.py backend/tests/test_utility.py backend/tests/test_adapters.py backend/tests/test_optimizer.py -q
```

Result after this packet: **32 passed**. Focused regressions cover threshold straddles and aligned boundaries; count/rate abstention; numeric membership and invalid values; semantic versus lexical domain distance; declared category maps; rare-cohort suppression and unpaired retention; hidden subgroup correlation reversals; verified and unverified unit conversion; native-unit threshold/tolerance scaling; 26-family/17-protection catalog coverage; and existing risk/search/pyCANON behavior. This is implementation verification, not a privacy or legal certification.
