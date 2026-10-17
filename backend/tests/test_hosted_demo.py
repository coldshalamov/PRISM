"""The public adapter boundary, isolation, and actual fixture calculation."""
import pytest
from fastapi.testclient import TestClient

from app.hosted_demo import BODY_LIMIT, COOKIE, HostedDemo
from app.main import app as local_app

ORIGIN = "https://demo.example"


def visitor(app):
    return TestClient(app, base_url=ORIGIN, headers={"Origin": ORIGIN})


def fixture(client):
    result = client.get("/v1/demo?fixture=kit")
    assert result.status_code == 200, result.text
    return result.json()


def candidate(client, data):
    result = client.post("/v1/candidates", json={"datasetId": data["datasetId"], "steps": data["defaultSteps"]})
    assert result.status_code == 200, result.text
    return result.json()


def test_two_visitors_refresh_and_clear_are_isolated_with_real_calculations():
    app = HostedDemo("demo.example")
    with visitor(app) as first, visitor(app) as second:
        data_a, data_b = fixture(first), fixture(second)
        assert data_a["synthetic"] and data_b["synthetic"]
        assert data_a["datasetId"] != data_b["datasetId"]
        assert fixture(first)["datasetId"] == data_a["datasetId"]
        assert first.cookies[COOKIE] != second.cookies[COOKIE]
        measured_a, measured_b = candidate(first, data_a), candidate(second, data_b)
        assert measured_a["risk"]["metrics"]["verified_unique_correct_matches"] == 75
        assert all(query["pass"] for query in measured_a["utility"]["queries"])
        assert measured_a["risk"]["release_cleared"] is False
        alternate = first.post("/v1/candidates", json={"datasetId": data_a["datasetId"], "steps": data_a["defaultSteps"] + [{"method": "drop", "columns": ["zip"], "params": {}}]}).json()
        assert alternate["risk"]["metrics"]["verified_unique_correct_matches"] == 20
        assert [q["protected"] for q in alternate["utility"]["queries"]] == [q["protected"] for q in measured_a["utility"]["queries"]]
        assert second.get(f'/v1/candidates/{measured_a["candidateId"]}/comparison').status_code == 404
        assert second.post("/v1/candidates", json={"datasetId": data_a["datasetId"], "steps": []}).status_code == 404
        assert first.delete("/v1/session").json() == {"cleared": True}
        assert first.get(f'/v1/candidates/{measured_a["candidateId"]}/comparison').status_code == 404
        assert second.get(f'/v1/candidates/{measured_b["candidateId"]}/comparison').status_code == 200
        assert fixture(first)["datasetId"] != data_a["datasetId"]


def test_intake_is_rejected_before_body_parsing_or_session_allocation():
    app = HostedDemo("demo.example")
    with visitor(app) as client:
        for path in ["/v1/datasets/import", "/v1/datasets/import/", "/v1/audits/import-pair"]:
            response = client.post(path, content=b"PRIVATE_RAW_ROW", headers={"Content-Type": "application/octet-stream"})
            assert response.status_code == 403
            assert response.json()["code"] == "fictional_only"
            assert "PRIVATE_RAW_ROW" not in response.text
        assert not app.sessions
        assert client.post("/v1/future-intake", json={"rows": ["PRIVATE"]}).status_code == 403


def test_host_exact_origin_fetch_site_and_secure_cookie_boundary():
    app = HostedDemo("demo.example")
    with visitor(app) as client:
        assert client.get("/health", headers={"Host": "evil.example"}).status_code == 403
        assert client.get("/health", headers={"Origin": "https://sibling.example"}).status_code == 403
        assert client.get("/health", headers={"Origin": "null"}).status_code == 403
        assert client.get("/health", headers={"Sec-Fetch-Site": "same-site"}).status_code == 403
        assert client.get("/health", headers={"Sec-Fetch-Site": "cross-site"}).status_code == 403
        # Forwarded host/proto cannot turn a hostile Origin into a trusted one.
        assert client.get("/health", headers={"Origin": "https://evil.example", "X-Forwarded-Host": "demo.example", "X-Forwarded-Proto": "https"}).status_code == 403
        assert not app.sessions
        response = client.get("/v1/demo?fixture=kit")
        cookie = response.headers["set-cookie"]
        assert "HttpOnly" in cookie and "Secure" in cookie and "SameSite=strict" in cookie
        assert "Domain=" not in cookie
        assert "access-control-allow-origin" not in response.headers
        assert response.headers["cache-control"] == "no-store"
    with TestClient(app, base_url=ORIGIN) as no_origin:
        assert no_origin.delete("/v1/session").status_code == 403
    # Importing/using the hosted adapter does not change local app trust.
    with TestClient(local_app, base_url=ORIGIN) as local:
        assert local.get("/health").json()["code"] == "loopback_only"


def test_health_session_ttl_capacity_and_load_are_bounded():
    moment = [100.0]
    app = HostedDemo("demo.example", max_sessions=1, ttl_seconds=10, clock=lambda: moment[0])
    with visitor(app) as first, visitor(app) as second:
        assert first.get("/health").json()["deploymentMode"] == "synthetic_demo"
        assert first.get("/health").json()["uploadsAllowed"] is False
        assert first.get("/v1/registry").status_code == 200
        assert not app.sessions
        old = fixture(first)["datasetId"]
        response = second.get("/v1/demo?fixture=kit")
        assert response.status_code == 503 and len(app.sessions) == 1
        assert response.headers["retry-after"]
        assert second.get("/health").status_code == 200
        moment[0] += 11
        assert fixture(second)["datasetId"] != old
        assert len(app.sessions) == 1
        assert app.cpu.acquire(blocking=False)
        try:
            assert second.get("/v1/demo?fixture=kit").status_code == 429
            assert second.get("/v1/lab").status_code == 429
            assert second.get("/health").status_code == 200
        finally:
            app.cpu.release()


def test_search_budget_candidate_cap_and_configuration_body_limit():
    app = HostedDemo("demo.example", max_candidates=2)
    with visitor(app) as client:
        data = fixture(client)
        too_big = client.post("/v1/search", json={"datasetId": data["datasetId"], "maxCandidates": 25})
        assert too_big.status_code == 422
        response = client.post("/v1/search", json={"datasetId": data["datasetId"], "maxCandidates": 2})
        assert response.status_code == 200, response.text
        result = response.json()
        assert result["evaluated"] == 2 and len(result["candidates"]) == 2
        assert client.get(f'/v1/search/{result["jobId"]}').json()["status"] == "completed"
        assert client.post("/v1/candidates", json={"datasetId": data["datasetId"], "steps": []}).status_code == 409
        assert client.delete("/v1/session").status_code == 200
        assert client.post("/v1/candidates", content=b"x" * (BODY_LIMIT + 1)).status_code == 413
        assert client.post("/v1/candidates", content=iter([b"x" * BODY_LIMIT, b"x"])).status_code == 413
        response = client.post("/v1/candidates", json={"datasetId": "missing", "steps": [], "privateExtra": "PRIVATE_CELL"})
        assert response.status_code == 422 and "PRIVATE_CELL" not in response.text


def test_loopback_development_cookie_and_invalid_authority():
    with TestClient(HostedDemo("localhost:7860"), base_url="http://localhost:7860", headers={"Origin": "http://localhost:7860"}) as local:
        assert "Secure" not in local.get("/v1/demo?fixture=kit").headers["set-cookie"]
        assert local.delete("/v1/session").status_code == 200
    for invalid in ["*", "https://demo.example", "demo.example/path", "demo.example@evil.example", "demo.example,evil.example"]:
        with pytest.raises(ValueError):
            HostedDemo(invalid)
