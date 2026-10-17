"""Regenerate public synthetic fixtures: .venv/Scripts/python.exe examples/generate.py"""

import json
import math
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

import numpy as np
import pandas as pd
from app.datasets import synthetic_oncology


def generate():
    target = ROOT / "examples" / "synthetic_oncology"
    target.mkdir(parents=True, exist_ok=True)
    frame = synthetic_oncology(5000, 42)
    frame.to_csv(target / "original.csv", index=False)
    frame.to_csv(target / "oncology_base.csv", index=False)
    frame.iloc[:12].to_csv(target / "tiny_oncology.csv", index=False)
    auxiliary = frame.iloc[np.random.default_rng(123).choice(len(frame), 500, replace=False)][["age", "zip", "weight", "eye_color"]].reset_index(drop=True)
    auxiliary.loc[::10, "weight"] = np.nan
    auxiliary.loc[::13, "eye_color"] = None
    auxiliary.to_csv(target / "auxiliary.csv", index=False)
    corrupted = frame.copy()
    # Exact marginal preservation with an explicit age-response reversal example
    # in tiny fixtures; this larger file demonstrates destructive permutation.
    corrupted["response"] = np.random.default_rng(43).permutation(corrupted["response"].to_numpy())
    corrupted.to_csv(target / "corrupted_relationships.csv", index=False)
    workload = [
        {"id": "mutation-by-stage", "type": "group_rate", "groupBy": ["stage"], "target": "mutation", "positiveValue": True, "weight": 2, "tolerance": 0.03, "minCohort": 25},
        {"id": "response-by-mutation", "type": "group_rate", "groupBy": ["mutation"], "target": "response", "positiveValue": True, "weight": 3, "tolerance": 0.03, "minCohort": 25},
        {"id": "age-by-stage", "type": "group_mean", "groupBy": ["stage"], "target": "age", "weight": 1, "tolerance": 2, "minCohort": 25},
        {"id": "response-by-stage", "type": "group_rate", "groupBy": ["stage"], "target": "response", "positiveValue": True, "weight": 2, "tolerance": 0.03, "minCohort": 25},
    ]
    use_case = {"synthetic": True, "seed": 42, "referenceDate": "2026-10-17", "units": {"age": "years", "weight": "kg"}, "qi": ["age", "zip", "weight", "eye_color"], "sensitive": ["mutation"], "workload": workload, "limitations": ["Designed correlations are not clinically accurate.", "Auxiliary fixture is synthetic outside knowledge and contains no direct identifiers.", "No true synthetic-release generator or train/control claim is provided."]}
    for name, value in [("use_case.json", use_case), ("clinical_objectives.json", workload)]:
        (target / name).write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")
    tiny = ROOT / "examples" / "tiny"
    tiny.mkdir(exist_ok=True)
    pd.DataFrame({"age": [20, 20, 20, 30, 30, 40], "zip": ["00101"] * 3 + ["00202"] * 2 + ["00303"], "diagnosis": ["A", "A", "B", "B", "B", "A"]}).to_csv(tiny / "hand_counts.csv", index=False)
    pd.DataFrame({"age": [20] * 5 + [30] * 5, "diagnosis": ["A"] * 5 + ["B"] * 5}).to_csv(tiny / "homogeneity.csv", index=False)
    ages = np.arange(20, 80, 5)
    positive = np.array([0] * 6 + [1] * 6)
    pd.DataFrame({"age": ages, "response": positive}).to_csv(tiny / "correlation_original.csv", index=False)
    pd.DataFrame({"age": ages, "response": positive[::-1]}).to_csv(tiny / "correlation_reversed.csv", index=False)
    expected = {"hand_counts": {"row_count": 6, "group_sizes": [3, 2, 1], "sample_unique": 1 / 6, "k_min": 1, "p_guess": 3 / 6, "row_entropy_bits": (3 * math.log2(3) + 2 * math.log2(2)) / 6}, "homogeneity": {"k_min": 5, "distinct_l_min": 1, "sensitive_baseline": 0.5, "sensitive_guess": 1.0, "sensitive_guess_advantage": 0.5}, "correlation": {"original": float(np.corrcoef(ages, positive)[0, 1]), "reversed": float(np.corrcoef(ages, positive[::-1])[0, 1]), "equal_marginals": True}}
    (tiny / "expected.json").write_text(json.dumps(expected, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    generate()
