import itertools
import math

import pandas as pd
import pytest

from backend.app import risk


def test_hand_worked_sample_guessing_and_entropy():
    frame = pd.DataFrame({"qi": ["a", "b", "b", "c"]})
    result = risk.evaluate(frame, ["qi"], [])
    assert result["metrics"]["sample_unique"] == .5
    assert result["metrics"]["k_min"] == 1
    assert result["metrics"]["p_guess"] == .75
    assert result["metrics"]["row_entropy_bits"] == .5
    assert result["metrics"]["sample_information_reduction_bits"] == 1.5
    assert result["release_cleared"] is False


def test_names_removed_does_not_remove_qi_uniqueness():
    frame = pd.DataFrame({"name": ["a", "b", "c", "d"], "age": [20, 30, 40, 50]})
    assert risk.evaluate(frame.drop(columns="name"), ["age"], [])["metrics"]["sample_unique"] == 1


def test_k_five_does_not_prevent_sensitive_homogeneity():
    frame = pd.DataFrame({"group": ["a"] * 5 + ["b"] * 5, "diagnosis": ["x"] * 5 + ["y"] * 5})
    result = risk.evaluate(frame, ["group"], ["diagnosis"])
    assert result["metrics"]["k_min"] == 5
    assert result["metrics"]["sample_unique"] == 0
    sensitive = result["sensitive"][0]
    assert sensitive["l_min"] == 1
    assert sensitive["p_guess"] == 1
    assert sensitive["guess_advantage"] == .5
    assert sensitive["t_max"] == .5
    assert sensitive["homogeneous_row_fraction"] == 1
    assert result["assessment"] == "mixed"
    assert "in-sample" in sensitive["estimation"]


def test_missing_is_one_category_distinct_from_literal_sentinel():
    frame = pd.DataFrame({"a": [None, float("nan"), "<missing>", "<missing>"],
                          "b": [0, 0, 1, 2], "s": ["x", None, "y", "y"]})
    single = risk.evaluate(frame, ["a"], ["s"])
    assert single["metrics"]["k_min"] == 2
    assert single["metrics"]["sample_unique"] == 0
    assert single["sensitive"][0]["l_min"] == 1
    assert risk.evaluate(frame, ["a", "b"], [])["metrics"]["sample_unique"] == .5


def test_subset_refinement_invariant_with_missing_values():
    frame = pd.DataFrame({"a": [None, None, "a", "a", "b", "b", "c", "c"],
                          "b": [0, 1, 0, 0, 1, None, 2, 2], "c": [1, 1, 2, 3, 4, 4, 5, 5]})
    result = risk.evaluate(frame, ["a", "b", "c"], [])
    subsets = {tuple(item["columns"]): item for item in result["exposure"]["subsets"]}
    for small, large in itertools.permutations(subsets, 2):
        if set(small) < set(large):
            assert subsets[small]["unique_fraction"] <= subsets[large]["unique_fraction"]
    coded = {column: risk._codes(frame[column]) for column in frame}
    for small in (("a",), ("b",), ("a", "b")):
        small_inverse, small_counts = risk._partition(coded, small, len(frame))
        full_inverse, full_counts = risk._partition(coded, tuple(frame.columns), len(frame))
        assert (full_counts[full_inverse] <= small_counts[small_inverse]).all()
    assert result["exposure"]["coverage"]["exhaustive"]
    assert sum(item["count"] for item in result["exposure"]["minimal_histogram"]) == len(frame)


def test_large_qi_coverage_is_bounded_and_explicit():
    frame = pd.DataFrame({f"q{i}": [0, 0, 1, 1] for i in range(11)})
    result = risk.evaluate(frame, list(frame), [])
    coverage = result["exposure"]["coverage"]
    assert coverage["evaluated"] == 128
    assert coverage["total_possible"] == 2047
    assert coverage["skipped"] == 1919
    assert not coverage["exhaustive"]
    assert coverage["full_qi_evaluated"]
    assert max(len(item["columns"]) for item in result["exposure"]["subsets"]) <= 3


def test_empty_and_empty_qi_semantics_and_input_validation():
    result = risk.evaluate(pd.DataFrame({"a": [1, 2, 3, 4]}), [], [])
    assert result["metrics"]["k_min"] == 4
    assert result["metrics"]["p_guess"] == .25
    assert result["metrics"]["row_entropy_bits"] == 2
    assert risk.evaluate(pd.DataFrame({"a": []}), ["a"], [])["metrics"]["k_min"] == 0
    with pytest.raises(ValueError, match="missing"):
        risk.evaluate(pd.DataFrame({"a": [1]}), ["missing"], [])


def test_continuous_sensitive_guessing_is_explicitly_unsupported():
    frame = pd.DataFrame({"q": ["a"] * 30, "s": list(range(30))})
    result = risk.evaluate(frame, ["q"], ["s"])
    assert result["sensitive"][0]["status"] == "unsupported"
    assert result["sensitive_inference_coverage"] == {"requested": 1, "implemented": 0}


def test_deterministic_metrics_reproducible():
    frame = pd.DataFrame({"q": [None, None, "a", "b"], "s": [1, 0, 1, 1]})
    assert risk.evaluate(frame, ["q"], ["s"]) == risk.evaluate(frame, ["q"], ["s"])


def test_heldout_predictability_uses_training_only_groups_and_honest_fallback():
    frame = pd.DataFrame({"q": ["a"] * 50 + ["b"] * 50, "s": ["x"] * 50 + ["y"] * 50})
    result = risk.evaluate(frame, ["q"], ["s"])
    heldout = result["sensitive"][0]["holdout"]
    assert heldout["status"] == "implemented"
    assert heldout["train_rows"] == 75
    assert heldout["test_rows"] == heldout["successes"] == 25
    assert heldout["accuracy"] == 1
    assert heldout["baseline"] < 1
    assert heldout["conditional_guesses"] == 25
    assert 0 <= heldout["ci95"][0] < heldout["ci95"][1] <= 1
    assert risk.evaluate(frame, ["q"], ["s"])["sensitive"][0]["holdout"] == heldout
    unique = frame.assign(q=list(range(100)))
    fallback = risk.evaluate(unique, ["q"], ["s"])["sensitive"][0]["holdout"]
    assert fallback["fallback_guesses"] == 25
    assert fallback["conditional_guesses"] == 0
    assert fallback["accuracy"] == fallback["baseline"]
    assert fallback["guess_advantage"] == 0
    assert risk.evaluate(frame.head(10), ["q"], ["s"])["sensitive"][0]["holdout"]["status"] == "not_applicable"


def test_high_cardinality_categorical_sensitive_values_remain_bounded_and_exact():
    frame = pd.DataFrame({"q": list(range(5000)), "s": [f"category-{i}" for i in range(5000)]})
    result = risk.evaluate(frame, ["q"], ["s"])["sensitive"][0]
    assert result["l_min"] == 1
    assert result["p_guess"] == 1
    assert result["baseline"] == 1 / 5000
    assert result["t_max"] == pytest.approx(1 - 1 / 5000)
    assert result["conditional_entropy_bits"] == 0
