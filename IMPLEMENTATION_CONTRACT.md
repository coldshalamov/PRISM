# PRISM integration contract

Source of truth: docs/spec/PRISM_MASTER_ARCHITECTURE.md and AGENT_HANDOFF_PROMPT.md. Build the complete hackathon definition of done; Phase 2/3 are disclosed roadmap, not fabricated integrations.

## Ownership
- Data agent: backend/app/datasets.py, backend/app/transforms.py, examples/, backend/tests/test_data.py, backend/tests/test_transforms.py.
- Evaluation agent: backend/app/risk.py, utility.py, optimizer.py, registry.py, adapters.py; tests for these modules.
- Frontend agent: frontend/ exclusively, including package manifest and lockfile.
- Coordinator: API, models, storage, reports, application/security, dependency/runtime setup, docs, integration tests. No agent commits or resets. Shared filesystem: do not change another owner's files.

## Python engine interfaces (plain dictionaries, pandas DataFrames)
`datasets.synthetic_oncology(n=5000, seed=42) -> DataFrame`
`datasets.profile(frame) -> list[ColumnSpec dict]`
`datasets.read_csv_bytes(content: bytes) -> DataFrame` validates bounded CSV, duplicate headers, empty data; preserves ZIP strings.
ColumnSpec: {name,dtype,role,unit?,importance}; role enum direct_identifier/quasi_identifier/sensitive/research_target/other; dtype integer/float/category/date/text/boolean. Weight requires kg or explicit lb conversion.
`transforms.default_steps(schema) -> list[TransformStep]`
`transforms.apply(frame, schema, steps, seed=42, secret=None) -> (DataFrame, list[int], dict)`
Lineage contains original iloc offsets in output order (never export). TransformStep {method,columns,params}. Methods: drop, mask, pseudonymize, band (width), zip_prefix (length), round (decimals), top_bottom (min/max), rare_group (min_count), date_generalize (precision), date_shift (days), noise (scale), permute (strata optional), redact (pattern optional), suppress_cells; final suppress_rows (qi,k,max_fraction) verifies cap. Keys never appear in recipes. Numeric band output uses half-open string intervals [a,b); utility decodes midpoint for numeric diagnostics and means, with approximation caveat. Preserve original index only internally; no exported index.
`risk.evaluate(frame, qi:list[str], sensitive:list[str]) -> dict` keys metrics {sample_unique,k_min,p_guess,row_entropy_bits,distinct_groups,sensitive_guess_advantage}, findings:list[AssessmentFinding], exposure:{subsets:[{columns,unique_fraction,k_min}],minimal_histogram,coverage}, sensitive:[...]. Validate missing fields. Missing values are one explicit category. Native categorical total variation t-distance; expose exact definition. No claim of general t-closeness equivalence for continuous targets. Bounded subset enumeration <=10 QI; for >10 <=3 subsets with cap, coverage explicit. No per-row data in results.
`utility.evaluate(original, protected, schema, workload, lineage=None) -> dict` {loss,queries:[{id,label,original,protected,error,tolerance,pass,issues,weight}], distributions:[{column,type,original,protected,missing_original,missing_protected,...}],correlations:[{x,y,original,protected,sign_flip}],warnings}. ResearchQuery {id,type,groupBy?,target?,filter?,positiveValue?,weight,tolerance,minCohort}; types group_rate/group_count/group_mean/correlation/difference_in_rates. Correlation params x/y via groupBy=[x],target=y. Grouped results may be list objects; real values only.
`optimizer.search(frame,schema,qi,sensitive,workload,max_candidates=24,constraints=None) -> dict` uses transforms.apply internally, risk/utility; {candidates:[{recipe:{steps,seed,version,releaseMode},risk,utility,constraints:[{id,pass,reason}],frontierMember,explanation}],evaluated,cap,termination,objectives}. Coordinator assigns immutable candidate IDs. Search 12+ actual distinct candidates by default, <=80 cap, respect research targets, actual recomputable nondominance. Function may accept additional kwargs only with defaults.
`registry.get_registry() -> dict` {attacks:[...],methods:[...],integrations:[...]}, source URLs, applicability/status/limitations, unsupported distinct.
`adapters.status() -> list[dict]` optional packages honest installed/runtime-tested distinction; pyCANON smoke cross-check attempt. Never install dependencies yourself (coordinator owns venv).

## HTTP contract /v1 (frontend API base same origin via Vite proxy)
All payload keys camelCase except engine metrics and nested scientific data. No filesystem paths from client. Errors {code,message,details}.
- GET /health -> {status:"ok",version}
- GET /v1/demo -> Dataset {datasetId,name,rowCount,schema,preview:[row objects],defaultSteps,defaultWorkload,synthetic:true}
- POST /v1/datasets/import multipart file -> Dataset (CSV only, 50MB cap); caller must review units and roles.
- GET /v1/datasets/{id}/preview?limit=30 -> {rows,rowCount,columns}
- PATCH /v1/datasets/{id}/schema body {schema:[ColumnSpec]} -> Dataset
- POST /v1/candidates body {datasetId,steps,seed:42,name?,qi?:string[],sensitive?:string[],workload?:ResearchQuery[]} -> Candidate
- POST /v1/assessments body {candidateId,qi,sensitive,workload} -> Candidate
- GET /v1/candidates/{id}/comparison -> Candidate
- POST /v1/search body {datasetId,qi,sensitive,workload,maxCandidates:24,constraints?:{minK,maxSuppression,maxUnique,maxLoss}} -> {jobId,status:"completed",candidates:Candidate[],evaluated,cap,termination,objectives}
- GET /v1/search/{jobId} -> same
- POST /v1/audits/import-pair body {originalDatasetId,protectedDatasetId,mode:"unpaired_microdata"|"paired_row_preserving"|"synthetic",columnMapping?:{},lineage?:number[],qi,sensitive,workload} -> Candidate; only explicit lineage allows paired utility; never attacker alignment.
- GET /v1/registry -> registry dictionary
- GET /v1/lab -> actual three executable counterexamples aggregate differencing, composition, reversed correlation.
- POST /v1/reports/export body {candidateId,format:"json"|"html"|"recipe"|"csv"} -> file download; CSV blocks direct IDs, spreadsheet formula injection protected; reports no raw rows.
- DELETE /v1/session -> clears all in-memory datasets/candidates; frontend resets state.

Candidate: {candidateId,datasetId,name,rowCount,recipe:{steps,seed,version,releaseMode},preview:[row objects],columns:string[],risk:<risk result>,utility:<utility result>,constraints:[...],frontierMember:boolean,explanation?,alignment:"verified"|"unpaired",createdAt}. dataset preview local only. Explicit warning that no automatic release clearance. Optional fields default safely. Preview max 30 rows; distributions are aggregate chart data. Store in memory only, no raw rows in logs/localStorage.

## Main-kit reconciliation (supplied later)
The original kit is preserved read-only under reference-kit/PRISM and docs/reference-kit. Its480-row benchmark is available from GET /v1/demo?fixture=kit; default architecture demo remains5000. Dataset adds rowUnit {entityColumn,oneRowPerPersonConfirmed,repeatedEntitiesDetected}. Schema PATCH optionally accepts entityColumn and oneRowPerPersonConfirmed; threat/workload requests optionally accept these plus membershipKnown. Candidate freezes threatContext. Public deterministic exact linkage appears as finding attackId verified_exact_linkage and nullable metrics verified_unique_correct_matches/verified_linkage_rate. Unknown external mechanisms, unknown membership, repeated-person ambiguity, or unsupported known-field transforms abstain; absent is never zero risk.

CSV exports require acknowledgments [authority,limitations,reviewed]. Owner JSON/HTML/recipe exports are labeled confidential. In-memory multipart parsing and chunked byte limits are enforced. Registry exposes exactly26 supplied threat families, engineAnalyses aliases, and17 protectionCatalog entries. Utility can add interval-filter coverage/inclusionBounds, semanticComparison and lexicalTv, subgroups/worstSubgroup; an unavailable selected query makes the composite unavailable. These changes preserve existing fields and manually synchronized frontend types.

Default workload generated from fixture fields mutation,stage,response,age; fixture generator must use these names. Full fixture fields: record_id,name,email,birth_date,age,zip,weight,eye_color,mutation,stage,treatment,response. mutation/response categorical booleans or 0/1, normalize in rate queries.

Frontend views: Workbench (table/distribution/correlation/subgroup), Knowledge Map, Attack Lab, Research Intent, Pareto Explorer, Report. Guided role/unit review and upload external protected CSV. Method controls visual, no required JSON editing. Candidate history. Export controls working. Local-only status, supported/uncovered clear. Accessible desktop/mobile layout.
