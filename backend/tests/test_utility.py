import pandas as pd
import pytest

from backend.app import utility


def schema(frame):
    return [{"name": name, "dtype": "float" if name == "age" else "boolean" if name == "response" else "category",
             "role": "quasi_identifier" if name == "age" else "research_target", "importance": 1} for name in frame]


def test_equal_marginals_opposite_correlation_has_high_query_loss():
    original = pd.DataFrame({"age": [20, 30, 40, 50, 60, 70], "response": [0, 0, 0, 1, 1, 1]})
    reversed_frame = original.assign(response=original.response.iloc[::-1].to_numpy())
    query = {"id": "association", "type": "correlation", "groupBy": ["age"], "target": "response",
             "weight": 3, "tolerance": .1, "minCohort": 3}
    result = utility.evaluate(original, reversed_frame, schema(original), [query])
    assert original.age.mean() == reversed_frame.age.mean()
    assert original.response.mean() == reversed_frame.response.mean()
    assert result["loss"] == 1
    assert result["queries"][0]["signFlip"]
    assert not result["queries"][0]["pass"]
    assert result["queries"][0]["original"] == pytest.approx(original.age.corr(original.response))
    assert result["correlations"][0]["sign_flip"]


def test_rates_counts_means_and_difference_are_actual_calculations():
    frame = pd.DataFrame({"group": ["a"] * 4 + ["b"] * 4,
                          "response": [0, 1, 1, 1, 0, 0, 0, 1], "age": [20, 30, 40, 50, 60, 70, 80, 90]})
    workload = [{"id": kind, "type": kind, "groupBy": ["group"], "target": "age" if kind == "group_mean" else "response",
                 "weight": 1, "tolerance": .1, "minCohort": 4}
                for kind in ("group_rate", "group_count", "group_mean", "difference_in_rates")]
    result = utility.evaluate(frame, frame.copy(), schema(frame), workload)
    queries = {query["id"]: query for query in result["queries"]}
    assert [record["value"] for record in queries["group_rate"]["original"]] == [.75, .25]
    assert [record["value"] for record in queries["group_count"]["original"]] == [4, 4]
    assert [record["value"] for record in queries["group_mean"]["original"]] == [35, 75]
    assert queries["difference_in_rates"]["original"] == -.5
    assert result["loss"] == 0
    assert all(query["pass"] for query in result["queries"])
    assert len(queries["group_rate"]["original"][0]["ci95"]) == 2


def test_weighted_loss_and_hard_cohort_constraints_cannot_average_away():
    frame = pd.DataFrame({"response": [0, 0, 1, 1], "group": ["a", "a", "b", "b"]})
    protected = frame.assign(response=1)
    workload = [{"id": "rate", "type": "group_rate", "target": "response", "weight": 3, "tolerance": .5, "minCohort": 1},
                {"id": "count", "type": "group_count", "weight": 1, "tolerance": 1, "minCohort": 1}]
    result = utility.evaluate(frame, protected, schema(frame), workload)
    assert result["loss"] == .75
    assert result["queries"][0]["error"] == .5
    assert result["queries"][0]["pass"]  # A declared tolerance boundary passes.
    workload[0].update(groupBy=["group"], minCohort=3)
    failed = utility.evaluate(frame, frame.copy(), schema(frame), workload)["queries"][0]
    assert failed["error"] == 0
    assert not failed["pass"]
    assert failed["normalizedError"] == 1


def test_missing_dropped_and_undefined_queries_fail_honestly():
    frame = pd.DataFrame({"age": [1, 2, 3], "response": [1, 1, 1]})
    query = {"id": "corr", "type": "correlation", "groupBy": ["age"], "target": "response", "tolerance": .1}
    result = utility.evaluate(frame, frame.copy(), schema(frame), [query])
    assert result["queries"][0]["protected"] is None
    assert result["loss"] == 1
    dropped = utility.evaluate(frame, frame.drop(columns="age"), schema(frame), [query])
    assert dropped["queries"][0]["status"] == "unavailable"
    assert not dropped["queries"][0]["pass"]
    assert dropped["loss"] is None
    assert not dropped["workloadCoverageComplete"]


def test_band_midpoints_are_explicit_approximation_and_unpaired_is_aggregate():
    frame = pd.DataFrame({"age": [20, 25, 30, 35], "response": [0, 0, 1, 1]})
    protected = frame.assign(age=["[20,25)", "[25,30)", "[30,35)", "[35,40)"])
    query = {"id": "mean", "type": "group_mean", "target": "age", "tolerance": 3, "minCohort": 2}
    result = utility.evaluate(frame, protected, schema(frame), [query])
    assert result["queries"][0]["protected"] == 30
    assert result["queries"][0]["error"] == 2.5
    assert result["distributions"][0]["midpoint_approximation"]
    assert any("midpoints" in warning for warning in result["warnings"])
    assert result["alignment"] == "unpaired"
    with pytest.raises(ValueError, match="Lineage"):
        utility.evaluate(frame, protected, schema(frame), [query], lineage=[0, 0, 1, 2])


def test_empty_cohorts_missing_group_and_boolean_rates():
    frame = pd.DataFrame({"group": [None, None, "a", "a"], "response": ["true", "false", "true", None]})
    query = {"id": "rate", "type": "group_rate", "groupBy": ["group"], "target": "response", "tolerance": .1}
    result = utility.evaluate(frame, frame.copy(), schema(frame), [query])
    assert result["loss"] == 0
    assert any(record["group"]["group"] is None for record in result["queries"][0]["original"])
    query["filter"] = {"group": "absent"}
    empty = utility.evaluate(frame, frame.copy(), schema(frame), [query])
    assert not empty["queries"][0]["pass"]
    assert empty["loss"] == 1


def test_missing_workload_has_no_invented_utility_score():
    frame = pd.DataFrame({"age": [1, 2]})
    assert utility.evaluate(frame, frame, schema(frame), [])["loss"] is None


@pytest.mark.parametrize("kind", ["group_count", "group_rate"])
def test_interval_threshold_straddle_abstains_instead_of_midpoint_count(kind):
    original = pd.DataFrame({"age": [20, 21, 25, 26], "response": [0, 1, 0, 1]})
    protected = original.assign(age=["[20,25)", "[20,25)", "[25,30)", "[25,30)"])
    query = {"id": "threshold", "type": kind, "target": "response", "filter": {"age": {"gte": 23}},
             "weight": 1, "tolerance": .05, "minCohort": 1}
    result = utility.evaluate(original, protected, schema(original), [query])
    compared = result["queries"][0]
    assert compared["status"] == "unavailable"
    assert compared["protected"] is None
    assert compared["inclusionBounds"] == {"original": [2, 2], "protected": [2, 4]}
    assert compared["filterCoverage"]["protected"]["uncertain"] == 2
    assert result["loss"] is None
    query["filter"] = {"age": {"gte": 25}}
    boundary = utility.evaluate(original, protected, schema(original), [query])["queries"][0]
    assert boundary["status"] == "implemented"
    assert boundary["filterCoverage"]["protected"]["exact"]
    assert boundary["filterCoverage"]["protected"]["definite"] == 2
    assert boundary["pass"]


def test_interval_membership_filters_and_nonnumeric_thresholds_are_not_coerced():
    original = pd.DataFrame({"age": [20, 21, 25, 26]})
    protected = original.assign(age=["[20,25)"] * 2 + ["[25,30)"] * 2)
    for condition in (22, {"in": [22, 30]}, {"gt": 25}):
        query = {"id": "threshold", "type": "group_count", "filter": {"age": condition}, "tolerance": 1}
        assert utility.evaluate(original, protected, schema(original), [query])["queries"][0]["status"] == "unavailable"
    invalid = pd.DataFrame({"age": [20, "unknown"]})
    query = {"id": "invalid", "type": "group_count", "filter": {"age": {"gte": 20}}, "tolerance": 1}
    assert utility.evaluate(invalid, invalid, schema(invalid), [query])["queries"][0]["status"] == "unavailable"


def test_common_interval_and_prefix_domains_separate_semantics_from_lexical_tv():
    original = pd.DataFrame({"age": [20, 21, 25, 26], "zip": ["33127", "33128", "10001", "10002"]})
    protected = pd.DataFrame({"age": ["[20,25)"] * 2 + ["[25,30)"] * 2, "zip": ["331", "331", "100", "100"]})
    result = utility.evaluate(original, protected, schema(original), [])
    for distribution in result["distributions"]:
        assert distribution["lexicalTv"] == 1
        semantic = distribution["semanticComparison"]
        assert semantic["status"] == "implemented"
        assert semantic["tv"] == 0
        assert sum(item["count"] for item in semantic["original"]) == 4
        assert sum(item["count"] for item in semantic["protected"]) == 4
    declared = [{"name": "color", "dtype": "category", "role": "other", "importance": 1,
                 "generalization": {"type": "category_map", "params": {"mapping": {"blue": "light", "brown": "dark"}}}}]
    comparison = utility.evaluate(pd.DataFrame({"color": ["blue", "brown"]}), pd.DataFrame({"color": ["light", "dark"]}), declared, [])["distributions"][0]
    assert comparison["semanticComparison"]["tv"] == 0
    undeclared = [{key: value for key, value in declared[0].items() if key != "generalization"}]
    comparison = utility.evaluate(pd.DataFrame({"color": ["blue", "brown"]}), pd.DataFrame({"color": ["OTHER", "OTHER"]}), undeclared, [])["distributions"][0]
    assert comparison["semanticComparison"]["status"] == "unavailable"
    assert comparison["semanticComparison"]["tv"] is None


def test_rare_subgroup_suppression_retention_is_visible_and_fidelity_abstains():
    original = pd.DataFrame({"group": ["common"] * 90 + ["rare"] * 10,
                             "response": [1] * 100, "age": list(range(100))})
    protected = original.iloc[:90].copy().reset_index(drop=True)
    workload = [{"id": "rate", "type": "group_rate", "groupBy": ["group"], "target": "response",
                 "weight": 1, "tolerance": .05, "minCohort": 5}]
    result = utility.evaluate(original, protected, schema(original), workload, lineage=list(range(90)))
    rare = next(item for item in result["subgroups"] if item["group"] == {"group": "rare"})
    assert rare["retention"] == 0
    assert rare["retainedCount"] == 0
    assert rare["cohortCountDifference"] == -10
    assert rare["status"] == "insufficient_evidence"
    assert rare["queries"] == []
    assert result["worstSubgroup"]["worstRetention"]["retention"] == 0
    assert result["worstSubgroup"]["insufficientEvidence"] == 1
    unpaired = utility.evaluate(original, protected, schema(original), workload)
    assert all(item["retention"] is None for item in unpaired["subgroups"])


def test_subgroup_correlation_reversal_is_visible_when_global_sign_is_preserved():
    original = pd.DataFrame({"group": ["a"] * 5 + ["b"] * 5,
                             "age": list(range(5)) + list(range(100, 105)),
                             "response": list(range(5)) + list(range(100, 105))})
    protected = original.assign(response=list(range(4, -1, -1)) + list(range(104, 99, -1)))
    workload = [{"id": "association", "type": "correlation", "groupBy": ["age"], "target": "response",
                 "weight": 1, "tolerance": .1, "minCohort": 3}]
    result = utility.evaluate(original, protected, schema(original), workload, lineage=list(range(10)), subgroup_by=["group"])
    assert not result["queries"][0]["signFlip"]
    assert result["queries"][0]["pass"]
    assert len(result["subgroups"]) == 2
    assert all(item["correlations"][0]["sign_flip"] for item in result["subgroups"])
    assert result["worstSubgroup"]["worstQuery"]["normalizedError"] == 1
    assert result["worstSubgroup"]["worstQuery"]["signFlip"]


def test_pounds_to_kg_utility_requires_verified_metadata_and_normalizes_native_tolerance():
    from backend.app import datasets, transforms
    original = pd.DataFrame({"weight": [100., 150., 200., 250.], "response": [0, 0, 1, 1]})
    fields = datasets.profile(original)
    weight = next(field for field in fields if field["name"] == "weight")
    weight["unit"] = "lb"
    protected, lineage, _ = transforms.apply(original, fields, [{"method": "band", "columns": ["weight"], "params": {"width": 5, "convertFrom": "lb"}}])
    workload = [{"id": "mean", "type": "group_mean", "target": "weight", "tolerance": 10, "minCohort": 1}]
    result = utility.evaluate(original, protected, fields, workload, lineage=lineage)
    assert result["unitComparisons"][0]["status"] == "implemented"
    assert result["queries"][0]["original"] == pytest.approx(original.weight.mean() * .45359237)
    assert result["queries"][0]["tolerance"] == pytest.approx(10 * .45359237)
    assert result["queries"][0]["inputTolerance"] == 10
    assert result["queries"][0]["comparisonUnit"] == "kg"
    assert "[kg; source lb converted]" in result["queries"][0]["label"]
    assert result["distributions"][0]["unit"] == "kg"
    assert original.weight.tolist() == [100., 150., 200., 250.]
    count_query = {"id": "threshold", "type": "group_count", "filter": {"weight": {"gte": 150}}, "tolerance": 2}
    count = utility.evaluate(original, protected, fields, [count_query])["queries"][0]
    assert count["tolerance"] == 2
    assert count["inclusionBounds"] == {"original": [3, 3], "protected": [2, 3]}
    external = protected.copy()
    external.attrs = {}
    unverified = utility.evaluate(original, external, fields, workload)
    assert unverified["loss"] is None
    assert unverified["queries"][0]["status"] == "unavailable"
    assert unverified["distributions"][0]["status"] == "unavailable"
    assert unverified["distributions"][0]["protected"] == []
    assert unverified["correlations"][0]["status"] == "unavailable"
    external.attrs = {"units": {"weight": "kg"}}
    assert utility.evaluate(original, external, fields, workload)["loss"] is None
