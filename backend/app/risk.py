"""Finite-table disclosure diagnostics, never release clearance.

All exact-match groups use factorized scalar values. Missing values are a single
explicit category, distinct from every literal string. No row signatures or
individual membership are returned by this module.
"""
from __future__ import annotations

import itertools
import math
import re
from collections import Counter, defaultdict
from typing import Any

import numpy as np
import pandas as pd

ASSUMPTIONS = [
    "One row per person; target membership in this released sample is known.",
    "Declared QI values are observed correctly and matched exactly.",
    "Uniform prior over source rows and uniform uncertainty within a QI class.",
]
CAVEATS = [
    "These are descriptive sample measures, not population re-identification probabilities.",
    "No outside-data linkage, incremental release leakage, or release authorization is established.",
]


def _validate(frame: pd.DataFrame, columns: list[str]) -> None:
    if not frame.columns.is_unique:
        raise ValueError("Duplicate column names are not supported")
    if len(columns) != len(set(columns)):
        raise ValueError("Repeated assessment columns are not supported")
    missing = [column for column in columns if column not in frame.columns]
    if missing:
        raise ValueError("Assessment references missing columns: " + ", ".join(missing))


def _codes(series: pd.Series) -> np.ndarray:
    # use_na_sentinel=False puts None/NA/NaN into one real category without a
    # sentinel string that could collide with an actual uploaded value.
    return pd.factorize(series, sort=False, use_na_sentinel=False)[0]


def _partition(codes: dict[str, np.ndarray], columns: tuple[str, ...], n: int):
    if not n:
        return np.array([], dtype=int), np.array([], dtype=int)
    if not columns:
        return np.zeros(n, dtype=int), np.array([n], dtype=int)
    matrix = np.column_stack([codes[column] for column in columns])
    _, inverse, counts = np.unique(matrix, axis=0, return_inverse=True, return_counts=True)
    return inverse, counts


def _summary(counts: np.ndarray, n: int) -> dict[str, Any]:
    return {
        "sample_unique": float(np.sum(counts == 1) / n) if n else 0.0,
        "k_min": int(counts.min()) if len(counts) else 0,
        "p_guess": float(len(counts) / n) if n else 0.0,
        "row_entropy_bits": float(np.sum((counts / n) * np.log2(counts))) if n else 0.0,
        "distinct_groups": int(len(counts)),
    }


def _finding(identifier: str, attack: str, narrative: str, **extra) -> dict:
    return {
        "id": identifier, "attackId": attack, "status": "implemented",
        "applicability": "row_release; declared exact-match QI on this finite table",
        "assumptions": list(ASSUMPTIONS), "narrative": narrative,
        "caveats": list(CAVEATS), "sourceId": "S3", **extra,
    }


def _wilson(successes: int, trials: int) -> list[float]:
    z = 1.959963984540054
    rate = successes / trials
    denominator = 1 + z * z / trials
    center = (rate + z * z / (2 * trials)) / denominator
    half = z * math.sqrt(rate * (1 - rate) / trials + z * z / (4 * trials * trials)) / denominator
    return [max(0.0, center - half), min(1.0, center + half)]


def _heldout_guessing(inverse: np.ndarray, secret_codes: np.ndarray) -> dict:
    """A fixed split of this table, never source-to-release row alignment.

    A majority predictor is trained only on training rows. A QI class must have
    five training observations before its conditional guess is used; otherwise
    the model falls back to the training-global majority. Both predictors are
    evaluated on exactly the same held-out rows.
    """
    n = len(inverse)
    if n < 30:
        return {"status": "not_applicable", "reason": "At least 30 rows are required for a 20+ training / 10+ test split",
                "train_rows": 0, "test_rows": 0}
    split = np.random.default_rng(42).permutation(n)
    n_test = max(10, n // 4)
    test, train = split[:n_test], split[n_test:]
    global_counts = Counter(secret_codes[train].tolist())
    majority = global_counts.most_common(1)[0][0]
    grouped = defaultdict(Counter)
    for offset in train:
        grouped[int(inverse[offset])][int(secret_codes[offset])] += 1
    modes = {group: values.most_common(1)[0][0] for group, values in grouped.items() if sum(values.values()) >= 5}
    guesses = np.array([modes.get(int(inverse[offset]), majority) for offset in test])
    successes = int(np.sum(guesses == secret_codes[test]))
    baseline_successes = int(np.sum(secret_codes[test] == majority))
    accuracy, baseline = successes / n_test, baseline_successes / n_test
    used = sum(int(inverse[offset]) in modes for offset in test)
    return {"status": "implemented", "seed": 42, "train_rows": len(train), "test_rows": n_test,
            "successes": successes, "trials": n_test, "accuracy": accuracy,
            "baseline_successes": baseline_successes, "baseline": baseline,
            "guess_advantage": accuracy - baseline, "ci95": _wilson(successes, n_test),
            "baseline_ci95": _wilson(baseline_successes, n_test),
            "conditional_guesses": used, "fallback_guesses": n_test - used, "min_train_group": 5,
            "algorithm": "Training-only class majority for QI groups with >=5 training rows; training-global majority otherwise; first-training-observation tie break",
            "interpretation": "Held-out predictability on one fixed split of this released table; not incremental release risk or an independent population validation",
            "ci_assumption": "Wilson binomial working-model interval for held-out correct guesses; a single split does not establish population generalization"}


def evaluate(frame: pd.DataFrame, qi: list[str], sensitive: list[str]) -> dict:
    """Evaluate declared QI and sensitive targets with bounded subset coverage.

    For <=10 QI all nonempty subsets are evaluated. Above 10, the first 128
    deterministic subsets of sizes 1..3 are evaluated; the full QI partition is
    still evaluated for the headline metrics. Minimum distinguishing knowledge
    is exact only when coverage is exhaustive, otherwise a found upper bound.
    """
    qi, sensitive = list(qi), list(sensitive)
    _validate(frame, qi)
    _validate(frame, sensitive)
    n = len(frame)
    coded = {column: _codes(frame[column]) for column in qi}
    inverse, counts = _partition(coded, tuple(qi), n)
    metrics = _summary(counts, n)
    metrics["prior_row_entropy_bits"] = math.log2(n) if n else 0.0
    metrics["sample_information_reduction_bits"] = (
        metrics["prior_row_entropy_bits"] - metrics["row_entropy_bits"]
    )
    findings = [
        _finding("sample-uniqueness", "sample_uniqueness",
                 f"{int(np.sum(counts == 1))} of {n} rows are unique within the declared released QI sample.",
                 numerator=int(np.sum(counts == 1)), denominator=n,
                 metricValue=metrics["sample_unique"], metricUnit="fraction",
                 severity="high" if metrics["sample_unique"] > .1 else "info"),
        _finding("sample-guess", "sample_guessing",
                 "Expected single-guess correctness under the stated uniform present-target model.",
                 numerator=len(counts), denominator=n, metricValue=metrics["p_guess"],
                 metricUnit="fraction", severity="info"),
    ]
    # A deliberately limited structured-name scanner, never a claim that PHI
    # detection is exhaustive. Role-based direct-identifier export blocking is
    # enforced by the application independently.
    id_names = [column for column in frame.columns if re.fullmatch(
        r"(record_?id|patient_?id|person_?id|name|full_?name|first_?name|last_?name|email|ssn|phone|address)",
        str(column).lower())]
    findings.append(_finding(
        "direct-identifiers", "direct_identifier_exposure",
        ("Recognized direct-identifier columns remain: " + ", ".join(id_names)) if id_names
        else "No recognized direct-identifier column names remain; manual role and free-text review is still required.",
        metricValue=len(id_names), metricUnit="columns", severity="high" if id_names else "info",
        caveats=["Name-based heuristic only; cannot clear unstructured text or misclassified columns.",
                 "Renaming or tokenizing an identifier does not establish anonymity."],
    ))

    exhaustive = len(qi) <= 10
    cap = (2 ** len(qi) - 1) if exhaustive else 128
    maximum_size = len(qi) if exhaustive else min(3, len(qi))
    subsets = []
    minimum = np.full(n, -1, dtype=int)
    # Cache partitions for the full-QI calculation and reuse it if encountered.
    partition_cache = {tuple(qi): (inverse, counts)}
    for size in range(1, maximum_size + 1):
        for columns in itertools.combinations(qi, size):
            if len(subsets) >= cap:
                break
            if columns not in partition_cache:
                partition_cache[columns] = _partition(coded, columns, n)
            subset_inverse, subset_counts = partition_cache[columns]
            subset_metrics = _summary(subset_counts, n)
            subsets.append({"columns": list(columns), "unique_fraction": subset_metrics["sample_unique"],
                            "k_min": subset_metrics["k_min"], "p_guess": subset_metrics["p_guess"]})
            if n:
                unique = subset_counts[subset_inverse] == 1
                minimum[(minimum < 0) & unique] = size
        if len(subsets) >= cap:
            break
    histogram = [{"known_fields": int(size), "count": int(np.sum(minimum == size))}
                 for size in sorted(set(minimum.tolist())) if size >= 0]
    histogram.append({"known_fields": None, "count": int(np.sum(minimum < 0))})
    total = 2 ** len(qi) - 1
    coverage = {
        "evaluated": len(subsets), "total_possible": total, "skipped": total - len(subsets),
        "exhaustive": exhaustive, "subset_cap": cap, "max_subset_size": maximum_size,
        "full_qi_evaluated": True,
        "histogram_interpretation": "exact minimum" if exhaustive else "smallest tested distinguishing subset; upper bound only",
        "not_distinguished": "not unique under any QI subset" if exhaustive else "not distinguished among tested subsets; untested subsets may distinguish",
    }
    findings.append(_finding(
        "exposure-subsets", "minimal_distinguishing_subsets",
        f"Evaluated {len(subsets)} of {total} nonempty QI subsets; minimum-known-fields histogram is aggregate only.",
        metricValue=len(subsets), metricUnit="subsets", severity="info",
        caveats=list(CAVEATS) + ([] if exhaustive else ["Subset search is bounded and incomplete."]),
    ))

    sensitive_results = []
    for column in sensitive:
        values = frame[column]
        cardinality = values.nunique(dropna=False)
        if pd.api.types.is_numeric_dtype(values) and not pd.api.types.is_bool_dtype(values) and cardinality > 20:
            sensitive_results.append({"column": column, "status": "unsupported",
                "reason": "Continuous numeric sensitive values require a declared discretization or continuous loss; categorical guessing is not run."})
            findings.append(_finding(
                f"sensitive-{column}", "sensitive_inference", "Continuous-sensitive inference is not implemented for this target.",
                status="unsupported", severity="info",
                caveats=["Do not interpret an unavailable attack as passing."]))
            continue
        secret_codes = _codes(values)
        if n:
            # Sparse observed joint cells avoid an N_groups * N_categories
            # allocation for high-cardinality categorical uploads. All sums
            # below are exact counts, including the missing category.
            joint_cells, joint_counts = np.unique(np.column_stack([inverse, secret_codes]),
                                                  axis=0, return_counts=True)
            group_ids, category_ids = joint_cells[:, 0], joint_cells[:, 1]
            prior = np.bincount(secret_codes) / n
            conditional = joint_counts / counts[group_ids]
            maxima = np.zeros(len(counts), dtype=np.int64)
            np.maximum.at(maxima, group_ids, joint_counts)
            guess = float(maxima.sum() / n)
            baseline = float(prior.max())
            diversity = np.bincount(group_ids, minlength=len(counts))
            # TV(P,Q) = 1 - sum min(P_s,Q_s); absent class categories
            # contribute zero to the minimum, so sparse sums include them.
            tv = np.clip(1 - np.bincount(group_ids, weights=np.minimum(conditional, prior[category_ids]),
                                         minlength=len(counts)), 0, 1)
            l_min = int(diversity.min())
            homogeneous_classes = int(np.sum(diversity == 1))
            homogeneous_rows = int(counts[diversity == 1].sum())
            entropy_value = float(-np.sum((joint_counts / n) * np.log2(conditional)))
        else:
            guess = baseline = entropy_value = 0.0
            l_min = homogeneous_classes = homogeneous_rows = 0
            tv = np.array([], dtype=float)
        result = {
            "column": column, "status": "implemented", "l_min": l_min,
            "p_guess": guess, "baseline": baseline, "guess_advantage": max(0.0, guess - baseline),
            "conditional_entropy_bits": entropy_value,
            "homogeneous_classes": homogeneous_classes, "homogeneous_rows": homogeneous_rows,
            "homogeneous_row_fraction": homogeneous_rows / n if n else 0.0,
            "t_max": float(tv.max()) if len(tv) else 0.0,
            "t_distance": "categorical total variation: 0.5 * sum_s |P(S=s|QI=g)-P(S=s)|; maximum over classes",
            "estimation": "in-sample empirical categorical guessing; no held-out evaluation or smoothing",
            "limitation": "Small classes can overstate inference. This is not a calibrated out-of-sample attack or incremental disclosure estimate.",
        }
        sensitive_results.append(result)
        findings.append(_finding(
            f"sensitive-{column}", "sensitive_inference",
            f"For {column}, {homogeneous_rows} of {n} rows lie in sensitive-homogeneous QI classes; in-sample guessing is {guess:.3f} versus baseline {baseline:.3f}.",
            metricValue=result["guess_advantage"], metricUnit="guessing advantage", baseline=baseline,
            numerator=homogeneous_rows, denominator=n,
            severity="high" if homogeneous_rows and (guess > baseline or l_min == 1) else "info",
            caveats=list(CAVEATS) + [result["limitation"], "Categorical total variation is not a continuous t-closeness definition."],
        ))
        heldout = _heldout_guessing(inverse, secret_codes)
        result["holdout"] = heldout
        findings.append(_finding(
            f"sensitive-holdout-{column}", "sensitive_inference",
            (f"Fixed-split held-out {column} guessing: {heldout['successes']}/{heldout['trials']} correct versus {heldout['baseline_successes']}/{heldout['trials']} using only the training-global majority."
             if heldout["status"] == "implemented" else heldout["reason"]),
            status=heldout["status"], metricValue=heldout.get("accuracy"), metricUnit="held-out correct fraction",
            numerator=heldout.get("successes"), denominator=heldout.get("trials"), baseline=heldout.get("baseline"),
            ci95=heldout.get("ci95"), severity="info",
            assumptions=["Deterministic non-DP 75/25 split (minimum 10 test rows) within this released table.",
                         "Training-only majority estimates; minimum five training rows per conditional QI class.",
                         "Row unit is one independent person; same declared QI are available to both evaluated predictors."],
            caveats=["This validates within-table held-out predictability, not an original-versus-release attack or independent population risk.",
                     "No private source-to-release row alignment is used.", "Wilson interval assumes binomial test outcomes; split reuse during optimization can overfit."],
        ))
    metrics["sensitive_guess_advantage"] = max(
        (result.get("guess_advantage", 0.0) for result in sensitive_results), default=0.0)
    return {
        "metrics": metrics, "findings": findings,
        "exposure": {"subsets": subsets, "minimal_histogram": histogram, "coverage": coverage},
        "sensitive": sensitive_results, "qi": qi, "sensitive_targets": sensitive,
        "row_count": n, "assumptions": list(ASSUMPTIONS), "limitations": list(CAVEATS),
        "sensitive_inference_coverage": {"requested": len(sensitive),
            "implemented": sum(result["status"] == "implemented" for result in sensitive_results)},
        "assessment": "mixed" if any(f.get("severity") == "high" for f in findings) else "descriptive_only",
        "release_cleared": False,
    }
