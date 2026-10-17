import numpy as np
import pandas as pd
import pytest

from app import datasets


def test_synthetic_is_deterministic_complete_and_explicitly_synthetic():
    frame = datasets.synthetic_oncology()
    pd.testing.assert_frame_equal(frame, datasets.synthetic_oncology())
    assert len(frame) == 5000
    assert list(frame) == ["record_id", "name", "email", "birth_date", "age", "zip", "weight", "eye_color", "mutation", "stage", "treatment", "response"]
    assert frame.attrs["synthetic"] is True
    assert frame.attrs["units"]["weight"] == "kg"
    assert frame["zip"].str.fullmatch(r"\d{5}").all()
    assert frame["zip"].str.startswith("0").any()
    assert frame["email"].str.endswith("@example.invalid").all()
    assert frame["response"].between(0, 1).all()
    assert frame.groupby("mutation")["response"].mean()[False] > frame.groupby("mutation")["response"].mean()[True]


def test_profile_reviews_units_and_roles():
    suggested = {spec["name"]: spec for spec in datasets.profile(datasets.synthetic_oncology(12))}
    assert suggested["email"]["role"] == "direct_identifier"
    assert suggested["birth_date"]["dtype"] == "date"
    assert suggested["weight"]["unit"] == "kg"
    assert suggested["mutation"]["role"] == "sensitive"
    imported = datasets.read_csv_bytes(b"weight,weight_lb,zip,participant_id\n150,150,02108,0001\n")
    suggested = {spec["name"]: spec for spec in datasets.profile(imported)}
    assert "unit" not in suggested["weight"]
    assert suggested["weight_lb"]["unit"] == "lb"
    assert suggested["participant_id"]["role"] == "direct_identifier"
    assert imported.iloc[0]["zip"] == "02108"
    assert imported.iloc[0]["participant_id"] == "0001"


def test_import_preserves_zip_identifier_and_literal_na_categories():
    frame = datasets.read_csv_bytes(b"zip,name,age,response,diagnosis\n00901,Synthetic,40,true,NA\n02108,Demo,,false,\n")
    assert frame["zip"].tolist() == ["00901", "02108"]
    assert frame["age"].iloc[0] == 40
    assert np.isnan(frame["age"].iloc[1])
    assert str(frame["response"].dtype) == "boolean"
    assert frame["diagnosis"].iloc[0] == "NA"
    assert pd.isna(frame["diagnosis"].iloc[1])
    assert frame.attrs["schemaReviewRequired"]


@pytest.mark.parametrize("content", [b"", b"age,age\n1,2\n", b"age, age\n1,2\n", b"age\n", b"a,b\n,\n", b"a,b\n1,2,3", b"a\n\"unterminated", b"a\n\x00", b"\xff"])
def test_import_rejects_invalid_csv_without_echoing_raw_values(content):
    with pytest.raises(ValueError):
        datasets.read_csv_bytes(content)


def test_import_bounds(monkeypatch):
    monkeypatch.setattr(datasets, "MAX_CSV_BYTES", 12)
    with pytest.raises(ValueError, match="50 MB"):
        datasets.read_csv_bytes(b"value\n1234567890123")
    monkeypatch.setattr(datasets, "MAX_CSV_BYTES", 10_000)
    monkeypatch.setattr(datasets, "MAX_ROWS", 1)
    with pytest.raises(ValueError, match="at most 1"):
        datasets.read_csv_bytes(b"value\n1\n2\n")


@pytest.mark.parametrize("n", [0, -1, 100001, True, 1.5])
def test_invalid_fixture_size(n):
    with pytest.raises(ValueError):
        datasets.synthetic_oncology(n)
