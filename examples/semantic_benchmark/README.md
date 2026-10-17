# Fictional semantic privacy benchmark

These **480 records are generated fiction**. They contain no patient records, sponsor data or real appointments. They reproduce PRISM's `datasets.semantic_fixture(n=480, seed=73)` with intentionally ambiguous research labels and designed relationships.

| File | Purpose |
| --- | --- |
| `source.csv`, `source.json`, `source.xlsx` | The same original records in all three supported intake formats. The XLSX has one visible sheet, explicit values and text ZIP codes. |
| `schema.json` | Reviewed demonstration roles, types and units. `HT_CM` is centimeters and `AGE` is years. |
| `recipe.json` | The default candidate's actual transformation recipe; importable through Advanced: recipe JSON. |
| `research-queries.json` | The two selected clinical-style analyses and their tolerances. |
| `external_protected.csv` | An independently coarsened version for an **unpaired** external audit. Do not supply row correspondence or claim its mechanism was inferred. |
| `measured-results.json` | Actual local-API measurements and the external generation settings for independent reproduction. These generation settings are not supplied to the unpaired audit. |
| `external-assessment.json` | An actual exported owner assessment of the external file, including unsupported tests, assumptions and unknown-mechanism lineage. |

## Run the demonstration

1. Start PRISM locally using the repository README. The public hosted application uses fictional bundled fixtures and disables file uploads; these files exercise the local import path. The built-in semantic oncology fixture is the quickest route to the same original data, reviewed schema, default recipe and two research questions.
2. Import `source.csv`, `source.json` or `source.xlsx` as the original. Review the fields against `schema.json`: `PAT_ID` is a direct identifier; `DOS`, `HOSP_SITE`, `AGE`, `ZIP`, `HT_CM` are quasi-identifiers; `DX_CODE` and `NOTES` are sensitive; `TX_RESP` is a research target. Confirm the `HT_CM` unit as cm. The confirmed fictional demo has one row per generated person and entity key `PAT_ID`.
3. Inspect the semantic field meanings. Optional Jev interpretation sends only approved schema metadata. `DOS` is deliberately ambiguous and may remain unresolved; confirm **encounter date** if needed. An abstention is a valid result. The fake contacts embedded in `NOTES` are also detected by independent local pattern scanning.
4. In Research Intent, use the questions in `research-queries.json`: response rate by `DX_CODE`, target `TX_RESP`, positive value true, tolerance 0.05; mean `HT_CM` by `DX_CODE`, tolerance 2 cm. Both use minimum cohort 5. The bundled semantic demo already includes these questions.
5. Evaluate an empty recipe to inspect the original combination, then import `recipe.json` through **Advanced: recipe JSON → Import a recipe** and evaluate. The recipe removes `PAT_ID`/`NOTES`, bands age in fixed 10-year intervals, keeps three ZIP digits, generalizes DOS to month and rounds height to whole centimeters. Inspect both the changed data and the fresh measured findings.
6. Import `external_protected.csv` through the protected-file audit flow, keeping the original loaded. Choose **unpaired microdata**; do not provide lineage or an external recipe. The audit measures the actual file and keeps the generating mechanism unknown.
7. Inspect the clinical questions, unassessed attacks and current candidate. Export the JSON/HTML assessment and recipe. Protected CSV export requires its explicit review acknowledgments and removal of recognized identifiers. The included external assessment is an example of the real JSON export, without raw row previews or private row correspondence.

## Actual results

These values were computed through real local API imports, reviewed schema, candidate evaluation and an unpaired external audit. CSV/JSON/XLSX source values were checked for equality.

| Current release | Unique rows in the tested combination | Response-by-diagnosis error | Height-by-diagnosis maximum mean error |
| --- | ---: | ---: | ---: |
| Original | 480 / 480 | 0 | 0 cm |
| Default recipe | 96 / 480 | 0 | 0 cm |
| External file | 0 / 480 | 0 | 1.2 cm |

The original/default combination is `DOS + HOSP_SITE + ZIP + AGE + HT_CM`. ZIP is absent from the external file, so its measured combination uses the four remaining fields. The response error is an absolute rate difference; height error is the maximum absolute cohort-mean difference. The external height error remains within the declared 2 cm tolerance. Exact results, query statuses and limitations are in `measured-results.json`.

**Zero unique rows in this tested sample is not zero privacy risk.** Population identification, external record linkage, membership inference, prior-release composition and other attacks need their own evidence. These figures establish the stated finite-table comparison and selected scientific queries only. They do not certify anonymity, release authorization or legal compliance.
