# Release limitations

**Not cleared for release.** PRISM is a synthetic-data demonstration and a scoped privacy/utility diagnostic prototype. Sample metrics, constraint passes, frontier membership, a report download and successful CSV export do not establish anonymity, HIPAA compliance or publication approval.

## Interpretation limits

- Exact-match risk assumes one row per person, known target membership, correct observed QI and a uniform prior. It is not a population re-identification probability.
- k limits distinguishability under the chosen retained QI. A k≥5 group may still reveal one sensitive value for every member. Omitted fields and outside knowledge can change the result.
- Primary inference is categorical, in-sample and unsmoothed. Rare groups can overstate apparent predictive accuracy. A separate train/test split diagnostic uses training-only class majorities with a five-observation minimum and global fallback, then scores held-out rows in the same release. It does not establish independent population accuracy or incremental disclosure; optimizer split reuse can overfit. Continuous numeric sensitive targets with more than 20 distinct values are unsupported.
- Categorical t-distance is total variation, not continuous EMD or a universal confidentiality guarantee. l/t auditing is available; l/t enforcement is not.
- Beyond ten QI, subset coverage is bounded and order-dependent. The displayed smallest distinguishing subset is only among tested combinations.
- Workload loss depends on user-chosen questions, tolerances and cohort minima. Midpoints approximate binned numeric data. Preserved marginals do not establish preserved scientific relationships.
- Search explores a finite deterministic library, not all mechanisms or all attacks. Protected analytical targets are preserved by automated search, but manually supplied recipes can alter them. No held-out population attacks, universal optimality or additive information-value attribution is claimed.

## Operational and data limits

Use fictional/synthetic demonstration data on a trusted local computer. The service binds loopback, restricts browser origins and keeps its working tables in process memory; it has no authentication, per-user isolation, encrypted database, secure memory erasure, machine-wide egress policy or production health-data deployment controls. Public hosting/tunnels are outside this design.

CSV only: no spreadsheets, hidden sheets, arbitrary metadata, document attachments or genomic/sequence parser. Intake is bounded to 50 MB, 100,000 rows and 80 API columns. The process session holds at most eight datasets and 160 candidates. Large exact subset maps and searches are synchronous and may take time; this is not a distributed compute service.

Role and type suggestions require owner review. ZIP leading zeroes are preserved, but imported CSV does not carry trusted unit metadata. Weight must be reviewed as kg or explicitly converted from lb before kg bands. The default three-digit ZIP operation does not evaluate population exceptions or establish Safe Harbor.

Pattern redaction misses unstructured identifiers. Reviewed direct-identifier columns block CSV export even after masking/tokenization. Unknown or misclassified identifiers may escape heuristic checks. Pseudonyms remain linkable within the same key/namespace. Session clearing rotates that key; the secret is intentionally absent from recipes, so a downloaded HMAC recipe alone cannot reproduce the same tokens in a fresh session.

Seeded noise, date offsets and permutation are experimental non-DP demonstrations. They may create outliers, implausible values, changed chronology or false person-level associations. There is no secure DP randomness protocol or privacy accountant.

## External comparisons and exported evidence

Separately imported files are unpaired unless the owner explicitly supplies unique valid original row offsets in paired mode. Validating that shape does not independently prove the owner's provenance claim. Utility remains an aggregate comparison; no patient-level causal change is asserted. Column mapping does not prove algorithm provenance, unit equivalence or row identity. Review both files' actual units and encodings before comparing them.

Synthetic audit mode runs descriptive diagnostics and marks unimplemented attacks unsupported. It does not execute Anonymeter or prove train/control disjointness. Learned synthetic generation, membership/memorization evaluation and DP synthetic release are not provided.

Reports exclude raw table previews, internal row alignment and HMAC keys. The API rejects research target/group/filter references to reviewed direct identifiers. Dataset display names, schema, other query definitions, cohort labels and aggregate values remain. Small cohorts, filters and misclassified identifying labels can themselves disclose information; review reports before sharing. Reports do not include a complete audit trail, input-file fingerprint, independent expert determination or general prior-release analysis. Downloaded files persist until the user removes them.

When the proposed sharing is unjustified by the evidence, use a governed enclave or a separately reviewed aggregate-query mechanism instead. Those are governance alternatives, not systems supplied by this prototype.
