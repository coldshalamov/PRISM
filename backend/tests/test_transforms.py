import copy
import json

import numpy as np
import pandas as pd
import pytest

from app.datasets import profile, synthetic_oncology
from app.transforms import apply, default_steps


def step(method, columns, **params):
    return {"method": method, "columns": columns, "params": params}


def run(frame, method, columns, **params):
    return apply(frame, profile(frame), [step(method, columns, **params)])


def test_default_bands_are_half_open_and_input_is_immutable():
    source = synthetic_oncology(20)
    copy = source.copy(deep=True)
    protected, lineage, report = apply(source, profile(source), default_steps(profile(source)))
    pd.testing.assert_frame_equal(source, copy)
    assert not {"record_id", "name", "email"} & set(protected)
    assert protected["age"].str.fullmatch(r"\[\d+,\d+\)").all()
    assert protected["zip"].str.len().eq(3).all()
    assert lineage == list(range(20))
    assert report["suppression_rate"] == 0
    assert any("Safe Harbor" in warning for warning in report["warnings"])
    assert "safe" not in report
    boundary = pd.DataFrame({"age": [-1, 0, 4, 5, np.nan]})
    result, _, _ = run(boundary, "band", ["age"], width=5)
    assert result["age"].tolist()[:4] == ["[-5,0)", "[0,5)", "[0,5)", "[5,10)"]
    assert pd.isna(result["age"].iloc[4])


def test_units_require_review_or_explicit_pounds_conversion():
    frame = pd.DataFrame({"weight": [110.231131, 220.462262]})
    schema = profile(frame)
    with pytest.raises(ValueError, match="reviewed kg"):
        apply(frame, schema, [step("band", ["weight"], width=5)])
    schema[0]["unit"] = "lb"
    with pytest.raises(ValueError, match="reviewed kg"):
        apply(frame, schema, [step("band", ["weight"], width=5)])
    result, _, report = apply(frame, schema, [step("band", ["weight"], width=5, convertFrom="lb")])
    assert result["weight"].tolist() == ["[45,50)", "[95,100)"]
    assert any("pounds" in warning for warning in report["warnings"])
    schema[0]["unit"] = "kg"
    with pytest.raises(ValueError, match="conflicts"):
        apply(frame, schema, [step("band", ["weight"], width=5, convertFrom="lb")])


@pytest.mark.parametrize("unit", ["kg", "lb"])
def test_weight_bands_stamp_canonical_units_without_mutating_nested_source_attrs(unit):
    frame = pd.DataFrame({"weight": [100.0, 150.0]})
    frame.attrs = {
        "units": {"weight": unit},
        "unit_conversions": {"other": {"from": "cm", "to": "m", "factor": 0.01}},
        "provenance": {"notes": ["source"]},
    }
    previous = copy.deepcopy(frame.attrs)
    params = {"width": 5, **({"convertFrom": "lb"} if unit == "lb" else {})}
    result, _, _ = apply(frame, profile(frame), [step("band", ["weight"], **params)])
    assert result.attrs["units"]["weight"] == "kg"
    if unit == "lb":
        assert result.attrs["unit_conversions"]["weight"] == {
            "from": "lb", "to": "kg", "factor": 0.45359237, "verified": True,
        }
    else:
        assert "weight" not in result.attrs["unit_conversions"]
    assert frame.attrs == previous
    result.attrs["units"]["weight"] = "changed"
    result.attrs["unit_conversions"]["other"]["factor"] = 99
    result.attrs["provenance"]["notes"].append("output only")
    assert frame.attrs == previous


def test_hmac_is_secret_keyed_column_separated_and_never_reported():
    frame = pd.DataFrame({"name": ["same", "same", None], "email": ["same", "other", None]})
    recipe = [step("pseudonymize", ["name", "email"], namespace="study-A")]
    secret = "external-test-secret-32-characters"
    first, _, report = apply(frame, profile(frame), recipe, secret=secret)
    second, _, _ = apply(frame, profile(frame), recipe, secret=secret)
    third, _, _ = apply(frame, profile(frame), recipe, secret="different-test-secret-32-characters")
    pd.testing.assert_frame_equal(first, second)
    assert first["name"].iloc[0] == first["name"].iloc[1]
    assert first["name"].iloc[0] != first["email"].iloc[0]
    assert first["name"].iloc[0] != third["name"].iloc[0]
    assert pd.isna(first["name"].iloc[2])
    assert secret not in json.dumps(report) + json.dumps(recipe)
    with pytest.raises(ValueError, match="external secret"):
        apply(frame, profile(frame), recipe)
    with pytest.raises(ValueError, match="unsupported or secret"):
        apply(frame, profile(frame), [step("pseudonymize", ["name"], secret=secret)])


def test_numeric_methods_and_rare_category_grouping():
    frame = pd.DataFrame({"value": [1.123, 2.234, 3.345, 100.0], "kind": ["a", "a", "b", None]})
    rounded, _, _ = run(frame, "round", ["value"], decimals=1)
    assert rounded["value"].tolist() == [1.1, 2.2, 3.3, 100.0]
    capped, _, _ = run(frame, "top_bottom", ["value"], min=2, max=5)
    assert capped["value"].tolist() == [2, 2.234, 3.345, 5]
    grouped, _, _ = run(frame, "rare_group", ["kind"], min_count=2)
    assert grouped["kind"].tolist()[:3] == ["a", "a", "Other"]
    assert pd.isna(grouped["kind"].iloc[3])
    for distribution in ["gaussian", "laplace"]:
        a, _, report = run(frame, "noise", ["value"], scale=2, distribution=distribution)
        b, _, _ = run(frame, "noise", ["value"], scale=2, distribution=distribution)
        pd.testing.assert_frame_equal(a, b)
        assert any("not differential privacy" in warning for warning in report["warnings"])


def test_dates_mask_and_limited_redaction():
    frame = pd.DataFrame({"birth_date": ["2000-01-02", "1999-12-31", None], "notes": ["Email demo@example.invalid", "SSN 123-45-6789", None]})
    generalized, _, _ = run(frame, "date_generalize", ["birth_date"], precision="quarter")
    assert generalized["birth_date"].tolist()[:2] == ["2000-Q1", "1999-Q4"]
    assert pd.isna(generalized["birth_date"].iloc[2])
    for precision, expected in [("year", "2000"), ("month", "2000-01"), ("day", "2000-01-02")]:
        result, _, _ = run(frame, "date_generalize", ["birth_date"], precision=precision)
        assert result["birth_date"].iloc[0] == expected
    shifted, _, _ = run(frame, "date_shift", ["birth_date"], days=4)
    difference = pd.to_datetime(shifted["birth_date"]) - pd.to_datetime(frame["birth_date"])
    assert difference.dropna().dt.days.abs().le(4).all()
    redacted, _, _ = run(frame, "redact", ["notes"])
    assert redacted["notes"].tolist()[:2] == ["Email [redacted]", "SSN [redacted]"]
    custom, _, _ = run(frame, "redact", ["notes"], pattern=r"\d{3}-\d{2}-\d{4}", replacement="TOKEN")
    assert custom["notes"].iloc[1] == "SSN TOKEN"
    masked, _, _ = run(frame, "mask", ["notes"])
    assert masked["notes"].tolist()[:2] == ["[masked]", "[masked]"]
    assert pd.isna(masked["notes"].iloc[2])


def test_permutation_preserves_stratum_marginals_and_null_group():
    frame = pd.DataFrame({"stratum": ["a"] * 20 + [None] * 20, "value": list(range(40))})
    result, _, _ = run(frame, "permute", ["value"], strata=["stratum"])
    assert result["value"].tolist() != frame["value"].tolist()
    assert sorted(result["value"].iloc[:20]) == list(range(20))
    assert sorted(result["value"].iloc[20:]) == list(range(20, 40))
    pd.testing.assert_series_equal(result["stratum"], frame["stratum"])


def test_cell_suppression_and_final_capped_row_suppression_private_lineage():
    frame = pd.DataFrame({"qi": ["a", "a", "b", "b", "rare"], "age": [10, 11, 12, 13, 14]})
    cells, _, _ = run(frame, "suppress_cells", ["age"], fraction=0.4)
    assert cells["age"].isna().sum() == 2
    assert frame["age"].isna().sum() == 0
    # Cell suppression must remain composable with later numeric protection.
    composed, _, _ = apply(frame, profile(frame), [step("suppress_cells", ["age"], fraction=0.4), step("band", ["age"], width=5)])
    assert composed["age"].isna().sum() == 2
    recipe = [step("suppress_rows", [], qi=["qi"], k=2, max_fraction=0.2)]
    result, lineage, report = apply(frame, profile(frame), recipe)
    assert len(result) == 4 and lineage == [0, 1, 2, 3]
    assert report["suppression_rate"] == 0.2
    assert "lineage" not in report
    with pytest.raises(ValueError, match="exceeds"):
        run(frame, "suppress_rows", [], qi=["qi"], k=2, max_fraction=0.19)
    with pytest.raises(ValueError, match="final"):
        apply(frame, profile(frame), recipe + [step("drop", ["age"])])
    with pytest.raises(ValueError, match="every row"):
        run(frame, "suppress_rows", [], qi=["qi"], k=6, max_fraction=1)
    # Missing values are one category, distinct from a literal sentinel string.
    nulls = pd.DataFrame({"qi": [None, np.nan, "<missing>"]})
    result, lineage, _ = run(nulls, "suppress_rows", [], qi=["qi"], k=2, max_fraction=1 / 3)
    assert lineage == [0, 1] and len(result) == 2


@pytest.mark.parametrize("method,columns,params", [
    ("band", ["age"], {"width": 0}),
    ("band", ["age"], {"width": float("nan")}),
    ("round", ["age"], {"decimals": True}),
    ("top_bottom", ["age"], {"min": 10, "max": 1}),
    ("noise", ["age"], {"scale": -1}),
    ("zip_prefix", ["zip"], {"length": 0}),
    ("date_generalize", ["age"], {"precision": "year"}),
    ("redact", ["name"], {"pattern": "(a+)+$"}),
    ("redact", ["name"], {"pattern": "a{1,9999999999999}"}),
    ("noise", ["age"], {"scale": 1, "distribution": []}),
    ("permute", ["age"], {"strata": ["age"]}),
    ("drop", ["absent"], {}),
    ("fake", ["age"], {}),
])
def test_invalid_parameters_and_incompatible_types_fail(method, columns, params):
    frame = synthetic_oncology(12)
    with pytest.raises(ValueError):
        apply(frame, profile(frame), [step(method, columns, **params)])


def test_dropped_column_cannot_be_reused_and_index_is_reset():
    frame = synthetic_oncology(12)
    frame.index = range(100, 112)
    result, lineage, _ = apply(frame, profile(frame), [])
    assert result.index.tolist() == list(range(12))
    assert lineage == list(range(12))
    with pytest.raises(ValueError, match="dropped column"):
        apply(frame, profile(frame), [step("drop", ["name"]), step("mask", ["name"])])
