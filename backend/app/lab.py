"""Tiny executable, synthetic counterexamples; no patient data or canned scores."""
import numpy as np
import pandas as pd


def experiments():
    diagnoses = [1, 0, 1, 1, 0, 1]
    all_count, except_target = sum(diagnoses), sum(diagnoses[:-1])
    a = pd.DataFrame({"age_band": ["20s", "20s", "30s", "30s"], "zip": ["331", "332", "331", "332"]})
    uniqueness = lambda cols: float((a.groupby(cols, dropna=False)[cols[0]].transform("size") == 1).mean())
    x = np.arange(1, 7, dtype=float)
    original, changed = x.copy(), x[::-1].copy()
    aux = pd.DataFrame({"age": [30, 36, 42, 43, 58, 59], "zip": ["33101", "33102", "33201", "33202", "33301", "33302"]})
    released = pd.DataFrame({"age": (aux.age // 5) * 5, "zip": aux.zip.str[:3]})
    unique_matches = 0
    for target_offset, known in aux.iterrows():
        # The attacker receives only the public generalized known values.
        possible = released.index[(released.age == (known.age // 5) * 5) & (released.zip == known.zip[:3])].tolist()
        # Ground truth is used only after matching, to verify correctness.
        unique_matches += int(len(possible) == 1 and possible[0] == target_offset)
    return {"experiments": [
        {"id": "differencing", "title": "One subtraction reveals a person", "status": "implemented",
         "explanation": "Overlapping exact counts can expose the excluded person's binary attribute.",
         "inputs": {"people": len(diagnoses), "all_positive_count": all_count, "all_except_target_positive_count": except_target},
         "result": {"inferred_target_value": all_count - except_target, "verified_target_value": diagnoses[-1], "correct": all_count - except_target == diagnoses[-1]},
         "lesson": "Aggregate-only is not automatically private. Restrict query overlap or use a reviewed mechanism and release accounting.",
         "assumptions": ["Attacker knows the target is the single excluded person.", "Both exact aggregates are available."]},
        {"id": "composition", "title": "Two coarse releases become identifying", "status": "implemented",
         "explanation": "Separately linkable age and ZIP releases can isolate rows when their facts are combined.",
         "inputs": {"rows": len(a), "release_a": "age decade", "release_b": "ZIP prefix"},
         "result": {"age_alone_unique_fraction": uniqueness(["age_band"]), "zip_alone_unique_fraction": uniqueness(["zip"]), "combined_unique_fraction": uniqueness(["age_band", "zip"])},
         "lesson": "Assess prior releases and stable join keys. Independent checks do not cover their intersection.",
         "assumptions": ["The same four people appear in both releases.", "A stable link or outside knowledge allows the facts to be combined."]},
        {"id": "correlation", "title": "Perfect marginals, reversed science", "status": "implemented",
         "explanation": "Reversing one column retains its mean and standard deviation but reverses its relationship with another.",
         "inputs": {"x": x.tolist(), "original_y": original.tolist(), "permuted_y": changed.tolist()},
         "result": {"original_mean": float(original.mean()), "protected_mean": float(changed.mean()), "original_std": float(original.std()), "protected_std": float(changed.std()), "original_correlation": float(np.corrcoef(x, original)[0, 1]), "protected_correlation": float(np.corrcoef(x, changed)[0, 1])},
         "lesson": "Preserve declared analytical questions and joint relationships, not only column distributions.",
         "assumptions": ["The scientific target is the x–y relationship.", "This is a deterministic illustrative permutation, not a privacy mechanism."]},
        {"id": "linkage", "title": "Verified exact linkage on fictional records", "status": "implemented",
         "explanation": "Apply public generalization rules to synthetic outside knowledge, then count unique correct candidate matches without giving the attacker row alignment.",
         "inputs": {"rows": len(aux), "known_fields": ["age", "zip"], "age_width": 5, "zip_prefix_length": 3},
         "result": {"unique_correct_matches": unique_matches, "targets": len(aux), "ambiguous_targets": len(aux) - unique_matches},
         "lesson": "Generalization can still leave matches. Ambiguous candidate sets are not verified identities.",
         "assumptions": ["All targets are known members.", "Known fields and public transformations are accurate.", "Correctness is checked against fixture ground truth after matching; row alignment is not an attack input."]}
    ]}
