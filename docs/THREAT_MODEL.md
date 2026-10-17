# Threat model and local trust boundaries

PRISM measures selected properties of a declared candidate **row release**. Its results describe the inspected finite table, under the observations and assumptions stated below. They do not authorize publication.

## Protected objects and observers

- The source table, direct identifiers, schema review, session HMAC key and owner-supplied lineage stay within the local service/browser workflow.
- A modeled row-release observer sees the candidate's released fields, knows that a target is present and knows the declared QI values correctly. The exact-match model gives all source rows equal prior weight and treats one row as one person.
- Primary sensitive inference uses the released table's categorical distributions. Its baseline is the global modal sensitive value. A separate fixed-split diagnostic trains conditional/global majorities on training rows and compares them on held-out rows from that same release. Neither models the observer's independently acquired prior or measures incremental disclosure from publishing the release.
- A researcher defines the analysis workload and its tolerances. Private lineage may validate owner-side alignment; it is never used as an attacker input or included in an evidence export.

Wrong membership, noisy external facts, repeated-person records and real-world population frequencies require another model. The prototype does not estimate them.

## Local application boundary

`prism` binds `127.0.0.1:8000`. Application middleware accepts loopback hostnames, restricts browser origins to the configured local development/application origins, rejects cross-site browser requests, limits upload size and adds no-store and browser security headers. Client-supplied filesystem paths are not opened. Vite development mode binds loopback and proxies local API routes.

The application code does not send imported tables to a cloud service, call paid APIs or load trained models. Python/npm installation contacts package registries. There is no operating-system network-egress sandbox: do not equate application behavior with a machine-wide network guarantee.

DataFrames, candidates, job results and the HMAC key are held in process memory. The raw source is not written into an application database or routine request log. The launcher disables access logs, and request-validation responses omit rejected input values. File uploads, browser processing, OS memory/swap, crash tooling and user downloads are separate persistence surfaces; the prototype does not promise forensic erasure.

This is a **single-user trusted-machine** boundary. There is no login, authorization boundary between local users, encrypted storage, TLS termination, enclave or protection against a malicious local process. Do not host it publicly or treat loopback as an authenticated multi-user service.

## Release and export boundary

The original table is intentionally visible in the local workbench. Candidate previews are also local row-level observations. They are not the content of the portable evidence report.

CSV export blocks columns classified as direct identifiers and re-profiles unexpected output columns. It omits the source index and escapes spreadsheet formula-like string cells. These checks cannot recognize every identifier or establish that a file is safe. Tokenizing or masking a field does not automatically remove its reviewed direct-identifier role; dropping it is the supported way to satisfy the export gate.

JSON/HTML reports exclude table previews, internal DataFrames, row lineage and HMAC keys. They include schema, workload, aggregate query labels/results, dataset display name, metrics, recipe, assumptions, package versions and coverage. API research queries cannot target, group by or filter reviewed direct-identifier fields. Small or misclassified identifying cohort definitions and aggregates may still be sensitive. Review report content and downloaded CSVs before sharing. A report is evidence for human review, not a privacy-preserving publication mechanism.

## Covered and uncovered threats

Covered diagnostics include exact sample singling out, rare QI conjunctions, categorical sensitive homogeneity and in-sample categorical guessing. Limited structured-name/format checks and selected-field redaction assist manual review. Attack Lab examples calculate how exact overlapping counts, combined fictional releases or destructive permutations can create problems.

No operational external public-record matching, independent population inference calibration, genomic linkage, sequence/trajectory uniqueness, trained-generator membership attack, general cross-release audit, reconstruction engine or formal DP accounting runs. Free-text recognition is incomplete. The runtime registry distinguishes partial, unsupported and error statuses from executed calculations.

## Decisions that stay with the data owner

Confirm the row unit, membership assumptions, field roles, units, research questions and relevant outside knowledge. Account for prior releases and institutional/consent obligations. If row-level dissemination is unjustified, consider governed controlled access or a separately reviewed aggregate query mechanism. PRISM supplies neither of those production systems in this version.
# In-flight clearing

Session epochs prevent a candidate, import or search started in an older session from adding results back after clearing. An in-flight bounded calculation may finish before its local references are reclaimed; clearing does not promise RAM zeroization, cancellation of every computation, or deletion of exported files.
