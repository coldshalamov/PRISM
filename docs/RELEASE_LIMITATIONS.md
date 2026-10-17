# PRISM 0.1.1 capability boundaries

PRISM is a working desktop-style privacy/utility proof of concept. The hosted Archie application accepts real CSV, JSON and single-sheet XLSX tables, supports external protected-file audit, and runs actual deterministic calculations. Labeled fictional examples are optional. Its results describe measured table behavior under stated assumptions; they do not constitute an anonymity certificate or an approval to publish.

## Operational scope

Archie serves the public entry and Core stores uploaded original file bytes plus visitor session configuration. Vercel serves assets and Python computation. Hosted intake is 3 MiB per file, 100,000 rows and 80 columns, with eight datasets, 40 candidates, four searches and 24 evaluated recipes per search. Local loopback intake is 50 MB. This is a bounded interactive application, not a distributed large-data service.

Clear session deletes the visitor's session and owned uploaded records. Thirty minutes of inactivity expires the session; cleanup occurs when the expired visitor returns. Abandoned records are not claimed to be proactively purged. The main workflow has no account/login or permission checklist. The legacy Docker fictional-only adapter has a separate purpose and does not describe the current public product.

JSON record tables and single-visible-sheet, values-only XLSX are supported; formula cells and unsupported workbook structures are rejected. ZIP leading zeroes are preserved. Units still require review: weight is kilograms or explicitly converted pounds. There is no document-container, DICOM, genomic or general embedded-metadata scanner.

## Scientific interpretation

- Sample uniqueness and group sizes use declared retained fields and record grain. They are not population re-identification probabilities; repeated visits are not distinct people.
- A large group can still reveal a homogeneous sensitive value. Current categorical inference, diversity and total-variation diagnostics have declared finite-table scope; l/t enforcement and independent population calibration are not provided.
- Subset exploration and recipe optimization are bounded. Search evaluates real candidates but does not establish a global optimum or test every possible attack.
- Utility follows selected questions, tolerances, units and cohort support. Interval midpoints approximate numeric output. Preserved means or marginal distributions do not prove preserved scientific relationships.
- Centered integer intervals preserve the exact source midpoint and earn no coarsening credit. Shared fixed bands are a different representation. Seeded noise/permutation are experimental, not differential privacy; no DP accountant is supplied.

## Semantics, audits and exports

Optional Jev interprets schema metadata. Its primary action prepares a current metadata digest and makes the requested call; View model input is read-only and optional. Source rows are not sent. Suggestions can abstain or be wrong, so deterministic identifier checks stay independent and confirmed user corrections take precedence. Probability metadata is not a privacy probability. Slider changes and replay do not call Jev. The configured budget ceiling is per process, with additional durable visitor attempt limits.

External files remain unpaired unless the owner supplies valid correspondence. Such correspondence is an owner assertion, not an inferred attacker resource. Column mapping does not establish units, row identity or the producing protection algorithm. The unknown external mechanism stays unknown; descriptive and executable query comparisons remain useful without pairing.

Direct CSV download uses the selected current frozen candidate with recognized-identifier and version guards, without the former three-box acknowledgment flow. Reports exclude table previews, private correspondence and HMAC keys; recipes and aggregate findings remain inspectable. Heuristic pattern scans do not identify every free-text disclosure, and pseudonyms preserve joins within their key/namespace.

Specialist auxiliary-record, longitudinal/genomic, trained synthetic membership/inversion, prior-release composition and query-history attacks require artifacts and implementations not supplied here. They remain explicit coverage gaps, not passes. Educational Attack Lab examples are labeled demonstrations. ARX/R bridges, production enclave services, synthetic generation and formal DP accounting are not installed features.

The final shipped revision, focused test results and public-browser outcomes are in [delivery status](../artifacts/DELIVERY_STATUS.json), [verification](../artifacts/verification.md), [v3 reconciliation](V3_RECONCILIATION.md) and the release checklist. Earlier test/review totals are historical checkpoints, not automatic approval of later code.
