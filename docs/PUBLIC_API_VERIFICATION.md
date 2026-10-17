# Direct public API verification

Outcome: **passed**. Canonical URL: [PRISM public demo](https://prism-healthcare-taupe.vercel.app).

The public 5,000-row workflow returned 24 evaluated candidates and 6 frontier
members. The 24-candidate search returned HTTP 200 with a 2,030,705-byte body.
JSON, HTML, recipe, and protected CSV exports were valid; CSV contained all
5,000 data rows and omitted `record_id`, `name`, and `email`. The chosen frontier
candidate still failed `min-k` and `max-unique`, remained infeasible, and was not
cleared for release. Successful download did not change those findings. Only
this verification visitor's session was cleared at the end.

Ran 2026-10-17T19:11:22.774030+00:00 through 2026-10-17T19:12:03.135732+00:00 against the deployed public service with one fresh visitor and an exact same-origin Origin header. Only the bundled architecture fictional fixture was used. Durations below are informational request timings, not a performance benchmark.

| Request | HTTP | Body bytes | Seconds |
| --- | ---: | ---: | ---: |
| load_architecture_fixture | 200 | 10119 | 3.906 |
| confirm_same_schema_and_person_declaration | 200 | 10119 | 0.297 |
| create_default_candidate | 200 | 87818 | 1.531 |
| search_24_candidates_on_5000_rows | 200 | 2030705 | 26.25 |
| retrieve_chosen_comparison | 200 | 87916 | 1.563 |
| export_json | 200 | 331178 | 1.578 |
| export_html | 200 | 424005 | 1.625 |
| export_recipe | 200 | 896 | 1.578 |
| export_csv | 200 | 275675 | 1.672 |

Aggregate results:

```json
{
  "fictionalFixtureRows": 5000,
  "directIdentifierColumns": [
    "record_id",
    "name",
    "email"
  ],
  "schemaUnchangedAndPersonDeclarationConfirmed": true,
  "defaultCandidate": {
    "rows": 5000,
    "directIdentifiersRemoved": true,
    "releaseCleared": false,
    "researchQueries": 3
  },
  "publicSearch": {
    "evaluated": 24,
    "returnedCandidates": 24,
    "frontierCount": 6,
    "cap": 24,
    "termination": "cap_reached",
    "status": "completed"
  },
  "chosenComparison": {
    "rows": 5000,
    "frontierMember": true,
    "feasible": false,
    "failedConstraintIds": [
      "min-k",
      "max-unique"
    ],
    "releaseCleared": false,
    "constraintsPreservedOnReplay": true
  },
  "exports": {
    "json": {
      "downloadAttachment": true,
      "formatValid": true,
      "sourceRows": 5000,
      "constraintsPreserved": true,
      "releaseCleared": false,
      "containsRawPreview": false
    },
    "html": {
      "downloadAttachment": true,
      "formatValid": true
    },
    "recipe": {
      "downloadAttachment": true,
      "formatValid": true,
      "matchesChosenRecipe": true
    },
    "csv": {
      "downloadAttachment": true,
      "formatValid": true,
      "dataRows": 5000,
      "columnCount": 9,
      "directIdentifierHeadersAbsent": true,
      "requiredAcknowledgmentsSent": 3
    }
  },
  "exportDoesNotClearConstraintsOrRelease": {
    "failedConstraintIdsRemainInJson": [
      "min-k",
      "max-unique"
    ],
    "releaseCleared": false,
    "csvExportWasAllowedAfterAcknowledgments": true
  }
}
```

Cleanup:

```json
{
  "httpStatus": 200,
  "responseBodyBytes": 16,
  "elapsedSeconds": 0.172,
  "ownVisitorCleared": true
}
```

The chosen comparison was fetched once; the full search job was not replayed. Exports were parsed in memory and discarded. No cookies, credentials, raw reports, rows, or visitor IDs were written to the evidence files. This verifies the direct public API route only; it does not establish browser interaction acceptance or independent external-data privacy protection.
