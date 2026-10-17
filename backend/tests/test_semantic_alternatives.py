"""Plausible interpretations route descriptive tests without claiming attacks."""
import pandas as pd

from app import datasets, semantic_rules, semantics


def finding(result, attack):
    return next(item for item in result["findings"] if item["attackId"] == attack)


def test_ambiguous_sites_and_locations_activate_reviewable_geographic_hypotheses():
    frame = pd.DataFrame({"SITE": ["A", "A", "B"], "LOC": ["L", "R", "R"],
                          "DOS": ["2026-01-01", "2026-01-02", "2026-01-03"]})
    schema = datasets.profile(frame)
    classified = semantics.classify(frame, schema)
    result = semantic_rules.evaluate(frame, classified, schema, [], [])
    geo = finding(result, "geographic_linkage")
    assert geo["status"] == "implemented"
    assert set(geo["columns"]) == {"SITE", "LOC"}
    assert geo["measured"]["uniqueRows"] == 3
    assert {field["column"] for field in geo["uncertainSemantics"]} == {"SITE", "LOC"}
    assert "not proof" in geo["explanation"]
    assert finding(result, "spatiotemporal_linkage")["measured"] is not None


def test_confirmed_anatomical_sites_do_not_trigger_physical_geography():
    frame = pd.DataFrame({"SITE": ["left lung", "right lung"]})
    schema = datasets.profile(frame)
    classified = semantics.classify(frame, schema, overrides={"SITE": "anatomical_location"})
    result = semantic_rules.evaluate(frame, classified, schema, [], [])
    geo = finding(result, "geographic_linkage")
    assert geo["status"] == "not_applicable"
    assert geo["columns"] == []
    assert geo["measured"] is None


def test_composition_lists_stable_tokens_but_remains_unassessed():
    frame = pd.DataFrame({"pseudonym": ["SYN-a", "SYN-b"], "value": [1, 2]})
    schema = datasets.profile(frame)
    classified = semantics.classify(frame, schema)
    result = semantic_rules.evaluate(frame, classified, schema, [], [])
    composition = finding(result, "cross_release_composition")
    assert composition["columns"] == ["pseudonym"]
    assert composition["status"] == "unsupported"
    assert composition["severity"] == "Needs Assessment"
    assert composition["measured"] is None
