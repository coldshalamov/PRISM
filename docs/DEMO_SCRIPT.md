# Demonstration and reproducible scenarios

Use the bundled fictional data throughout. Start the built application as described in the root README. The browser workspace and API use [loopback port 8000](http://127.0.0.1:8000).

## Ninety-second route

1. **Purpose:** “This is a synthetic oncology study. We want to share less identifying detail while preserving mutation/stage/response analyses.” Load the demo and review roles, weight kg and research targets.
2. **Protect:** Keep response-by-mutation-and-stage and mutation-by-stage in Research Intent. Apply the baseline age/ZIP/weight settings. Show the original and actual candidate; names disappear and numeric detail becomes intervals. Note any retained birth date or other risky field.
3. **Expose:** Open the Knowledge Map and name one calculated unique fraction, its exact QI combination and the finite-sample assumption. Show a sensitive-value inference or homogeneity result separately from k. Do not narrate a low number as release safety.
4. **Preserve:** Open subgroup/correlation results. Show one actual tolerance result, its cohort sizes and any midpoint warning.
5. **Improve:** Run 24 configurations and select two or three frontier/history candidates. Compare actual recipes and failed constraints. A nondominated point need not pass the user's requirements.
6. **Explain:** Open one Attack Lab example: unchanged marginals can hide a reversed correlation, or combining two releases can sharpen exposure. These are executable fictional examples.
7. **Export:** Download HTML evidence and the recipe. State: “This report records measured results and uncovered attacks. It does not clear the file for release.” Clear the local session after the demo.

Read the live values; fixture seed reproducibility does not justify memorizing numbers for another configuration.

The seed-42 engine reference run used all reviewed demo QI, including exact birth date. Its baseline sample uniqueness was **0.9984**. In the 24 evaluated recipes, a joint candidate dropping birth date and using age-20/ZIP-1/weight-20 generalization measured **0.0166** uniqueness, **0.0014** in-sample sensitive guessing advantage and **0.0567** workload loss. Six candidates were nondominated. Every tested candidate failed at least one strict default constraint, including the required minimum-k setting; those results must be presented as a useful tradeoff with unresolved constraints, not a cleared release. Recalculate if the fixture, workload, QI or search grammar changes.

## API workflow in PowerShell

These calls create only local in-memory demo candidates and write the requested exports into the current directory. They use the same API as the browser.

```powershell
$api = 'http://127.0.0.1:8000'
$demo = Invoke-RestMethod "$api/v1/demo"
$qi = @($demo.schema | Where-Object role -eq 'quasi_identifier' | ForEach-Object name)
$sensitive = @('mutation')
$candidateBody = @{
    datasetId = $demo.datasetId
    steps = $demo.defaultSteps
    seed = 42
    name = 'Baseline oncology'
    qi = $qi
    sensitive = $sensitive
    workload = $demo.defaultWorkload
} | ConvertTo-Json -Depth 20
$candidate = Invoke-RestMethod "$api/v1/candidates" -Method Post -ContentType 'application/json' -Body $candidateBody
$candidate.risk.metrics
$candidate.utility.queries | Select-Object id, error, tolerance, pass

$searchBody = @{
    datasetId = $demo.datasetId
    qi = $qi
    sensitive = $sensitive
    workload = $demo.defaultWorkload
    maxCandidates = 24
    constraints = @{ minK = 5; maxSuppression = 0.10; maxUnique = 0.10; maxLoss = 0.35 }
} | ConvertTo-Json -Depth 20
$search = Invoke-RestMethod "$api/v1/search" -Method Post -ContentType 'application/json' -Body $searchBody
$search | Select-Object evaluated, cap, termination
$frontier = @($search.candidates | Where-Object frontierMember)
$chosen = $frontier | Select-Object -First 1
$chosen.constraints | Format-Table id, pass, reason -Wrap

foreach ($format in @('html', 'json', 'recipe', 'csv')) {
    $extension = if ($format -eq 'recipe') { 'recipe.json' } else { $format }
    $review = if ($format -eq 'csv') { @('authority', 'limitations', 'reviewed') } else { @() }
    $body = @{ candidateId = $chosen.candidateId; format = $format; acknowledgments = $review } | ConvertTo-Json
    Invoke-WebRequest "$api/v1/reports/export" -Method Post -ContentType 'application/json' -Body $body -OutFile "prism-demo.$extension"
}
```

The first frontier point is chosen for a reproducible selection rule, not because it is cleared or necessarily feasible. Read its constraints and report. HMAC recipes omit secrets by design; the default demo does not use HMAC.

## Equal marginals, opposite research association

The tiny original/reversed files have the same age and binary-response marginals. Their response ordering differs. This unpaired audit asks a dataset-level correlation question and supplies no row crosswalk:

```powershell
$original = curl.exe -sS -F 'file=@examples/tiny/correlation_original.csv' "$api/v1/datasets/import" | ConvertFrom-Json
$protected = curl.exe -sS -F 'file=@examples/tiny/correlation_reversed.csv' "$api/v1/datasets/import" | ConvertFrom-Json
$auditBody = @{
    originalDatasetId = $original.datasetId
    protectedDatasetId = $protected.datasetId
    mode = 'unpaired_microdata'
    qi = @('age')
    sensitive = @()
    workload = @(@{
        id = 'age-response'
        type = 'correlation'
        groupBy = @('age')
        target = 'response'
        weight = 1
        tolerance = 0.1
        minCohort = 3
    })
} | ConvertTo-Json -Depth 12
$audit = Invoke-RestMethod "$api/v1/audits/import-pair" -Method Post -ContentType 'application/json' -Body $auditBody
$audit.utility.queries | Select-Object id, original, protected, error, pass, signFlip
```

The calculated correlations have opposite signs; the query fails and contributes maximum normalized workload loss. `examples/tiny/expected.json` records the direct reference correlations. This proves a limitation of marginal fidelity on these fixtures, not a clinical finding.

## End and repeat

```powershell
Invoke-RestMethod "$api/v1/session" -Method Delete
```

Previously issued dataset/candidate/job IDs now refer to an ended session. Re-load the demo to repeat. Exported files are not removed. For a direct fixture regeneration, run `.venv/Scripts/python.exe examples/generate.py` from the repository root.
