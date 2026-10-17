"""Semantic recognition is fallible; core local evidence and corrections survive."""
from copy import deepcopy
import json

import httpx
import pandas as pd
import pytest

from app import jev, semantics
from app.datasets import profile


@pytest.fixture(autouse=True)
def provider_state(monkeypatch):
    monkeypatch.setenv("PRISM_JEV_ENABLED", "false")
    monkeypatch.setenv("OPENROUTER_API_KEY", "fictional-test-key")
    monkeypatch.setenv("PRISM_JEV_BUDGET_USD", "0.10")
    monkeypatch.setattr(jev, "_reserved_usd", 0.0)
    jev._cache.clear()


def acceptance_frame():
    return pd.DataFrame({
        "PAT_ID": ["SYN-001", "SYN-002", "SYN-003"],
        "DOS": ["2026-10-01", "2026-10-02", "2026-10-03"],
        "HOSP_SITE": ["Fictional A", "Fictional A", "Fictional B"],
        "DX_CODE": ["C34", "C34", "C50"], "AGE": [43, 61, 52],
        "ZIP": ["33101", "33102", "33103"], "HT_CM": [165, 180, 171],
        "TX_RESP": [1, 0, 1], "NOTES": ["fictional note"] * 3,
    })


def fake_provider(monkeypatch, *, family="medicine", leaf="disease_stage", invalid=False, low=False):
    requests = []
    class Client:
        def __init__(self, **kwargs):
            assert kwargs["follow_redirects"] is False
        def __enter__(self): return self
        def __exit__(self, *args): pass
        def post(self, url, *, content, headers):
            payload = json.loads(content)
            requests.append(payload)
            assert url == jev.ENDPOINT
            assert headers["Authorization"] == "Bearer fictional-test-key"
            answers = {}
            for key, question in payload["questions"].items():
                if question["type"] == "noul":
                    answers[key] = {"type": "noul", "noul": .9}
                    continue
                chosen = family if key.endswith("_family") else leaf
                if invalid: chosen = "not_in_the_ontology"
                probability = .6 if low else .9
                other = "unknown" if chosen != "unknown" else next(iter(question["criteria"]))
                answers[key] = {"type": "choice", "choice": chosen, "probabilities": {chosen: probability, other: 1-probability}, "confidence": .8}
            return httpx.Response(200, json={"model": "typesafe/jev-1.14-test", "id": "fictional-receipt", "answers": answers, "usage": {"cost": .00001, "input_tokens": 100}})
    monkeypatch.setattr(jev.httpx, "Client", Client)
    monkeypatch.setenv("PRISM_JEV_ENABLED", "true")
    return requests


def test_ontology_covers_every_family_with_valid_hierarchy():
    ontology = semantics.ontology()
    assert len(ontology["families"]) == 13
    assert len(ontology["types"]) == 145
    assert len({item["id"] for item in ontology["types"]}) == 145
    parents = {group["id"] for family in ontology["families"] for group in family["groups"]}
    assert all(item["parent"] in parents for item in ontology["types"])
    assert {"anatomical_location", "geographic_trajectory", "narrative_sensitive_events", "genetic_ancestry", "shared_account_device"} <= {item["id"] for item in ontology["types"]}
    ontology["types"].clear()
    assert len(semantics.ontology()["types"]) == 145


def test_deterministic_vertical_slice_preserves_schema_and_data(monkeypatch):
    frame = acceptance_frame()
    original_frame = frame.copy(deep=True)
    schema = profile(frame)
    original_schema = deepcopy(schema)
    monkeypatch.setattr(jev, "decide", lambda *args: pytest.fail("offline classification must not call Jev"))
    result = semantics.classify(frame, schema)
    fields = {item["column"]: item for item in result["fields"]}
    assert fields["PAT_ID"]["primaryType"] == "patient_identifier"
    assert fields["HOSP_SITE"]["primaryType"] == "healthcare_facility"
    assert fields["DX_CODE"]["primaryType"] == "diagnosis_code"
    assert fields["HT_CM"]["primaryType"] == "height"
    assert fields["TX_RESP"]["primaryType"] == "treatment_outcome"
    assert fields["DOS"]["reviewStatus"] == "needs_review"
    assert "direct_identifier" in fields["PAT_ID"]["privacyRoles"]
    assert fields["AGE"]["families"] == ["time", "demographics"]
    assert result["provider"]["calls"] == 0
    assert schema == original_schema
    pd.testing.assert_frame_equal(frame, original_frame)


def test_deliberately_ambiguous_labels_are_first_class_review_states():
    frame = pd.DataFrame({key: ["a", "b"] for key in ["SITE", "LOC", "DOS", "TX", "ID", "STAGE", "LAT", "DX"]})
    result = semantics.classify(frame, profile(frame))
    assert all(field["reviewStatus"] == "needs_review" for field in result["fields"])
    assert all(field["alternatives"] for field in result["fields"])


def test_typed_hierarchical_requests_are_cached_and_metadata_only(monkeypatch):
    requests = fake_provider(monkeypatch)
    frame = pd.DataFrame({"STAGE": ["CELL_SENTINEL_1", "CELL_SENTINEL_2"], "PAT_ID": ["SYN-001", "SYN-002"]})
    schema = profile(frame)
    schema[0]["sensitivityReason"] = "PRIVATE_DESCRIPTION_SENTINEL"
    first = semantics.classify(frame, schema, allow_remote=True)
    second = semantics.classify(frame, schema, allow_remote=True)
    assert len(requests) == 2
    assert first["provider"]["calls"] == 2
    assert second["provider"]["calls"] == 0
    assert second["provider"]["cacheHits"] == 2
    assert first["fields"][0]["primaryType"] == "disease_stage"
    assert first["fields"][0]["source"] == "jev"
    assert first["fields"][0]["reviewStatus"] == "needs_review"
    assert first["fields"][0]["decisionMetadata"]["independentConfirmation"] is False
    raw = json.dumps(requests)
    assert "CELL_SENTINEL" not in raw
    assert "PRIVATE_DESCRIPTION_SENTINEL" not in raw
    assert requests[0]["model"] == "typesafe/jev-1.14"
    assert len(next(iter(requests[0]["questions"].values()))["criteria"]) == 13
    assert "government_identifier" not in next(iter(requests[1]["questions"].values()))["criteria"]
    assert {question["type"] for question in requests[1]["questions"].values()} == {"choice", "noul"}


def test_incorrect_model_cannot_remove_local_identifier_evidence(monkeypatch):
    fake_provider(monkeypatch)
    frame = pd.DataFrame({"SITE": ["one@example.invalid", "two@example.invalid", "three@example.invalid"]})
    result = semantics.classify(frame, profile(frame), allow_remote=True)
    field = result["fields"][0]
    assert field["primaryType"] == "disease_stage"  # Simulate a confidently wrong interpretation.
    assert "direct_identifier" in field["privacyRoles"]
    assert "email" in field["validation"]["profile"]["formats"]
    assert any("conflicts" in warning for warning in field["validation"]["warnings"])
    assert field["reviewStatus"] == "needs_review"


def test_user_correction_is_confirmed_preserves_core_checks_and_skips_provider(monkeypatch):
    requests = fake_provider(monkeypatch)
    frame = pd.DataFrame({"SITE": ["one@example.invalid", "two@example.invalid"]})
    result = semantics.classify(frame, profile(frame), allow_remote=True, overrides={"SITE": {"primaryType": "anatomical_location", "properties": {"geographicRelationship": "anatomical"}}})
    field = result["fields"][0]
    assert not requests
    assert field["source"] == "user"
    assert field["primaryType"] == "anatomical_location"
    assert field["properties"]["userConfirmation"] == "confirmed"
    assert field["properties"]["geographicRelationship"] == "anatomical"
    assert "direct_identifier" in field["privacyRoles"]
    assert any("conflicts" in warning for warning in field["validation"]["warnings"])


@pytest.mark.parametrize("correction", [{"SITE": "invented"}, {"missing": "age"}, {"SITE": {"primaryType": "age", "properties": {"safety": "guaranteed"}}}])
def test_invalid_corrections_fail_before_remote_call(monkeypatch, correction):
    monkeypatch.setattr(jev, "decide", lambda *args: pytest.fail("invalid correction must fail before provider"))
    frame = pd.DataFrame({"SITE": ["a"]})
    with pytest.raises(ValueError):
        semantics.classify(frame, profile(frame), allow_remote=True, overrides=correction)


def test_invalid_model_vocabulary_abstains(monkeypatch):
    requests = fake_provider(monkeypatch, invalid=True)
    frame = pd.DataFrame({"STAGE": ["I", "II"]})
    result = semantics.classify(frame, profile(frame), allow_remote=True)
    assert len(requests) == 1
    assert result["provider"]["status"] == "invalid_response"
    assert result["fields"][0]["primaryType"] == "ambiguous"
    assert result["fields"][0]["reviewStatus"] == "needs_review"


def test_low_probability_abstains_without_leaf_call(monkeypatch):
    requests = fake_provider(monkeypatch, low=True)
    frame = pd.DataFrame({"STAGE": ["I", "II"]})
    result = semantics.classify(frame, profile(frame), allow_remote=True)
    assert len(requests) == 1
    assert result["provider"]["status"] == "abstained"
    assert result["fields"][0]["primaryType"] == "ambiguous"


def test_disabled_and_unconfigured_provider_do_not_send_metadata(monkeypatch):
    frame = pd.DataFrame({"STAGE": ["I", "II"]})
    monkeypatch.setattr(jev.httpx, "Client", lambda **kwargs: pytest.fail("provider disabled"))
    result = semantics.classify(frame, profile(frame), allow_remote=True)
    assert result["provider"]["status"] == "disabled"
    assert result["provider"]["calls"] == 0
    assert result["provider"]["fieldsSent"] == 0
    monkeypatch.setenv("PRISM_JEV_ENABLED", "true")
    monkeypatch.delenv("OPENROUTER_API_KEY")
    result = semantics.classify(frame, profile(frame), allow_remote=True)
    assert result["provider"]["status"] == "not_configured"


def test_zero_cost_budget_prevents_network(monkeypatch):
    monkeypatch.setenv("PRISM_JEV_ENABLED", "true")
    monkeypatch.setenv("PRISM_JEV_BUDGET_USD", "0")
    monkeypatch.setattr(jev.httpx, "Client", lambda **kwargs: pytest.fail("budget exhausted"))
    frame = pd.DataFrame({"STAGE": ["I", "II"]})
    result = semantics.classify(frame, profile(frame), allow_remote=True)
    assert result["provider"]["status"] == "budget_exhausted"
    assert result["provider"]["calls"] == 0


def test_timeout_falls_back_and_does_not_leak_provider_error(monkeypatch):
    monkeypatch.setenv("PRISM_JEV_ENABLED", "true")
    class BrokenClient:
        def __init__(self, **kwargs): pass
        def __enter__(self): return self
        def __exit__(self, *args): pass
        def post(self, *args, **kwargs): raise httpx.ReadTimeout("PRIVATE_PROVIDER_MESSAGE")
    monkeypatch.setattr(jev.httpx, "Client", BrokenClient)
    frame = pd.DataFrame({"STAGE": ["I", "II"]})
    result = semantics.classify(frame, profile(frame), allow_remote=True)
    assert result["provider"]["status"] == "provider_unavailable"
    assert result["provider"]["calls"] == 1
    assert result["fields"][0]["primaryType"] == "ambiguous"
    assert "PRIVATE_PROVIDER_MESSAGE" not in json.dumps(result)


def test_invalid_probabilities_are_rejected():
    question = {"field": {"type": "choice", "criteria": {"a": "A", "b": "B"}}}
    for probabilities in [{"a": float("nan"), "b": 0}, {"a": 1.1, "b": -.1}, {"a": .3, "b": .1}, {"outside": 1}]:
        assert not jev._validate_answers({"field": {"type": "choice", "choice": "a", "probabilities": probabilities}}, question)


def test_batch_is_capped_at_eight_ambiguous_fields(monkeypatch):
    requests = fake_provider(monkeypatch)
    frame = pd.DataFrame({"unknown_" + str(index): ["a", "b"] for index in range(15)})
    result = semantics.classify(frame, profile(frame), allow_remote=True)
    assert result["provider"]["fieldsSent"] == 8
    assert len(requests[0]["state"]["columns"]) == 8
    assert len(requests[0]["questions"]) == 8
    assert len(requests[1]["questions"]) == 24
    assert sum(field["source"] == "jev" for field in result["fields"]) == 8


def test_anatomical_location_is_not_residential_geography():
    frame = pd.DataFrame({"BODY_SITE": ["left lung", "right lung"]})
    field = semantics.classify(frame, profile(frame))["fields"][0]
    assert field["primaryType"] == "anatomical_location"
    assert field["properties"]["geographicRelationship"] == "anatomical"
