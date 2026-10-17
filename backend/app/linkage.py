# SPDX-License-Identifier: Apache-2.0
# Copyright 2026 PRISM contributors
# Adapted from the user-supplied PRISM hackathon kit's privacy.exact_linkage.
# Original source/license/notice: reference-kit/PRISM/{backend/prism/privacy.py,LICENSE,NOTICE}.
"""Verified exact-match linkage with a separate owner-only scoring boundary.

An attacker sees target-known QI and public deterministic column transforms.
It does not receive the private source-to-release crosswalk. This is complete
enumeration of this source, not independent auxiliary-data/population testing.
"""
from __future__ import annotations

from collections import Counter
from pathlib import Path
import json

import numpy as np
import pandas as pd

from . import datasets, transforms

PUBLIC_METHODS = {"drop", "mask", "band", "centered_interval", "zip_prefix", "round", "top_bottom", "date_generalize"}
MAX_ROWS = 100_000
MAX_KNOWN = 20
SOURCE = "reference-kit/PRISM/backend/prism/privacy.py"


def _finding(status: str, reason: str, targets: int, columns: list[str]) -> dict:
    return {
        "id": "verified-exact-linkage", "attackId": "verified_exact_linkage", "status": status,
        "applicability": "row_release; known source membership, trusted owner scoring lineage and replayable public QI transforms",
        "numerator": None, "denominator": targets, "metricValue": None,
        "metricUnit": "verified unique correct matches / source targets", "severity": "info",
        "columns": columns, "narrative": reason,
        "algorithm": "Replay public QI transforms; exact candidate matching; private correspondence used only after matching to score correctness",
        "sourceId": "KIT-EXACT-LINKAGE", "source": SOURCE,
        "assumptions": [
            "Target membership in the source cohort is known; one source row is treated as one target.",
            "Target-known QI are correct and the deterministic transformation codebook is public.",
            "The attacker never receives owner lineage; owner correspondence is used only to score precomputed matches.",
            "The source target cohort is fully enumerated; suppressed targets remain in its denominator.",
        ],
        "caveats": [
            "This is simulated source-target linkage, not independently validated external auxiliary-data linkage.",
            "No population re-identification probability, unknown-membership false-positive calibration or release clearance is established.",
            "Inapplicable replay is an uncovered attack, not zero risk; fuzzy or secret-compromise attacks may still apply.",
            "The finite enumeration has no invented sampling confidence interval.",
        ],
        "baseline": None,
        "baselineDefinition": "No independent nonmember control is available; uniform tie-breaking within a matched candidate set is reported only as a model comparator.",
    }


def _keys(frame: pd.DataFrame, columns: list[str]) -> list[tuple]:
    # Tagged tuples prevent missingness from colliding with a real CSV string.
    return [tuple(("missing",) if pd.isna(value) else ("value", value) for value in row)
            for row in frame[columns].itertuples(index=False, name=None)]


def _match_targets(target_view: pd.DataFrame, released_view: pd.DataFrame, columns: list[str]) -> tuple[list[tuple], list[tuple], Counter]:
    """Attacker computation; deliberately has no lineage/scoring argument."""
    targets = _keys(target_view, columns)
    released = _keys(released_view, columns)
    return targets, released, Counter(released)


def evaluate(original: pd.DataFrame, protected: pd.DataFrame, schema: list[dict], steps: list[dict] | None,
             lineage: list[int] | None, *, qi: list[str] | None = None,
             membership_known: bool = True) -> dict:
    """Return one aggregate AssessmentFinding, without keys, positions or rows.

    qi defaults to reviewed quasi_identifier roles. Public replay supports only
    deterministic row-local methods listed in PUBLIC_METHODS. Data-dependent,
    random/secret methods on surviving known fields abstain. Suppression is not
    replayed on target records: retained released rows are matched, all original
    targets stay in the denominator, and private lineage scores results later.
    """
    if not isinstance(original, pd.DataFrame) or not isinstance(protected, pd.DataFrame):
        raise ValueError("Linkage inputs must be data tables.")
    if not original.columns.is_unique or not protected.columns.is_unique:
        raise ValueError("Linkage requires unique column names.")
    if len(original) > MAX_ROWS or len(protected) > MAX_ROWS:
        raise ValueError("Exact linkage is bounded to 100000 source/released rows.")
    if not isinstance(schema, list) or any(not isinstance(field, dict) or not isinstance(field.get("name"), str) for field in schema):
        raise ValueError("Linkage requires reviewed column specifications.")
    fields = {field["name"]: field for field in schema}
    if len(fields) != len(schema) or set(fields) != set(original.columns):
        raise ValueError("Linkage schema must cover the original columns exactly once.")
    known = [field["name"] for field in schema if field.get("role") == "quasi_identifier"] if qi is None else qi
    if not isinstance(known, list) or any(not isinstance(c, str) or c not in original for c in known) or len(known) != len(set(known)) or len(known) > MAX_KNOWN:
        raise ValueError("Linkage known fields must be at most 20 distinct original columns.")
    surviving = [column for column in known if column in protected]
    if not len(original) or not len(protected):
        return _finding("not_applicable", "Source or release is empty; this exact-match attack has no assessable release.", len(original), surviving)
    if not membership_known:
        return _finding("not_applicable", "Unknown-membership linkage requires independent nonmember controls and calibrated thresholds.", len(original), surviving)
    if lineage is None:
        return _finding("not_applicable", "Verified linkage requires explicit trusted owner correspondence; imported row order is never inferred.", len(original), surviving)
    if steps is None:
        return _finding("not_applicable", "No public transformation recipe is supplied; external mechanism provenance is unknown.", len(original), surviving)
    if not isinstance(lineage, list) or len(lineage) != len(protected) or any(isinstance(index, bool) or not isinstance(index, (int, np.integer)) or not 0 <= index < len(original) for index in lineage) or len(lineage) != len(set(lineage)):
        raise ValueError("Owner lineage must give one unique valid source offset for every released row.")
    if not surviving:
        return _finding("not_applicable", "No declared known QI survive; this does not rule out other attacks.", len(original), surviving)
    if not isinstance(steps, list) or len(steps) > 100:
        raise ValueError("Linkage replay supports at most 100 recipe steps.")
    public_steps = []
    for step in steps:
        if not isinstance(step, dict) or not isinstance(step.get("method"), str) or not isinstance(step.get("columns", []), list) or any(not isinstance(column, str) for column in step.get("columns", [])):
            raise ValueError("Linkage recipe steps are malformed.")
        selected = [column for column in step.get("columns", []) if column in surviving]
        method = step["method"]
        if method == "suppress_rows":
            continue
        if not selected:
            continue
        if method not in PUBLIC_METHODS:
            return _finding("not_applicable", "Exact public replay is unavailable for a random, secret, data-dependent or unsupported method on surviving known QI.", len(original), surviving)
        public_steps.append({"method": method, "columns": selected, "params": step.get("params", {})})
    # Only target-known columns enter the replay. Sensitive fields, direct IDs
    # and owner lineage are absent from this attacker input.
    target_view = original[surviving].copy(deep=True).reset_index(drop=True)
    public_schema = [fields[column] for column in surviving]
    try:
        target_view, _, _ = transforms.apply(target_view, public_schema, public_steps, seed=42)
    except (ValueError, KeyError, TypeError):
        return _finding("not_applicable", "The declared public recipe cannot be replayed on the known fields with their reviewed types and units.", len(original), surviving)
    if any(column not in target_view for column in surviving):
        return _finding("not_applicable", "Recipe and released known-field columns are inconsistent.", len(original), surviving)
    target_keys, released_keys, counts = _match_targets(target_view, protected[surviving], surviving)

    # The scoring phase begins only after every attacker candidate set exists.
    # No private correspondence changes the candidate counts/signatures above.
    owner_positions = {int(source): position for position, source in enumerate(lineage)}
    matched = ambiguous = unique_candidate = unique_correct = unique_incorrect = 0
    expected_correct = 0.0
    for source_position, key in enumerate(target_keys):
        size = counts.get(key, 0)
        matched += size > 0
        ambiguous += size > 1
        unique_candidate += size == 1
        owner_position = owner_positions.get(source_position)
        truth_in_candidates = owner_position is not None and released_keys[owner_position] == key
        if truth_in_candidates and size:
            expected_correct += 1 / size
        if size == 1:
            unique_correct += truth_in_candidates
            unique_incorrect += not truth_in_candidates
    result = _finding("implemented", f"{unique_correct} of {len(original)} source targets have a verified unique correct exact-match candidate under the declared public QI replay.", len(original), surviving)
    result.update({
        "numerator": int(unique_correct), "metricValue": unique_correct / len(original),
        "severity": "high" if unique_correct else "info",
        "matchedTargets": int(matched), "ambiguousTargets": int(ambiguous),
        "unmatchedTargets": int(len(original) - matched), "uniqueCandidateTargets": int(unique_candidate),
        "uniqueIncorrectMatches": int(unique_incorrect), "suppressedTargets": int(len(original) - len(protected)),
        "expectedCorrectRandomTiebreakFraction": expected_correct / len(original),
        "coverage": {"targetsEnumerated": len(original), "releasedRows": len(protected), "knownColumns": surviving,
                     "externalAuxiliaryValidation": False, "membershipKnown": True},
    })
    return result


def kit_fixture() -> dict:
    """Load the original 480-row fictional benchmark with current contracts.

    Original CSV/request/report and Apache notices remain unmodified in
    examples/kit_benchmark. The adapter uses original names and maps the three
    supplied analytical tasks into the current explicit workload grammar.
    """
    module_path = Path(__file__).resolve()
    bundled = module_path.parent / "fixtures" / "kit_benchmark"
    folder = bundled if bundled.is_dir() else module_path.parents[2] / "examples" / "kit_benchmark"
    frame = datasets.read_csv_bytes((folder / "fictional_oncology.csv").read_bytes())
    frame.attrs.update({"synthetic": True, "units": {"age": "years", "weight_kg": "kg"}})
    schema = datasets.profile(frame)
    original_request = json.loads((folder / "default_request.json").read_text(encoding="utf-8"))
    roles = {"identifier": "direct_identifier", "quasi": "quasi_identifier", "sensitive": "sensitive", "analytical": "research_target"}
    for field in schema:
        legacy = next(item for item in original_request["columns"] if item["name"] == field["name"])
        field["role"] = roles[legacy["role"]]
        if legacy.get("unit"):
            field["unit"] = legacy["unit"]
    steps = [
        {"method": "drop", "columns": ["subject_id", "name"], "params": {}},
        {"method": "band", "columns": ["age"], "params": {"width": 5}},
        {"method": "zip_prefix", "columns": ["zip"], "params": {"length": 3}},
        {"method": "band", "columns": ["weight_kg"], "params": {"width": 5}},
        {"method": "date_generalize", "columns": ["diagnosis_date"], "params": {"precision": "year"}},
    ]
    workload = [
        {"id": "six-month-failure", "type": "group_rate", "target": "failure_6m", "groupBy": [], "positiveValue": 1, "weight": 1, "tolerance": 0.02, "minCohort": 5},
        {"id": "liver-subgroup-failure", "type": "group_rate", "target": "failure_6m", "groupBy": [], "positiveValue": 1, "filter": {"liver_metastasis": 1}, "weight": 1, "tolerance": 0.03, "minCohort": 5},
        {"id": "age-weight-correlation", "type": "correlation", "groupBy": ["age"], "target": "weight_kg", "weight": 1, "tolerance": 0.05, "minCohort": 5},
    ]
    return {"frame": frame, "schema": schema, "defaultSteps": steps, "defaultWorkload": workload,
            "qi": ["age", "zip", "weight_kg"], "sensitive": ["liver_metastasis", "KRAS", "failure_6m"],
            "name": "Original kit benchmark · 480 fictional records", "synthetic": True,
            "provenance": {"source": "PRISM-hackathon-kit.zip", "license": "Apache-2.0"}}
