# PRISM 0.1.1 maintainer handoff

PRISM is a desktop-style privacy/utility workbench for the Enterprise AI hackathon track. The hosted proof of concept supports real CSV, JSON and single-sheet XLSX imports, source/candidate comparison, external protected-file audit, deterministic assessments and direct downloads. Labeled fictional fixtures remain available. Imported data is not labeled fictional merely because it runs on the public host.

Canonical application: [PRISM on Archie](https://41d0bdfd-0065-4b0b-a973-efbe1c1a9c5e.archie.site/). [Repository](https://github.com/coldshalamov/PRISM), [pitch](https://prism-healthcare-taupe.vercel.app/pitch/), [release](https://github.com/coldshalamov/PRISM/releases/tag/v0.1.1). The final immutable asset revision, publication and browser acceptance are recorded in [delivery status](../artifacts/DELIVERY_STATUS.json) and [verification](../artifacts/verification.md); source readiness alone does not mean a revision has been published.

## Runtime map

- Archie serves the saved static HTML entry and is the application origin.
- Vercel serves pinned JS/CSS/fonts and the Python `app.serverless_demo:app` API.
- Archie Core Postgres/GraphQL stores each visitor's compact session configuration plus uploaded original file bytes in separate `kind: dataset` records, gzip-compressed and base64-encoded. Uploaded tables and external protected tables can therefore replay after a Python cold start. This encoding is storage representation, not an encryption claim.
- `app.main:app` is the local loopback workbench; tables stay in that process. `app.hosted_demo:app` and Docker are a legacy fictional-only, memory-based adapter, not the current Archie product.

The current hosted limit is **3 MiB per input file**, 100,000 rows, 80 columns, eight datasets, 40 candidates, four searches and 24 candidates per search. Local file intake allows 50 MB with the same row/column limits. Clear session removes the visitor's session and owned upload records. After 30 minutes of inactivity the session expires; returning with the expired session triggers cleanup. There is no claimed proactive purge of abandoned records.

## Core ownership and invariants

`datasets.py` / `structured_intake.py` parse tables; `transforms.py` copies source data before ordered transformation; `risk.py`, `semantic_rules.py` and `utility.py` calculate evidence; `optimizer.py` evaluates a bounded recipe set. `serverless_demo.py` reconstructs these same engines from Archie-backed state; `archie_store.py` handles storage. Frontend `workspace.tsx` owns revision and candidate state; `draftPreview.ts` shows supported preview changes without pretending a full assessment is complete.

Keep immutable candidate snapshots, semantic revisions, source preservation, actual utility results, explicit unsupported coverage, and the owner/attacker alignment boundary. An unpaired audit does not invent row correspondence or infer the external algorithm. Direct CSV download uses the selected current frozen candidate and existing recognized-identifier/version guards; the main path has no account/login or three-acknowledgment checklist.

Optional Jev interprets schema metadata through OpenRouter. The primary Interpret action prepares a current metadata digest and makes the requested call; View model input is an optional read-only inspection. Source rows are not sent to Jev. It is absent from slider changes, core statistical calculations and replay. User-confirmed corrections stay authoritative; model failure leaves deterministic checks available.

## Build and handoff

Use Python 3.11/3.12, Node 20.19+ or 22.12+, locked dependencies, `setup.ps1` and `start.ps1`. Local deterministic use needs no cloud credentials. Run focused checks appropriate to a change; `npm run build --prefix frontend` builds production assets. `scripts/package.py` creates the wheel/source handoff after that build. The final package check is in [LOCAL_PACKAGE_VERIFICATION.md](LOCAL_PACKAGE_VERIFICATION.md).

The actual Archie Core upload probe passed all three formats, cold replay, external audit and deletion of all four uploaded records in 17.03 seconds. Its 480-row example produced 96 unique protected rows; the separate external release had zero unique rows and height-query error 1.2 cm. These bounded results are not a population-risk claim or public-browser acceptance. See `artifacts/v3-real-core-receipt.json` and the final verification record.

Read [v3 reconciliation](V3_RECONCILIATION.md), [frontend handoff](FRONTEND_HANDOFF.md), [deployment](ARCHIE_DEPLOYMENT.md), [limitations](RELEASE_LIMITATIONS.md) and [hackathon requirements](HACKATHON_REQUIREMENTS.md). Historical test/review counts apply to their named earlier commits, not automatically to 0.1.1. Root release/status documents identify the final accepted revision. Save the Enterprise AI submission draft; do not submit without the user's instruction.
