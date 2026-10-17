"""Hosted workbench with visitor-isolated Archie files and stateless compute.

Validated configuration and compressed source files live in separate Archie
records. Pandas frames are rebuilt for each request using the real engine.
"""
from __future__ import annotations

import copy
import base64
import gzip
import io
import hashlib
import hmac
import importlib.util
import json
import os
import re
import secrets
import time
from http.cookies import SimpleCookie
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

from pydantic import ValidationError
from starlette.concurrency import run_in_threadpool
from starlette.datastructures import Headers
from starlette.requests import Request
from starlette.exceptions import HTTPException
from starlette.responses import JSONResponse, Response

from . import lab, registry
from .archie_store import ArchieStore, StoreConflict, StoreUnavailable
from .hosted_demo import BODY_LIMIT, COOKIE, ROUTES, SECURITY_HEADERS, _authority
from .models import AuditRequest, AssessmentRequest, CandidateRequest, ReportRequest, SchemaRequest, SearchRequest, SemanticRequest

TTL = 1800
MAX_CANDIDATES = 40
MAX_SEARCH = 24
MAX_JOBS = 4
STATE_LIMIT = 64 * 1024
MAX_UPLOAD_BYTES = 3 * 1024 * 1024
MAX_DATASETS = 8
UPLOAD_ROUTES = (("POST", re.compile(r"/v1/datasets/import")), ("POST", re.compile(r"/v1/audits/import-pair")))
HOSTED_ROUTES = ROUTES + UPLOAD_ROUTES
BROWSER_SESSION_HEADER = "x-prism-demo-session"
CORS_METHODS = {"GET", "HEAD", "POST", "PATCH", "DELETE", "OPTIONS"}
CORS_HEADERS = {"content-type", BROWSER_SESSION_HEADER}
META = ("constraints", "frontierMember", "explanation", "objectives", "feasible", "suppression_rate", "validation")


class DemoProblem(Exception):
    def __init__(self, code, message, status=400):
        self.code, self.message, self.status = code, message, status


class ServerlessDemo:
    def __init__(self, public_host=None, *, store=None, secret=None, clock=time.time, archie_origins=None):
        configured = [public_host] if public_host else [os.environ.get(k) for k in
            ("PUBLIC_DEMO_HOST", "VERCEL_PROJECT_PRODUCTION_URL", "VERCEL_URL")]
        self.hosts = {_authority(h) for h in configured if h}
        if not self.hosts:
            self.hosts = {"localhost:8000"}
        self.store = store or ArchieStore()
        self.secret = secret or os.environ.get("PRISM_SESSION_SECRET", "")
        self.clock = clock
        configured_origins = archie_origins if archie_origins is not None else os.environ.get("PUBLIC_ARCHIE_ORIGINS", "").split(",")
        self.archie_origins = set()
        for value in configured_origins:
            value = value.strip()
            if not value:
                continue
            parsed = urlsplit(value)
            if (parsed.scheme != "https" or not parsed.netloc or parsed.path or parsed.query or parsed.fragment
                    or value != "https://" + _authority(parsed.netloc)):
                raise ValueError("PUBLIC_ARCHIE_ORIGINS must contain exact HTTPS origins without paths or wildcards.")
            self.archie_origins.add(value)

    @staticmethod
    def _module():
        name = f"{__package__}._replay_{secrets.token_hex(12)}"
        spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name("main.py"))
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module

    @staticmethod
    def _dump(state):
        text = json.dumps(state, separators=(",", ":"), allow_nan=False)
        if len(text.encode()) > STATE_LIMIT:
            raise DemoProblem("session_capacity", "This demo session reached its configuration budget. Clear it before continuing.", 409)
        return text

    @staticmethod
    def _save_semantic(state, result):
        # The public classification revision intentionally excludes provider
        # receipts. Storage keys include them so a later cache receipt cannot
        # mutate the provenance of an already frozen candidate snapshot.
        key = hashlib.sha256(json.dumps(result, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()).hexdigest()[:24]
        state["semanticResults"][key] = copy.deepcopy(result)
        return key

    def _identity(self, headers):
        cookies = SimpleCookie()
        try:
            cookies.load(headers.get("cookie", ""))
        except Exception:
            pass
        value = cookies.get(COOKIE)
        token = value.value if value else ""
        return token if re.fullmatch(r"[A-Za-z0-9_-]{43}", token) else ""

    def _new(self):
        token = secrets.token_urlsafe(32)
        visitor = hashlib.sha256(token.encode()).hexdigest()
        state = {"version": 1, "datasets": {}, "snapshots": {}, "contexts": {}, "candidates": {}, "jobs": {}, "semanticResults": {}, "remoteSemanticAttempts": 0}
        record = self.store.create(visitor, self._dump(state), self.clock() + TTL)
        return token, record, state

    def _session(self, headers, browser=False):
        if len(self.secret) < 32:
            raise StoreUnavailable()
        if browser:
            values = headers.getlist(BROWSER_SESSION_HEADER)
            if len(values) != 1 or not re.fullmatch(r"[A-Za-z0-9_-]{43}", values[0]):
                raise DemoProblem("browser_session_required", "Start a fresh browser session before using this bridge.", 403)
            token = values[0]
        else:
            token = self._identity(headers)
        record = self.store.get(hashlib.sha256(token.encode()).hexdigest()) if token else None
        if record and record.expires <= self.clock():
            self._clear_record(record)
            record = None
        if record:
            return token, record, record.state()
        if browser:
            # A forged, cleared, or expired header must never allocate a visitor.
            raise DemoProblem("session_expired", "This browser session ended. Start a fresh session to continue.", 403)
        return self._new()

    def _browser_session(self):
        if len(self.secret) < 32:
            raise StoreUnavailable()
        token, _, _ = self._new()
        return JSONResponse({"token": token, "expiresIn": TTL})

    def _engine(self, token):
        module = self._module()
        module.SESSION_SECRET = hmac.new(self.secret.encode(), token.encode(), hashlib.sha256).digest()
        module._upload_visitor = hashlib.sha256(token.encode()).hexdigest()
        module._upload_cache = {}
        return module

    def _clear_record(self, record):
        state = record.state()
        refs = {item["blob"] for item in list(state.get("datasets", {}).values()) + list(state.get("snapshots", {}).values()) if item.get("blob")}
        for reference in refs:
            self.store.delete_blob(record.visitor, reference)
        self.store.delete(record)

    def _dataset(self, module, identifier, spec, state=None):
        if spec.get("blob"):
            reference = spec["blob"]
            if reference not in module._upload_cache:
                blob = self.store.get_blob(module._upload_visitor, reference)
                if blob is None:
                    raise DemoProblem("dataset_not_found", "This uploaded dataset is no longer available. Reimport it to continue.", 404)
                payload = blob.state()
                compressed = base64.b64decode(payload["gzipBase64"], validate=True)
                with gzip.GzipFile(fileobj=io.BytesIO(compressed)) as stream:
                    content = stream.read(MAX_UPLOAD_BYTES + 1)
                if len(content) > MAX_UPLOAD_BYTES:
                    raise StoreUnavailable()
                module._upload_cache[reference] = (content, payload["filename"])
            content, filename = module._upload_cache[reference]
            from .structured_intake import read_table_bytes
            data = module.add_dataset(read_table_bytes(content, filename), spec["name"])
            module.DATASETS.pop(data["id"])
        else:
            request = Request({"type": "http", "state": {"session_epoch": 0}})
            result = module.demo(request, spec["fixture"])
            data = module.DATASETS.pop(result["datasetId"])
        data["id"] = identifier
        module.DATASETS[identifier] = data
        if spec.get("schema"):
            module.update_schema(identifier, SchemaRequest.model_validate(spec["schema"]))
        if state is not None and spec.get("semantic"):
            data["semantic"] = copy.deepcopy(state.get("semanticResults", {}).get(spec["semantic"], data["semantic"]))
        data["_semanticOverrides"] = copy.deepcopy(spec.get("semanticOverrides", {}))
        return data

    def _candidate(self, module, identifier, spec, state):
        # Snapshot schema/threat/workload per candidate so later review edits do
        # not change an earlier result or its export after a cold start.
        self._dataset(module, spec["datasetId"], state["snapshots"][spec["dataset"]], state)
        context = state["contexts"][spec["context"]]
        body = {**context, "datasetId": spec["datasetId"], "steps": spec["recipe"]["steps"],
                "seed": spec["recipe"].get("seed", 42)}
        if spec.get("audit"):
            audit = spec["audit"]
            self._dataset(module, audit["protectedDatasetId"], state["snapshots"][audit["protectedSnapshot"]], state)
            result = module.audit_pair(AuditRequest.model_validate({**context, "originalDatasetId": spec["datasetId"],
                "protectedDatasetId": audit["protectedDatasetId"], "mode": audit["mode"],
                "columnMapping": audit["columnMapping"], "lineage": audit.get("lineage")}))
        else:
            result = module.create_candidate(CandidateRequest.model_validate(body))
        item = module.CANDIDATES.pop(result["candidateId"])
        item.update(candidateId=identifier, createdAt=spec["createdAt"], name=spec["name"], recipe=spec["recipe"])
        if spec["recipe"].get("version") != "external":
            # Search recipes carry version 1.0; ordinary candidates use 1.
            # Hash the actual frozen recipe after restoring it, not the replay constructor's default.
            item["recipeHash"] = hashlib.sha256(json.dumps(spec["recipe"], sort_keys=True, separators=(",", ":"), allow_nan=False).encode()).hexdigest()
        item["workload"] = context["workload"]
        item.update(spec.get("meta", {}))
        if not spec.get("transformReport", True):
            item.pop("transformReport", None)
        module.CANDIDATES[identifier] = item
        return module.public_candidate(item)

    @staticmethod
    def _spec(result, dataset, state):
        snapshot = hashlib.sha256(json.dumps(dataset, sort_keys=True).encode()).hexdigest()[:24]
        state["snapshots"][snapshot] = copy.deepcopy(dataset)
        context = result["threatContext"]
        request = {**result["threatModel"], "workload": result["workload"],
                   **{k: context[k] for k in ("membershipKnown", "entityColumn", "oneRowPerPersonConfirmed")}}
        context_id = hashlib.sha256(json.dumps(request, sort_keys=True).encode()).hexdigest()[:24]
        state["contexts"][context_id] = copy.deepcopy(request)
        return {"datasetId": result["datasetId"], "dataset": snapshot, "context": context_id,
                "name": result["name"], "createdAt": result["createdAt"], "recipe": result["recipe"],
                "meta": {k: result[k] for k in META if k in result}, "transformReport": "transformReport" in result}

    @staticmethod
    def _find(collection, identifier, kind):
        if identifier not in collection:
            raise DemoProblem(kind + "_not_found", "This result is absent or this visitor session has ended.", 404)
        return collection[identifier]

    def _dispatch(self, method, path, query, body, headers, browser=False, session=None):
        token, record, state = session if session is not None else self._session(headers, browser)
        if method == "DELETE":
            self._clear_record(record)
            return JSONResponse({"cleared": True}), ""
        module = self._engine(token)
        payload = body if isinstance(body, dict) else json.loads(body) if body else {}
        state.setdefault("semanticResults", {})
        state.setdefault("remoteSemanticAttempts", 0)
        created_blob = None
        if path == "/v1/datasets/import":
            if len(state["datasets"]) >= MAX_DATASETS:
                raise DemoProblem("session_capacity", "This session holds eight datasets. Clear it before importing another.", 409)
            from .structured_intake import read_table_bytes, TableIntakeError
            content, filename = payload["content"], payload["filename"]
            try:
                frame = read_table_bytes(content, filename)
                data = module.add_dataset(frame, filename)
            except TableIntakeError as exc:
                raise DemoProblem("invalid_table", str(exc), 422) from exc
            result = module.dataset_response(data)
            identifier = data["id"]
            # Parse, profile and validate the bounded config before writing source bytes.
            spec = {"name": filename}
            spec["semantic"] = self._save_semantic(state, data["semantic"])
            state["datasets"][identifier] = spec
            self._dump(state)
            created_blob = self.store.create_blob(record.visitor, content, filename, self.clock() + TTL)
            spec["blob"] = created_blob.id
        elif path == "/v1/demo":
            fixture = parse_qs(query).get("fixture", ["architecture"])[0]
            if fixture not in {"architecture", "kit", "semantic"}:
                raise DemoProblem("unknown_fixture", "Choose architecture, kit or semantic demo data.")
            existing = next(((k, v) for k, v in state["datasets"].items() if v.get("fixture") == fixture), None)
            identifier, spec = existing or (secrets.token_urlsafe(18), {"fixture": fixture})
            data = self._dataset(module, identifier, spec, state)
            semantic = data.get("semantic")
            if semantic:
                spec["semantic"] = self._save_semantic(state, semantic)
            if not existing:
                if len(state["datasets"]) >= MAX_DATASETS:
                    raise DemoProblem("session_capacity", "This session holds eight datasets. Clear it before loading another.", 409)
                state["datasets"][identifier] = spec
            result = module.dataset_response(data)
        elif path.startswith("/v1/datasets/"):
            identifier, action = path.split("/")[3:5]
            spec = self._find(state["datasets"], identifier, "dataset")
            self._dataset(module, identifier, spec, state)
            if action == "schema":
                validated = SchemaRequest.model_validate(payload)
                result = module.update_schema(identifier, validated)
                spec["schema"] = validated.model_dump(by_alias=True, exclude_unset=True)
            elif action == "semantics":
                validated = SemanticRequest.model_validate(payload)
                if validated.previewOnly:
                    # The preview is read-only: no provider request, budget reservation or durable mutation.
                    return JSONResponse(module.classify_semantics(identifier, validated)), token
                if validated.allowRemote:
                    module.validate_semantic_input(identifier, validated)
                    if state["remoteSemanticAttempts"] >= 2:
                        raise DemoProblem("semantic_budget", "This visitor's two remote interpretation attempts are used. Deterministic classification and corrections remain available.", 429)
                    # Reserve the bounded attempt durably before sending any
                    # approved schema metadata. CAS prevents concurrent calls
                    # from spending an unrecorded slot.
                    state["remoteSemanticAttempts"] += 1
                    reserved = self._dump(state)
                    self.store.save(record, reserved, self.clock() + TTL)
                    record = self.store.get(record.visitor)
                    if record is None or record.text != reserved:
                        raise StoreConflict()
                result = module.classify_semantics(identifier, validated)
                spec["semantic"] = self._save_semantic(state, result)
                spec["semanticOverrides"] = module.DATASETS[identifier].get("_semanticOverrides", {})
            else:
                limit = int(parse_qs(query).get("limit", ["30"])[0])
                result = module.preview(identifier, limit)
        elif path == "/v1/audits/import-pair":
            if len(state["candidates"]) >= MAX_CANDIDATES:
                raise DemoProblem("session_capacity", "This session reached its 40-candidate limit. Clear it before continuing.", 409)
            request = AuditRequest.model_validate(payload)
            original = self._find(state["datasets"], request.originalDatasetId, "dataset")
            protected = self._find(state["datasets"], request.protectedDatasetId, "dataset")
            if request.originalDatasetId == request.protectedDatasetId:
                raise DemoProblem("invalid_pair", "Choose distinct original and protected datasets.", 422)
            self._dataset(module, request.originalDatasetId, original, state)
            self._dataset(module, request.protectedDatasetId, protected, state)
            result = module.audit_pair(request)
            spec = self._spec(result, original, state)
            protected_key = hashlib.sha256(json.dumps(protected, sort_keys=True).encode()).hexdigest()[:24]
            state["snapshots"][protected_key] = copy.deepcopy(protected)
            spec["audit"] = {"protectedDatasetId": request.protectedDatasetId, "protectedSnapshot": protected_key,
                            "mode": request.mode, "columnMapping": request.columnMapping, "lineage": request.lineage}
            state["candidates"][result["candidateId"]] = spec
        elif path in {"/v1/candidates", "/v1/assessments", "/v1/search"}:
            budget = payload.get("maxCandidates", MAX_SEARCH) if path == "/v1/search" else 1
            if type(budget) is not int or not 1 <= budget <= MAX_SEARCH:
                raise DemoProblem("search_limit", "Public searches require 1–24 candidates.", 422)
            if len(state["candidates"]) + budget > MAX_CANDIDATES:
                raise DemoProblem("session_capacity", "This demo session reached its 40-candidate limit. Clear it before continuing.", 409)
            if path == "/v1/assessments":
                request = AssessmentRequest.model_validate(payload)
                old = self._find(state["candidates"], request.candidateId, "candidate")
                self._candidate(module, request.candidateId, old, state)
                current_ds = self._find(state["datasets"], old["datasetId"], "dataset")
                self._dataset(module, old["datasetId"], current_ds, state)
                result = module.assess(request)
                # Reassessment is explicit: use current semantic corrections
                # while preserving the candidate's reviewed schema/recipe.
                assessed_ds = copy.deepcopy(state["snapshots"][old["dataset"]])
                for key in ("semantic", "semanticOverrides"):
                    if key in current_ds:
                        assessed_ds[key] = copy.deepcopy(current_ds[key])
                    else:
                        assessed_ds.pop(key, None)
                spec = self._spec(result, assessed_ds, state)
                if old.get("audit"):
                    spec["audit"] = copy.deepcopy(old["audit"])
                    # Replay through the external-audit adapter, never an empty transform recipe.
                    identifier = result["candidateId"]
                    state["candidates"][identifier] = spec
                    result = self._candidate(module, identifier, spec, state)
            else:
                request = (SearchRequest if path == "/v1/search" else CandidateRequest).model_validate(payload)
                ds = self._find(state["datasets"], request.datasetId, "dataset")
                self._dataset(module, request.datasetId, ds, state)
                if path == "/v1/search":
                    if len(state["jobs"]) >= MAX_JOBS:
                        raise DemoProblem("session_capacity", "Clear this demo session before starting more searches.", 409)
                    result = module.search(request)
                    ids = []
                    for candidate in result["candidates"]:
                        identifier = candidate["candidateId"]
                        state["candidates"][identifier] = self._spec(candidate, ds, state)
                        ids.append(identifier)
                    state["jobs"][result["jobId"]] = {**{k: v for k, v in result.items() if k != "candidates"}, "candidateIds": ids}
                else:
                    result = module.create_candidate(request)
                    spec = self._spec(result, ds, state)
            if path != "/v1/search":
                state["candidates"][result["candidateId"]] = spec
        elif path.startswith("/v1/search/"):
            job = self._find(state["jobs"], path.split("/")[3], "search")
            result = {k: v for k, v in job.items() if k != "candidateIds"}
            result["candidates"] = [self._candidate(module, i, state["candidates"][i], state) for i in job["candidateIds"]]
        else:
            identifier = (ReportRequest.model_validate(payload).candidateId if path == "/v1/reports/export" else path.split("/")[3])
            spec = self._find(state["candidates"], identifier, "candidate")
            result = self._candidate(module, identifier, spec, state)
            if path == "/v1/reports/export":
                result = module.export(ReportRequest.model_validate(payload))
        # Keep old interpretations only while a frozen candidate references
        # them. An unused rules-only classification need not consume budget
        # after an explicit correction or approved remote interpretation.
        referenced = {item.get("semantic") for item in list(state["datasets"].values()) + list(state["snapshots"].values())}
        state["semanticResults"] = {k: v for k, v in state["semanticResults"].items() if k in referenced}
        try:
            self.store.save(record, self._dump(state), self.clock() + TTL)
        except Exception:
            if created_blob is not None:
                self.store.delete_blob(record.visitor, created_blob.id)
            raise
        return result if isinstance(result, Response) else JSONResponse(module.clean(result)), token

    async def _send(self, scope, receive, send, response, token=None, cors_origin=None):
        response.headers.update(SECURITY_HEADERS)
        if cors_origin is not None:
            response.headers["Access-Control-Allow-Origin"] = cors_origin
            response.headers["Access-Control-Expose-Headers"] = "Content-Disposition"
            response.headers["Vary"] = "Origin"
        elif token is not None:
            local = urlsplit("//" + Headers(scope=scope)["host"]).hostname in {"localhost", "127.0.0.1", "::1"}
            if token:
                response.set_cookie(COOKIE, token, max_age=TTL, secure=not local, httponly=True, samesite="strict", path="/")
            else:
                response.delete_cookie(COOKIE, secure=not local, httponly=True, samesite="strict", path="/")
        await response(scope, receive, send)

    async def __call__(self, scope, receive, send):
        if scope["type"] == "lifespan":
            while True:
                message = await receive()
                if message["type"] == "lifespan.startup":
                    await send({"type": "lifespan.startup.complete"})
                elif message["type"] == "lifespan.shutdown":
                    await send({"type": "lifespan.shutdown.complete"})
                    return
        if scope["type"] != "http":
            return
        headers = Headers(scope=scope)
        cors_origin = None
        try:
            if len(headers.getlist("host")) != 1 or headers["host"].lower() not in self.hosts:
                raise DemoProblem("host_denied", "This hostname is not configured for the public demo.", 403)
            host = headers["host"].lower()
            local = urlsplit("//" + host).hostname in {"localhost", "127.0.0.1", "::1"}
            origin = ("http" if local else "https") + "://" + host
            origins = headers.getlist("origin")
            if len(origins) > 1:
                raise DemoProblem("origin_denied", "Use the demo's own origin.", 403)
            if origins and origins != [origin]:
                if origins[0] not in self.archie_origins:
                    raise DemoProblem("origin_denied", "Use the demo's own origin or an explicitly configured Archie origin.", 403)
                cors_origin = origins[0]
            browser = cors_origin is not None
            if not browser and headers.get("sec-fetch-site") not in {None, "same-origin", "none"}:
                raise DemoProblem("cross_site_denied", "Use the demo's own origin.", 403)
            method, path = scope["method"], scope["path"].rstrip("/") or "/"
            if browser and method == "OPTIONS":
                requested_method = headers.get("access-control-request-method", "")
                requested_headers = {value.strip().lower() for value in headers.get("access-control-request-headers", "").split(",") if value.strip()}
                known_route = ((path == "/health" and requested_method in {"GET", "HEAD"})
                               or (path == "/v1/browser-session" and requested_method == "POST")
                               or (path in {"/v1/registry", "/v1/lab"} and requested_method == "GET")
                               or any(requested_method == verb and pattern.fullmatch(path) for verb, pattern in HOSTED_ROUTES))
                if requested_method not in CORS_METHODS or not requested_headers <= CORS_HEADERS or not known_route:
                    raise DemoProblem("preflight_denied", "This bridge request method, route, or header is not allowed.", 403)
                response = Response(status_code=204, headers={
                    "Access-Control-Allow-Methods": "GET, HEAD, POST, PATCH, DELETE, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, X-PRISM-Demo-Session",
                    "Access-Control-Max-Age": "600",
                })
                return await self._send(scope, receive, send, response, cors_origin=cors_origin)
            if not browser and method not in {"GET", "HEAD", "OPTIONS"} and origins != [origin]:
                raise DemoProblem("origin_required", "Changing demo state requires its exact same-origin Origin header.", 403)
            if path == "/health" and method in {"GET", "HEAD"}:
                return await self._send(scope, receive, send, JSONResponse({"status": "ok", "version": "0.1.1", "deploymentMode": "hosted_workbench", "uploadsAllowed": True, "maxUploadBytes": MAX_UPLOAD_BYTES, "maxRows": 100000, "maxColumns": 80, "backendProvider": "Archie", "sessionTtlSeconds": TTL, "maxSearchCandidates": MAX_SEARCH, "maxCandidates": MAX_CANDIDATES}), cors_origin=cors_origin)
            handshake = browser and path == "/v1/browser-session" and method == "POST"
            # Authenticate before parsing any cross-origin configuration. Reuse
            # this record for dispatch so authentication needs only one lookup.
            session = await run_in_threadpool(self._session, headers, True) if browser and not handshake else None
            if path == "/v1/registry" and method == "GET":
                return await self._send(scope, receive, send, JSONResponse(registry.get_registry()), cors_origin=cors_origin)
            if path == "/v1/lab" and method == "GET":
                return await self._send(scope, receive, send, JSONResponse(await run_in_threadpool(lab.experiments)), cors_origin=cors_origin)
            if path == "/v1/semantics/ontology" and method == "GET":
                from . import semantics, semantic_rules
                return await self._send(scope, receive, send, JSONResponse({**semantics.ontology(), "attackRules": semantic_rules.registry()}), cors_origin=cors_origin)
            if not handshake and not any(method == verb and pattern.fullmatch(path) for verb, pattern in HOSTED_ROUTES):
                raise DemoProblem("fictional_only", "This route is not available in the hosted workbench.", 403)
            is_upload = path == "/v1/datasets/import" and method == "POST"
            body_limit = MAX_UPLOAD_BYTES + BODY_LIMIT if is_upload else BODY_LIMIT
            length = headers.get("content-length")
            if length and (not length.isdigit() or int(length) > body_limit):
                raise DemoProblem("request_too_large", "Demo configuration is limited to 64 KiB.", 413)
            body = bytearray()
            while True:
                message = await receive()
                if message["type"] == "http.disconnect":
                    return
                body.extend(message.get("body", b""))
                if len(body) > body_limit:
                    raise DemoProblem("request_too_large", "Demo configuration is limited to 64 KiB.", 413)
                if not message.get("more_body", False):
                    break
            # Parse before allocating durable storage; never persist invalid or
            # arbitrary JSON bodies even transiently.
            if is_upload:
                async def upload_receive():
                    return {"type": "http.request", "body": bytes(body), "more_body": False}
                upload_request = Request(scope, upload_receive)
                async with upload_request.form(max_files=1, max_fields=0, max_part_size=MAX_UPLOAD_BYTES) as form:
                    file = form.get("file")
                    if file is None or not hasattr(file, "read") or len(form) != 1:
                        raise DemoProblem("invalid_upload", "Choose one CSV, JSON or XLSX file.", 422)
                    content = await file.read(MAX_UPLOAD_BYTES + 1)
                    if len(content) > MAX_UPLOAD_BYTES:
                        raise DemoProblem("file_too_large", "Hosted uploads support files up to 3 MiB.", 413)
                    filename = (file.filename or "table.csv").replace("\\", "/").split("/")[-1]
                    suffix = Path(filename).suffix.lower()
                    if suffix not in {".csv", ".json", ".xlsx"}:
                        raise DemoProblem("unsupported_file", "Choose a CSV, JSON or XLSX file.", 422)
                    filename = filename[:max(1, 100 - len(suffix))] + suffix if len(filename) > 100 else filename
                    body = {"content": content, "filename": filename}
            elif body and not isinstance(json.loads(body), dict):
                raise ValueError()
            if path == "/v1/audits/import-pair":
                AuditRequest.model_validate(json.loads(body) if body else {})
            if handshake:
                if body and json.loads(body) != {}:
                    raise ValueError()
                response = await run_in_threadpool(self._browser_session)
                return await self._send(scope, receive, send, response, cors_origin=cors_origin)
            response, token = await run_in_threadpool(self._dispatch, method, path, scope.get("query_string", b"").decode(), body if is_upload else bytes(body), headers, browser, session)
            return await self._send(scope, receive, send, response, token, cors_origin)
        except StoreUnavailable:
            response = JSONResponse({"code": "backend_unavailable", "message": "Archie storage is temporarily unavailable. Retry shortly; no local fallback is used.", "details": {}}, status_code=503)
        except StoreConflict:
            response = JSONResponse({"code": "session_changed", "message": "This visitor session changed in another request. Refresh and retry.", "details": {}}, status_code=409)
        except DemoProblem as exc:
            response = JSONResponse({"code": exc.code, "message": exc.message, "details": {}}, status_code=exc.status)
        except HTTPException:
            response = JSONResponse({"code": "invalid_upload", "message": "Choose exactly one valid CSV, JSON or XLSX file.", "details": {}}, status_code=422)
        except (ValidationError, ValueError, UnicodeDecodeError):
            response = JSONResponse({"code": "invalid_configuration", "message": "Check the dataset configuration fields and limits.", "details": {}}, status_code=422)
        except Exception as exc:
            # main.py's per-request Problem class is dynamically loaded.
            if all(hasattr(exc, key) for key in ("code", "message", "status")):
                response = JSONResponse({"code": exc.code, "message": exc.message, "details": {}}, status_code=exc.status)
            else:
                raise
        await self._send(scope, receive, send, response, cors_origin=cors_origin)


app = ServerlessDemo()
