# Methods, attacks and integration coverage

`GET /v1/registry` is the machine-readable current registry, including source links, applicability, assumptions and limits. `implemented` describes the listed scoped calculation, `partial` describes limited coverage, and `unsupported`, `error` or `not_applicable` must never be counted as successful assessment.

## Transformation recipe reference

A step has `method`, `columns` and `params`. Unknown parameter keys, incompatible reviewed types and missing/previously dropped columns are rejected. Steps run in order on a copy. Fixed seeds reproduce non-DP random transformations. Lineage is returned internally and is not recipe content.

| Method | Parameters | Behavior and limits |
|---|---|---|
| `drop` | `{}` | Remove selected columns; later steps cannot reference them |
| `mask` | `value`, default `[masked]` | Replace each nonmissing selected value with one string |
| `pseudonymize` | `namespace`, default `prism` | Full SHA-256 HMAC token over namespace, column, scalar type and value; external key required, never a step parameter |
| `band` | Positive `width`; optional `origin=0`, `convertFrom:"lb"` | Half-open `[a,b)` numeric intervals, including correct negative intervals; weight bands require kg or explicit pounds conversion |
| `zip_prefix` | Integer `length` 1–5 | Prefix of a five-digit string ZIP, optionally ZIP+4; preserves leading zeroes and does not imply legal compliance |
| `round` | Integer `decimals` −10…10 | Numeric rounding, distinct from interval bands |
| `top_bottom` | `min` and/or `max` | Clip numeric extremes; lower bound must not exceed upper |
| `rare_group` | `min_count` ≥2; optional `label="Other"` | Merge nonmissing categories below the individual-column count threshold |
| `date_generalize` | `precision`: year, quarter, month or day | Replace dates by the specified calendar label |
| `date_shift` | Integer `days` 0…36500 | Independent seeded per-record date offsets in inclusive `[-days,+days]`; intervals/chronology can change |
| `noise` | Nonnegative `scale`; `distribution`: gaussian or laplace | Experimental seeded numeric perturbation; not DP, plausibility bounds are not imposed |
| `permute` | Optional `strata:[]` | Independently shuffle target columns inside declared strata; targets cannot be stratum keys; joint relationships can be destroyed |
| `redact` | Optional `pattern`, `replacement` | Limited selected-text scanner; default email/US SSN/phone patterns, incomplete PHI coverage |
| `suppress_cells` | `fraction` 0–1, default 1 | Seeded selection of floor(N×fraction) cells in each selected column, replaced by missing values |
| `suppress_rows` | `qi`, `k`, `max_fraction` | Remove classes smaller than k, reject cap excess/all-row removal, and verify final sample k; must be final step |

Weight conversion uses `kg = lb * 0.45359237`. Imported generic weight has no inferred unit; selecting kg without confirming source units is an owner error the engine cannot independently detect. Recipe bands contain labels, not recoverable exact measurements. Custom redaction patterns are limited to a small regex subset: no groups, alternation or backreferences; at most one unbounded repetition; bounded counts at most 1000. This is not a comprehensive document scrubber.

The baseline drops declared direct identifiers and applies age width 5, ZIP length 3 and weight width 5 kg. It does not silently remove every other risky field. Review birth dates, free text, unusual columns and the actual declared QI set.

## Native disclosure coverage

| Family | Coverage |
|---|---|
| Exact QI uniqueness, minimum k, sample guessing and entropy | Implemented for declared retained QI, including explicit missing category |
| Knowledge subset exposure / rare conjunctions | Exhaustive through ten QI; bounded 128 subsets above ten with coverage disclosure |
| Sensitive homogeneity, distinct l and categorical t-distance | Native exact table calculations; categorical TV definition, no continuous t claim |
| Sensitive inference | Partial: in-sample modal guessing plus separate fixed-split within-release majority diagnostic; no smoothing, independent population calibration or incremental-release claim |
| Direct identifiers | Partial structured name/format suggestions plus reviewed role/export gate; misses identifiers and free text |
| Auxiliary linkage | Partial fictional exact-match demonstration; no probabilistic or real external-data linkage service |
| Composition and aggregate differencing | Partial executable counterexamples, not general production audit/accounting services |
| File metadata | Partial CSV/index/export checks; no spreadsheet hidden-sheet or embedded-document parser |
| Longitudinal trajectories, genomics, generator membership | Unsupported |

## Library and release-mode status

pyCANON 1.3.6 is the optional executable integration. When installed, runtime status attempts native-versus-package k/l/categorical-TV smoke checks on standard and null-containing fixtures. The API exposes both `installed` and `runtimeTested`; failed smoke checks are `error`. The package audits properties and does not transform data.

SDMetrics, Anonymeter and OpenDP expose availability/status descriptions but have no executed adapter. The synthetic attack guard rejects absent training/release/control tables or unverified train/control disjointness, then still returns unsupported because attack execution is not implemented. ARX and sdcMicro have no Java/R bridge. Microaggregation, PRAM, l/t enforcement, trained synthetic generation, formal DP mechanisms/accounting, encryption services and controlled enclave operation are roadmap items.

Only `row_release` is implemented as a release workflow. External `synthetic` audit mode means descriptive comparison with a synthetic-specific uncovered-attack warning. `aggregate_query` and `controlled_access` are not production services, even though the lab explains why those deployment choices need careful design.

## Source context

The preserved [master architecture](spec/PRISM_MASTER_ARCHITECTURE.md) supplies the research bibliography. Runtime entries link to [NIST SP 800-188](https://csrc.nist.gov/pubs/sp/800/188/final), [pyCANON](https://github.com/IFCA-Advanced-Computing/pycanon), [ARX](https://github.com/arx-deidentifier/arx), [OpenDP](https://docs.opendp.org/en/stable/), [Anonymeter](https://github.com/statice/anonymeter) and other primary projects. These references motivate the implemented scope; a project link is not evidence that its integration ran here.
