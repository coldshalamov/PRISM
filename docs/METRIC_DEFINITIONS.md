# Implemented metric definitions

These definitions follow `backend/app/risk.py`, `utility.py` and `optimizer.py`. All risk numbers are finite-table descriptions unless explicitly labeled otherwise. Missing values are one real category for exact-match risk grouping, distinct from any literal string.

## Exact-match QI classes

For a released table with `N` rows and declared retained QI fields `Q`, let equivalence classes have sizes `n_g`. With no retained QI, a nonempty table is one class of size `N`.

| Output key | Definition | Interpretation |
|---|---|---|
| `sample_unique` | `number of singleton classes / N` | Fraction of rows unique on the declared released QI |
| `k_min` | `min_g n_g` | Smallest observed exact-match QI class |
| `distinct_groups` | Number of QI classes | Number of different released QI signatures |
| `p_guess` | `number of classes / N` | Mean one-guess correctness under uniform present-target/within-class uncertainty |
| `row_entropy_bits` | `sum_g (n_g/N) log2(n_g)` | Conditional uncertainty about the sample row index under that same model |
| `sample_information_reduction_bits` | `log2(N) - row_entropy_bits` | Reduction from a uniform sample-row prior, not general sensitive-information leakage |

The empty-table engine convention is zero for these outputs; it is not evidence that an empty result satisfies a privacy requirement. Final row suppression rejects removal of every row. No population uncertainty interval is attached to these fixed-table fractions.

For class sizes `[3,2,1]`, `N=6`, the expected values are uniqueness `1/6`, k `1`, guessing `3/6` and entropy `(3 log2(3)+2 log2(2))/6`. See `examples/tiny/hand_counts.csv` and `expected.json`.

## Knowledge–Exposure Map

For at most ten QI fields, the engine evaluates every nonempty subset: at most `2^10-1=1023`. For more than ten, it evaluates the first 128 deterministic combinations of sizes one through three, and still calculates the headline full-QI partition. This order-dependent cap can omit some triples or pairs; inspect `exposure.coverage` rather than assuming coverage of every combination.

Each subset reports its fields, unique fraction, minimum k and sample guessing statistic. The minimum-distinguishing histogram records the smallest **tested** subset size that singles out each row, but only exports aggregate counts. Exhaustive coverage gives an exact minimum; bounded coverage gives a found upper bound. A null histogram size means not distinguished among the tested subsets. It never means immune to other information.

Adding an exact-match field refines or retains each class; removing a QI cannot increase sample uniqueness when records and group coding are held constant. Neither property makes a field count a real-world acquisition cost.

## Sensitive categorical diagnostics

For each declared categorical sensitive field `S`:

- `l_min = min_g |{observed S categories in g}|`. Missingness is a category. This is distinct l-diversity, without a claim of background-knowledge resistance.
- Homogeneous classes have one observed sensitive category; `homogeneous_row_fraction` weights them by their row counts.
- `p_guess(S|Q) = sum_g max_s count(g,s) / N`.
- The baseline is `max_s count(s)/N`, the global modal sensitive category.
- `guess_advantage = max(0, conditional guessing - baseline)`.
- Sensitive conditional entropy is `sum_g (n_g/N) H(S|g)`.
- `t_max = max_g 0.5 sum_s |P(S=s|g)-P(S=s)|`, categorical total variation.

The headline `sensitive_guess_advantage` is the maximum implemented in-sample target advantage. Examine per-target status and coverage before interpreting it: unsupported targets do not become successful tests because the headline has a numeric default. Numeric non-boolean sensitive fields with more than 20 distinct values are unsupported. No smoothing, continuous EMD or prior-without-release comparison is implemented.

A separate `holdout` object uses one seed-42 split of the released table: 25% test rows, at least ten test rows and at least 30 total rows. Conditional class-majority predictions require at least five training observations in a QI class; otherwise they fall back to the training-global majority. Both conditional and baseline models are scored on the same test rows. The object reports train/test sizes, correct counts, baseline/conditional accuracy, signed accuracy advantage, conditional/fallback counts and approximate Wilson intervals. Ties use first-training-observation order. This diagnostic does not use source-to-release alignment and is not independent population validation or incremental disclosure. Reusing a split across optimization can overfit it. It does not replace the primary in-sample search objective.

Installed pyCANON cross-checks explicitly encode values and missingness as categories. Its smoke test compares native k, distinct l and categorical total variation on fixed standard/null fixtures. This does not run an independent attack on every uploaded dataset.

## Research queries and loss

Queries filter the original and actual candidate tables independently, then compute:

| Query type | Actual calculation |
|---|---|
| `group_count` | Number of rows per declared group |
| `group_rate` | Fraction matching `positiveValue` among nonmissing target observations per group |
| `group_mean` | Arithmetic mean of valid numeric target values per group |
| `correlation` | Pearson correlation; encode x as `groupBy:[x]` and y as `target:y` |
| `difference_in_rates` | Second minus first of exactly two observed cohorts on one groupBy field, with returned direction labels |

Boolean/0/1 aliases are normalized for rates. Rate estimates include approximate 95% Wilson binomial intervals; these are statistical intervals under binomial assumptions, not privacy or clinical validation. Numeric interval strings `[a,b)` are decoded using midpoint `(a+b)/2` for means, histograms and numeric correlations, with approximation warnings. Exact within-bin relationships cannot be recovered.

For query `i`, the absolute error is the largest absolute original-to-candidate change over matched cohorts. Missing cohorts, undersized original or candidate cohorts, undefined estimates, correlation/rate-difference sign reversals and changed rate-difference definitions fail the query. A missing required column makes it unavailable.

For a valid query, `e_i = min(1, max_cohort_absolute_error / tolerance_i)`. Unavailable or cohort-failed queries contribute `1`. Overall `loss = sum_i weight_i * e_i / sum_i weight_i`. No positively weighted workload gives unavailable loss. Thus loss is an analysis-specific decision measure; `1` does not mean all scientific value is destroyed. Every query's individual tolerance/cohort checks remain hard constraints in search even when average loss is low.

Categorical charts use the combined top 20 categories plus an explicit tail, with missingness separately counted. Numeric charts use ten common histogram bins. Pairwise diagnostic correlations cover at most 12 numeric/binary-compatible fields; explicit research queries are evaluated independently of that display cap. The same aggregates work for unpaired files; no patient-level change is inferred.

## Search objectives and feasibility

Search minimizes the vector `[sample_unique, sensitive_guess_advantage, suppression_rate, scientific_query_loss]`. An unsupported requested sensitive target makes its objective worst-case `1` and fails the relevant coverage constraint; missing workload loss is also represented as `1` for ranking. Candidate A dominates B only if A is no worse on every objective and strictly better on at least one. Ties can both be frontier members.

`frontierMember` describes objective nondominance within the tested library. `feasible` separately requires all checks: no reviewed direct identifiers, min k, suppression/uniqueness/loss caps, requested sensitive-target coverage and every research query. Defaults and supplied constraints are visible in results. Neither status is release authorization.

Search uses seed 42, memoized actual recipes, up to four coordinate-edit depths, width-ten beam selection and a hard 80-attempt bound. The requested candidate cap is 1–80, default 24. Small grammars or invalid configurations may yield fewer candidates. Single-field information-value entries compare actual evaluated QI-drop candidates against the identifier-dropped baseline; unevaluated ablations are labeled accordingly. Effects are not additive and are not Shapley attributions.
