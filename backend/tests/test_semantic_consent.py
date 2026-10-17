"""The preview/input consistency boundary uses real metadata generation and no provider network."""
import copy
import json

import pandas as pd
from fastapi.testclient import TestClient

from app import jev, main, semantics
from test_serverless_demo import FakeStore, client as public_client


def test_preview_contains_exact_bounded_metadata_and_remote_uses_it(monkeypatch):
    frame = pd.DataFrame({f"UNRESOLVED_{i}": [f"private-cell-{i}"] for i in range(20)})
    schema = [{"name": name, "dtype": "text", "role": "other"} for name in frame]
    original = frame.copy(deep=True)
    preview = semantics.remote_metadata_preview(frame, schema)
    assert preview["fieldCount"] == 8
    assert len(preview["metadata"]["neighboringLabels"]) == 12
    assert "private-cell" not in json.dumps(preview)
    captured = []
    monkeypatch.setattr(semantics, "_remote", lambda fields, metadata: (captured.append(copy.deepcopy(metadata)) or {}, []))
    semantics.classify(frame, schema, allow_remote=True)
    assert captured == [preview["metadata"]]
    pd.testing.assert_frame_equal(frame, original)


def test_local_preview_no_provider_and_missing_tampered_stale_input_digest_rejected(monkeypatch):
    calls = []
    monkeypatch.setattr(semantics, "_remote", lambda fields, metadata: (calls.append(metadata) or {}, []))
    with TestClient(main.app, base_url="http://127.0.0.1:8000") as client:
        client.delete("/v1/session")
        data = client.get("/v1/demo?fixture=semantic").json()
        endpoint = f'/v1/datasets/{data["datasetId"]}/semantics'
        preview = client.post(endpoint, json={"previewOnly": True})
        assert preview.status_code == 200
        input_digest = preview.json()
        assert len(input_digest["metadataDigest"]) == 64 and not calls
        changed_response = client.post(endpoint, json={"allowRemote": True})
        assert changed_response.status_code == 409 and changed_response.json()["code"] == "metadata_changed"
        assert client.post(endpoint, json={"allowRemote": True, "metadataDigest": "0" * 64}).status_code == 409
        assert client.post(endpoint, json={"previewOnly": True, "allowRemote": True}).status_code == 422
        assert not calls
        changed = client.post(endpoint, json={"overrides": {"AGE": "age"}})
        assert changed.status_code == 200
        assert client.post(endpoint, json={"allowRemote": True, "metadataDigest": input_digest["metadataDigest"]}).status_code == 409
        fresh = client.post(endpoint, json={"previewOnly": True}).json()
        assert fresh["metadataDigest"] != input_digest["metadataDigest"]
        assert not calls
        assert client.post(endpoint, json={"allowRemote": True, "metadataDigest": fresh["metadataDigest"]}).status_code == 200
        assert len(calls) == 1
        client.delete("/v1/session")


def test_public_preview_and_invalid_input_digest_do_not_reserve_attempt_or_mutate_store(monkeypatch):
    store = FakeStore()
    calls = []
    monkeypatch.setattr(semantics, "_remote", lambda fields, metadata: (calls.append(metadata) or {}, []))
    with public_client(store) as client:
        data = client.get("/v1/demo?fixture=semantic").json()
        endpoint = f'/v1/datasets/{data["datasetId"]}/semantics'
        before = {key: record.text for key, record in store.records.items()}
        input_digest = client.post(endpoint, json={"previewOnly": True}).json()
        assert not calls
        assert {key: record.text for key, record in store.records.items()} == before
        assert client.post(endpoint, json={"allowRemote": True}).status_code == 409
        assert client.post(endpoint, json={"allowRemote": True, "metadataDigest": "0" * 64}).status_code == 409
        assert client.post(endpoint, json={"previewOnly": True, "allowRemote": True}).status_code == 422
        assert {key: record.text for key, record in store.records.items()} == before
        assert not calls
        assert client.post(endpoint, json={"allowRemote": True, "metadataDigest": input_digest["metadataDigest"]}).status_code == 200
        assert len(calls) == 1
        assert next(iter(store.records.values())).state()["remoteSemanticAttempts"] == 1


def test_input_digest_binds_current_schema_model_and_dataset(monkeypatch):
    with TestClient(main.app, base_url="http://127.0.0.1:8000") as client:
        client.delete("/v1/session")
        data = client.get("/v1/demo?fixture=semantic").json()
        endpoint = f'/v1/datasets/{data["datasetId"]}/semantics'
        input_digest = client.post(endpoint, json={"previewOnly": True}).json()
        changed = copy.deepcopy(data["schema"])
        changed[0]["importance"] += 1
        assert client.patch(f'/v1/datasets/{data["datasetId"]}/schema', json={"schema": changed}).status_code == 200
        assert client.post(endpoint, json={"allowRemote": True, "metadataDigest": input_digest["metadataDigest"]}).status_code == 409
        fresh = client.post(endpoint, json={"previewOnly": True}).json()
        monkeypatch.setattr(jev, "MODEL", "typesafe/jev-different")
        assert client.post(endpoint, json={"allowRemote": True, "metadataDigest": fresh["metadataDigest"]}).status_code == 409
        other = client.get("/v1/demo?fixture=kit").json()
        assert client.post(f'/v1/datasets/{other["datasetId"]}/semantics', json={"allowRemote": True, "metadataDigest": fresh["metadataDigest"]}).status_code == 409
        client.delete("/v1/session")


def test_provider_questions_use_the_previewed_truncated_labels(monkeypatch):
    label = "UNRESOLVED_" + "x" * 220 + "private-unapproved-tail"
    frame = pd.DataFrame({label: ["private-cell"]})
    schema = [{"name": label, "dtype": "text", "role": "other"}]
    preview = semantics.remote_metadata_preview(frame, schema)
    sent = []
    def fake_decide(state, questions):
        sent.append({"state": state, "questions": questions})
        return {"status": "abstained", "answers": {}}
    monkeypatch.setattr(jev, "decide", fake_decide)
    semantics.classify(frame, schema, allow_remote=True)
    assert len(sent) == 1
    assert sent[0]["state"] == preview["metadata"]
    assert "private-unapproved-tail" not in json.dumps(sent)
    assert "private-cell" not in json.dumps(sent)
