# Evaluation and optimization agent assignment

Own `privacy.py`, `utility.py`, `engine.py` and focused regression tests. Do not change API shapes without lead approval. Your objective is stronger evidence, not a prettier scalar.

## Preserve the baseline

Reproduce the 5/3/5 fixture (75 unique correct matches / 480) and ZIP-removed candidate (20 / 480) before editing. Those counts are a regression fixture, not a scientific target to optimize against secretly. Preserve source immutability and owner-only lineage.

## First improvements

1. **Interval-aware utility.** Current numeric bands use midpoints. For count/filter tasks near a boundary, implement definite/possible inclusion or an explicit uncertainty interval; do not report midpoint-derived counts as exact. Show unsupported queries rather than coercing semantics.
2. **Semantic-domain comparison.** Compare generalized categoricals at a common declared hierarchy. Keep lexical TV as a diagnostic but do not confuse its domain mismatch with scientific damage.
3. **Worst-subgroup metrics.** User-declared groups, adequate support, separate missingness/retention/utility results. Never conceal severe rare-group distortion in an average. Low support becomes insufficient evidence.
4. **Frozen candidates.** Optimization should return immutable candidate handles/report snapshots; stochastic reselection must not silently produce different evidence. Cache owner-side seeds/keys securely without exporting them.
5. **Validation split.** Separate recipe selection from confirmation of attack/workload robustness. Plan subject-level splits where relevant, independent auxiliary/control scenarios, repeated stochastic trials, and clearly labeled uncertainty. Do not create artificial independence by randomly splitting repeated visits.

## A stronger linkage extension

Build approximate linkage only against authorized independent auxiliary data or controlled fictional ground truth. Specify how numeric tolerances, missing fields and categories affect a match; include abstention; calibrate thresholds on separate targets. Report precision/recall, false matches, coverage and class imbalance under a stated prior. Owner-only correspondence scores the attack but is never given to the matcher. One failed fuzzy attack is not proof of anonymity.

## Optimizer requirements

Keep objectives separate. Do not average linkage, membership, group disclosure and utility into “safety.” Enforce all user constraints explicitly; an infeasible or unassessed candidate cannot win by receiving default zeros. Pareto dominance refers only to the objective set and candidate search space. Display selection bias/held-out status.

The present grid adjusts only age/ZIP/weight precision. Add method combinations only with a bounded search budget, deterministic operation signatures, monotonicity tests where mathematically justified, cancellation, and profiling. Do not enumerate an exponential universe simply because an agent can write the loop.

## Acceptance tests

Source and transformed controls; equivalent candidates; dominated candidates; absent metrics; empty outputs; repeated persons; missing/non-numeric values; intervals spanning query thresholds; rare subgroup suppression; shuffled secrets with preserved marginals; global vs subgroup correlation reversal; stochastic candidate freezing; held-out target separation.

Submit concrete counterexamples and result JSON with every new metric. No blanket l-diversity/t-closeness/information-theory claim from a proxy that does not meet its definition.
