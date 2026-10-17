"""Focused v3 reconciliation: readable centers are not protective bins."""
import json

import pandas as pd

from app import datasets, semantic_rules, semantics, transforms


def _finding(frame, *, steps=None, external=False):
    schema = datasets.profile(frame)
    semantic = semantics.classify(frame, schema, allow_remote=False)
    result = semantic_rules.evaluate(frame, semantic, schema, ["age"], [],
                                     steps=steps, external=external)
    return next(f for f in result["findings"] if f["attackId"] == "recoverable_value_encoding")


def test_external_declared_centered_encoding_explains_output_only_recovery():
    frame = pd.DataFrame({"age": ["CI[41,45]", "CI[42,46]", None, "CI[-4,0]"]})
    before = frame.copy(deep=True)
    result = _finding(frame, external=True)
    assert result["status"] == "implemented"
    assert result["severity"] == "Moderate"
    assert result["columns"] == ["age"]
    assert result["measured"]["recoverableCells"] == 3
    assert result["measured"]["sourceMechanismVerified"] is False
    assert "unknown external source value" in result["explanation"]
    assert "Only the released interval bounds" in result["attackerNeeds"]
    assert "CI[41,45]" not in json.dumps(result)
    pd.testing.assert_frame_equal(frame, before)


def test_known_centered_display_recovery_is_not_suppressed_by_semantic_unknown():
    source = pd.DataFrame({"age": [43, 44, 44, 45]})
    steps = [{"method": "centered_interval", "columns": ["age"], "params": {"radius": 2}}]
    frame, _, _ = transforms.apply(source, datasets.profile(source), steps)
    result = _finding(frame, steps=steps)
    assert result["status"] == "implemented"
    assert result["measured"]["recoverableCells"] == 4
    assert result["measured"]["sourceMechanismVerified"] is True
    assert result["measured"]["precision"] == "exact integer midpoint"


def test_ordinary_shared_bins_do_not_claim_source_center_recovery():
    result = _finding(pd.DataFrame({"age": ["[40,45)", "[40,45)", "[45,50)"]}), external=True)
    assert result["status"] == "not_applicable"
    assert result["measured"] is None
    assert result["columns"] == []


def test_another_fields_known_transform_does_not_verify_an_imported_encoding():
    frame = pd.DataFrame({"age": ["CI[41,45]"], "height": ["CI[169,173]"]})
    steps = [{"method": "centered_interval", "columns": ["height"], "params": {"radius": 2}}]
    result = _finding(frame, steps=steps)
    assert result["measured"]["sourceMechanismVerified"] is False
    by_column = {item["column"]: item for item in result["measured"]["columns"]}
    assert by_column["height"]["sourceMechanismVerified"] is True
    assert by_column["age"]["sourceMechanismVerified"] is False


def test_malformed_or_half_integer_center_abstains_without_raw_values():
    frame = pd.DataFrame({"age": ["CI[4,3]", "CI[1,4]", "CI[secret,7]", "CI[" + "9" * 5000 + ",8]"]})
    result = _finding(frame, external=True)
    assert result["status"] == "unsupported"
    assert result["severity"] == "Needs Assessment"
    assert result["measured"]["recoverableCells"] == 0
    assert result["measured"]["columns"][0]["invalidEncodingCells"] == 4
    assert "secret" not in json.dumps(result)


def test_recovery_category_is_registered_once_and_coverage_is_derived():
    registry = semantic_rules.registry()
    assert len(registry["rules"]) == 25
    assert sum(rule["id"] == "recoverable_value_encoding" for rule in registry["rules"]) == 1
    frame = pd.DataFrame({"age": ["CI[41,45]"]})
    schema = datasets.profile(frame)
    result = semantic_rules.evaluate(frame, semantics.classify(frame, schema), schema, ["age"], [], external=True)
    assert sum(result["coverage"].values()) == len(result["findings"]) == 25


def test_external_extra_encoded_column_absent_from_original_semantics_is_scanned():
    original = pd.DataFrame({"age": [43, 44]})
    schema = datasets.profile(original)
    output = pd.DataFrame({"age": ["[40,45)", "[40,45)"],
                           "extra": ["CI[98,102]", "CI[198,202]"]})
    result = semantic_rules.evaluate(output, semantics.classify(original, schema), schema, ["age"], [], external=True)
    finding = next(f for f in result["findings"] if f["attackId"] == "recoverable_value_encoding")
    assert finding["status"] == "implemented"
    assert finding["columns"] == ["extra"]
    assert finding["measured"]["recoverableCells"] == 2
    assert finding["measured"]["sourceMechanismVerified"] is False
    assert finding["uncertainSemantics"] == []
