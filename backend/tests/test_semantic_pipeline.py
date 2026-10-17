"""Semantic interpretation must change real evidence routing, never invent it."""
import copy
import json

from fastapi.testclient import TestClient

from app import main, semantics
from app.serverless_demo import ServerlessDemo
from test_serverless_demo import FakeStore, client as public_client


def finding(candidate, attack):
    return next(f for f in candidate["risk"]["semantic"]["findings"] if f["attackId"] == attack)


def create(client, data, steps):
    response = client.post("/v1/candidates", json={"datasetId": data["datasetId"], "steps": steps})
    assert response.status_code == 200, response.text
    return response.json()


def test_real_combination_evidence_changes_and_keeps_clinical_queries():
    with TestClient(main.app, base_url="http://127.0.0.1:8000") as client:
        client.delete("/v1/session")
        data = client.get("/v1/demo?fixture=semantic").json()
        assert data["rowCount"] == 480 and data["semantic"]["revision"]
        original = copy.deepcopy(data["preview"])
        before = create(client, data, [])
        after = create(client, data, data["defaultSteps"])
        assert len(after["risk"]["semantic"]["findings"]) == 24
        raw, protected = finding(before, "spatiotemporal_linkage"), finding(after, "spatiotemporal_linkage")
        assert {"DOS", "HOSP_SITE", "AGE"} <= set(raw["columns"])
        assert raw["measured"]["uniqueRows"] == 480
        assert protected["measured"]["uniqueRows"] == 96
        assert protected["severity"] == "Moderate"
        assert finding(after, "population_uniqueness")["status"] == "unsupported"
        assert finding(after, "membership_inference")["measured"] is None
        assert after["risk"]["semantic"]["coverage"]["needsAssessment"] > 0
        assert len(after["utility"]["queries"]) == 2
        response_query = next(q for q in after["utility"]["queries"] if q["id"] == "response-by-diagnosis")
        assert response_query["error"] == 0 and response_query["pass"] is True
        assert client.get(f'/v1/datasets/{data["datasetId"]}/preview').json()["rows"] == original
        dose = next(f for f in after["risk"]["semantic"]["lineage"] if f["column"] == "DOS")
        assert dose["lineage"]["currentRepresentation"] == "date_generalize"
        notes = next(f for f in after["risk"]["semantic"]["lineage"] if f["column"] == "NOTES")
        assert notes["lineage"]["active"] is False
        assert finding(after, "free_text_identifiers")["status"] == "not_applicable"
        client.delete("/v1/session")


def test_corrections_are_frozen_per_candidate_and_basic_detection_is_independent():
    with TestClient(main.app, base_url="http://127.0.0.1:8000") as client:
        client.delete("/v1/session")
        data = client.get("/v1/demo?fixture=semantic").json()
        before = create(client, data, [])
        corrected = client.post(f'/v1/datasets/{data["datasetId"]}/semantics', json={
            "overrides": {"DOS": "unknown", "HOSP_SITE": "unknown", "PAT_ID": "unknown"}})
        assert corrected.status_code == 200, corrected.text
        revision = corrected.json()["revision"]
        assert revision != data["semantic"]["revision"]
        after = create(client, data, [])
        assert after["risk"]["semantic"]["semanticRevision"] == revision
        assert before["risk"]["semantic"]["semanticRevision"] == data["semantic"]["revision"]
        assert "PAT_ID" in finding(after, "direct_identifier_disclosure")["columns"]
        assert finding(after, "spatiotemporal_linkage")["measured"]["uniqueRows"] == 480
        report = client.post("/v1/reports/export", json={"candidateId": before["candidateId"], "format": "json"}).json()
        assert report["dataset"]["semantic"]["revision"] == data["semantic"]["revision"]
        assert "FICTION-00001" not in json.dumps(report)
        client.delete("/v1/session")


def test_external_audit_measures_actual_representation_without_attributing_recipe():
    with TestClient(main.app, base_url="http://127.0.0.1:8000") as client:
        client.delete("/v1/session")
        data = client.get("/v1/demo?fixture=semantic").json()
        output = main.DATASETS[data["datasetId"]]["frame"].drop(columns=["PAT_ID", "NOTES"]).copy()
        output["DOS"] = "2026"
        output["AGE"] = "[40,80)"
        output["ZIP"] = "region unavailable"
        output["HT_CM"] = 160
        uploaded = client.post("/v1/datasets/import", files={"file": ("external.csv", output.to_csv(index=False).encode(), "text/csv")}).json()
        response = client.post("/v1/audits/import-pair", json={"originalDatasetId": data["datasetId"],
            "protectedDatasetId": uploaded["datasetId"], "mode": "unpaired_microdata"})
        assert response.status_code == 200, response.text
        candidate = response.json()
        assert candidate["alignment"] == "unpaired"
        assert finding(candidate, "spatiotemporal_linkage")["measured"]["uniqueRows"] == 0
        dose = next(f for f in candidate["risk"]["semantic"]["lineage"] if f["column"] == "DOS")
        assert dose["lineage"]["mechanismKnown"] is False
        assert dose["lineage"]["transformations"] == []
        assert dose["lineage"]["granularity"] == "unknown"
        client.delete("/v1/session")


def test_public_remote_result_cached_through_cold_replay_and_attempts_bounded(monkeypatch):
    calls = []
    original = semantics.classify
    def fake(frame, schema, allow_remote=False, overrides=None):
        result = original(frame, schema, allow_remote=False, overrides=overrides)
        if allow_remote:
            calls.append(True)
            result["provider"] = {"status": "completed", "calls": 1, "cacheHits": 0, "receipts": [{"model": "typesafe/jev-1.14"}]}
        return result
    monkeypatch.setattr(semantics, "classify", fake)
    store = FakeStore()
    with public_client(store) as client:
        data = client.get("/v1/demo?fixture=semantic").json()
        endpoint = f'/v1/datasets/{data["datasetId"]}/semantics'
        assert not calls
        interpreted = client.post(endpoint, json={"allowRemote": True})
        assert interpreted.status_code == 200, interpreted.text
        assert len(calls) == 1
        data["semantic"] = interpreted.json()
        candidate = create(client, data, data["defaultSteps"])
        cookie = client.cookies["prism_demo_session"]
    with public_client(store, cookie) as cold:
        assert cold.get(f'/v1/candidates/{candidate["candidateId"]}/comparison').json() == candidate
        assert cold.get("/v1/demo?fixture=semantic").json()["semantic"] == interpreted.json()
        assert len(calls) == 1
        correction = cold.post(endpoint, json={"overrides": {"DOS": "encounter_date"}})
        assert correction.status_code == 200 and correction.json()["provider"]["status"] == "completed"
        reassessed = cold.post("/v1/assessments", json={"candidateId": candidate["candidateId"]})
        assert reassessed.status_code == 200, reassessed.text
        assert reassessed.json()["risk"]["semantic"]["semanticRevision"] == correction.json()["revision"]
        reassessed_id = reassessed.json()["candidateId"]
        assert cold.get(f'/v1/candidates/{reassessed_id}/comparison').json() == reassessed.json()
        assert len(calls) == 1
        assert cold.post(endpoint, json={"allowRemote": True}).status_code == 200
        assert cold.post(endpoint, json={"allowRemote": True}).status_code == 429
        assert len(calls) == 2
        searched = cold.post("/v1/search", json={"datasetId": data["datasetId"], "maxCandidates": 24})
        assert searched.status_code == 200, searched.text
        assert searched.json()["evaluated"] > 0
        report = cold.post("/v1/reports/export", json={"candidateId": candidate["candidateId"], "format": "json"})
        assert report.status_code == 200, report.text
        assert report.json()["dataset"]["semantic"]["revision"] == data["semantic"]["revision"]
        assert cold.get("/v1/semantics/ontology").status_code == 200
    assert max(len(record.text.encode()) for record in store.records.values()) < 65536
    assert all("FICTION-00001" not in record.text for record in store.records.values())


def test_unknown_membership_never_gets_semantic_present_target_guessing():
    with TestClient(main.app, base_url="http://127.0.0.1:8000") as client:
        client.delete("/v1/session")
        data = client.get("/v1/demo?fixture=semantic").json()
        response = client.post("/v1/candidates", json={"datasetId": data["datasetId"],
            "steps": data["defaultSteps"], "membershipKnown": False})
        assert response.status_code == 200
        assert finding(response.json(), "sample_singling_out")["measured"]["uniformPresentTargetGuessing"] is None
        client.delete("/v1/session")


def test_confirmed_identifier_semantics_cannot_be_bypassed_by_other_declared_role():
    with TestClient(main.app, base_url="http://127.0.0.1:8000") as client:
        client.delete("/v1/session")
        data = client.post("/v1/datasets/import", files={"file": ("names.csv", b"X,value\nFictional Avery,1\nFictional Riley,2\n", "text/csv")}).json()
        assert data["schema"][0]["role"] == "other"
        corrected = client.post(f'/v1/datasets/{data["datasetId"]}/semantics', json={"overrides": {"X": "legal_name"}})
        assert corrected.status_code == 200
        blocked_query = client.post("/v1/candidates", json={"datasetId": data["datasetId"], "steps": [],
            "workload": [{"id": "names", "type": "group_count", "groupBy": ["X"], "minCohort": 1}]})
        assert blocked_query.status_code == 400 and blocked_query.json()["code"] == "identifier_query_blocked"
        candidate = create(client, data, [])
        response = client.post("/v1/reports/export", json={"candidateId": candidate["candidateId"], "format": "csv",
            "acknowledgments": ["authority", "limitations", "reviewed"]})
        assert response.status_code == 409 and response.json()["code"] == "direct_identifiers_blocked"
        client.delete("/v1/session")
