# Public synthetic fixtures

All records are generated demonstrations, with designed statistical relationships and no claim of clinical accuracy. Emails use `example.invalid`. No real patient or public-record dataset is used.

Regenerate from the repository root with `.venv/Scripts/python.exe examples/generate.py`. The fixed seed is 42 and reference date is 2026-10-17; changing today's date does not change the fixture.

`synthetic_oncology/original.csv` and its named alias `oncology_base.csv` contain 5,000 rows. `tiny_oncology.csv` contains the first 12. `auxiliary.csv` provides 500 overlapping synthetic demographic observations with partial missingness and no names, emails, record IDs or owner-only crosswalk. `corrupted_relationships.csv` shuffles response while preserving its marginal counts. `clinical_objectives.json` and `use_case.json` declare units and the research workload. Imported CSV units still require review because CSV does not carry this metadata.

`tiny/expected.json` contains directly calculated reference values for six-row equivalence classes, ten-row homogeneous sensitive groups and two 12-row tables with equal marginals but opposite correlation. These examples illustrate limitations; none authorizes release.

Implemented methods are drop, mask, secret-key HMAC, half-open bands, ZIP prefix, rounding, top/bottom coding, rare-category grouping, date generalization, seeded date offsets, experimental Gaussian/Laplace noise, seeded within-stratum permutation, limited pattern redaction, cell suppression and final capped row suppression. Weight banding requires reviewed kg units or an explicit pounds conversion. Custom redaction patterns support character classes, bounded repetitions and at most one unbounded repetition; groups, alternation and backreferences are rejected. Free-text scanning is incomplete. Pseudonyms retain linkage and secret keys never belong in recipes. There is no differential-privacy guarantee, clinical validation, or automatic legal compliance determination.

Focused checks: `.venv/Scripts/python.exe -m pytest backend/tests/test_data.py backend/tests/test_transforms.py` with `PYTHONPATH=backend` (the repository test configuration may set this automatically).
