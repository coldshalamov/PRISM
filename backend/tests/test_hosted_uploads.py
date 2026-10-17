import base64
import gzip
import io
import json
import secrets

import pytest
from fastapi.testclient import TestClient
from openpyxl import Workbook

from app.archie_store import Record, StoreConflict
from app.serverless_demo import ServerlessDemo, MAX_UPLOAD_BYTES
from test_serverless_demo import FakeStore, client, ARCHIE_ORIGIN, SECRET


class UploadStore(FakeStore):
    def __init__(self):
        super().__init__()
        self.blobs = {}
        self.fail_save = False
        self.fail_delete = False

    def create_blob(self, visitor, content, filename, expires):
        record = Record(secrets.token_hex(12), visitor, json.dumps({"filename": filename,
            "gzipBase64": base64.b64encode(gzip.compress(content)).decode()}), expires)
        self.blobs[record.id] = record
        return record

    def get_blob(self, visitor, identifier):
        record = self.blobs.get(identifier)
        return record if record and record.visitor == visitor else None

    def delete_blob(self, visitor, identifier):
        if self.fail_delete:
            raise StoreConflict()
        if self.get_blob(visitor, identifier):
            del self.blobs[identifier]

    def save(self, record, text, expires):
        if self.fail_save:
            raise StoreConflict()
        return super().save(record, text, expires)


def upload(visitor, content=b"age,zip,result\n43,02108,1\n44,02108,0\n", name="table.csv"):
    response = visitor.post("/v1/datasets/import", files={"file": (name, content)})
    assert response.status_code == 200, response.text
    return response.json()


@pytest.mark.parametrize("format", ["csv", "json", "xlsx"])
def test_real_upload_formats_candidate_and_export_survive_cold_replay(format):
    if format == "csv":
        content = b"age,zip,result\n43,02108,1\n44,02108,0\n"
    elif format == "json":
        content = json.dumps([{"age": 43, "zip": "02108", "result": 1}, {"age": 44, "zip": "02108", "result": 0}]).encode()
    else:
        workbook = Workbook(); sheet = workbook.active
        sheet.append(["age", "zip", "result"]); sheet.append([43, "02108", 1]); sheet.append([44, "02108", 0])
        target = io.BytesIO(); workbook.save(target); content = target.getvalue()
    store = UploadStore()
    with client(store) as first:
        data = upload(first, content, f"table.{format}")
        assert data["synthetic"] is False and data["rowCount"] == 2
        assert data["preview"][0]["zip"] == "02108"
        result = first.post("/v1/candidates", json={"datasetId": data["datasetId"], "steps": []})
        assert result.status_code == 200, result.text
        candidate = result.json()
        cookie = first.cookies["prism_demo_session"]
        assert len(store.blobs) == 1
    with client(store, cookie) as cold:
        preview = cold.get(f'/v1/datasets/{data["datasetId"]}/preview')
        assert preview.status_code == 200
        assert preview.json()["rows"] == data["preview"]
        assert cold.get(f'/v1/candidates/{candidate["candidateId"]}/comparison').json() == candidate
        report = cold.post("/v1/reports/export", json={"candidateId": candidate["candidateId"], "format": "json"})
        assert report.status_code == 200
        assert cold.delete("/v1/session").json() == {"cleared": True}
        assert not store.records and not store.blobs


def test_external_audit_replay_mapping_correction_and_reassessment_keep_actual_output():
    store = UploadStore()
    with client(store) as first:
        source = upload(first, b"age,zip,result\n43,02108,1\n44,02109,0\n45,02109,1\n")
        protected = upload(first, b"AGE,zip,result\n[40;50),021,1\n[40;50),021,0\n[40;50),021,1\n", "protected.csv")
        response = first.post("/v1/audits/import-pair", json={"originalDatasetId": source["datasetId"],
            "protectedDatasetId": protected["datasetId"], "columnMapping": {"age": "AGE"}, "mode": "unpaired_microdata"})
        assert response.status_code == 200, response.text
        candidate = response.json()
        assert candidate["recipe"]["version"] == "external" and candidate["auditMode"] == "unpaired_microdata"
        assert candidate["preview"][0]["age"] == "[40;50)"
        assert candidate["risk"]["metrics"]["verified_linkage_rate"] is None
        cookie = first.cookies["prism_demo_session"]
    with client(store, cookie) as cold:
        assert cold.get(f'/v1/candidates/{candidate["candidateId"]}/comparison').json() == candidate
        endpoint = f'/v1/datasets/{source["datasetId"]}/semantics'
        assert cold.post(endpoint, json={"overrides": {"age": "age"}}).status_code == 200
        reassessed = cold.post("/v1/assessments", json={"candidateId": candidate["candidateId"]})
        assert reassessed.status_code == 200, reassessed.text
        new = reassessed.json()
        assert new["recipe"]["version"] == "external" and new["preview"] == candidate["preview"]
        assert new["auditMode"] == "unpaired_microdata"
        assert cold.get(f'/v1/candidates/{new["candidateId"]}/comparison').json() == new


def test_upload_isolation_limits_invalid_parse_and_failed_save_cleanup():
    store = UploadStore()
    with client(store) as first, client(store) as other:
        data = upload(first)
        assert other.get(f'/v1/datasets/{data["datasetId"]}/preview').status_code == 404
        assert first.post("/v1/datasets/import", files={"file": ("bad.json", b"[invalid]")}).status_code == 422
        assert len(store.blobs) == 1
        assert first.post("/v1/datasets/import", files={"file": ("big.csv", b"x" * (MAX_UPLOAD_BYTES + 1))}).status_code == 413
        assert len(store.blobs) == 1
        store.fail_save = True
        assert first.post("/v1/datasets/import", files={"file": ("valid.csv", b"a,b\n1,2\n")}).status_code == 409
        assert len(store.blobs) == 1
        store.fail_save = False
        store.fail_delete = True
        assert first.delete("/v1/session").status_code == 409
        assert store.records and store.blobs
        store.fail_delete = False
        assert first.delete("/v1/session").status_code == 200
        assert not store.blobs


def test_archie_browser_upload_preflight_and_authenticated_multipart_work():
    store = UploadStore()
    app = ServerlessDemo("demo.example", store=store, secret=SECRET, archie_origins=[ARCHIE_ORIGIN])
    with TestClient(app, base_url="https://demo.example", headers={"Origin": ARCHIE_ORIGIN}) as visitor:
        preflight = visitor.options("/v1/datasets/import", headers={"Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "x-prism-demo-session"})
        assert preflight.status_code == 204
        assert preflight.headers["Access-Control-Allow-Origin"] == ARCHIE_ORIGIN
        assert visitor.post("/v1/datasets/import", files={"file": ("data.csv", b"a,b\n1,2\n")}).status_code == 403
        token = visitor.post("/v1/browser-session", json={}).json()["token"]
        visitor.headers["X-PRISM-Demo-Session"] = token
        data = upload(visitor)
        assert data["rowCount"] == 2
        health = visitor.get("/health").json()
        assert health["deploymentMode"] == "hosted_workbench" and health["uploadsAllowed"] is True
        assert health["maxUploadBytes"] == MAX_UPLOAD_BYTES


def test_expired_session_deletes_uploaded_blobs_before_replacement():
    store = UploadStore(); moment = [100.0]
    with client(store, clock=lambda: moment[0]) as visitor:
        upload(visitor)
        assert store.blobs
        moment[0] += 1801
        visitor.get("/v1/demo?fixture=kit")
        assert not store.blobs
