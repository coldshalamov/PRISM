/* Method encyclopedia shown in tooltips. Static explanatory text only; every number in the
   app comes from the local service. Each entry states what is measured, the assumptions,
   and what it does not mean. */
export interface GlossaryEntry { term: string; what: string; assumes: string; not: string }

export const glossary: Record<string, GlossaryEntry> = {
  sample_unique: {
    term: 'Sample uniqueness',
    what: 'Share of rows whose combination of declared quasi-identifier values appears exactly once in this table.',
    assumes: 'One row per person, correct exact matching, and that the observer knows every declared quasi-identifier.',
    not: 'Not the chance that a real person is re-identified, and not a population estimate.',
  },
  k_min: {
    term: 'Smallest group (k)',
    what: 'Size of the smallest set of rows that share identical quasi-identifier values.',
    assumes: 'Only the declared quasi-identifiers are known to the observer.',
    not: 'k ≥ 5 on one chosen set does not protect other attribute sets, sensitive values, or outside records.',
  },
  linkage: {
    term: 'Verified exact linkage',
    what: 'Targets whose known fields, after replaying the public generalization rule, match exactly one released row, and that row is the correct one. Counted over every source target; suppressed targets stay in the denominator.',
    assumes: 'Known membership, correct known values, a public deterministic recipe, and a private correspondence used only to score the matches.',
    not: 'Not a population re-identification probability. Noise, shuffling or secret keys on a known field make it not applicable, which is not zero risk.',
  },
  p_guess: {
    term: 'Single-guess correctness',
    what: 'Expected chance of picking the right row when guessing uniformly inside each equivalence class.',
    assumes: 'Target is known to be present; uniform prior within each class.',
    not: 'Not incremental leakage from publishing the file.',
  },
  row_entropy: {
    term: 'Row-index uncertainty',
    what: 'Bits of uncertainty left about which source row matches, averaged over classes: Σ (n_g / N) · log₂ n_g.',
    assumes: 'Equal prior over source rows and known membership.',
    not: 'Not equal to information about any sensitive attribute.',
  },
  guess_advantage: {
    term: 'Sensitive inference advantage',
    what: 'How much better the best guess of a sensitive value becomes when the quasi-identifier class is known, compared with guessing the most common value.',
    assumes: 'In-sample empirical guessing; no held-out validation or smoothing.',
    not: 'Not a calibrated attack success rate. Small classes can overstate it.',
  },
  homogeneity: {
    term: 'Homogeneous classes',
    what: 'Classes where every row shares the same sensitive value, so membership alone reveals it, even when k is large.',
    assumes: 'The sensitive target is declared in Review classifications.',
    not: 'Absence of homogeneous classes does not rule out probabilistic inference.',
  },
  t_max: {
    term: 'Largest class divergence (t)',
    what: 'Categorical total variation: 0.5 · Σ |P(S = s | class) − P(S = s)|, maximised over classes.',
    assumes: 'Sensitive value is treated as a category.',
    not: 'Not a general t-closeness claim for continuous values.',
  },
  suppression: {
    term: 'Row suppression',
    what: 'Fraction of rows removed from the release.',
    assumes: 'Suppression is measured against the full original table.',
    not: 'Removal can bias subgroups; it is not neutral for the research question.',
  },
  loss: {
    term: 'Research-query loss',
    what: 'Weighted mean of min(1, largest cohort error ÷ tolerance) across your research questions. If a weighted question cannot be computed, the composite is unavailable; it is never treated as zero loss.',
    assumes: 'Tolerances and weights are yours, not clinical standards.',
    not: 'Not a universal fidelity score; hard pass/fail per question still applies.',
  },
  tolerance: {
    term: 'Tolerance',
    what: 'Largest absolute change in the question\'s result you will accept, in the units of that result (a rate is a fraction 0–1).',
    assumes: 'Set before looking at candidates to avoid fitting to the answer.',
    not: 'Not a statistical significance threshold.',
  },
  min_cohort: {
    term: 'Minimum cohort',
    what: 'Smallest number of rows a group needs on either side before its estimate counts as usable.',
    assumes: 'Small cohorts give unstable estimates.',
    not: 'Not a privacy threshold.',
  },
  band: {
    term: 'Numeric bands',
    what: 'Replaces a number with a half-open interval [a, b) such as [40,45). Utility decodes midpoints for means and correlations.',
    assumes: 'Fixed width and origin 0.',
    not: 'Midpoint decoding is an approximation of within-band values.',
  },
  zip_prefix: {
    term: 'ZIP prefix',
    what: 'Keeps the first N characters of a 5-digit ZIP code.',
    assumes: 'ZIP stored as text with leading zeros.',
    not: 'A 3-digit prefix does not establish HIPAA Safe Harbor: population exceptions and other identifiers still apply.',
  },
  date_generalize: {
    term: 'Date generalization',
    what: 'Keeps only year, quarter, month or day of a date.',
    assumes: 'Dates parse cleanly.',
    not: 'An exact date of birth with age is a direct re-identification path.',
  },
  rare_group: {
    term: 'Rare category grouping',
    what: 'Combines categories seen fewer than the chosen count into one "Other" label.',
    assumes: 'Rarity within this table.',
    not: 'Does not hide membership of a rare category in other columns.',
  },
  drop: {
    term: 'Drop columns',
    what: 'Removes the selected columns from the release.',
    assumes: 'Role classification is correct.',
    not: 'Dropping names alone does not make remaining quasi-identifiers non-unique.',
  },
  permute: {
    term: 'Group permutation',
    what: 'Experimental shuffle within strata. Preserves marginals, can destroy research relationships.',
    assumes: 'Seeded, non-private by default.',
    not: 'Not a privacy guarantee.',
  },
  noise: {
    term: 'Numeric noise',
    what: 'Experimental seeded perturbation of numeric values.',
    assumes: 'No formal accounting.',
    not: 'Not differential privacy.',
  },
  exposure_map: {
    term: 'Knowledge–exposure map',
    what: 'For each combination of attributes an observer might know, the share of rows that combination singles out in this table.',
    assumes: 'Exact values known; exhaustive for up to 10 quasi-identifiers, bounded above that.',
    not: 'Number of known fields is not the cost of acquiring them.',
  },
  frontier: {
    term: 'Nondominated set (Pareto frontier)',
    what: 'Tested candidates that no other tested candidate matches on every objective and beats on at least one (lower is better on all four). Failing a hard limit is a separate matter from being dominated.',
    assumes: 'Only the candidates this bounded search evaluated, with complete measurements.',
    not: 'Not a ranking, and not a proof that better recipes do not exist.',
  },
  membership: {
    term: 'Source membership',
    what: 'Whether the observer already knows that a target person is a row in this file. If membership is unknown, row-guessing figures are not reported, because they would need non-member controls PRISM does not have.',
    assumes: 'A yes/no declaration by the data owner for the scenario being tested.',
    not: 'Not a statement about who is actually in the file, and not a protection: an observer who knows membership is the strongest simple model.',
  },
  scenario: {
    term: 'Release scenario',
    what: 'A named starting point for the search limits (minimum group size, share of unique rows, rows suppressed, query loss).',
    assumes: 'The limits are editable planning defaults chosen for the context.',
    not: 'Not a standard, a legal threshold or a release permission.',
  },
  unit_conversion: {
    term: 'Explicit unit conversion',
    what: 'Pounds are converted to kilograms by a stated rule before banding or comparison. Values and tolerances shown after conversion carry the kg label; values in the source file keep their source unit.',
    assumes: 'The data owner reviewed the unit of the weight column.',
    not: 'PRISM never assumes kilograms when the unit is unset.',
  },
  paired: {
    term: 'Verified pairing',
    what: 'You supplied, and vouched for, a one-to-one mapping from protected rows to original rows. It is used only for internal utility diagnostics and is never exported.',
    assumes: 'The data owner verified the lineage.',
    not: 'Row order or similar-looking rows never imply pairing.',
  },
  unpaired: {
    term: 'Unknown pairing',
    what: 'Rows are not matched. Only dataset-level distributions, queries and uniqueness are compared.',
    assumes: 'Nothing about row correspondence.',
    not: 'Differences are aggregate, not facts about individual patients.',
  },
};
