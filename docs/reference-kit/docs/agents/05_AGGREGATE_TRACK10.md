# Optional independent lane: align with Healthcare Challenge 10

Do not assume the current microdata workbench completes the sponsor brief. That brief asks for an aggregate-only analytic layer over authorized GENIE records. Data access and submission rules must be confirmed with the sponsor. No GENIE patient data are included in this repository.

## Minimal legitimate architecture

Create a separate **recipient** service with no original-row, preview, upload, owner-audit, or unrestricted SQL endpoints. The owner configures datasets, schemas, permitted cohorts, endpoint definitions, contribution limits and release policy. The recipient submits a restricted analysis specification and receives only permitted summaries.

The owner PRISM instance can assess candidate policies using authorized data. Do not deploy its current API behind a different URL and call it aggregate-only: that leaves private owner endpoints accessible.

## Required clinical workload from the supplied brief

For the BPC colorectal cancer cohort, only when the source fields genuinely support it:
- metastatic colorectal cancer cohort counts, stratified by liver involvement;
- six-/nine-month early failure/progression summaries after first-line systemic therapy;
- selected alteration frequencies, including APC, TP53, KRAS/NRAS, BRAF V600E, SMAD4 and MSI/MMR;
- interpretable group comparisons or survival summaries.

Treat unavailable liver status, therapy index, censoring or outcome definitions as missing capability—not an invitation to invent endpoints. Clinical definitions and data dictionaries must be reviewed. A cancer-type label is not enough to infer stage or treatment line.

## Privacy policy

Simple minimum-cell suppression is useful but not sufficient against overlapping/complementary queries. Demonstrate this with the existing differencing fixture. A stronger implementation may use restricted fixed reports or a correctly composed DP query mechanism, depending on required utility and sponsor expectations.

A DP service needs explicit person-level adjacency, bounded contributions, durable transactional budget accounting across all users/restarts, tested noise mechanisms, no seed reset, and review of metadata/errors/previews. Owner-side exact audits cannot be returned to recipients. An empirical “attack did not succeed” result is not a formal guarantee.

## Deliverables and tests

Typed query AST, dataset adapter using authorized schema, explicit missing-endpoint behavior, aggregate result schema, owner/recipient access separation, adversarial differencing/reconstruction/repetition tests, budget concurrency/restart tests where applicable, and a synthetic-only public demo. Record whether actual GENIE data were available and whether the sponsor accepted the data setup.

This lane must not break or delay the main demo. It is a distinct scope decision, not an extra checkbox in the anonymization panel.
