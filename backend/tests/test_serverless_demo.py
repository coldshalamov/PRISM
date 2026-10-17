"""Cold-start replay uses real engines while Archie stores fixture specs only."""
import json
import secrets
import threading

from fastapi.testclient import TestClient

from app.archie_store import Record, StoreConflict, StoreUnavailable
from app.serverless_demo import BODY_LIMIT, COOKIE, ServerlessDemo

ORIGIN = "https://demo.example"
SECRET = "stable-test-secret-with-at-least-32-characters"
ARCHIE_ORIGIN = "https://41d0bdfd-0065-4b0b-a973-efbe1c1a9c5e.previews.archie.com"


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


def bridge(store, clock=None):
    app = ServerlessDemo("demo.example", store=store, secret=SECRET, archie_origins=[ARCHIE_ORIGIN],
                         **({"clock": clock} if clock else {}))
    return TestClient(app, base_url=ORIGIN, headers={"Origin": ARCHIE_ORIGIN, "Sec-Fetch-Site": "cross-site"})


def handshake(visitor):
    response = visitor.post("/v1/browser-session", json={})
    assert response.status_code == 200, response.text
    payload = response.json()
    assert set(payload) == {"token", "expiresIn"} and payload["expiresIn"] == 1800
    assert len(payload["token"]) == 43
    assert "set-cookie" not in response.headers
    assert response.headers["access-control-allow-origin"] == ARCHIE_ORIGIN
    assert "access-control-allow-credentials" not in response.headers
    visitor.headers["X-PRISM-Demo-Session"] = payload["token"]
    return payload["token"]


def test_archie_bridge_real_calculation_download_and_visitor_isolation_without_cookies():
    store = FakeStore()
    with bridge(store) as first, bridge(store) as second:
        first_token, second_token = handshake(first), handshake(second)
        assert first_token != second_token and len(store.records) == 2
        first_data, second_data = fixture(first), fixture(second)
        assert first_data["datasetId"] != second_data["datasetId"]
        protected = create(first, first_data)
        assert protected["risk"]["metrics"]["verified_unique_correct_matches"] == 75
        assert second.get(f'/v1/candidates/{protected["candidateId"]}/comparison').status_code == 404
        download = first.post("/v1/reports/export", json={"candidateId": protected["candidateId"], "format": "recipe"})
        assert download.status_code == 200 and download.json() == protected["recipe"]
        assert download.headers["access-control-expose-headers"] == "Content-Disposition"
        assert "attachment;" in download.headers["content-disposition"]
        assert "set-cookie" not in download.headers and not first.cookies and not second.cookies
        assert first.delete("/v1/session").json() == {"cleared": True}
        assert first.get("/v1/demo").status_code == 403 and len(store.records) == 1
        assert fixture(second)["datasetId"] == second_data["datasetId"]


def test_archie_bridge_preflight_is_exact_opt_in_and_has_no_credentials():
    store = FakeStore()
    with bridge(store) as visitor:
        response = visitor.options("/v1/candidates", headers={
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,x-prism-demo-session",
        })
        assert response.status_code == 204
        assert response.headers["access-control-allow-origin"] == ARCHIE_ORIGIN
        assert set(response.headers["access-control-allow-methods"].split(", ")) == {"GET", "HEAD", "POST", "PATCH", "DELETE", "OPTIONS"}
        assert set(response.headers["access-control-allow-headers"].lower().split(", ")) == {"content-type", "x-prism-demo-session"}
        assert "access-control-allow-credentials" not in response.headers and "set-cookie" not in response.headers
        assert visitor.get("/health").status_code == 200 and not store.records
        bad_header = visitor.options("/v1/candidates", headers={"Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "Authorization"})
        assert bad_header.status_code == 403
        for foreign in ("https://evil.example", ARCHIE_ORIGIN + ".evil.example", "null"):
            denied = visitor.post("/v1/browser-session", headers={"Origin": foreign})
            assert denied.status_code == 403 and "access-control-allow-origin" not in denied.headers
        assert visitor.post("/v1/browser-session", headers={"Host": "evil.example", "X-Forwarded-Host": "demo.example"}).status_code == 403
        assert visitor.post("/v1/datasets/import", content=b"PRIVATE_ROWS").json()["code"] == "fictional_only"
        assert visitor.post("/v1/audits/import-pair", json={}).json()["code"] == "fictional_only"
        assert visitor.post("/v1/browser-session", json={"rows": ["PRIVATE"]}).status_code == 422
        assert not store.records
    with client(store) as same_origin:
        # The opt-in bridge endpoint is not exposed to ordinary cookie clients.
        assert same_origin.post("/v1/browser-session", json={}).status_code == 403
        assert same_origin.get("/health", headers={"Origin": ARCHIE_ORIGIN}).status_code == 403


def test_archie_bridge_rejects_missing_invalid_expired_headers_without_allocation():
    store = FakeStore()
    moment = [100.0]
    with bridge(store, clock=lambda: moment[0]) as visitor:
        for path in ("/v1/demo", "/v1/registry", "/v1/lab"):
            assert visitor.get(path).json()["code"] == "browser_session_required"
        assert visitor.post("/v1/candidates", content=b"not-json").json()["code"] == "browser_session_required"
        assert not store.records
        token = handshake(visitor)
        assert visitor.get("/v1/registry").status_code == 200
        fixture(visitor)
        for invalid in ("", "bad", "x" * 43, token + "extra"):
            denied = visitor.get("/v1/demo", headers={"X-PRISM-Demo-Session": invalid})
            assert denied.status_code == 403 and "set-cookie" not in denied.headers
            assert len(store.records) == 1
        duplicate = visitor.get("/v1/demo", headers=[("X-PRISM-Demo-Session", token), ("X-PRISM-Demo-Session", token)])
        assert duplicate.status_code == 403 and len(store.records) == 1
        # A valid same-origin cookie cannot replace the required bridge header.
        visitor.headers.pop("X-PRISM-Demo-Session")
        visitor.cookies.set(COOKIE, token, domain="demo.example", path="/")
        assert visitor.get("/v1/demo").status_code == 403 and len(store.records) == 1
        visitor.headers["X-PRISM-Demo-Session"] = token
        moment[0] += 1801
        expired = visitor.get("/v1/demo")
        assert expired.status_code == 403 and expired.json()["code"] == "session_expired"
        assert not store.records
        assert handshake(visitor) != token and len(store.records) == 1
