# Semantic recognition and Jev

PRISM classifies schema metadata into a versioned ontology before its deterministic privacy pipeline. The semantic result is a suggestion, separate from the researcher's declared column roles. Neither a recognized class nor a Jev probability is a successful privacy attack or a safety guarantee.

## Registry and contract

`backend/app/ontology.json` contains **145 leaf types in 13 families**, with family → subgroup → leaf parents. It covers identity, geography, time, demographics, physical characteristics, medicine, genetics, finance, behavior, relationships, technical metadata, free text, and unknown/mixed content. Anatomical location has an explicit anatomical relationship and is not residential geography.

`app.semantics.ontology()` returns the vocabulary, independent property enums, privacy-role vocabulary and review states. It returns a copy, so callers cannot mutate the registry.

`classify(frame, schema, *, allow_remote=False, overrides=None)` returns a JSON-compatible object with `version`, `ontologyVersion`, `fields`, `provider`, `reviewRequired` and `limitations`. Each field contains:

- Stable `fieldId`, `column`, `primaryType`, primary `family` and additional `families`.
- Independent `properties`: `subjectType`, `personalDataAssociation`, `stability`, `granularity`, `representation`, `temporalRelationship`, `geographicRelationship`, `potentialSensitivity`, `externalMatchability`, `researchRole`, `recordRelationship`, `userConfirmation`.
- Suggested `privacyRoles`, alternative interpretations, classification `source`, exact served `model` and selected-leaf `probability` where available.
- `reviewStatus`, local validation evidence/warnings and a semantic `lineage` reference.

The original frame and schema remain unchanged. Initial lineage preserves the recognized source meaning; the candidate pipeline must annotate transformations and current representations. Current-data measurements remain authoritative.

## Deterministic recognition and corrections

Column aliases, declared types and local formats are evaluated first. Local checks recognize email, UUID, IP, MAC and ISO date representations, measure full-field cardinality, and detect contact-like text. Format scans inspect at most 512 nonempty values per field and are explicitly described as bounded scans. They are not an exhaustive named-entity recognizer.

The synthetic acceptance columns `PAT_ID`, `HOSP_SITE`, `DX_CODE`, `AGE`, `ZIP`, `HT_CM`, `TX_RESP`, `NOTES` resolve without a provider. `DOS` retains encounter/date-versus-dose alternatives until sufficient evidence or a correction exists. Deliberately ambiguous `SITE`, `LOC`, `DOS`, `TX`, `ID`, `STAGE`, `LAT`, `DX` remain reviewable.

Privacy-role hypotheses include plausible alternatives. Incorrect model classifications and researcher corrections cannot erase locally detected identifier evidence or high-cardinality observations. Contradictory date, identifier or declared-unit evidence produces a warning. Independent privacy scans still run.

Corrections map a column name or field ID to an ontology leaf, or to `{primaryType, properties}` using the property enums. Invalid corrections fail before any provider call. Corrections are applied last, marked user-confirmed and retain local evidence. The session/API layer owns persistence and merging with an existing semantic result; provider caches alone are not a durable correction store.

## Provider contract

The adapter uses the current documented **OpenRouter Decisions API**, `POST https://openrouter.ai/api/alpha/decisions`, with pinned **`typesafe/jev-1.14`**. This is the typed decisions endpoint, not chat completions. Stage A asks a broad-family `choice`; Stage B asks a leaf `choice` within that family. Independent person-association and persistence propositions use the `noul` yes/no probability primitive. A maximum of eight ambiguous fields and two logical batches are considered per classification. An HTTP transient-status retry is bounded to one additional attempt per batch.

Output choices, probability ranges/sums and the served model are validated locally. Family and leaf choices below 0.65 abstain. Unknown, missing, invalid and conflicting decisions preserve deterministic suggestions and require review. Multiple answers in one decision call are explicitly **not independent confirmation**. Model confidence and categorical probability describe the interpretation, never a probability of identification.

Only approved minimized schema metadata is transmitted: column labels, declared types, units, locally recognized structural format names and neighboring column labels. No row samples, cells, file paths, arbitrary data dictionaries or free-form schema descriptions are sent. Remote inference requires `allow_remote=True`, `PRISM_JEV_ENABLED=true` and a server-side `OPENROUTER_API_KEY`. Default classification is offline. Exports and frontend bundles do not contain the key.

Set `PRISM_JEV_BUDGET_USD` to lower the default **$0.10 per-server-process** ceiling. Each attempt reserves a conservative input-cost bound using capped request bytes and provider-wrapper allowance. Successful known-cost calls reconcile their reservation; failed calls retain it. The documented pinned-model price is $0.042 per million input tokens with free output. Requests are at most 32 KiB; timeouts are eight seconds with a three-second connection timeout. A bounded 128-entry memory cache avoids duplicate provider calls for identical minimized metadata. Hosted deployment additionally needs its durable session/request ledger; this process counter is **not** a global cross-worker spend guarantee. Provider-side key limits can impose an account-wide ceiling.

Primary sources checked October 17, 2026: [OpenRouter's Jev decisions examples, model version and pricing](https://openrouter.ai/blog/insights/what-is-jev/), [Jev 1.14 model catalog](https://openrouter.ai/typesafe/jev-1.14).

## Direct verification

`python -m pytest tests/test_semantics.py -q` from `backend` passed **17 tests**. Coverage includes ontology parents, the acceptance schema, all eight ambiguous labels, hierarchical typed requests, no cell transmission, cache reuse, deliberately wrong model interpretations, correction precedence, malformed output, probability validation, disabled/missing credentials, exhausted budget, timeout fallback and the eight-field cap.

A real minimal provider check on fictional metadata returned model **`typesafe/jev-1.14-20261014`**. The final two logical requests used 3,270 and 4,513 input tokens and cost **$0.000326886 total**. Repeating the same classification made **zero requests with two cache hits**. Jev supported `STAGE → disease_stage` (0.77) and `LAT → gps_coordinates` (0.89). The other six intentionally ambiguous labels remained unresolved under the 0.65 threshold. This is a small integration demonstration, not a benchmark or accuracy claim. The local rules recognized all eight unambiguous acceptance fields listed above; remote interpretation did not remove any core local evidence.

Sanitized request IDs, usage and classifications are retained locally in ignored `artifacts/jev-live-receipt.json`; no credential is included. This check verifies the provider adapter. Hosted UI integration and release verification are recorded by the release owner.

## Current-output recovery finding

Semantic evidence version 1.1 has **25 categories**. The added `recoverable_value_encoding` test recognizes the explicitly declared PRISM `CI[lower,upper]` encoding in actual output and reports aggregate exact-midpoint recovery counts. It also scans additional external output columns absent from the source schema. Plain shared bins do not activate source-center recovery. For an unknown external mechanism, the finding does not assert that the midpoint was the source value or that a person was identified. Malformed encodings remain unassessed. Centered intervals are retained solely as an explicitly unsafe diagnostic demo, not a protection recommendation.

The [v3 reconciliation](V3_RECONCILIATION.md) records the supplied design's useful integrations and deliberate capability boundaries; the [engine review](v3-review-engine.md) records the implementation and focused checks.
