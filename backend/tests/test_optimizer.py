import pandas as pd
import pytest

from backend.app import datasets, optimizer, risk, transforms, utility


@pytest.fixture(scope="module")
def search_result():
    frame = datasets.synthetic_oncology(n=350, seed=42)
    schema = datasets.profile(frame)
    qi = [field["name"] for field in schema if field["role"] == "quasi_identifier"]
    workload = [{"id": "response", "type": "group_rate", "groupBy": ["stage"], "target": "response",
                 "weight": 1, "tolerance": .05, "minCohort": 5},
                {"id": "mean-age", "type": "group_mean", "groupBy": ["stage"], "target": "age",
                 "weight": 1, "tolerance": 2, "minCohort": 5}]
    return frame, schema, qi, workload, optimizer.search(frame, schema, qi, ["mutation"], workload, max_candidates=24)


def test_bounded_search_runs_at_least_twelve_actual_distinct_recipes(search_result):
    frame, schema, qi, workload, result = search_result
    assert result["evaluated"] == len(result["candidates"]) == 24
    assert result["cap"] == 24
    assert result["termination"] == "cap_reached"
    assert len({candidate["recipeHash"] for candidate in result["candidates"]}) == 24
    # Reproduce one nontrivial candidate through the production transform path.
    candidate = result["candidates"][2]
    protected, lineage, _ = transforms.apply(frame, schema, candidate["recipe"]["steps"], seed=42)
    rerisk = risk.evaluate(protected, [column for column in qi if column in protected], ["mutation"])
    assert candidate["risk"]["metrics"] == rerisk["metrics"]
    assert candidate["utility"] == utility.evaluate(frame, protected, schema, workload, lineage=lineage)


def test_frontier_membership_is_recomputable_and_targets_not_mutated(search_result):
    _, schema, _, _, result = search_result
    vectors = [optimizer.objective_vector(candidate) for candidate in result["candidates"]]
    protected_targets = {field["name"] for field in schema if field["role"] == "research_target"}
    for index, candidate in enumerate(result["candidates"]):
        assert candidate["frontierMember"] == (not any(optimizer.dominates(other, vectors[index])
                                                      for j, other in enumerate(vectors) if j != index))
        assert not ({column for step in candidate["recipe"]["steps"] for column in step["columns"]} & protected_targets)
        assert candidate["feasible"] == all(check["pass"] for check in candidate["constraints"])
    assert result["informationValue"]
    assert any(entry["status"] == "implemented" for entry in result["informationValue"])


def test_explicit_low_cap_and_constraints_are_respected(search_result):
    frame, schema, qi, workload, _ = search_result
    result = optimizer.search(frame, schema, qi, ["mutation"], workload, max_candidates=3,
                              constraints={"minK": 10000, "maxSuppression": 0, "maxUnique": 0, "maxLoss": 0})
    assert result["evaluated"] == 3
    assert result["feasibleCount"] == 0
    assert all(not candidate["feasible"] for candidate in result["candidates"])
    with pytest.raises(ValueError):
        optimizer.search(frame, schema, qi, ["mutation"], workload, constraints={"maxSuppression": -1})


def test_unavailable_inference_cannot_be_reported_as_constraint_success():
    frame = pd.DataFrame({"q": [0] * 30, "secret": list(range(30))})
    schema = [{"name": "q", "role": "quasi_identifier", "dtype": "integer", "importance": 1},
              {"name": "secret", "role": "sensitive", "dtype": "float", "importance": 1}]
    result = optimizer.search(frame, schema, ["q"], ["secret"], [], max_candidates=1)
    candidate = result["candidates"][0]
    assert candidate["objectives"]["sensitive_guess_advantage"] == 1
    assert any(check["id"] == "sensitive-inference-coverage" and not check["pass"] for check in candidate["constraints"])
