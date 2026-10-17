# Supplied hackathon kit: baseline and integration

The user supplied `C:\Users\93rob\Downloads\PRISM-hackathon-kit.zip` after the initial application build. It is an existing working foundation, not a specification-only document. Its source, fixtures, tests, catalog, documentation, screenshots and original Apache-2.0 notices are preserved separately so its results can be compared with the current application without overwriting either implementation.

## Provenance and extraction

Archive SHA-256:

```text
5d549a2e3e8c44c1257d8470b48b4656e4846c7f9bb234420a65474c69d3db83
```

All 82 archive entries were inspected before extraction. Absolute paths, traversal components, colon-bearing paths, symbolic links, targets outside the intended directory and existing target files were rejected; the uncompressed size was bounded. The original tree is under `reference-kit/PRISM/`. No original application file was patched. The root-coordinator's documentation/catalog copies under `docs/reference-kit/` are a separate convenient reference.

Unmodified benchmark CSVs, original request/report and exact LICENSE/NOTICE copies are under `examples/kit_benchmark/`; `PROVENANCE.json` records per-file SHA-256 values. The original source is Apache-2.0. The new `backend/app/linkage.py` adaptation carries its own Apache-2.0 SPDX/attribution header and refers to the preserved original `backend/prism/privacy.py`. The root project's license does not replace those upstream terms.

## What was executed

The original package's complete **61-test backend/API suite passed** in isolation from the current application's `app` package. Pytest used the original `pyproject.toml` and original backend path. One Starlette/httpx TestClient deprecation warning occurred. No packages were installed or changed for this check.

This reused the current environment: FastAPI 0.143.3, Uvicorn 0.54.0, Pydantic 2.13.5, pandas 2.3.3, NumPy 2.0.2 and SciPy 1.15.3. FastAPI/Uvicorn exceed the original kit's declared upper ranges (`<0.130` / `<0.50`). The observed pass demonstrates compatibility in this environment; it does not claim that the original declared installation ranges or every supported Python version were freshly installed and tested.

The original engine was then invoked with the original CSV/request and seed 42. The current transform/utility engines and new verified matcher independently reproduced the relevant benchmark using an explicit compatibility adapter:

| Configuration | Verified unique correct target matches | Matching fraction | Research-task results |
|---|---:|---:|---|
| Age width 5 / ZIP prefix 3 / weight width 5 kg | 75 of 480 | 0.15625 | All three within tolerance |
| Same numeric settings, ZIP removed | 20 of 480 | 0.0416666667 | All three within tolerance |

The fictional overall six-month failure rate is 0.3625. The liver-subgroup rate is approximately 0.4502617801 over 191 observations. Age–weight correlation changes from approximately 0.6951518369 to 0.6893257140, an absolute error of 0.0058261228 against tolerance 0.05. Removing ZIP leaves these task outputs unchanged. The current workload loss is approximately 0.038840819 in both cases; it is a purpose-specific normalized-error calculation, not a scientific-validity percentage.

`examples/kit_benchmark/default_report.json` is the supplied historical artifact. `reproduction.json` is the newly executed aggregate result with environment details. The original suite checks the original API; those 61 tests must not be presented as tests of the current React/FastAPI application. Original screenshots and offline browser receipts likewise describe the original starter, not the current frontend's browser acceptance.

## Compatible fixture loader

```python
from app import linkage, transforms, utility

fixture = linkage.kit_fixture()
source = fixture["frame"]
protected, lineage, _ = transforms.apply(
    source, fixture["schema"], fixture["defaultSteps"], seed=42
)
finding = linkage.evaluate(
    source, protected, fixture["schema"], fixture["defaultSteps"], lineage,
    qi=fixture["qi"],
)
research = utility.evaluate(
    source, protected, fixture["schema"], fixture["defaultWorkload"], lineage=lineage
)
assert (finding["numerator"], finding["denominator"]) == (75, 480)
assert all(query["pass"] for query in research["queries"])
```

`kit_fixture()` returns `frame`, `schema`, `defaultSteps`, `defaultWorkload`, `qi`, `sensitive`, `name`, `synthetic` and `provenance`. Original field names are preserved, including `weight_kg`, `KRAS`, `liver_metastasis` and `failure_6m`. The adapter confirms kg from the supplied schema rather than guessing units. It maps the original failure-rate, liver-subgroup failure-rate and age–weight correlation queries into the current workload grammar.

The API exposes this fixture at `GET /v1/demo?fixture=kit`. The loader first looks for `app/fixtures/kit_benchmark` inside an installed package, then uses `examples/kit_benchmark` in the source checkout. Distribution packaging must include the fixture, request and retained Apache LICENSE/NOTICE; the fallback is not a claim that arbitrary wheel layouts already include them.

The original recipe shuffles output rows. The current baseline transform recipe preserves row order, while the new matcher ignores row order and accepts explicitly reordered owner lineage. This difference does not alter these linkage counts or aggregate research answers. The original protected CSV is retained for provenance; it is not falsely represented as byte-identical to a fresh current-engine candidate.

## Verified matching boundary

`linkage.evaluate(original, protected, schema, steps, lineage, *, qi=None, membership_known=True)` returns one finding with `attackId:"verified_exact_linkage"`. Its `numerator`, `denominator` and `metricValue` are actual verified unique correct matches, original target count and their fraction. Additional outputs are aggregate matched/ambiguous/unmatched/incorrect-match counts, suppressed targets, a uniform random-tiebreak comparator, coverage and limitations. No per-target keys, examples, offsets, match positions or private crosswalk are returned.

The matcher first receives only the source targets' declared known QI, the released QI columns and public deterministic operations. It forms target signatures and candidate sets without a lineage argument. **Only afterward** does the scorer use owner lineage to check whether a uniquely matching candidate is actually the retained source target. Altering lineage changes correctness scores while leaving the attacker's candidate counts unchanged; regression tests exercise this distinction. Suppressed targets remain in the original-source denominator.

Replay supports public row-local drop, mask, bands, ZIP prefix, rounding, clipping and date generalization. A random, secret, data-dependent or unsupported method on a surviving known field returns `not_applicable`, with unavailable numerator/metric rather than a favorable zero. Noise, permutation, date shifts, pseudonyms, cell suppression, redaction and unsupplied rare-category codebooks therefore abstain. Random operations confined to fields outside the attacker-known QI do not invalidate an otherwise replayable attack.

Unknown membership, absent owner lineage, an unknown external recipe (`steps=None`), empty inputs or no surviving known QI also abstain. An explicit empty recipe list means a known identity transformation, not an unknown external algorithm. Caller-supplied lineage must contain exactly one unique in-range source offset per released row. The current API coordinator decides when that provenance is available; supplying a compatible file shape does not establish it.

Computations are bounded to 100,000 source/release rows, twenty known fields and one hundred recipe steps. Candidate lookup uses signature counts rather than a quadratic target-by-release scan. Tests cover the vulnerable fixture, an ambiguity-only zero-unique-match control, row reordering, wrong scoring lineage, missing/literal distinction, suppression denominators and unavailable replay. This remains a complete synthetic source-target simulation with no independent nonmember or external-auxiliary calibration and no release guarantee.

## Reproduction commands

From the current repository root, run the new integration checks:

```powershell
.\.venv\Scripts\python.exe -m pytest backend/tests/test_linkage.py -q
```

To rerun the unmodified source suite with its own import/configuration root:

```powershell
$PrismPython = (Resolve-Path '.venv/Scripts/python.exe').Path
Push-Location 'reference-kit/PRISM'
try {
    & $PrismPython -m pytest -q
} finally {
    Pop-Location
}
```

Direct Python scripts importing the original package additionally need `PYTHONPATH` set to `reference-kit/PRISM/backend` (or `backend` while inside that source tree). Do not install its `prism` command into the current environment: both packages define that executable name. Do not replace the current project's lockfile with the kit's older declared ranges merely to run an isolated comparison.
