import pandas as pd

from app import datasets, linkage, risk, transforms, utility


def test_centered_intervals_are_recoverable_not_privacy_credit():
    source = pd.DataFrame({"age": [43, 44, 44, 45], "outcome": [0, 1, 0, 1]})
    schema = datasets.profile(source)
    recipe = [{"method": "centered_interval", "columns": ["age"], "params": {"radius": 2}}]
    protected, lineage, report = transforms.apply(source, schema, recipe)
    assert protected.age.tolist() == ["CI[41,45]", "CI[42,46]", "CI[42,46]", "CI[43,47]"]
    assert source.age.tolist() == [43, 44, 44, 45]
    assert any("midpoint reveals" in message for message in report["warnings"])
    decoded, approximate = utility._numeric(protected.age)
    assert decoded.tolist() == source.age.tolist()
    assert not approximate
    definite, possible = utility._predicate(protected.age, "gte", 44)
    assert definite.tolist() == possible.tolist() == [False, True, True, True]
    assert risk.evaluate(source, ["age"], [])['metrics']['sample_unique'] == risk.evaluate(protected, ["age"], [])['metrics']['sample_unique']
    attack = linkage.evaluate(source, protected, schema, recipe, lineage, qi=["age"], membership_known=True)
    assert attack["status"] == "implemented"
    assert attack["numerator"] == 2


def test_utc_hour_and_iso_week_boundaries():
    source = pd.DataFrame({"DOS": ["2021-01-01T00:30:00+02:00", "2021-01-04T05:12:00Z", None]})
    schema = [{"name": "DOS", "dtype": "date", "role": "quasi_identifier", "importance": 1}]
    hourly, _, _ = transforms.apply(source, schema, [{"method": "date_generalize", "columns": ["DOS"], "params": {"precision": "hour"}}])
    assert hourly.DOS.iloc[:2].tolist() == ["2020-12-31T22:00Z", "2021-01-04T05:00Z"]
    weekly, _, _ = transforms.apply(source, schema, [{"method": "date_generalize", "columns": ["DOS"], "params": {"precision": "week"}}])
    assert weekly.DOS.iloc[:2].tolist() == ["2020-W53", "2021-W01"]
    assert weekly.DOS.isna().sum() == 1
