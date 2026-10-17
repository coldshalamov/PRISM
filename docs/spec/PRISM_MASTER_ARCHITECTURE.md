# PRISM — Purpose-Aware Privacy Engineering Laboratory
## Validated research synthesis, deterministic architecture, and agent implementation plan
**Design review date:** 2026-10-17  
**Status:** Research-backed specification; no claim that integrations or code have been executed or independently security-certified.  
**Intended deployment:** local-first, open-source, low-compute, no paid APIs, for synthetic demonstration data during the hackathon.  
**One-line description:** *PRISM helps researchers discover what an intended dataset release reveals, what research conclusions its protections distort, and which tested transformations preserve the important answers with lower measured disclosure risk.*

---

## 0. Executive decision — what to actually build

**Choose a testable, narrow product core over a broad but false security promise.** Build one polished workbench that imports a structured dataset; identifies direct identifiers, quasi-identifiers, sensitive attributes and analytical targets; produces protected candidate releases; evaluates information disclosure and scientific utility; and searches for better candidates. Back every finding with a repeatable calculation, a threat-model statement and a test case.

The distinctive feature is **Research Intent + Information Value Analysis**: define the analyses to preserve, then automatically discover the transformations and attributes that improve measured privacy at the least scientific cost. A second memorable feature is the **Knowledge–Exposure Map**: how easy it is to isolate records or predict sensitive attributes for different combinations of available facts.

**Non-negotiable:** no percentage called “anonymity,” “privacy guaranteed,” or “HIPAA-compliant.” Showing a green score must never authorize disclosure. Privacy hazards depend on release mode, outside knowledge, available attacks and prior releases. If no acceptable safe-to-release candidate is supported, say *“Not cleared for release; consider a governed enclave or aggregate-only query interface.”*

### Current baseline scenario
- Age: **5-year bands** (`[40,45)`, etc.), not implicit age rounding.
- ZIP: **3-digit prefix**; explicitly not a HIPAA Safe Harbor pass by default (population constraints/other identifiers/actual knowledge still apply).
- Weight: **5 kg bands**, units validated at import.
- Direct identifiers: flagged and blocked from unreviewed release, not merely renamed.
- Sample privacy objective: measure record singling out and sensitive-attribute inference across plausible known-column subsets.
- Sample research objective: preserve the association of KRAS mutation status, stage and response, plus one subgroup proportion.

### Hackathon implementation claim
A demonstrated *prototype privacy auditor and transformer for synthetic tabular data*, not a complete de-identification service for protected health information. Open-source library adapters may be included and labeled **verified API integration** only after installed-package smoke tests pass.

---

## 1. What the research actually supports

1. **Privacy versus usefulness is a real optimization problem.** Privacy Funnel and Information Bottleneck research formalizes retaining predictive utility while limiting sensitive inference. Practical finite-data estimates are not universal guarantees. [S1]
2. **Anonymization and risk auditing are mature.** ARX already supports generalization, suppression, microaggregation, privacy models, utility and re-identification analyses; do not claim these as invented. [S2]
3. **Policy depends on disclosure model.** NIST SP 800-188 distinguishes public microdata, synthetic releases, restricted query interfaces and controlled enclaves. [S3]
4. **Classical privacy models are partial.** `k`-anonymity checks distinguishability on selected QI; `l`-diversity and `t`-closeness check sensitive-value distribution properties; none proves universal immunity to background knowledge. pyCANON can evaluate these properties. [S4, S5]
5. **Synthetic-data testing is its own problem.** Anonymeter measures singling-out, linkability and inference attacks for synthetic tabular data using train, released synthetic and held-out control datasets. Do not use its risk score indiscriminately for deterministic row-preserving generalization. [S6]
6. **Formal DP is mechanism-specific.** OpenDP implements DP mechanisms, but sound use requires verified neighboring-dataset relation, contribution bounds, sensitivity, mechanism, budget composition and randomness handling. NIST SP 800-226 documents implementation hazards. [S7, S8]
7. **Pairwise similarity is not task preservation.** SDMetrics compares marginal and pairwise synthetic-data statistics; its docs explicitly caution that matching correlations may miss slopes and other structure. [S9]
8. **Healthcare-specific legal constraints are not captured by an entropy score.** HIPAA has Safe Harbor and Expert Determination paths; three-digit ZIP prefixes have population exceptions and Safe Harbor also has an actual-knowledge restriction. Automated testing is neither legal compliance nor an expert determination. [S10]

**Originality boundary:** PRISM's novelty claim is the *integrated purpose-aware workflow, evidence-driven repair search and interactive exposure analysis*, not inventing privacy attacks or privacy mathematics.

---

## 2. Taxonomy — disambiguate what is being protected

| Term | What it means | What it does **not** mean | MVP |
|---|---|---|---|
| De-identification | Reduction of identifiable attributes | Proof of anonymity | Yes, scoped |
| Pseudonymization/tokenization | Replaces identifiers with tokens; mapping may persist | Anonymous microdata | Yes (demo); keep key secret |
| Generalization/binning | Less granular fields (age, ZIP, weight) | Immunity from rare-group attacks | Yes |
| Suppression | Remove cells, fields or records | Safe if other identifiers remain | Yes |
| Microaggregation | Replace clusters of numeric values with group summaries | Generally formal DP | Phase 2 |
| Data swapping / permutation / PRAM | Alter record-level associations while preserving some distributions | Preserves scientific joint relationships automatically | Phase 2 |
| `k`-anonymity | QI equivalence classes each size ≥ `k` | Sensitive-value confidentiality, population uniqueness or DP | Audit now; enforcement later |
| `l`-diversity | Sensitive-value diversity within QI classes | No background-knowledge attacks | Audit via pyCANON |
| `t`-closeness | Restricts class-to-population sensitive-distribution divergence | Universal privacy | Audit via pyCANON |
| Synthetic data | New records learned/generated from source patterns | Automatically safe; automatically DP | Audit adapter phase 2 |
| Differential privacy | Formal bound on output change under neighboring data | A slider that adds arbitrary noise; guarantee for original unsanitized rows | Separate aggregate-only module |
| Encryption | Protects data confidentiality in transit/storage using cryptographic keys | Anonymization of decrypted content | Recommend transport; separate component |
| Information leakage | Quantified increase in inferences for specified secrets/prior/observer | A universal number computable from one CSV | Carefully scoped |

Release modes must be explicit enum `row_release | synthetic_release | aggregate_query | controlled_access`. Each mode owns a different attack registry, utility evaluation and guarantee type. **Hackathon: fully implement `row_release`; demonstrate architecture / stub status for the others.** If targeting Healthcare Challenge #10, invert the priority: build `aggregate_query` first; a row anonymizer alone does not satisfy that challenge.

---

## 3. The information-theoretic core, with honest assumptions

### 3.1 Record distinguishability (sample descriptive measure)
Let `D` have `N` rows, presumed one row/person for this first approximation; let `Q` be the released quasi-identifier fields. Rows sharing identical released `Q` values form equivalence classes `g` with counts `n_g`.

- Sample uniqueness fraction: `u(Q) = (sum over g with n_g=1 of n_g) / N`.
- Minimum sample k: `k_min(Q) = min_g n_g`.
- Expected *single-guess correctness* for a uniformly sampled present target and uniform uncertainty within each equivalence class: `p_guess = sum_g (n_g/N)*(1/n_g) = number_of_classes / N`.
- Conditional *sample row-index uncertainty*: `H(I | Q) = sum_g (n_g/N) log2(n_g)` bits, assuming equal prior over source rows.
- Sample *reduction* from a uniform prior: `log2(N) - H(I|Q)`.

**What these mean:** They describe how released QI combinations partition **this table**, conditional on known membership, correct matching, complete QI observation and uniform per-row prior. They do **not** quantify incremental leakage from publishing the file, and do **not** prove population re-identification probabilities. Mixed units must be normalized (weight kilograms) and group coding must use robust null semantics.

### 3.2 Minimum distinguishing knowledge / exposure surface
For each row `i`, find the smallest subset `A ⊆ Q` whose value signature distinguishes that row within the *released sample*. Define `d_i = min |A|` or `∞` if none found. Report histogram of `d_i`, not a universal effort-to-attack metric. *Number of known fields* is not the same as acquisition cost or bits of prior knowledge.

Enumerate subsets when `|Q| ≤ 10`, with cap `2^|Q| -1` (at most 1023 at 10). For larger Q, restrict subset size ≤3 initially, or use beam search/top-information candidates; publish **coverage** and skipped subsets. Cache group-by results. Display heatmaps of `subset → uniqueness fraction`, and show which attributes generate unexpectedly sharp reductions when combined. Store only redacted aggregate heatmap values in exportable reports.

### 3.3 Sensitive attribute inference
For sensitive attribute `S` and known fields `Y`, group by combinations of released `Y` values. A simple empirical optimal categorical guess statistic is:

`p_guess(S | Y) = Σ_y P(y) max_s P(s | y)`.

Compare against a relevant baseline `p_guess(S)` or, preferably, a model with the same prior knowledge but **without** the release. The improvement is an **inference advantage under specified data-generating/auxiliary assumptions**. For continuous sensitive fields use loss functions (MAE, Brier/log-loss after discretization) rather than treating every distinct value as a category. Rare groups require smoothing/min sample thresholds. Validate on held-out synthetic population data to avoid in-sample overconfidence.

Conditional entropy `H(S|Y)` and conditional mutual information `I(S;R|Y) = H(S|Y)-H(S|Y,R)` are meaningful only if `S`, prior `Y`, release observation `R` and their joint distribution are defined. **Do not claim that a sample uniqueness entropy equals `I(S;R|Y)`**. Don't estimate the last term from row-aligned original and released CSVs without modeling what a real observer can identify: the row alignment itself may be private information unavailable to the attacker.

### 3.4 Differential privacy is separate
For appropriate randomized mechanism `M` and neighboring datasets `D,D'` differing in one protected contribution, `(ε,δ)`-DP means `P[M(D)∈O] ≤ e^ε P[M(D')∈O] + δ` for measurable outputs `O`. This is a **distributional guarantee about a release mechanism**, not a metric read off an individual already-anonymized CSV. No custom DP implementation labeled as guaranteed before OpenDP-based bounded count/sum + budget accounting is vetted.

### 3.5 Research intent as a query workload
The researcher supplies a set of important statistical queries `W = { (q_i, weight_i, tolerance_i, min_cohort_i) }` such as:
- KRAS-positive rate by stage, with counts and CIs;
- Treatment-response rate among mutation-positive vs negative cohorts;
- A weighted mean (e.g., age by stage);
- Pairwise correlation to preserve;
- Conditional difference or odds ratio with clear handling of zero cells.

Compute each query on original data `q_i(D)` and candidate `q_i(T(D))`, then normalized error `e_i = |q_i(T(D))-q_i(D)| / scale_i`. Choose `scale_i` explicitly (clinical tolerance, bootstrap SE or predeclared range); avoid division by near-zero estimates. `L_W = Σ w_i * clamp(e_i, max_i) / Σ w_i` is a **decision metric**, not a scientifically universal fidelity score. Mark sign flips, empty subgroups, cohort-size failures and statistical-interval changes separately. Hard constraints on selected queries supersede weighted averaging.

### 3.6 Marginal information value / counterfactual ablation
For each field transformation `T_j`, recompute the same risk vector and workload utility. Define `Δr_j = r(D) - r(T_j(D))` and `ΔL_j = L_W(T_j(D)) - L_W(D)` (where `L_W(D)=0` under identical-query comparison). Report risk change per named metric/attack, not one fake universal score. Recompute **joint transformations** to catch feature interactions; optionally approximate Shapley attributions using fixed permutations, clearly labeled estimates. Never advise dropping clinically necessary fields solely because a marginal ablation appears low-impact; report subgroup and multivariate sensitivity.

---

## 4. Attack catalog, with implementation applicability

Every registry entry: `id`, `name`, `release_modes`, `required_columns`, `requires_original`, `requires_auxiliary`, `model_assumptions`, `algorithm`, `n_trials`, `baseline`, `metric_definition`, `confidence_interval`, `sample_vs_population`, `status`, `source`, `runtime`.

| Attack or vulnerability | Deterministic core / method | Prerequisite | Hackathon status |
|---|---|---|---|
| Direct identifier exposure | Typed-column patterns, formats; explicit review | Dataset columns | **Implement**; regex misses unstructured PHI |
| Quasi-identifier sample uniqueness | Group-by equivalence classes | Declared QI, row-unit definition | **Implement** |
| Minimal distinguishing subsets | Enumerate QI subsets, uniqueness histogram | Max subset budget | **Implement** |
| Rare conjunction / intersection | Multi-column and small cohort counts | Categorical/binned QI | **Implement** |
| Homogeneity / sensitive-value disclosure | Class-level sensitive distributions, `l`-diversity | Sensitive column | **Implement** using pyCANON + native cross-check |
| `t`-closeness auditing | Distance between class and overall sensitive distributions | Sensitive column, defined distance | **Adapter / integration test** |
| Auxiliary dataset record linkage | Exact/blocking/probabilistic matching, precision at fixed recall | Licensed, *synthetic* outside file | **One deterministic synthetic example** |
| Sensitive attribute inference | Empirical Bayes grouped conditional probabilities; held-out evaluation | Defined sensitive attribute and prior | **Implement constrained** |
| Longitudinal trajectory uniqueness | Fingerprint sequences/dates, count near-unique paths | Sequence data | Document / later |
| Free-text identifiers | Regex + structured heuristics, report limitations | Text fields | Warn/limited scanner only |
| Genomic fingerprinting | Genotype/rare-variant matching | Genomic records and threat model | Warn / later |
| Synthetic singling out/linkability/inference | Anonymeter, train/control/release | Truly synthetic release + heldout control | Adapter, not default |
| Synthetic record memorization/membership | Train vs holdout match/nearest neighbors and controlled attack | Generator + train/control | Later |
| Aggregate differencing / reconstruction | Restricted query-difference enumeration | Aggregate API and query history | Separate module later |
| Repeated DP release composition | Privacy accountant + mechanism metadata | DP release backend | Separate module later |
| Metadata/hidden sheets/embedded IDs | File metadata, export names, indexes | Input/export artifact | **Implement basic export scans** |
| External record cross-linking at scale | Matching against actual public datasets | Authorized sources and applicable law | Not claimed; later |

A red-team finding must report *actual attack success, the tested setting, what outside information was assumed, and whether a control attack performed similarly*. Example: “One of the tested combinations uniquely distinguishes 14% of rows **within this released sample**,” **not** “14% of people will be re-identified.”

---

## 5. Transformation catalog and support policy

| Transformation | Algorithm & parameters | Scientific tradeoff | MVP |
|---|---|---|---|
| Drop identifiers | Explicit column drop; redact known ID formats in selected fields | Typically little numerical change, but linkage/joins may break | Yes |
| Deterministic token replacement | Cryptographic HMAC with external secret, namespace + rotation | Preserves within-key joins; still linkable | Yes, local only; no secret in export |
| Numeric generalization | Consistent half-open intervals; five-year age and five-kg weight defaults | Blurs exact means/correlation, keeps coarse grouping | Yes |
| Hierarchical categorical generalization | User-specified taxonomy tree; e.g. ZIP 5→3→none | Geographic analysis loses resolution | Yes for ZIP; configurable later |
| Top/bottom coding | Clamp outliers into bins with explicit thresholds | Can mask rare individuals but lose tails | Yes |
| Cell suppression | Null selected QI cells | Changes missingness, degrades subgroup analyses | Yes |
| Row suppression | Suppress at-risk rows under explicit cap | Selection bias, subgroup loss | Yes |
| Uniform/group-wise permutations | Shuffle among allowed strata; seeded random for demo | Preserves marginals, can destroy conditional relationships | Yes as *experimental* transformation, explicit warning |
| Numeric noise | Gaussian/Laplace perturbation *without formal DP claim* | Changes moments and range, can cause outliers | Yes as experimental setting |
| Microaggregation | Group numeric attributes; mean or robust centroid | Blurs values, preserves selected coarse relationships | Later or extra lane |
| k-anonymity enforcement | Generalization + bounded suppression search; verify final min k | Alters join and subgroup detail | MVP bounded solver (only QI definition) |
| l-diversity/t-closeness enforcement | Additional optimization under sensitive distribution constraints | May require heavy suppression | Later; auditing now |
| DP aggregates | OpenDP on bounded sum/count, compositional ε accounting | Noise/error, cannot guarantee raw release | Separate backend phase 2 |
| Synthetic generation | Statistical or ML-based generator; separate train/control | May memorize, may destroy rare patterns | Later; do not use BSL generators without license review |

**Important:** A “privacy slider” adjusts preference among *evaluated candidates*, never secretly modifies one arbitrary epsilon or claims stronger privacy. Let users inspect method-specific settings; do not promise monotonicity of measured risk across all transformations.

---

## 6. Optimizer — practical deterministic bounded search

Goal: find **Pareto-efficient** candidates under explicit risk and research-utility constraints, **not** solve universal privacy optimization.

Input: original `D`; schema and protected/analysis field roles; candidate transformation grammar; research workload `W`; risk metrics and attacker knowledge combinations; search caps.

Algorithm:
1. Compute baseline metrics on original and default candidate, including suppression and missingness, with seeds controlled for **non-DP simulations**.
2. Produce a candidate library: age intervals `{5,10,20,drop}`, ZIP `{5,3,none}` (with Safe Harbor warnings), weight `{5,10,drop}`, selected QI drops, suppression limits `{0,.01,.05,.10}` and a small set of categorical hierarchies.
3. Search by beam or greedy coordinate descent: start with baseline, propose one edit at a time, memoize candidates by canonical recipe hash, evaluate cheap risk and query errors. Suggested bounded budget: **≤80 candidates**, depth ≤4, beam width 10; no expensive brute-force Cartesian explosion.
4. Filter hard constraints: no direct identifiers, max suppression fraction, k minima for declared QI, selected scientific-query tolerances, no protected analysis target mutated unless explicitly authorized.
5. Identify non-dominated candidates over separate metric vectors (`sample_unique`, `sensitive_guess_advantage`, `suppression_rate`, `scientific_query_loss`) rather than collapsing all into a single security percentage. A configuration is dominated if another is no worse on every specified objective and better on at least one.
6. **Retest shortlisted candidates** with attacks or combinations not used in the search, and require independent validation of implemented k/l/t metrics. Return failed and uncovered scenarios.
7. Explain top candidates by changed fields, measured effects, failed constraints and caveats. “No tested configuration meets all constraints” is a legitimate result.

Optional visual slider picks among candidates in a ranked Pareto set by user preference `α` (e.g. research-preservation ↔ tested disclosure resistance). Do **not** present α as ε, probability of re-identification, or guarantee.

**Reason to avoid fixed global percentages:** A change that lowers sample-uniqueness risk can increase sensitive-value homogeneity; optimization must retain a vector and explicit pass/fail constraints.

---

## 7. Architecture and trust boundaries

```text
LOCAL MACHINE (127.0.0.1 only; no external API or telemetry)
┌──────────────────────────────────────────────────────────────────────┐
│ React + TypeScript + Vite frontend                                  │
│ Import / split-pane tables / charts / risk map / recipes / compare    │
│           ↕ restricted typed JSON over loopback                     │
│ FastAPI service (short-lived session and local-only origin checks)   │
│   ├─ DatasetStore      raw D isolated from candidate/output storage   │
│   ├─ SchemaProfiler    type+role classification, review required     │
│   ├─ TransformEngine   validated composable transformations          │
│   ├─ RiskEngine        sample uniqueness, k/l/t, inference, registry  │
│   ├─ UtilityEngine     query workload, marginal/pairwise diagnostics │
│   ├─ Optimizer         bounded deterministic candidate search        │
│   ├─ AdapterRegistry   pyCANON; SDMetrics; optional ARX/OpenDP later │
│   └─ ReportEngine      local JSON/HTML/CSV + provenance manifest     │
└──────────────────────────────────────────────────────────────────────┘
```

**Deployment choice:** React dev server (`localhost:5173`) + FastAPI (`127.0.0.1:8000`) for prototype; later bundle as a desktop app (Tauri) or a localhost-managed app with static frontend. Browser files are not uploaded to a public server. A public hosted frontend must never imply data remain local unless the computation actually runs on-device. Block arbitrary host binds, restrict CORS to loopback origin, prevent network egress in demo environment if possible. Never log raw data, row values, PHI, tokens or exact high-risk record content.

**Library adapters:**
- **Native Python** (pandas, NumPy/SciPy, DuckDB, scipy.stats): core engine; deterministic statistics and transforms.
- **pyCANON**: assess actual `k`, `l`, `t` metrics, with local basic cross-checks; does **not** anonymize by itself. [S5]
- **SDMetrics (MIT)**: *optional* diagnostics for compatible synthetic-data comparisons, not an automatic all-data quality score. [S9]
- **Anonymeter (Clear BSD)**: *only* when `original training`, `synthetic output`, and disjoint control records exist. [S6]
- **ARX (Apache 2.0; Java)**: excellent transformation/optimization reference; do not try to embed Java runtime in the first hackathon slice unless the API integration is proven. [S2]
- **OpenDP (MIT)**: isolated aggregate-query backend; review its vetted vs `contrib`/`honest-but-curious` feature flags before making DP claims. [S7]
- **sdcMicro (R)**: optional longer-term integration for microaggregation, PRAM, local suppression and risk; separate R bridge/container required. [S11]
- **SDV**: do not bundle as “fully permissive OSS”; its core generator advertises Business Source License. [S12]

**Licensing gate:** check pinned dependency licenses and transitive requirements in `THIRD_PARTY_NOTICES.md`; re-evaluate before distribution. Search results alone do not constitute installation/API compatibility verification.

### Repository layout
```text
prism/
  frontend/
    src/{app,components,features/{workbench,methods,exposure,utility,optimizer,reports},api,types}
  backend/
    app/{main.py,settings.py,api,domain,datasets,transforms,risk,utility,optimizer,adapters,reports,security}
    tests/{unit,integration,property,fixtures}
    pyproject.toml
  schemas/
    dataset.schema.json
    config.schema.json
    assessment.schema.json
    candidate.schema.json
  examples/synthetic_oncology/
    original.csv
    auxiliary.csv
    corrupted_relationships.csv
    use_case.json
  docs/{THREAT_MODEL.md,METRIC_DEFINITIONS.md,METHOD_REGISTRY.md,RELEASE_LIMITATIONS.md,AGENT_HANDOFF.md}
  THIRD_PARTY_NOTICES.md
  README.md
```

---

## 7A. External-audit mode — original and third-party-protected dataset

A key user workflow is **Audit** rather than **Create**: the researcher uploads `D` and a separately anonymized `R` and asks PRISM to assess the resulting protection. This needs its own semantics, not an implicit assumption that row 37 of the second CSV is patient 37 in the first.

**Import modes:**
- `paired_row_preserving`: explicitly verified one-to-one lineage supplied by the *data owner*, with a local-only crosswalk for internal utility evaluation. The crosswalk is never exported. The auditor must not hand this alignment to the simulated attacker.
- `unpaired_microdata`: uncertain row order, row suppression, swaps, merges, or independently produced records. Compare marginals, subgroup/query outputs and dataset-level uniqueness **without pretending row-to-row differences are patient-level facts**.
- `synthetic`: generated sample with training and disjoint control data known. Use synthetic-appropriate tests; do not match output rows directly to training subjects.
- `aggregate_only`: neither side is a released individual-row dataset; evaluate a declared query/release contract instead.

**External-audit algorithm:** (1) validate units and schema compatibility; (2) detect direct identifiers, unexpected columns and high-cardinality fields; (3) compute same-release QI class measures; (4) compute workload and distribution differences; (5) run only applicable attack adapters; (6) classify candidate **transformation signatures** as hypotheses (e.g., binned age, truncated ZIP) with confidence/explanation, not proof of what algorithm was used; (7) report coverage, unknown lineage and residual concerns. If protected columns cannot be mapped, require an explicit user mapping or mark tests unavailable. If the original is missing, PRISM can profile output uniqueness and obvious identifiers, **but cannot calculate original-to-release utility loss or incremental leakage**.

**Version history / composition:** A researcher may have already released earlier variants. PRISM should collect *optional prior release metadata* and warn that comparing separate releases can disclose more than either release alone. Full multi-release attacks are deferred; never certify each release in isolation as safe against their intersection. Treat previous public statistics as auxiliary information if explicitly supplied.

**Scientific-method honesty:** Inferring the exact transformation algorithm from `D` and `R` is generally not identifiable: multiple mechanisms can produce the same empirical file. PRISM measures observable differences and verified constraints, with method-origin attribution only when a recipe is supplied.

---

## 8. Frozen contracts BEFORE parallel coding

All engines operate on server-side `dataset_id` and immutable `candidate_id`, not user-supplied filesystem paths; clients receive only aggregate previews. Required foundational models:

```ts
type Role = 'direct_identifier'|'quasi_identifier'|'sensitive'|'research_target'|'other';
type ReleaseMode = 'row_release'|'synthetic_release'|'aggregate_query'|'controlled_access';
type Status = 'implemented'|'partial'|'unsupported'|'not_applicable'|'error';

type ColumnSpec = {
  name: string; dtype: 'integer'|'float'|'category'|'date'|'text'|'boolean';
  role: Role; unit?: string; importance: number; sensitivityReason?: string;
  generalization?: {type:string; params:Record<string, unknown>};
};
type ResearchQuery = {
  id:string; type:'group_rate'|'group_count'|'group_mean'|'correlation'|'difference_in_rates';
  groupBy?: string[]; target?:string; filter?:Record<string,unknown>;
  weight:number; tolerance:number; minCohort:number;
};
type TransformStep = {method:string; columns:string[]; params:Record<string,unknown>};
type CandidateRecipe = {baseDatasetId:string; releaseMode:ReleaseMode;
  steps:TransformStep[]; seed?:number; version:string};
type AssessmentFinding = {id:string; attackId:string; status:Status;
  applicability:string; assumptions:string[]; numerator?:number; denominator?:number;
  metricValue?:number; metricUnit?:string; ci95?:[number,number];
  baseline?:number; severity?:'info'|'low'|'medium'|'high';
  narrative:string; sourceId?:string; caveats:string[]};
type CandidateSummary = {candidateId:string; recipe:CandidateRecipe;
  findings:AssessmentFinding[]; utility:Record<string,number>;
  constraints:{id:string; pass:boolean; reason:string}[];
  evaluationCoverage:{run:string[]; skipped:string[]};
  frontierMember:boolean};
```

Use Pydantic for server-side validation and generate TS types from JSON Schema or make contract generation authoritative in one direction. Reject invalid method parameters, row-level outputs that accidentally include direct IDs, and methods incompatible with field types. Store derivations as immutable recipes. Endpoints:

| Verb/route | Contract |
|---|---|
| `POST /v1/datasets/import` | Multipart local file; returns dataset id/schema/profile; enforce size cap (e.g., 50 MB demo). |
| `GET /v1/datasets/{id}/preview?limit=30` | Local authorized preview; no raw rows in logs. |
| `PATCH /v1/datasets/{id}/schema` | User reviews field roles and units. |
| `POST /v1/audits/import-pair` | Original + externally protected file ids, pairing/lineage claim, column mapping → audit context; no implied row alignment. |
| `POST /v1/candidates` | Dataset id + recipe → new candidate id and transform report. |
| `POST /v1/assessments` | Candidate id + threat configuration + workload → findings/metrics. |
| `POST /v1/search` | Constraints, cost caps, objective weights → bounded candidates. |
| `GET /v1/search/{job_id}` | Progress / top candidates / status; background local process okay, no cloud. |
| `GET /v1/candidates/{id}/comparison` | Joint table+chart diffs and query results. |
| `POST /v1/reports/export` | JSON/HTML evidence report; separate protected CSV export. |
| `GET /v1/registry` | Supported/unsupported methods and coverage. |

Background worker and progress events are optional; short tasks may run synchronously with bounded workloads. Every error includes `code`, `message`, `details` without sensitive raw values.

---

## 9. Interface brief — serious visual workbench, not an AI dashboard

**Default view:** two synchronized panes: original (left) and current protected candidate (right). Tabs toggle table, distribution chart, pairwise scatter/correlation, subgroup analytics. Changed cells are highlighted only on local screen and never copied into public reports. Show irreversible information loss explicitly. Side rail holds method configuration and method-specific definitions; top nav: **Workbench | Knowledge Map | Attack Lab | Research Intent | Pareto Explorer | Report**.

**Interaction path:**
1. Drag-and-drop file; schema/type/role suggestions shown with prominent *“Review classifications”*.
2. Select release scenario (lab collaboration, limited research sharing, public release, or aggregate query; these are contextual descriptions not legal authorizations).
3. Research Intent: choose template analytical questions or construct query from menu; assign importance and hard tolerances.
4. Protect: baseline age=5y, ZIP prefix=3, weight=5kg, drop direct identifiers; build first candidate. Show visual distortion live.
5. Evaluate: run actual privacy risks and utility tests; show split metrics rather than magic overall score.
6. Knowledge Map: dynamic heatmap of column combinations and sample uniqueness; hover explains assumptions and units. No real individuals' row values in shareable output.
7. **“Find better configurations”**: search bounded candidates and display Pareto scatter with selectable versions. Comparing 3 candidate recipes is sufficient.
8. Export: protected CSV, recipe JSON, audit HTML with test coverage, assumptions, residual risk, sources, versions, warning, and explicit human review gate.

**Narrative examples:**
- “Age+ZIP+weight uniquely distinguishes 7% of rows in this sample; this is not an estimate of real-world identity linkage.”
- “Dropping eye color reduced sample uniqueness by 2 percentage points but did not change the selected response-rate analysis beyond the configured tolerance.”
- “A disease subgroup is entirely uniform in one sensitive attribute even though k≥5; k-anonymity did not prevent this attribute-inference concern.”
- “No candidate meets the requested scientific tolerance and sample risk limits.”

All such statements must be calculated from fixtures during the demo, not hard-coded labels. Visual quality is important but secondary to genuine calculation.

---

## 10. Validation plan — prove that the mathematics works

### 10.1 Synthetic fixtures (public only)
Generate with a fixed *demonstration* seed and known ground truth; do not claim any genuine clinical accuracy.
- `oncology_base.csv`: 5,000–15,000 synthetic people, names, birthdays, 5-digit ZIP, kg weight, eye color, rare mutation, cancer stage, treatment and response; controlled correlations and rare combinations.
- `auxiliary.csv`: synthetic outside knowledge about an overlapping subset, with missing/partial fields. No access to direct IDs for the purported attacker during linkage.
- `clinical_objectives.json`: mutation-stage-response query templates, tolerances.
- `split_train/control`: needed if testing a true synthetic release.

### 10.2 Mandatory acceptance tests
1. Removing names alone **does not** automatically make sample uniqueness low.
2. Two datasets with equal column marginals but opposite age–response correlations result in **high utility loss** on that analysis.
3. A 5-anonymous QI grouping where every individual in a group has the same sensitive diagnosis passes `k≥5` but **raises homogeneity/inference risk**.
4. Knowledge Map: adding a known attribute cannot make an exact-match equivalence class larger for a given row; test this invariant.
5. Uniqueness fraction and mean guessing calculations match hand-worked 4–8 row toy examples.
6. Removing one QI column does not increase sample uniqueness when group coding and records are held constant; include missing/null edge cases.
7. If patient units are pounds, convert to kg or block kg-binning; don't silently misinterpret.
8. ZIP 3-digit settings alone **never** produce an automated HIPAA Safe Harbor pass.
9. A candidate that passes sample k yet reveals a sensitive subgroup is reported as mixed, not “green.”
10. Bounded optimizer compares at least 12 candidates; stops at cap and reports cap; every Pareto status is recomputable.
11. UI never reports assessment success when attack has status `unsupported` or `error`.
12. No public network endpoints receive uploaded data; no raw row printed in server logs; no secret HMAC key in recipe/export.
13. Re-evaluating the same non-DP candidate with fixed demo seed reproduces metrics exactly.
14. Any future DP module uses **cryptographically appropriate randomness and release accounting**; repeated deterministic DP seeds should never be made public or used as a reproducibility shortcut.
15. Explicit synthetic-data attack adapter refuses to run if disjoint train/control inputs are missing.
16. Export report includes tested QI set, sensitive targets, workload, library versions, SHA-256 hashes of inputs (optional, avoid publishing fingerprints of sensitive raw files), coverage, and caveats.

**Statistical discipline:** For simulated attack success proportions, use Wilson or bootstrap intervals where appropriate; show sample sizes. For fixed finite datasets, report the descriptive fraction without pretending it has sampling uncertainty. Do not call a hand-selected threshold a calibrated probability of harm.

### 10.3 Independent checks
- Native `k/l/t` calculations should be cross-checked on small fixtures against pyCANON; fail test if disagreement unresolved.
- Compare utility against direct SciPy/pandas calculations and optional SDMetrics metrics with data-type compatibility checks.
- Any transformation that claims a hard privacy constraint must explicitly re-run its validator on the transformed output.
- Run held-out attack combinations on finalists to reduce optimizer gaming.
- Run backend pytest, API schema tests and frontend typecheck/build. Avoid E2E browser suite until the vertical slice works.

---

## 11. Parallel agent work breakdown

**Before parallelization (owner / orchestrator, 20–30 min):** Freeze JSON schemas, generate 12-record tiny fixture and 10k-row synthetic fixture, create empty route stubs, document metrics and sample scenarios. Assign exclusive ownership of files and integration checkpoints.

| Lane | Ownership | Deliverables | Must not edit |
|---|---|---|---|
| A: Data + Transformation | `backend/app/datasets`, `/transforms`; dataset APIs | Import/profile/type roles; 5y age, 3-digit ZIP, 5kg weight, remove/drop, top-code, suppression, recipe versioning | Risk, frontend |
| B: Quantitative Risk | `backend/app/risk`; findings schema adapters | QI equivalence classes, subset map, min distinguishing knowledge, k/l checks, constrained sensitive inference, registry, tests | Transform, frontend |
| C: Research Utility + Search | `backend/app/utility`, `/optimizer`; query and search APIs | Query templates, utility regression tests, ablations, bounded search/Pareto and findings explanation | Risk algorithms, frontend |
| D: Frontend | `frontend/` | Modern split-screen, methods rail, Knowledge Map, utility comparisons, Pareto explorer, reports; synthetic fixtures preview | Backend algorithms |
| Coordinator | shared schemas, API glue, build scripts, security & test harness | Freeze contract, reconcile PRs, run integrated smoke tests, prepare pitch/demo and tests | Avoid changing lanes without handshake |

**Agent integration protocol:**
- Write expected endpoint JSONs into fixtures before implementation.
- One integration checkpoint per 60–90 minutes; all agents commit independently to branches/patches.
- Each agent must add tests, a README section, clear `supported/partial/unimplemented` disclosures, and precise commands.
- The orchestrator merges after tests, not on prose assertions; if time-constrained, disable broken features instead of faking results.

### Short hackathon execution order
- **Hour 1:** Types/contract, synthetic dataset, static split UI, original/protected first pass.
- **Hours 2–3:** Candidate transformations + real risk group-by/subset computations + initial query utility.
- **Hour 4:** Demonstrate leakage despite names removed; show correlation destruction after naive shuffle; verify all findings.
- **Hours 5–6:** Bounded optimizer + Pareto comparison + evidence narratives; pyCANON bridge if integration stable.
- **Hour 7:** UI polish, red-team/negative tests, local security check, final report export.
- **Remaining time:** stable walkthrough, 60–90-second pitch, README, submission and video; no risky new dependencies.

**Definition of done for hackathon:** fresh local install; load synthetic dataset; review roles; run default transforms; see original/protected visuals; run at least 3 genuine privacy analyses; define 2 research queries; evaluate at least 12 variants; show ≥2 Pareto candidates; generate portable report with limitations; all results agree with fixtures; no external API/data costs.

---

## 12. Follow-on roadmap, explicitly outside the one-day claim

**Phase 2:** ARX integration behind a Java adapter (validate core API separately); sdcMicro bridge (if robust on target OS); l/t enforcement; sampled Shapley; secure local multi-file metadata scan; proper experimental synthetic release evaluation using Anonymeter; full provenance/method registry; user-defined hierarchy editor; local desktop package.

**Phase 3:** DP aggregates via OpenDP with formal review and budget accounting; differencing/reconstruction attack lab for controlled query workloads; controlled enclave mode; genomics and event sequences; provenance-aware version catalog across prior releases; rights and disclosures workflow; expert-report review system. These require significant further testing and professional evaluation.

### Engineering traps to avoid
- A “privacy meter 96% safe” is unsound.
- A “More private” slider is not an ordered security guarantee.
- `k=5` in one chosen QI set does not establish safety against other QI sets, target presence uncertainty or outside records.
- Perfect mean/standard deviation fidelity can coexist with inverted clinically important relationships.
- Swapping within fine strata may retain sensitive joins; aggressive swaps can fabricate false person-level records.
- A public site that accepts PHI is a security risk even if the output is scrubbed.
- Evaluating on the same tests you optimize invites overfitting; hold out test combinations.
- A differential-privacy epsilon is not comparable to percentage sample-uniqueness.
- A CSV containing dates, free text, longitudinal trajectories or genomics may need capabilities outside the MVP; unsupported ≠ passed.
- Regulatory compliance and ethical sharing need human governance, not only metrics.

---

## 13. Sources / verified references (accessed 2026-10-17)

[S1] Makhdoumi et al., *From the Information Bottleneck to the Privacy Funnel* (2014), https://arxiv.org/abs/1402.1774 — foundational privacy/utility tradeoff.

[S2] ARX official GitHub, https://github.com/arx-deidentifier/arx — risk and anonymization methods; Apache 2.0, Java integration and build.

[S3] NIST SP 800-188, https://csrc.nist.gov/pubs/sp/800/188/final — de-identification risks, governance, release models and risk studies.

[S4] Background-knowledge concerns and classical model limitations: https://www.sciencedirect.com/science/article/abs/pii/S0167404822002681 and standard classical literature.

[S5] pyCANON, https://github.com/IFCA-Advanced-Computing/pycanon — k/l/t etc assessment, **not** data transformer.

[S6] Anonymeter, https://github.com/statice/anonymeter — synthetic risk attack model and train/control requirements; Clear BSD license at https://github.com/statice/anonymeter/blob/main/LICENSE.md.

[S7] OpenDP docs, https://docs.opendp.org/en/stable/getting-started/quickstart.html and https://docs.opendp.org/en/stable/api/user-guide/index.html — Python binding, core features/contrib flags; MIT repo https://github.com/opendp/opendp.

[S8] NIST SP 800-226 (2025), https://csrc.nist.gov/pubs/sp/800/226/final — mathematical DP, implementation pitfalls and evaluation.

[S9] SDMetrics, https://docs.sdv.dev/sdmetrics/data-metrics/quality and https://docs.sdv.dev/sdmetrics/data-metrics/quality/correlationsimilarity — utility diagnostics and limitations; MIT project https://github.com/sdv-dev/SDMetrics.

[S10] HHS HIPAA De-identification Guidance, https://www.hhs.gov/hipaa/for-professionals/special-topics/de-identification/index.html — Safe Harbor, Expert Determination, date and ZIP rules.

[S11] sdcMicro, https://sdctools.github.io/sdcMicro/reference/sdcMicro-package.html and https://sdctools.github.io/sdcMicro/reference/localSuppression.html — existing R methods, including importance-guided suppression.

[S12] SDV project, https://github.com/sdv-dev/sdv — synthetic generation; Business Source License; licensing review required.

**Evidence qualification:** Documentation confirms available concepts and advertised library functionality; specific combinations, pinned versions, numerical performance, data security and API interoperability remain **engineering hypotheses** until tested in PRISM's target runtime. This document does not claim the application has already been built.
