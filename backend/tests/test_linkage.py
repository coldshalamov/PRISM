import copy
import json

import numpy as np
import pandas as pd
import pytest

from app import datasets, linkage, transforms, utility


def test_original_kit_counts_and_compatible_research_queries():
    fixture = linkage.kit_fixture()
    original = fixture["frame"]
    assert len(original) == 480 and original.attrs["synthetic"]
    assert original["zip"].str.startswith("0").any()
    protected, lineage, _ = transforms.apply(original, fixture["schema"], fixture["defaultSteps"])
    finding = linkage.evaluate(original, protected, fixture["schema"], fixture["defaultSteps"], lineage, qi=fixture["qi"])
    assert finding["status"] == "implemented"
    assert finding["attackId"] == "verified_exact_linkage"
    assert finding["numerator"] == 75 and finding["denominator"] == 480
    assert finding["metricValue"] == 75 / 480
    assert finding["matchedTargets"] == 480
    # Removing ZIP leaves the source-target denominator unchanged.
    removed_steps = [step for step in copy.deepcopy(fixture["defaultSteps"]) if step["method"] != "zip_prefix"]
    removed_steps.append({"method": "drop", "columns": ["zip"], "params": {}})
    protected, lineage, _ = transforms.apply(original, fixture["schema"], removed_steps)
    without_zip = linkage.evaluate(original, protected, fixture["schema"], removed_steps, lineage, qi=fixture["qi"])
    assert without_zip["numerator"] == 20 and without_zip["denominator"] == 480
    scientific = utility.evaluate(original, protected, fixture["schema"], fixture["defaultWorkload"], lineage=lineage)
    assert all(query["pass"] for query in scientific["queries"])
    assert scientific["queries"][2]["error"] == pytest.approx(0.005826122846, abs=1e-10)


def test_matching_ignores_row_order_and_lineage_only_scores_afterward():
    original = pd.DataFrame({"age": [21, 42, 63, 84], "diagnosis": [0, 0, 1, 1]})
    schema = datasets.profile(original)
    protected = original.iloc[[2, 0, 3, 1]].reset_index(drop=True)
    correct = linkage.evaluate(original, protected, schema, [], [2, 0, 3, 1], qi=["age"])
    wrong = linkage.evaluate(original, protected, schema, [], [0, 1, 2, 3], qi=["age"])
    assert correct["numerator"] == 4 and wrong["numerator"] == 0
    assert correct["matchedTargets"] == wrong["matchedTargets"] == 4
    assert correct["uniqueCandidateTargets"] == wrong["uniqueCandidateTargets"] == 4
    assert wrong["uniqueIncorrectMatches"] == 4
    serialized = json.dumps(correct)
    assert "lineage" not in correct and "examples" not in correct
    assert "source_position" not in serialized and "target_position" not in serialized


def test_missing_values_do_not_collide_with_literal_and_suppressed_targets_stay():
    original = pd.DataFrame({"known": [None, np.nan, "<missing>", "rare"]})
    schema = datasets.profile(original)
    protected = original.iloc[[0, 1, 2]].reset_index(drop=True)
    finding = linkage.evaluate(original, protected, schema, [], [0, 1, 2], qi=["known"])
    assert finding["numerator"] == 1 and finding["denominator"] == 4
    assert finding["ambiguousTargets"] == 2 and finding["unmatchedTargets"] == 1
    assert finding["suppressedTargets"] == 1
    assert finding["expectedCorrectRandomTiebreakFraction"] == 0.5


@pytest.mark.parametrize("method", ["noise", "permute", "date_shift", "pseudonymize", "redact", "rare_group", "suppress_cells", "future_unknown"])
def test_nonpublic_or_unsupported_known_field_replay_abstains(method):
    original = pd.DataFrame({"age": [20, 40, 60]})
    step = {"method": method, "columns": ["age"], "params": {}}
    finding = linkage.evaluate(original, original, datasets.profile(original), [step], [0, 1, 2], qi=["age"])
    assert finding["status"] == "not_applicable"
    assert finding["numerator"] is None and finding["metricValue"] is None


def test_random_methods_on_other_fields_do_not_block_known_field_match():
    original = pd.DataFrame({"age": [20, 40, 60], "response": [0, 1, 0]})
    steps = [{"method": "permute", "columns": ["response"], "params": {}}]
    finding = linkage.evaluate(original, original, datasets.profile(original), steps, [0, 1, 2], qi=["age"])
    assert finding["status"] == "implemented" and finding["numerator"] == 3


def test_coarse_public_generalization_has_a_genuine_zero_unique_match_control():
    original = pd.DataFrame({"age": [21, 22, 41, 42]})
    schema = datasets.profile(original)
    steps = [{"method": "band", "columns": ["age"], "params": {"width": 20}}]
    protected, lineage, _ = transforms.apply(original, schema, steps)
    finding = linkage.evaluate(original, protected, schema, steps, lineage)
    assert finding["status"] == "implemented" and finding["metricValue"] == 0
    assert finding["ambiguousTargets"] == 4 and finding["matchedTargets"] == 4
    assert finding["expectedCorrectRandomTiebreakFraction"] == 0.5


def test_public_bands_round_mask_topcode_and_date_replay():
    original = pd.DataFrame({"age": [20, 21, 40, 41], "value": [1.123, 1.223, 4.5, 6.7], "date": ["2020-01-01", "2020-02-01", "2022-01-01", "2022-02-01"], "kind": ["a", "b", "c", "d"]})
    schema = datasets.profile(original)
    steps = [
        {"method": "band", "columns": ["age"], "params": {"width": 5}},
        {"method": "round", "columns": ["value"], "params": {"decimals": 1}},
        {"method": "top_bottom", "columns": ["value"], "params": {"max": 5}},
        {"method": "date_generalize", "columns": ["date"], "params": {"precision": "year"}},
        {"method": "mask", "columns": ["kind"], "params": {}},
    ]
    protected, lineage, _ = transforms.apply(original, schema, steps)
    finding = linkage.evaluate(original, protected, schema, steps, lineage, qi=list(original))
    assert finding["status"] == "implemented" and finding["numerator"] == 4


def test_unverified_correspondence_unknown_membership_empty_fields_unavailable():
    original = pd.DataFrame({"age": [20, 40, 60]})
    schema = datasets.profile(original)
    for kwargs in [{"lineage": None}, {"lineage": [0, 1, 2], "membership_known": False}, {"lineage": [0, 1, 2], "qi": []}]:
        finding = linkage.evaluate(original, original, schema, [], **kwargs)
        assert finding["status"] == "not_applicable" and finding["metricValue"] is None
    empty = linkage.evaluate(original, original.iloc[:0], schema, [], [])
    assert empty["status"] == "not_applicable" and empty["metricValue"] is None
    unknown_recipe = linkage.evaluate(original, original, schema, None, [0, 1, 2])
    assert unknown_recipe["status"] == "not_applicable" and unknown_recipe["metricValue"] is None


@pytest.mark.parametrize("lineage", [[0, 0, 2], [0, 1], [0, 1, 9], [0, 1, True]])
def test_invalid_lineage_rejected(lineage):
    original = pd.DataFrame({"age": [20, 40, 60]})
    with pytest.raises(ValueError):
        linkage.evaluate(original, original, datasets.profile(original), [], lineage)


def test_cap_and_nonreplayable_type_rejection(monkeypatch):
    original = pd.DataFrame({"age": [20, 40, 60]})
    schema = datasets.profile(original)
    monkeypatch.setattr(linkage, "MAX_ROWS", 2)
    with pytest.raises(ValueError, match="bounded"):
        linkage.evaluate(original, original, schema, [], [0, 1, 2])
    monkeypatch.setattr(linkage, "MAX_ROWS", 100000)
    bad = linkage.evaluate(original, original, schema, [{"method": "band", "columns": ["age"], "params": {"width": 0}}], [0, 1, 2])
    assert bad["status"] == "not_applicable" and bad["metricValue"] is None
