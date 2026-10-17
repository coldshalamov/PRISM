import json
import logging

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    with TestClient(app, base_url="http://127.0.0.1:8000") as local:
        local.delete("/v1/session")
        yield local
        local.delete("/v1/session")


def candidate(client, demo=None):
    demo = demo or client.get("/v1/demo").json()
    response = client.post("/v1/candidates", json={"datasetId": demo["datasetId"], "steps": demo["defaultSteps"]})
    assert response.status_code == 200, response.text
    return response.json()


def test_full_workflow_and_private_exports(client, caplog):
    caplog.set_level(logging.INFO)
    demo = client.get("/v1/demo").json()
    assert demo["rowCount"] == 5000 and demo["synthetic"] is True
    result = candidate(client, demo)
    assert result["alignment"] == "verified"
    assert "name" not in result["columns"]
    assert result["preview"][0]["age"].startswith("[")
    assert result["risk"]["release_cleared"] is False
    assert len(result["utility"]["queries"]) >= 2
    assert "_frame" not in result and "_lineage" not in result
    for kind in ["json", "html", "recipe", "csv"]:
        response = client.post("/v1/reports/export", json={"candidateId": result["candidateId"], "format": kind, "acknowledgments": ["authority", "limitations", "reviewed"] if kind == "csv" else []})
        assert response.status_code == 200
        assert "attachment;" in response.headers["content-disposition"]
        assert "example.invalid" not in response.text
        assert demo["preview"][0]["name"] not in response.text
        if kind == "json":
            report = response.json()
            assert "preview" not in report["candidate"]
            assert report["candidate"]["threatModel"]["qi"]
            assert report["candidate"]["workload"]
            assert report["libraries"]["pandas"]
            assert report["decision"].startswith("Not cleared for release")
    assert demo["preview"][0]["email"] not in caplog.text


def test_origin_host_boundary_and_errors_redact_input(client):
    assert client.get("/health", headers={"origin": "https://evil.invalid"}).status_code == 403
    assert client.get("/health", headers={"host": "evil.invalid"}).status_code == 403
    assert client.get("/health").headers["cache-control"] == "no-store"
    response = client.post("/v1/candidates", json={"datasetId": "missing", "steps": [], "patientSecret": "SECRET_CELL"})
    assert response.status_code == 422 and "SECRET_CELL" not in response.text
    assert client.get("/v1/datasets/../../Windows/preview").status_code != 200


def test_upload_units_and_roles_are_reviewable(client):
    raw = b"name,age,zip,weight,response\nPRIVATE_NAME,31,02138,180,1\nOther,41,02139,160,0\n"
    imported = client.post("/v1/datasets/import", files={"file": ("research.csv", raw, "text/csv")}).json()
    assert imported["preview"][0]["zip"] == "02138"
    response = client.post("/v1/candidates", json={"datasetId": imported["datasetId"], "steps": imported["defaultSteps"]})
    assert response.status_code == 422 and "PRIVATE_NAME" not in response.text
    for field in imported["schema"]:
        if field["name"] == "weight":
            field["unit"] = "lb"
    updated = client.patch(f'/v1/datasets/{imported["datasetId"]}/schema', json={"schema": imported["schema"]})
    assert updated.status_code == 200
    result = candidate(client, updated.json())
    assert result["preview"][0]["weight"] == "[80,85)"


def test_direct_identifiers_block_csv_and_session_clear(client):
    demo = client.get("/v1/demo").json()
    unchanged = client.post("/v1/candidates", json={"datasetId": demo["datasetId"], "steps": []}).json()
    response = client.post("/v1/reports/export", json={"candidateId": unchanged["candidateId"], "format": "csv"})
    assert response.status_code == 409
    client.delete("/v1/session")
    assert client.get(f'/v1/candidates/{unchanged["candidateId"]}/comparison').status_code == 404


def test_direct_identifier_queries_cannot_leak_into_reports(client):
    demo = client.get("/v1/demo").json()
    response = client.post("/v1/candidates", json={"datasetId": demo["datasetId"], "steps": demo["defaultSteps"], "workload": [{"id": "leak", "type": "group_count", "groupBy": ["name"]}]})
    assert response.status_code == 400
    assert response.json()["code"] == "identifier_query_blocked"


def test_external_audit_does_not_assume_alignment(client):
    demo = client.get("/v1/demo").json()
    raw = b"years,postal,mass,stage,mutation,response\n35,021,70,II,true,true\n45,331,80,III,false,false\n"
    external = client.post("/v1/datasets/import", files={"file": ("protected.csv", raw, "text/csv")}).json()
    body = {"originalDatasetId": demo["datasetId"], "protectedDatasetId": external["datasetId"], "columnMapping": {"age": "years", "zip": "postal", "weight": "mass"}}
    response = client.post("/v1/audits/import-pair", json=body)
    assert response.status_code == 200, response.text
    audit = response.json()
    assert audit["alignment"] == "unpaired"
    assert "age" in audit["columns"]
    assert "Unknown" in audit["recipe"]["provenance"]
    body["mode"] = "paired_row_preserving"
    assert client.post("/v1/audits/import-pair", json=body).status_code == 400


def test_bounded_search_and_download(client):
    demo = client.get("/v1/demo").json()
    response = client.post("/v1/search", json={"datasetId": demo["datasetId"], "maxCandidates": 12})
    assert response.status_code == 200, response.text
    search = response.json()
    assert search["evaluated"] == 12
    assert len(search["candidates"]) == 12
    assert any(c["frontierMember"] for c in search["candidates"])
    assert client.get(f'/v1/search/{search["jobId"]}').json()["status"] == "completed"
    assert client.post("/v1/search", json={"datasetId": demo["datasetId"], "maxCandidates": 81}).status_code == 422


def test_lab_counterexamples_calculated(client):
    experiments = {x["id"]: x for x in client.get("/v1/lab").json()["experiments"]}
    assert experiments["differencing"]["result"]["correct"] is True
    assert experiments["composition"]["result"]["combined_unique_fraction"] == 1
    assert experiments["composition"]["result"]["age_alone_unique_fraction"] == 0
    assert experiments["correlation"]["result"]["original_correlation"] == pytest.approx(1)
    assert experiments["correlation"]["result"]["protected_correlation"] == pytest.approx(-1)
    assert experiments["linkage"]["result"]["unique_correct_matches"] == 2


def test_formula_export_and_html_escape():
    import pandas as pd
    from app import reports
    output = reports.protected_csv(pd.DataFrame({"x": ["=HYPERLINK(\"evil\")", -2, "@SUM(1)"]}))
    assert "'=HYPERLINK" in output and "'@SUM" in output and "\r\n-2\r\n" in output
    html = reports.render_html({"generatedAt": "now", "decision": "<script>bad</script>"})
    assert "<script>bad</script>" not in html


def test_response_contract_models_match_vertical_slice(client):
    from app.models import DatasetSummary, CandidateSummary, AssessmentFinding
    demo = client.get("/v1/demo").json()
    assert DatasetSummary.model_validate(demo).rowCount == 5000
    protected = candidate(client, demo)
    assert CandidateSummary.model_validate(protected).alignment == "verified"
    for finding in protected["risk"]["findings"]:
        assert AssessmentFinding.model_validate(finding).status in {"implemented", "unsupported", "not_applicable", "partial", "error"}


def test_kit_benchmark_real_linkage_and_same_science(client):
    demo = client.get("/v1/demo?fixture=kit").json()
    assert demo["rowCount"] == 480
    default = candidate(client, demo)
    assert default["risk"]["metrics"]["verified_unique_correct_matches"] == 75
    steps = demo["defaultSteps"] + [{"method": "drop", "columns": ["zip"], "params": {}}]
    alternate_response = client.post("/v1/candidates", json={"datasetId": demo["datasetId"], "steps": steps})
    assert alternate_response.status_code == 200, alternate_response.text
    alternate = alternate_response.json()
    assert alternate["risk"]["metrics"]["verified_unique_correct_matches"] == 20
    assert [q["protected"] for q in default["utility"]["queries"]] == [q["protected"] for q in alternate["utility"]["queries"]]
    assert all(q["pass"] for q in default["utility"]["queries"])


def test_noise_membership_and_external_unknown_recipe_abstain(client):
    demo = client.get("/v1/demo?fixture=kit").json()
    steps = [s for s in demo["defaultSteps"] if "age" not in s["columns"]]
    steps += [{"method": "noise", "columns": ["age"], "params": {"scale": 2}}]
    response = client.post("/v1/candidates", json={"datasetId": demo["datasetId"], "steps": steps})
    assert response.status_code == 200
    assert response.json()["risk"]["metrics"]["verified_linkage_rate"] is None
    result = client.post("/v1/candidates", json={"datasetId": demo["datasetId"], "steps": demo["defaultSteps"], "membershipKnown": False}).json()
    assert result["risk"]["metrics"]["verified_linkage_rate"] is None
    assert result["risk"]["metrics"]["p_guess"] is None


def test_export_requires_all_three_acknowledgments(client):
    result = candidate(client)
    for acknowledgments in ([], ["authority"], ["authority", "limitations"]):
        response = client.post("/v1/reports/export", json={"candidateId": result["candidateId"], "format": "csv", "acknowledgments": acknowledgments})
        assert response.status_code == 409 and response.json()["code"] == "export_review_required"
    response = client.post("/v1/reports/export", json={"candidateId": result["candidateId"], "format": "csv", "acknowledgments": ["authority", "limitations", "reviewed"]})
    assert response.status_code == 200


def test_repeated_entity_key_remains_record_diagnostic(client):
    raw = b"person_id,age,zip\nONE,30,02138\nONE,31,02139\nTWO,41,33101\n"
    data = client.post("/v1/datasets/import", files={"file": ("visits.csv", raw, "text/csv")}).json()
    assert data["rowUnit"]["repeatedEntitiesDetected"] is True
    result = client.post("/v1/candidates", json={"datasetId": data["datasetId"], "steps": data["defaultSteps"], "oneRowPerPersonConfirmed": True}).json()
    assert result["risk"]["metrics"]["verified_linkage_rate"] is None
    assert any(f["id"] == "row-person-unit" for f in result["risk"]["findings"])


def test_chunked_size_limit_without_content_length():
    from fastapi import FastAPI, Request
    from app.security import BoundedBodyMiddleware
    tiny = FastAPI()
    tiny.add_middleware(BoundedBodyMiddleware, max_bytes=8)

    @tiny.post("/")
    async def echo(request: Request):
        return {"size": len(await request.body())}

    with TestClient(tiny) as local:
        response = local.post("/", content=iter([b"123456", b"abcdef"]))
        assert response.status_code == 413
        assert response.json()["code"] == "file_too_large"
        assert local.post("/", content=iter([b"1234", b"5678"])).json() == {"size": 8}


def test_multipart_over_one_megabyte_stays_in_memory(client, monkeypatch):
    import tempfile
    import starlette.formparsers
    observed = []

    class ObservedFile(tempfile.SpooledTemporaryFile):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            self.disk_rollover = False
            observed.append(self)

        def rollover(self):
            self.disk_rollover = True
            return super().rollover()

    monkeypatch.setattr(starlette.formparsers, "SpooledTemporaryFile", ObservedFile)
    content = ("note\n" + ("x" * 600 + "\n") * 2000).encode()
    assert len(content) > 1024 * 1024
    response = client.post("/v1/datasets/import", files={"file": ("large.csv", content, "text/csv")})
    assert response.status_code == 200
    assert observed and not any(file.disk_rollover for file in observed)


def test_clear_session_cannot_be_repopulated_by_inflight_candidate(client, monkeypatch):
    from concurrent.futures import ThreadPoolExecutor
    import threading
    from app import main
    entered, finish = threading.Event(), threading.Event()
    apply = main.transforms.apply
    demo = client.get("/v1/demo").json()

    def paused(*args, **kwargs):
        entered.set()
        assert finish.wait(5)
        return apply(*args, **kwargs)

    monkeypatch.setattr(main.transforms, "apply", paused)
    with ThreadPoolExecutor(max_workers=1) as worker:
        future = worker.submit(client.post, "/v1/candidates", json={"datasetId": demo["datasetId"], "steps": demo["defaultSteps"]})
        assert entered.wait(5)
        try:
            assert client.delete("/v1/session").status_code == 200
        finally:
            finish.set()
        response = future.result(timeout=10)
    assert response.status_code == 409
    assert response.json()["code"] == "session_ended"
    assert not main.CANDIDATES and not main.DATASETS


def test_underscore_csv_headers_are_preserved_without_engine_state(client):
    data = client.post("/v1/datasets/import", files={"file": ("headers.csv", b"_age,_frame\n31,literal data\n42,other data\n", "text/csv")}).json()
    result = client.post("/v1/candidates", json={"datasetId": data["datasetId"], "steps": data["defaultSteps"]}).json()
    assert result["preview"][0]["_age"] == "[30,35)"
    assert result["preview"][0]["_frame"] == "literal data"
    assert "_frame" not in result and "_lineage" not in result
    comparison = client.get(f'/v1/candidates/{result["candidateId"]}/comparison').json()
    assert comparison["preview"][0]["_frame"] == "literal data"
    assert "_frame" not in comparison
