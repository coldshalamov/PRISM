"""Loopback-only, memory-only HTTP integration for PRISM."""
from __future__ import annotations

import copy
import json
import secrets
import threading
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
from fastapi import FastAPI, File, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from starlette.formparsers import MultiPartParser

from . import datasets, lab, linkage, optimizer, registry, reports, risk, transforms, utility
from .models import AssessmentRequest, AuditRequest, CandidateRequest, ReportRequest, SchemaRequest, SearchRequest
from .security import BoundedBodyMiddleware

app = FastAPI(title="PRISM local workbench", version="0.1.0")
ORIGINS = {"http://127.0.0.1:8000", "http://localhost:8000", "http://127.0.0.1:5173", "http://localhost:5173"}
app.add_middleware(CORSMiddleware, allow_origins=list(ORIGINS), allow_methods=["GET", "POST", "PATCH", "DELETE"], allow_headers=["Content-Type"])
DATASETS: dict[str, dict] = {}
CANDIDATES: dict[str, dict] = {}
JOBS: dict[str, dict] = {}
LOCK = threading.RLock()
SEARCH_LOCK = threading.Lock()
SESSION_SECRET = secrets.token_bytes(32)
SESSION_EPOCH = 0
MAX_BYTES = 50 * 1024 * 1024
# Prevent UploadFile's default 1 MB rollover from writing imported rows to a
# temporary disk file. The body middleware rejects oversized input first.
MultiPartParser.spool_max_size = MAX_BYTES + 65536
app.add_middleware(BoundedBodyMiddleware, max_bytes=MAX_BYTES + 65536)


class Problem(Exception):
    def __init__(self, code, message, status=400):
        self.code, self.message, self.status = code, message, status


@app.exception_handler(Problem)
async def problem_handler(request, exc):
    return JSONResponse({"code": exc.code, "message": exc.message, "details": {}}, status_code=exc.status)


@app.exception_handler(RequestValidationError)
async def validation_handler(request, exc):
    # Pydantic's default response includes offending input, possibly source rows.
    fields = [".".join(map(str, item["loc"])) for item in exc.errors()]
    return JSONResponse({"code": "invalid_request", "message": "Check the request fields and limits.", "details": {"fields": fields}}, status_code=422)


@app.exception_handler(ValueError)
async def value_handler(request, exc):
    # Engine errors may mention a rejected raw cell; never echo that value.
    return JSONResponse({"code": "invalid_configuration", "message": "The configuration is incompatible with the data. Review field types, units, query columns, and method parameters.", "details": {}}, status_code=422)


@app.middleware("http")
async def local_boundary(request: Request, call_next):
    request.state.session_epoch = SESSION_EPOCH
    if request.url.hostname not in {"localhost", "127.0.0.1", "::1"}:
        return JSONResponse({"code": "loopback_only", "message": "PRISM only accepts local hostnames.", "details": {}}, status_code=403)
    origin = request.headers.get("origin")
    if origin and origin not in ORIGINS:
        return JSONResponse({"code": "origin_denied", "message": "This origin is not permitted.", "details": {}}, status_code=403)
    if request.headers.get("sec-fetch-site") == "cross-site":
        return JSONResponse({"code": "cross_site_denied", "message": "Cross-site access is not permitted.", "details": {}}, status_code=403)
    length = request.headers.get("content-length")
    if length and (not length.isdigit() or int(length) > MAX_BYTES + 65536):
        return JSONResponse({"code": "file_too_large", "message": "Maximum upload size is 50 MB.", "details": {}}, status_code=413)
    response = await call_next(request)
    response.headers.update({"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "X-Frame-Options": "DENY", "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'"})
    return response


def now():
    return datetime.now(timezone.utc).isoformat()


def clean(value):
    """Normalize pandas/NumPy scalars and missing cells at the HTTP boundary."""
    if isinstance(value, pd.DataFrame):
        return json.loads(value.to_json(orient="records", date_format="iso"))
    if isinstance(value, dict):
        return {str(k): clean(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [clean(v) for v in value]
    if hasattr(value, "item"):
        value = value.item()
    if isinstance(value, float) and (pd.isna(value) or abs(value) == float("inf")):
        return None
    return value


def public_candidate(item):
    # Strip engine state at the structural boundary. CSV headers and category
    # labels beginning with '_' remain legitimate user data in local previews.
    return clean({key: value for key, value in item.items() if key not in {"_frame", "_lineage", "_epoch"}})


def get_dataset(identifier):
    data = DATASETS.get(identifier)
    if data is None:
        raise Problem("dataset_not_found", "Dataset is absent or this local session has ended.", 404)
    return data


def get_candidate(identifier):
    candidate = CANDIDATES.get(identifier)
    if candidate is None:
        raise Problem("candidate_not_found", "Candidate is absent or this local session has ended.", 404)
    return candidate


def default_workload(schema):
    columns = {item["name"] for item in schema}
    queries = []
    if {"mutation", "response", "stage"} <= columns:
        queries.extend([
            {"id": "response-by-mutation-stage", "type": "group_rate", "groupBy": ["mutation", "stage"], "target": "response", "positiveValue": 1, "weight": 3, "tolerance": .05, "minCohort": 5},
            {"id": "mutation-by-stage", "type": "group_rate", "groupBy": ["stage"], "target": "mutation", "positiveValue": 1, "weight": 2, "tolerance": .05, "minCohort": 5},
        ])
    if {"age", "stage"} <= columns:
        queries.append({"id": "mean-age-by-stage", "type": "group_mean", "groupBy": ["stage"], "target": "age", "weight": 1, "tolerance": 2, "minCohort": 5})
    if not queries:
        queries = [{"id": "record-count", "type": "group_count", "groupBy": [], "weight": 1, "tolerance": 1, "minCohort": 1}]
    return queries


def dataset_response(data):
    return clean({"datasetId": data["id"], "name": data["name"], "rowCount": len(data["frame"]), "schema": data["schema"], "preview": data["frame"].head(30), "defaultSteps": data.get("defaultSteps", transforms.default_steps(data["schema"])), "defaultWorkload": data.get("defaultWorkload", default_workload(data["schema"])), "synthetic": data["synthetic"], "rowUnit": data["rowUnit"]})


def add_dataset(frame, name, synthetic=False, expected_epoch=None):
    if len(frame) > 100000 or len(frame.columns) > 80:
        raise Problem("dataset_limit", "The local prototype supports at most 100,000 rows and 80 columns.")
    with LOCK:
        if expected_epoch is not None and expected_epoch != SESSION_EPOCH:
            raise Problem("session_ended", "The local session ended while this request was running. Reload or reimport to continue.", 409)
        if len(DATASETS) >= 8:
            raise Problem("session_capacity", "Clear this local session before importing more datasets.", 409)
        identifier = secrets.token_urlsafe(18)
        data = {"id": identifier, "frame": frame, "name": name[:100], "synthetic": synthetic, "schema": datasets.profile(frame)}
        data["_epoch"] = SESSION_EPOCH
        entity = next((c["name"] for c in data["schema"] if c["role"] == "direct_identifier" and c["name"].lower().endswith("id")), None)
        data["rowUnit"] = {"entityColumn": entity, "oneRowPerPersonConfirmed": synthetic,
                           "repeatedEntitiesDetected": bool(frame[entity].dropna().duplicated().any()) if entity else False}
        DATASETS[identifier] = data
        return data


def threat_config(data, request):
    schema = data["schema"]
    qi = request.qi if request.qi is not None else [c["name"] for c in schema if c["role"] == "quasi_identifier"]
    sensitive = request.sensitive if request.sensitive is not None else [c["name"] for c in schema if c["role"] == "sensitive"]
    if len(qi) != len(set(qi)) or len(sensitive) != len(set(sensitive)) or any(c not in data["frame"].columns for c in qi + sensitive):
        raise Problem("invalid_threat_columns", "Select distinct threat-model columns present in the original dataset.")
    workload = [q.model_dump() for q in request.workload] if request.workload is not None else data.get("defaultWorkload", default_workload(schema))
    direct = {c["name"] for c in schema if c["role"] == "direct_identifier"}
    for query in workload:
        references = set(query.get("groupBy") or []) | set(query.get("filter") or {})
        if query.get("target"):
            references.add(query["target"])
        if references & direct:
            raise Problem("identifier_query_blocked", "Research queries cannot group, filter or analyze direct-identifier fields; their results may expose raw identities in reports.")
    return qi, sensitive, workload


def threat_context(data, request, base=None):
    context = {"membershipKnown": True, **data["rowUnit"], **(base or {})}
    for key in ("membershipKnown", "entityColumn", "oneRowPerPersonConfirmed"):
        value = getattr(request, key, None)
        if value is not None:
            context[key] = value
    entity = context.get("entityColumn")
    if entity and entity not in data["frame"].columns:
        raise Problem("invalid_entity_column", "Choose an entity key present in the original dataset.")
    context["repeatedEntitiesDetected"] = bool(data["frame"][entity].dropna().duplicated().any()) if entity else False
    return context


def make_candidate(data, frame, recipe, qi, sensitive, workload, lineage=None, name=None, precomputed=None, context=None):
    if len(CANDIDATES) >= 160:
        raise Problem("session_capacity", "Clear the local session before creating more candidates.", 409)
    available_qi = [c for c in qi if c in frame.columns]
    available_sensitive = [c for c in sensitive if c in frame.columns]
    risk_result = copy.deepcopy(precomputed["risk"]) if precomputed else risk.evaluate(frame, available_qi, available_sensitive)
    utility_result = copy.deepcopy(precomputed["utility"]) if precomputed else utility.evaluate(data["frame"], frame, data["schema"], workload, lineage=lineage)
    risk_result["declared_qi"] = qi
    risk_result["removed_qi"] = [c for c in qi if c not in frame.columns]
    risk_result["removed_sensitive"] = [c for c in sensitive if c not in frame.columns]
    context = context or {"membershipKnown": True, **data["rowUnit"]}
    risk_result["threat_context"] = context
    if lineage is not None and recipe.get("version") != "external":
        linked = linkage.evaluate(data["frame"], frame, data["schema"], recipe["steps"], lineage, qi=qi,
                                  membership_known=context["membershipKnown"])
        if not context.get("oneRowPerPersonConfirmed") or context.get("repeatedEntitiesDetected"):
            linked.update(status="not_applicable", numerator=None, metricValue=None,
                          narrative="Person-level verified linkage is unassessed: confirm one row per person and resolve repeated entity keys.")
    else:
        linked = {"id": "verified-linkage-unavailable", "attackId": "verified_exact_linkage", "status": "not_applicable",
                  "numerator": None, "denominator": len(frame), "metricValue": None, "metricUnit": "fraction",
                  "narrative": "Verified correct identity linkage is unassessed without trusted correspondence and a known public recipe.",
                  "assumptions": [], "caveats": ["Unknown external mechanisms cannot be inferred from similar rows."]}
    risk_result["findings"].append(linked)
    risk_result["metrics"]["verified_unique_correct_matches"] = linked.get("numerator") if linked["status"] == "implemented" else None
    risk_result["metrics"]["verified_linkage_rate"] = linked.get("metricValue") if linked["status"] == "implemented" else None
    if not context["membershipKnown"]:
        risk_result["limitations"].append("Source membership is not known in the selected scenario; present-target guessing is inapplicable. Sample partitions remain descriptive.")
        risk_result["metrics"]["p_guess"] = None
        risk_result["assumptions"] = ["Conditional definitions require known membership; this scenario does not establish that prerequisite."] + risk_result["assumptions"][1:]
        for finding in risk_result["findings"]:
            if finding["attackId"] == "sample_guessing":
                finding.update(status="not_applicable", metricValue=None, numerator=None,
                               narrative="Present-target guessing requires known source membership; it was not assessed for this scenario.")
    if not context.get("oneRowPerPersonConfirmed") or context.get("repeatedEntitiesDetected"):
        warning = "Row-level diagnostics do not establish person-level risk: one row per person is unconfirmed or repeated entity keys were detected. Same-table train/test splitting is not subject-level independence."
        risk_result["limitations"].append(warning)
        risk_result["assumptions"] = ["This is a record-level analysis; distinct people and subject-level independence are unverified."] + risk_result["assumptions"][1:]
        risk_result["findings"].append({"id": "row-person-unit", "attackId": "longitudinal_trajectories", "status": "unsupported", "narrative": warning, "severity": "high", "assumptions": [], "caveats": [warning]})
        for finding in risk_result["findings"]:
            if finding.get("status") == "implemented":
                finding["assumptions"] = ["Record-level calculation only; one-record-per-person and subject-level independence are unverified."] + finding.get("assumptions", [])[1:]
                finding.setdefault("caveats", []).append(warning)
    identifier = secrets.token_urlsafe(18)
    item = {"candidateId": identifier, "datasetId": data["id"], "name": name or f"Candidate {len(CANDIDATES) + 1}",
            "rowCount": len(frame), "recipe": recipe, "preview": clean(frame.head(30)), "columns": list(frame.columns),
            "risk": risk_result, "utility": utility_result, "constraints": precomputed.get("constraints", []) if precomputed else [],
            "frontierMember": bool(precomputed.get("frontierMember", False)) if precomputed else False,
            "explanation": precomputed.get("explanation", "") if precomputed else "",
            "alignment": "verified" if lineage is not None else "unpaired", "createdAt": now(),
            "threatModel": {"qi": qi, "sensitive": sensitive}, "workload": workload,
            "threatContext": context,
            "schema": copy.deepcopy(data["schema"]), "_frame": frame.copy(deep=True), "_lineage": lineage}
    if precomputed:
        for key in ("objectives", "feasible", "suppression_rate", "validation"):
            if key in precomputed:
                item[key] = copy.deepcopy(precomputed[key])
    with LOCK:
        if data["_epoch"] != SESSION_EPOCH:
            raise Problem("session_ended", "The local session ended while this request was running. Reload or reimport to continue.", 409)
        if len(CANDIDATES) >= 160:
            raise Problem("session_capacity", "Clear the local session before creating more candidates.", 409)
        CANDIDATES[identifier] = item
    return public_candidate(item)


@app.get("/health")
def health():
    return {"status": "ok", "version": "0.1.0"}


@app.get("/v1/demo")
def demo(request: Request, fixture: str = "architecture"):
    if fixture not in {"architecture", "kit"}:
        raise Problem("unknown_fixture", "Choose architecture or kit demo data.")
    for item in list(DATASETS.values()):
        if item.get("demo") == fixture:
            return dataset_response(item)
    if fixture == "kit":
        bundle = linkage.kit_fixture()
        data = add_dataset(bundle["frame"], bundle["name"], True, expected_epoch=request.state.session_epoch)
        for key in ("schema", "defaultSteps", "defaultWorkload"):
            data[key] = bundle[key]
    else:
        data = add_dataset(datasets.synthetic_oncology(), "Synthetic oncology", True, expected_epoch=request.state.session_epoch)
    data["demo"] = fixture
    return dataset_response(data)


@app.post("/v1/datasets/import")
async def import_dataset(request: Request, file: UploadFile = File(...)):
    if not (file.filename or "").lower().endswith(".csv"):
        raise Problem("unsupported_file", "Import a UTF-8 CSV. Other formats and hidden-sheet scanning are not supported.")
    content = bytearray()
    while chunk := await file.read(1024 * 1024):
        content.extend(chunk)
        if len(content) > MAX_BYTES:
            raise Problem("file_too_large", "Maximum upload size is 50 MB.", 413)
    await file.close()
    frame = datasets.read_csv_bytes(bytes(content))
    # File basename is display-only; no client path is ever opened.
    name = (file.filename or "Imported CSV").replace("\\", "/").split("/")[-1]
    return dataset_response(add_dataset(frame, name, expected_epoch=request.state.session_epoch))


@app.get("/v1/datasets/{dataset_id}/preview")
def preview(dataset_id: str, limit: int = 30):
    data = get_dataset(dataset_id)
    return {"rows": clean(data["frame"].head(max(0, min(limit, 100)))), "rowCount": len(data["frame"]), "columns": list(data["frame"].columns)}


@app.patch("/v1/datasets/{dataset_id}/schema")
def update_schema(dataset_id: str, body: SchemaRequest):
    data = get_dataset(dataset_id)
    schema = [c.model_dump(exclude_none=True) for c in body.schema_]
    if [c["name"] for c in schema] != list(data["frame"].columns):
        raise Problem("schema_mismatch", "Schema names and order must match all imported columns.")
    if "entityColumn" in body.model_fields_set:
        if body.entityColumn and body.entityColumn not in data["frame"].columns:
            raise Problem("invalid_entity_column", "Choose an entity key present in the original dataset.")
    data["schema"] = schema
    if "entityColumn" in body.model_fields_set:
        data["rowUnit"]["entityColumn"] = body.entityColumn
    if body.oneRowPerPersonConfirmed is not None:
        data["rowUnit"]["oneRowPerPersonConfirmed"] = body.oneRowPerPersonConfirmed
    entity = data["rowUnit"]["entityColumn"]
    data["rowUnit"]["repeatedEntitiesDetected"] = bool(data["frame"][entity].dropna().duplicated().any()) if entity else False
    return dataset_response(data)


@app.post("/v1/candidates")
def create_candidate(body: CandidateRequest):
    data = get_dataset(body.datasetId)
    qi, sensitive, workload = threat_config(data, body)
    steps = [s.model_dump() for s in body.steps]
    frame, lineage, transform_report = transforms.apply(data["frame"], data["schema"], steps, body.seed, secret=SESSION_SECRET)
    result = make_candidate(data, frame, {"steps": steps, "seed": body.seed, "version": "1", "releaseMode": "row_release"}, qi, sensitive, workload, lineage, body.name, context=threat_context(data, body))
    with LOCK:
        stored = CANDIDATES.get(result["candidateId"])
        if stored is None:
            raise Problem("session_ended", "The local session ended before this result returned.", 409)
        stored["transformReport"] = transform_report
    result["transformReport"] = clean(transform_report)
    return result


@app.post("/v1/assessments")
def assess(body: AssessmentRequest):
    old = get_candidate(body.candidateId)
    data = dict(get_dataset(old["datasetId"]))
    data["schema"] = old["schema"]
    qi, sensitive, workload = threat_config(data, body)
    return make_candidate(data, old["_frame"], copy.deepcopy(old["recipe"]), qi, sensitive, workload, old["_lineage"], old["name"] + " · reassessed", context=threat_context(data, body, old["threatContext"]))


@app.get("/v1/candidates/{candidate_id}/comparison")
def comparison(candidate_id: str):
    return public_candidate(get_candidate(candidate_id))


@app.post("/v1/search")
def search(body: SearchRequest):
    if not SEARCH_LOCK.acquire(blocking=False):
        raise Problem("search_busy", "A local search is already running.", 409)
    try:
        data = get_dataset(body.datasetId)
        qi, sensitive, workload = threat_config(data, body)
        if len(CANDIDATES) + body.maxCandidates > 160:
            raise Problem("session_capacity", "Clear the local session before starting another candidate search.", 409)
        result = optimizer.search(data["frame"], data["schema"], qi, sensitive, workload, max_candidates=body.maxCandidates, constraints=body.constraints.model_dump() if body.constraints else None)
        candidates = []
        for index, candidate in enumerate(result["candidates"]):
            recipe = candidate["recipe"]
            frame, lineage, _ = transforms.apply(data["frame"], data["schema"], recipe["steps"], recipe.get("seed", 42), secret=SESSION_SECRET)
            candidates.append(make_candidate(data, frame, recipe, qi, sensitive, workload, lineage, f"Search {index + 1}", precomputed=candidate, context=threat_context(data, body)))
        job = {**result, "candidates": candidates, "jobId": secrets.token_urlsafe(18), "status": "completed"}
        with LOCK:
            if data["_epoch"] != SESSION_EPOCH:
                raise Problem("session_ended", "The local session ended before this search returned.", 409)
            JOBS[job["jobId"]] = clean(job)
        return clean(job)
    finally:
        SEARCH_LOCK.release()


@app.get("/v1/search/{job_id}")
def search_status(job_id: str):
    if job_id not in JOBS:
        raise Problem("search_not_found", "Search is absent or this local session has ended.", 404)
    return JOBS[job_id]


@app.post("/v1/audits/import-pair")
def audit_pair(body: AuditRequest):
    original, protected = get_dataset(body.originalDatasetId), get_dataset(body.protectedDatasetId)
    qi, sensitive, workload = threat_config(original, body)
    mapping = body.columnMapping
    if any(a not in original["frame"].columns or b not in protected["frame"].columns for a, b in mapping.items()) or len(set(mapping.values())) != len(mapping):
        raise Problem("invalid_mapping", "Column mapping must use distinct existing original-to-protected names.")
    frame = protected["frame"].rename(columns={b: a for a, b in mapping.items()}).copy()
    if not frame.columns.is_unique:
        raise Problem("mapping_collision", "Mapped output column names must be unique.")
    lineage = None
    if body.mode == "paired_row_preserving":
        lineage = body.lineage
        if lineage is None or len(lineage) != len(frame) or len(set(lineage)) != len(lineage) or any(i < 0 or i >= len(original["frame"]) for i in lineage):
            raise Problem("lineage_required", "Paired mode requires an explicit unique original row offset for each protected row.")
    elif body.lineage is not None:
        raise Problem("lineage_inapplicable", "Only verified paired-row mode may supply lineage.")
    result = make_candidate(original, frame, {"steps": [], "version": "external", "releaseMode": "synthetic_release" if body.mode == "synthetic" else "row_release", "provenance": "Unknown external mechanism; no transformation attribution inferred."}, qi, sensitive, workload, lineage, "External protected file", context=threat_context(original, body))
    with LOCK:
        stored = CANDIDATES.get(result["candidateId"])
        if stored is None:
            raise Problem("session_ended", "The local session ended before this audit returned.", 409)
        stored["auditMode"] = body.mode
        if body.mode == "synthetic":
            stored["risk"]["findings"].append({"id": "synthetic-control-required", "attackId": "synthetic_inference", "status": "unsupported", "narrative": "Synthetic inference/linkability attacks require disjoint train and control datasets. Only descriptive output diagnostics were run.", "assumptions": [], "caveats": ["No Anonymeter attack executed."]})
        return public_candidate(stored)


@app.get("/v1/registry")
def get_registry():
    return registry.get_registry()


@app.get("/v1/lab")
def get_lab():
    return lab.experiments()


@app.post("/v1/reports/export")
def export(body: ReportRequest):
    candidate = get_candidate(body.candidateId)
    data = dict(get_dataset(candidate["datasetId"]))
    data["schema"] = candidate["schema"]
    if body.format == "csv":
        if not {"authority", "limitations", "reviewed"} <= set(body.acknowledgments):
            raise Problem("export_review_required", "Confirm authority, limitations, and review of this measured candidate before exporting its protected CSV.", 409)
        direct = [c["name"] for c in candidate["schema"] if c["role"] == "direct_identifier" and c["name"] in candidate["columns"]]
        # Also scan unexpected external columns by profiler, independently of original schema.
        direct += [c["name"] for c in datasets.profile(candidate["_frame"]) if c["role"] == "direct_identifier"]
        if direct:
            raise Problem("direct_identifiers_blocked", "Protected CSV export is blocked while direct-identifier columns remain. Drop them and reassess.", 409)
        text, media, suffix = reports.protected_csv(candidate["_frame"]), "text/csv", "csv"
    elif body.format == "recipe":
        text, media, suffix = json.dumps(clean(candidate["recipe"]), indent=2), "application/json", "recipe.json"
    else:
        report = reports.evidence(public_candidate(candidate), data, registry.get_registry())
        text = reports.render_html(report) if body.format == "html" else json.dumps(report, indent=2, ensure_ascii=False, allow_nan=False)
        media, suffix = ("text/html", "html") if body.format == "html" else ("application/json", "json")
    label = "protected" if body.format == "csv" else "confidential-owner"
    return Response(text, media_type=media, headers={"Content-Disposition": f'attachment; filename="prism-{label}-{body.candidateId[:8]}.{suffix}"'})


@app.delete("/v1/session")
def clear_session():
    global SESSION_SECRET, SESSION_EPOCH
    if SEARCH_LOCK.locked():
        raise Problem("search_busy", "Wait for the local search to finish before clearing the session.", 409)
    with LOCK:
        SESSION_EPOCH += 1
        DATASETS.clear()
        CANDIDATES.clear()
        JOBS.clear()
        SESSION_SECRET = secrets.token_bytes(32)
    return {"cleared": True}


# Production build served by the same loopback process. API routes win first.
frontend_dist = Path(__file__).resolve().parent / "static"
if not frontend_dist.is_dir():
    frontend_dist = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if frontend_dist.is_dir():
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")


def run():
    import uvicorn
    # No user-configurable public bind; no raw rows or request bodies logged.
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, access_log=False, log_level="warning")


if __name__ == "__main__":
    run()
