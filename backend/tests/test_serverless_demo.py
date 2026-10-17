"""Cold-start replay uses real engines while Archie stores fixture specs only."""
import json
import secrets
import threading

from fastapi.testclient import TestClient

from app.archie_store import Record, StoreConflict, StoreUnavailable
from app.serverless_demo import BODY_LIMIT, COOKIE, ServerlessDemo

ORIGIN = "https://demo.example"
SECRET = "stable-test-secret-with-at-least-32-characters"


class FakeStore:
    def __init__(self):
        self.records = {}
        self.lock = threading.Lock()

    def get(self, visitor):
        return next((Record(r.id, r.visitor, r.text, r.expires) for r in self.records.values() if r.visitor == visitor), None)

    def create(self, visitor, text, expires):
        record = Record(secrets.token_hex(12), visitor, text, expires)
        self.records[record.id] = record
        return record

    def save(self, record, text, expires):
        with self.lock:
            current = self.records.get(record.id)
            if current is None or current.text != record.text:
                raise StoreConflict()
            self.records[record.id] = Record(record.id, record.visitor, text, expires)

    def delete(self, record):
        self.records.pop(record.id, None)


def client(store, cookie=None, clock=None):
    app = ServerlessDemo("demo.example", store=store, secret=SECRET, **({"clock": clock} if clock else {}))
    result = TestClient(app, base_url=ORIGIN, headers={"Origin": ORIGIN})
    if cookie:
        result.cookies.set(COOKIE, cookie, domain="demo.example", path="/")
    return result


def fixture(visitor):
    response = visitor.get("/v1/demo?fixture=kit")
    assert response.status_code == 200, response.text
    return response.json()


def create(visitor, data, extra=None):
    response = visitor.post("/v1/candidates", json={"datasetId": data["datasetId"], "steps": data["defaultSteps"], **(extra or {})})
    assert response.status_code == 200, response.text
    return response.json()


def test_cold_starts_real_75_to_20_export_schema_assessment_and_visitor_clear():
    store = FakeStore()
    with client(store) as first, client(store) as other:
        data = fixture(first)
        other_data = fixture(other)
        baseline = create(first, data)
        protected = create(first, data, {"steps": data["defaultSteps"] + [{"method": "drop", "columns": ["zip"], "params": {}}]})
        assert baseline["risk"]["metrics"]["verified_unique_correct_matches"] == 75
        assert protected["risk"]["metrics"]["verified_unique_correct_matches"] == 20
        assert protected["risk"]["release_cleared"] is False
        cookie = first.cookies[COOKIE]
    with client(store, cookie) as cold:
        assert fixture(cold)["datasetId"] == data["datasetId"]
        replay = cold.get(f'/v1/candidates/{protected["candidateId"]}/comparison')
        assert replay.status_code == 200, replay.text
        assert replay.json() == protected
        assert cold.get(f'/v1/datasets/{data["datasetId"]}/preview').json()["rowCount"] == data["rowCount"]
        reviewed = cold.patch(f'/v1/datasets/{data["datasetId"]}/schema', json={"schema": data["schema"], "oneRowPerPersonConfirmed": False})
        assert reviewed.status_code == 200, reviewed.text
        reassess = cold.post("/v1/assessments", json={"candidateId": protected["candidateId"], "membershipKnown": False})
        assert reassess.status_code == 200, reassess.text
        assert reassess.json()["risk"]["metrics"]["p_guess"] is None
        for format in ("json", "html", "recipe", "csv"):
            report = cold.post("/v1/reports/export", json={"candidateId": protected["candidateId"], "format": format,
                               "acknowledgments": ["authority", "limitations", "reviewed"]})
            assert report.status_code == 200, report.text
            assert report.headers["content-disposition"].startswith("attachment;")
        assert cold.delete("/v1/session").json() == {"cleared": True}
        assert COOKIE not in cold.cookies
        assert cold.get(f'/v1/candidates/{protected["candidateId"]}/comparison').status_code == 404
    with client(store, other.cookies[COOKIE]) as independent:
        assert fixture(independent)["datasetId"] == other_data["datasetId"]
        assert independent.get(f'/v1/candidates/{protected["candidateId"]}/comparison').status_code == 404
    assert all('"frame"' not in r.text and '"preview"' not in r.text for r in store.records.values())


def test_search_24_cold_replay_and_limits():
    store = FakeStore()
    with client(store) as visitor:
        data = fixture(visitor)
        # Reviewing a schema before search must not duplicate its full payload
        # 24 times and exhaust the durable configuration budget.
        assert visitor.patch(f'/v1/datasets/{data["datasetId"]}/schema', json={"schema": data["schema"]}).status_code == 200
        assert visitor.post("/v1/search", json={"datasetId": data["datasetId"], "maxCandidates": 25}).status_code == 422
        search = visitor.post("/v1/search", json={"datasetId": data["datasetId"], "maxCandidates": 24})
        assert search.status_code == 200, search.text
        job = search.json()
        assert job["evaluated"] == 24 and len(job["candidates"]) == 24
        cookie = visitor.cookies[COOKIE]
    with client(store, cookie) as cold:
        replay = cold.get(f'/v1/search/{job["jobId"]}')
        assert replay.status_code == 200, replay.text
        assert replay.json() == job
        assert cold.post("/v1/search", json={"datasetId": data["datasetId"], "maxCandidates": 24}).status_code == 409
    assert max(len(r.text.encode()) for r in store.records.values()) <= BODY_LIMIT


def test_boundary_ttl_failure_and_stable_pseudonyms():
    store = FakeStore()
    moment = [100.0]
    with client(store, clock=lambda: moment[0]) as visitor:
        assert visitor.get("/health").json()["backendProvider"] == "Archie"
        assert visitor.get("/health").json()["uploadsAllowed"] is False
        assert visitor.get("/health", headers={"Host": "evil.example"}).status_code == 403
        assert visitor.get("/health", headers={"Origin": "https://evil.example"}).status_code == 403
        assert visitor.get("/health", headers={"Sec-Fetch-Site": "same-site"}).status_code == 403
        assert visitor.post("/v1/datasets/import", content=b"PRIVATE_ROWS").status_code == 403
        assert visitor.post("/v1/audits/import-pair", json={"rows": ["PRIVATE"]}).status_code == 403
        assert not store.records
        assert visitor.post("/v1/candidates", content=b"x" * (BODY_LIMIT + 1)).status_code == 413
        assert visitor.post("/v1/candidates", content=b"[]").status_code == 422
        assert not store.records
        data = fixture(visitor)
        response = visitor.post("/v1/candidates", json={"datasetId": data["datasetId"], "steps": [], "privateExtra": "PRIVATE_CELL"})
        assert response.status_code == 422 and "PRIVATE_CELL" not in response.text
        pseudonym = create(visitor, data, {"steps": [{"method": "pseudonymize", "columns": [data["schema"][0]["name"]], "params": {}}]})
        cookie = visitor.cookies[COOKIE]
    with client(store, cookie, clock=lambda: moment[0]) as cold:
        assert cold.get(f'/v1/candidates/{pseudonym["candidateId"]}/comparison').json() == pseudonym
        moment[0] += 1801
        assert fixture(cold)["datasetId"] != data["datasetId"]
        assert cold.get(f'/v1/candidates/{pseudonym["candidateId"]}/comparison').status_code == 404
    class Down(FakeStore):
        def create(self, *args):
            raise StoreUnavailable()
    with client(Down()) as down:
        assert down.get("/v1/demo").status_code == 503
        assert down.get("/health").status_code == 200
    with TestClient(ServerlessDemo("demo.example", store=store, secret=SECRET), base_url=ORIGIN) as no_origin:
        assert no_origin.delete("/v1/session").status_code == 403
