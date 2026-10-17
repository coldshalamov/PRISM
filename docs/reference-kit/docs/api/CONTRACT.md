# Frontend/API result contract

Use `openapi.json`, `backend/prism/models.py`, and `examples/default_request.json` for exact request fields. The result format is `0.1`; arbitrary dictionaries in FastAPI's generated response schema do not replace this semantic contract.

## Evaluation snapshot

```
format_version
label, recipe, columns, threat, queries
candidate_rows, candidate_columns, suppressed_rows
canonical_candidate_sha256
privacy { equality_classes, linkage, sensitive_groups, pii,
          column_ablations, unit, warnings, coverage,
          formal_privacy_guarantee, release_status }
utility { fields, histograms, correlations, tasks,
          task_coverage, weighted_task_loss, rows_retained_fraction, notes }
preview                       // owner-side, at most 50 rows
warnings, notice
variant_id                    // API-added session handle
```

Do not infer measured values from absent fields. Statuses include `measured`, `not_assessed`, `not_applicable`, `insufficient_data`, `unavailable`, and search-specific `infeasible`. `measured` does not mean passed. Formal guarantees are absent in the core; release status stays `review_required`.

The currently displayed form is not necessarily the report's form. Render explanations from the frozen recipe/threat/columns/queries snapshot. A form change invalidates export until evaluation or explicit selection of an already evaluated snapshot. Imported audits have `recipe: null`; do not pretend to reconstruct their transformation procedure.

## Optimization

Each point supplies its actual recipe, status, tasks and objectives. An objective triple is `[verified_unique_linkage_fraction, weighted_task_loss, row_loss]`, all minimized. `nondominated: null` means insufficient comparable evidence. A null objective must not become zero in JavaScript (avoid `value || 0` and `Number(null)`).

The chart projects only two dimensions; the inspector must retain the third and the threat/workload scope. Optimizer results are not candidate export handles. Apply/evaluate a point to create a session variant; a future frozen candidate store may replace this protocol.

## Exports

`POST /api/export` returns CSV bytes, not JSON. It requires a current variant handle, three acknowledgments, review note and formula-neutralization choice. Read the response as a Blob. `X-PRISM-Export-SHA256` is the hash of actual exported bytes, unlike the snapshot's canonical serialization digest. Neither hash proves privacy.

`GET /api/report/{id}` returns **owner-confidential** JSON including exact source statistics. It is a different artifact and must not be automatically bundled with recipient data. Frontend evidence drawers are also owner-side views.

## Transport

Source/candidate uploads use a raw file body with `Content-Type: text/csv`, not multipart/base64. Session headers are in-memory. Errors use `{detail: string}` without rejected data. Display errors as text. No CORS wildcard, remote endpoint fallback, browser telemetry, service-worker caches, or external scripts.
