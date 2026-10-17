"""Deterministic, memoized candidate search with recomputable Pareto flags."""
from __future__ import annotations

import copy
import hashlib
import json
import math

import pandas as pd

from . import risk, transforms, utility

OBJECTIVES = ["sample_unique", "sensitive_guess_advantage", "suppression_rate", "scientific_query_loss"]


def objective_vector(candidate: dict) -> list[float]:
    """All objectives are minimized; absent scientific evidence is worst (1)."""
    metrics = candidate["risk"]["metrics"]
    inference = (1.0 if any(target.get("status") != "implemented" for target in candidate["risk"].get("sensitive", []))
                 else float(metrics["sensitive_guess_advantage"]))
    return [float(metrics["sample_unique"]), inference,
            float(candidate.get("suppression_rate", 0)),
            float(candidate["utility"]["loss"]) if candidate["utility"]["loss"] is not None else 1.0]


def dominates(left: list[float], right: list[float]) -> bool:
    return all(a <= b for a, b in zip(left, right)) and any(a < b for a, b in zip(left, right))


def mark_frontier(candidates: list[dict]) -> None:
    """Mark objective nondominance independently from constraint feasibility."""
    vectors = [objective_vector(candidate) for candidate in candidates]
    for index, candidate in enumerate(candidates):
        candidate["objectives"] = dict(zip(OBJECTIVES, vectors[index]))
        candidate["frontierMember"] = not any(dominates(other, vectors[index])
                                               for j, other in enumerate(vectors) if index != j)
        candidate["feasible"] = all(check["pass"] for check in candidate["constraints"])


def check_constraints(frame: pd.DataFrame, schema: list[dict], risk_result: dict,
                      utility_result: dict, suppression: float, constraints: dict | None = None) -> list[dict]:
    supplied = constraints or {}
    defaults = {"minK": 5, "maxSuppression": .10, "maxUnique": .10, "maxLoss": .35}
    limits = {**defaults, **supplied}
    for name in defaults:
        value = limits[name]
        if not isinstance(value, (float, int)) or not math.isfinite(value):
            raise ValueError(f"Constraint {name} must be finite")
        if (name == "minK" and (value < 1 or int(value) != value)) or (name != "minK" and not 0 <= value <= 1):
            raise ValueError(f"Constraint {name} is outside its valid range")
    remaining = [field["name"] for field in schema
                 if field.get("role") == "direct_identifier" and field["name"] in frame]
    metrics = risk_result["metrics"]
    loss = utility_result["loss"]
    checks = [
        {"id": "direct-identifiers", "pass": not remaining,
         "reason": "Declared direct identifiers removed" if not remaining else "Declared direct identifiers remain in release"},
        {"id": "min-k", "pass": metrics["k_min"] >= limits["minK"] and len(frame) > 0,
         "reason": f"Measured sample k={metrics['k_min']}; required k≥{limits['minK']} on remaining declared QI"},
        {"id": "max-suppression", "pass": suppression <= limits["maxSuppression"] + 1e-12,
         "reason": f"Row suppression {suppression:.4f}; cap {limits['maxSuppression']:.4f}"},
        {"id": "max-unique", "pass": metrics["sample_unique"] <= limits["maxUnique"] + 1e-12,
         "reason": f"Sample uniqueness {metrics['sample_unique']:.4f}; cap {limits['maxUnique']:.4f}"},
        {"id": "max-loss", "pass": loss is not None and loss <= limits["maxLoss"] + 1e-12,
         "reason": f"Research workload loss {loss if loss is not None else 'unavailable'}; cap {limits['maxLoss']}"},
    ]
    checks.extend({"id": "query:" + query["id"], "pass": query["pass"],
                   "reason": f"{query['label']}: absolute error {query['error']}; tolerance {query['tolerance']}" +
                   ("; " + "; ".join(query["issues"]) if query["issues"] else "")}
                  for query in utility_result["queries"])
    if any(target.get("status") != "implemented" for target in risk_result.get("sensitive", [])):
        checks.append({"id": "sensitive-inference-coverage", "pass": False,
                       "reason": "A requested sensitive inference target is unsupported; unavailable is not a passing attack"})
    return checks


def _canonical(steps: list[dict], seed: int) -> str:
    return hashlib.sha256(json.dumps({"steps": steps, "seed": seed, "version": "1.0"},
                                     sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def _library(frame: pd.DataFrame, schema: list[dict], qi: list[str]):
    """Finite coordinate grammar. Research-target roles are immutable."""
    identifiers = [field["name"] for field in schema if field.get("role") == "direct_identifier" and field["name"] in frame]
    protected_targets = {field["name"] for field in schema if field.get("role") == "research_target"}
    base = [{"method": "drop", "columns": identifiers, "params": {}}] if identifiers else []
    dimensions = []
    field_map = {field["name"]: field for field in schema}
    for column in qi:
        if column not in frame or column in protected_targets or column in identifiers:
            continue
        field = field_map.get(column, {})
        dtype = field.get("dtype")
        choices = [None]
        if column.lower() in {"zip", "zipcode", "zip_code", "postal_code"}:
            choices.extend({"method": "zip_prefix", "columns": [column], "params": {"length": size}}
                           for size in (3, 2, 1))
        elif dtype in {"integer", "float"}:
            # Unitless/generic weight fields must be reviewed before applying
            # any kilogram bin; the transformer enforces the same boundary.
            if column.lower() == "weight" and field.get("unit") != "kg":
                choices = [None]
            else:
                choices.extend({"method": "band", "columns": [column], "params": {"width": width}}
                               for width in (5, 10, 20))
        elif dtype == "date":
            choices.extend({"method": "date_generalize", "columns": [column], "params": {"precision": precision}}
                           for precision in ("month", "year"))
        else:
            choices.extend({"method": "rare_group", "columns": [column], "params": {"min_count": minimum}}
                           for minimum in (5, 20, 100))
        choices.append({"method": "drop", "columns": [column], "params": {}})
        dimensions.append((column, choices))
    return base, dimensions


def search(frame: pd.DataFrame, schema: list[dict], qi: list[str], sensitive: list[str],
           workload: list[dict], max_candidates: int = 24, constraints: dict | None = None) -> dict:
    """Evaluate actual recipes with a hard cap of 80 and depth <=4.

    Seed configurations cover baseline, default, single coordinates and three
    joint generalizations. A width-10 beam then proposes one coordinate edit at
    a time. Canonical recipes are memoized, including failures; no candidate
    scores are interpolated or fabricated. Frontier flags use all four returned
    objective values; feasibility is reported separately.
    """
    if isinstance(max_candidates, bool) or not isinstance(max_candidates, int) or max_candidates < 1:
        raise ValueError("max_candidates must be a positive integer")
    cap = min(max_candidates, 80)
    if len(qi) != len(set(qi)) or any(column not in frame for column in qi):
        raise ValueError("Search QI must be unique available input columns")
    if any(column not in frame for column in sensitive):
        raise ValueError("Search sensitive targets must be available input columns")
    # Validate limits once even if grammar produces no successful recipe.
    check_constraints(frame, schema, {"metrics": {"k_min": 0, "sample_unique": 1}},
                      {"loss": None, "queries": []}, 0, constraints)
    seed = 42
    base, dimensions = _library(frame, schema, qi)
    memo: dict[str, dict | None] = {}
    candidates, failures = [], []
    target_names = {field["name"] for field in schema if field.get("role") == "research_target"}

    def evaluate_steps(steps: list[dict], depth: int = 0):
        if len(candidates) >= cap:
            return None
        signature = _canonical(steps, seed)
        if signature in memo:
            return memo[signature]
        if len(memo) >= 80:
            return None
        memo[signature] = None
        mutated = {column for step in steps for column in step["columns"]}
        if mutated & target_names:
            failures.append({"recipeHash": signature, "reason": "Research-target role is protected from automated mutation"})
            return None
        try:
            protected, lineage, report = transforms.apply(frame, schema, steps, seed=seed)
            retained_qi = [column for column in qi if column in protected]
            retained_sensitive = [column for column in sensitive if column in protected]
            risk_result = risk.evaluate(protected, retained_qi, retained_sensitive)
            # Missing sensitive targets are an uncovered scenario, never a low
            # risk metric silently manufactured by removing the secret.
            risk_result["removed_qi"] = [column for column in qi if column not in protected]
            utility_result = utility.evaluate(frame, protected, schema, workload, lineage=lineage)
            suppression = (len(frame) - len(protected)) / len(frame) if len(frame) else 0.0
            checks = check_constraints(protected, schema, risk_result, utility_result, suppression, constraints)
            if len(retained_sensitive) != len(sensitive):
                checks.append({"id": "sensitive-target-coverage", "pass": False,
                               "reason": "A requested sensitive target is absent from this candidate"})
            candidate = {"recipe": {"steps": copy.deepcopy(steps), "seed": seed, "version": "1.0", "releaseMode": "row_release"},
                         "recipeHash": signature, "risk": risk_result, "utility": utility_result,
                         "constraints": checks, "suppression_rate": suppression, "rowCount": len(protected),
                         "frontierMember": False, "searchDepth": depth,
                         "explanation": "Evaluated " + (", ".join(step["method"] + "(" + ",".join(step["columns"]) + ")" for step in steps) or "unmodified data") +
                         ". Declared research targets remain unchanged; no release clearance is implied.",
                         "transformReport": report}
            candidates.append(candidate)
            memo[signature] = candidate
            return candidate
        except (ValueError, KeyError, TypeError) as error:
            failures.append({"recipeHash": signature, "reason": str(error)})
            return None

    def from_coordinates(coordinates):
        steps = copy.deepcopy(base)
        for (_, choices), index in zip(dimensions, coordinates):
            if choices[index] is not None:
                steps.append(copy.deepcopy(choices[index]))
        return steps

    default_steps = []
    for step in transforms.default_steps(schema):
        adjusted = copy.deepcopy(step)
        adjusted["columns"] = [column for column in step["columns"] if column not in target_names and column in frame]
        if adjusted["columns"]:
            default_steps.append(adjusted)
    evaluate_steps(base, 0)
    evaluate_steps(default_steps, 1)
    # Exercise suppression variants before the coordinate grammar consumes the
    # budget, recording strict-cap failures rather than silently relaxing k.
    for fraction in (.01, .05, .10):
        if len(candidates) >= cap or len(memo) >= 80:
            break
        drop_names = {column for step in default_steps if step["method"] == "drop" for column in step["columns"]}
        remaining_qi = [column for column in qi if column not in drop_names]
        steps = copy.deepcopy(default_steps) + [{"method": "suppress_rows", "columns": [],
            "params": {"qi": remaining_qi, "k": int((constraints or {}).get("minK", 5)), "max_fraction": fraction}}]
        evaluate_steps(steps, 2)
    coordinates = [0] * len(dimensions)
    proposals = [(coordinates, 0)]
    # Joint first/default-like and stronger candidates expose real interactions.
    for level in (1, 2, 3):
        proposals.append(([min(level, len(choices) - 1) for _, choices in dimensions], 1))
    for dimension, (_, choices) in enumerate(dimensions):
        for option in range(1, len(choices)):
            changed = coordinates.copy()
            changed[dimension] = option
            proposals.append((changed, 1))
    evaluated_coordinates = []
    for coordinate, depth in proposals:
        candidate = evaluate_steps(from_coordinates(coordinate), depth)
        if candidate is not None:
            evaluated_coordinates.append((coordinate, candidate))
        if len(candidates) >= cap:
            break
    for depth in range(2, 5):
        if len(candidates) >= cap or len(memo) >= 80:
            break
        beam = sorted(evaluated_coordinates, key=lambda pair: (
            sum(not check["pass"] for check in pair[1]["constraints"]),
            sum(objective_vector(pair[1])), pair[1]["recipeHash"]))[:10]
        added = []
        for coordinate, _ in beam:
            for dimension, (_, choices) in enumerate(dimensions):
                for option in range(len(choices)):
                    if option == coordinate[dimension]:
                        continue
                    changed = coordinate.copy()
                    changed[dimension] = option
                    candidate = evaluate_steps(from_coordinates(changed), depth)
                    if candidate is not None and all(candidate is not existing[1] for existing in evaluated_coordinates):
                        added.append((changed, candidate))
                    if len(candidates) >= cap or len(memo) >= 80:
                        break
                if len(candidates) >= cap or len(memo) >= 80:
                    break
            if len(candidates) >= cap or len(memo) >= 80:
                break
        evaluated_coordinates.extend(added)
        if not added:
            break
    mark_frontier(candidates)
    baseline = memo.get(_canonical(base, seed))
    information_value = []
    if baseline is not None:
        for column, choices in dimensions:
            single_drop = memo.get(_canonical(base + [choices[-1]], seed))
            if single_drop is None:
                information_value.append({"column": column, "status": "not_evaluated",
                                          "reason": "Single-field drop was outside the evaluated search budget"})
                continue
            information_value.append({"column": column, "status": "implemented",
                "operation": "drop one QI; keep all other non-identifier fields unchanged",
                "recipeHash": single_drop["recipeHash"],
                "riskReduction": {metric: baseline["risk"]["metrics"][metric] - single_drop["risk"]["metrics"][metric]
                                  for metric in ("sample_unique", "p_guess", "sensitive_guess_advantage")},
                "utilityLoss": single_drop["utility"]["loss"],
                "utilityLossChange": (single_drop["utility"]["loss"] - baseline["utility"]["loss"])
                                     if single_drop["utility"]["loss"] is not None and baseline["utility"]["loss"] is not None else None,
                "failedQueries": [query["id"] for query in single_drop["utility"]["queries"] if not query["pass"]],
                "limitations": ["Single-field counterfactual on this table; interactions are evaluated as separate joint recipes and effects are not additive.",
                                "No claim that a clinically required field is dispensable."]})
    # Every selected-QI subset was evaluated for <=10 fields, leaving no subset
    # holdout in that case. Larger maps are explicitly incomplete. No held-out
    # population or independently calibrated attack claim is invented.
    coverage = {"run": ["exact full-QI classes", "bounded QI subsets", "categorical in-sample inference", "research workload"],
                "skipped": ["held-out population inference", "real-world auxiliary linkage", "multi-release composition"],
                "retest": "Finalists retain exact full-QI checks. Exhaustive <=10-QI maps already include all subset combinations; no independent population validation."}
    return {"candidates": candidates, "evaluated": len(candidates), "cap": cap,
            "requestedCap": max_candidates, "attempted": len(memo), "memoized": True,
            "termination": "cap_reached" if len(candidates) >= cap else "attempt_cap_reached" if len(memo) >= 80 else "bounded_grammar_exhausted",
            "objectives": OBJECTIVES, "failures": failures, "evaluationCoverage": coverage,
            "feasibleCount": sum(candidate["feasible"] for candidate in candidates),
            "informationValue": information_value,
            "message": "No automatic release clearance. " + (
                "Some tested candidates satisfy the configured finite-sample and research constraints."
                if any(candidate["feasible"] for candidate in candidates)
                else "No tested configuration meets all constraints; consider governed controlled access or aggregate-only workflows.")}
