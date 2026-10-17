# Evaluation contract: what PRISM measures

This document is the scientific contract for agents and UI authors. Equations below specify this implementation or a proposed extension. They are not legal thresholds.

## 1. Inputs and releases

Let D be the owner-side source table, R=T(D) a candidate, K the attacker-known fields, S the secret fields, and W a declared analytical workload. The user also declares the unit (row or person), source-membership knowledge, release context, and any entity key. Owner-only data can be used to **score** an attack but must not silently become an attacker's input.

Three input situations must remain distinct:

| Situation | Valid starting assessments | Missing prerequisites |
|---|---|---|
| PRISM-generated transformation | Classes, group disclosure, verified deterministic linkage replay, utility | Independent real-world auxiliary data and broader threat validation |
| Externally transformed table | Candidate structure, field checks, compatible workload utility | Trusted correspondence before asserting verified identity linkage |
| Synthetic table | Fidelity; optional synthetic-audit adapter when controls exist | Independent comparable records excluded from generator fitting, attack design, provenance |

The original table is not a magically independent control for itself. Splitting it after fitting a generator does not undo training contamination. Anonymeter's published evaluation explicitly separates source, synthetic, and control inputs [S5]. The included optional adapter requires provenance acknowledgments but cannot establish their truth.

## 2. Person-level versus row-level claims

An equality class containing five visits from one patient is not five-person anonymity. A one-row-per-person declaration is required for person labels. When a declared entity key has nulls or duplicates, the backend downgrades to row-level metrics and warns. A missing key still leaves the user's declaration unverified. Longitudinal/multi-table protection needs a separate person contribution and relational model.

Missing values are encoded distinctly from literal strings. Matching null patterns may itself disclose structure. Unknown units, mixed date semantics, duplicated identifiers, or omitted quasi-identifiers are coverage concerns, not cosmetic cleanup issues.

## 3. Exact equality-class diagnostics — implemented

For a candidate row r, define E_K(r) as the set of rows with the same values on surviving selected known fields. Measure:

- minimum class size min_r |E_K(r)|;
- sample unique fraction: number of rows with class size one / number of candidate rows;
- class-size histogram and rows in classes smaller than five;
- a conditional uniform-guess model: mean_r 1/|E_K(r)|.

The last quantity is **not** a real-world identity probability. It assumes the attacker matches the correct class, knows membership, and chooses uniformly within it. Sample uniqueness is not population uniqueness. An empty candidate or absent known fields yields an explicit unavailable/inapplicable state, never a green zero.

K-suppression drops classes smaller than the selected k and checks the suppression fraction. The requirement applies only to the selected fields and the resulting table. Additional fields, other releases, or repeated-person records can defeat its interpretation. Established models and their distinctions are documented by ARX [S4].

## 4. Verified exact linkage replay — implemented, narrow

The attacker gets source-target known attributes and the public deterministic generalization recipe. PRISM maps those attributes into candidate domains and looks for matches. The private original-to-candidate row map is used **only to verify the result**.

Define U as targets for which exactly one candidate matches and that candidate is the correct retained source record. Report |U|/|D|, matched-target count, and expected correct random-tiebreak fraction. Suppressed targets remain in the source-target denominator. This is a full enumeration of the supplied fixture, not a population estimate, so the current implementation does not invent sampling confidence intervals.

Noise, column permutation, secret pseudonyms, or secret date shifts on known fields make this exact replay inapplicable. Mark that result `not_applicable`; do not conclude the method is secure. Fuzzy linkage and key-compromise scenarios require other evaluators. Imported tables without trusted correspondence yield `not_assessed`.

Owner-side evidence currently gives limited target positions and candidate counts, not names or secret values. Any future display of a linked secret requires an explicit owner-only reveal and must be omitted from public reports.

## 5. Attribute-disclosure diagnostics — implemented, descriptive

For each selected categorical secret with at most 50 values:

- calculate the minimum number of distinct observed secret values per equality class;
- calculate the fraction of nonmissing sensitive rows in single-value classes;
- compare each class's secret distribution p_g with the candidate-wide distribution p using total variation: TV(p_g,p)=0.5*sum_s |p_g(s)-p(s)|.

These are distinct-l, homogeneity, and categorical distribution-shift diagnostics. They are **not** a generic t-closeness certificate, semantic similarity analysis, independent inference accuracy, or proof that the observed pattern is caused by release leakage. A group can be homogeneous because of genuine population associations. Numeric secrets and high-cardinality values need separate methods. Missing secret values are excluded and denominators shown.

The original t-closeness formulation motivates distinguishing distribution distances and sensitive domains rather than treating a count of distinct values as sufficient [S10].

## 6. Field ablation — implemented

Remove one known field at a time from the candidate class analysis and recompute sample uniqueness. Rank the reduction. This tells the owner where a selected field contributes distinguishing power **within this table and this attack model**. It is not a causal explanation or a global privacy feature importance. Interactions between fields mean single-field removal may miss jointly valuable repairs.

## 7. Utility — implemented

### Marginals and relationships

Numeric columns: mean, missingness change, Wasserstein distance in native units, and distance normalized by the source 5th-to-95th percentile width. Zero-width references use a small numerical denominator; such normalized values are unstable and should not be presented as universal quality percentages.

Categorical columns: total-variation distance on nonmissing frequencies. Domain changes such as `33127` to `331` can make raw category comparison harsh; a later semantic-domain adapter should compare at a shared hierarchy. Do not claim an unaligned category score describes scientific usefulness.

For numeric bands, midpoint substitution is a clearly disclosed approximation used in charts and numeric tasks. It is not a recovered individual measurement. Top-coded tails remain unknown. Candidate parse coverage is exposed. Pearson correlations use pairwise available observations, up to sixteen numeric columns; nonlinear and high-order relationships are not comprehensively assessed.

### Research tasks

The core permits count, rate, mean, and correlation, plus typed filters. It never executes arbitrary Python/SQL supplied by an uploaded file. For task j:

    error_j = |q_j(R) - q_j(D)|
    normalized_loss_j = error_j / tolerance_j
    L_W = sum_j weight_j * normalized_loss_j / sum_j weight_j

Tolerances are **absolute native units**. A rate tolerance of 0.02 means two percentage points; a mean-weight tolerance of 2 means two kilograms when units are kilograms. Relative percent errors are inappropriate around zero. A missing task makes the composite unavailable rather than improving it. Show per-task errors and coverage even when a composite exists.

Current task comparisons are descriptive, not causal or clinical recommendations. They do not validate endpoints, censoring, immortal-time bias, confounding, or survival models. Task preservation is purpose-specific and cannot be generalized to all future research.

## 8. Candidate search — implemented, bounded

Search selected age widths {5,10,20}, ZIP lengths {3,2,0}, and weight widths {5,10}; preserve unrelated recipe operations. The UI requests twelve candidates; the API permits up to eighteen. Infeasible suppression settings retain their error state.

Minimize the vector:

    (verified_unique_linkage_fraction, weighted_task_loss, fraction_suppressed)

Candidate a dominates b only when it is no worse on every measured objective and strictly better on at least one. Missing objectives cannot earn a favorable rank. The two-dimensional chart is a projection; show row loss in the inspector. These objectives deliberately do not claim comprehensive privacy coverage.

Search and assessment currently use the same dataset and attack family. This is exploratory selection, not independent confirmation. A final evaluator should predeclare workloads/threats, hold out attack targets or auxiliary scenarios as appropriate, repeat stochastic methods, and separately report selection and confirmation results. Stochastic transformations should store a frozen candidate snapshot; simply rerunning a recipe may produce different bytes and scores.

## 9. Formal guarantees are separate

Differential privacy is a property of a randomized release mechanism under a specified adjacency relation, not something established by an attractive before/after table. The full protected release includes outputs used to choose settings, repeated answers, metadata, and cross-user/cross-session behavior. NIST describes implementation hazards and the need to evaluate the complete guarantee [S2].

The optional OpenDP adapter illustrates one bounded binary-count primitive. It is not wired to a recipient API, and its in-memory ledger is not a production accountant. Publishing exact audit results alongside a DP answer defeats the intended boundary. Do not seed a DP mechanism for reproducible public output or reset its budget whenever a slider moves.

A deterministic result independent of all patient data reveals nothing about those data, but is often useless. This does not justify claiming that arbitrary coarse/noisy microdata reach a zero-leak endpoint. Useful privacy depends on the mechanism, what is secret, the attacker's knowledge, and what is released.

## 10. Proposed next evaluations, with prerequisites

- **Fuzzy external linkage:** independent authorized auxiliary records, held-out matching thresholds, false matches and abstentions, precision/recall at stated coverage; no identity output in public logs.
- **Synthetic inference:** Anonymeter source/synthetic/independent-control setup; baseline/control attack success, confidence intervals, package version, multiple target secrets, and subgroup denominators.
- **Membership inference:** explicit members/nonmembers and attacker access model; base-rate-sensitive precision, false-positive rate and attack advantage; no privacy certificate from one failed membership attack.
- **Composition:** all released versions, allowed join keys and membership assumptions; candidate intersections with correct correspondence; avoid using owner-only linkage as if publicly available.
- **Aggregate reconstruction:** restricted query language, complete release history and adversary transcript; test differencing, complementary suppression, linear reconstruction and repeated-query averaging. Separate owner-side demos from actual recipient endpoints.
- **Worst-subgroup utility/privacy:** predefined groups and minimum support; report scarce/unknown rather than hiding them in global averages.

Each extension must have a counterexample that fails without the protection, a relevant non-leaking/utility control, explicit computational bounds, and a source. Test absence is not evidence of safety.

Reference index: [research/SOURCES.md](research/SOURCES.md).
