"""Fictional-only public demo with durable Archie specs and stateless compute.

Only validated configuration is persisted. Pandas source/candidate frames are
rebuilt from bundled fixtures for each request using the existing real engine.
"""
from __future__ import annotations

import copy
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
from starlette.responses import JSONResponse, Response

from . import lab, registry
from .archie_store import ArchieStore, StoreConflict, StoreUnavailable
from .hosted_demo import BODY_LIMIT, COOKIE, ROUTES, SECURITY_HEADERS, _authority
from .models import AssessmentRequest, CandidateRequest, ReportRequest, SchemaRequest, SearchRequest

TTL = 1800
MAX_CANDIDATES = 40
MAX_SEARCH = 24
MAX_JOBS = 4
STATE_LIMIT = 64 * 1024
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
        state = {"version": 1, "datasets": {}, "snapshots": {}, "contexts": {}, "candidates": {}, "jobs": {}}
        record = self.store.create(visitor, self._dump(state), self.clock() + TTL)
        return token, record, state

    def _session(self, headers, browser=False):
        if len(self.secret) < 32:
            raise StoreUnavailable()
        if browser:
            values = headers.getlist(BROWSER_SESSION_HEADER)
            if len(values) != 1 or not re.fullmatch(r"[A-Za-z0-9_-]{43}", values[0]):
                raise DemoProblem("browser_session_required", "Start a fresh fictional browser session before using this bridge.", 403)
            token = values[0]
        else:
            token = self._identity(headers)
        record = self.store.get(hashlib.sha256(token.encode()).hexdigest()) if token else None
        if record and record.expires <= self.clock():
            self.store.delete(record)
            record = None
        if record:
            return token, record, record.state()
        if browser:
            # A forged, cleared, or expired header must never allocate a visitor.
            raise DemoProblem("session_expired", "This fictional browser session ended. Start a fresh session to continue.", 403)
        return self._new()

    def _browser_session(self):
        if len(self.secret) < 32:
            raise StoreUnavailable()
        token, _, _ = self._new()
        return JSONResponse({"token": token, "expiresIn": TTL})

    def _engine(self, token):
        module = self._module()
        module.SESSION_SECRET = hmac.new(self.secret.encode(), token.encode(), hashlib.sha256).digest()
        return module

    @staticmethod
    def _dataset(module, identifier, spec):
        request = Request({"type": "http", "state": {"session_epoch": 0}})
        result = module.demo(request, spec["fixture"])
        data = module.DATASETS.pop(result["datasetId"])
        data["id"] = identifier
        module.DATASETS[identifier] = data
        if spec.get("schema"):
            module.update_schema(identifier, SchemaRequest.model_validate(spec["schema"]))
        return data

    def _candidate(self, module, identifier, spec, state):
        # Snapshot schema/threat/workload per candidate so later review edits do
        # not change an earlier result or its export after a cold start.
        self._dataset(module, spec["datasetId"], state["snapshots"][spec["dataset"]])
        context = state["contexts"][spec["context"]]
        body = {**context, "datasetId": spec["datasetId"], "steps": spec["recipe"]["steps"],
                "seed": spec["recipe"].get("seed", 42)}
        result = module.create_candidate(CandidateRequest.model_validate(body))
        item = module.CANDIDATES.pop(result["candidateId"])
        item.update(candidateId=identifier, createdAt=spec["createdAt"], name=spec["name"], recipe=spec["recipe"])
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
            self.store.delete(record)
            return JSONResponse({"cleared": True}), ""
        module = self._engine(token)
        payload = json.loads(body) if body else {}
        if path == "/v1/demo":
            fixture = parse_qs(query).get("fixture", ["architecture"])[0]
            if fixture not in {"architecture", "kit"}:
                raise DemoProblem("unknown_fixture", "Choose architecture or kit demo data.")
            existing = next(((k, v) for k, v in state["datasets"].items() if v["fixture"] == fixture), None)
            identifier, spec = existing or (secrets.token_urlsafe(18), {"fixture": fixture})
            data = self._dataset(module, identifier, spec)
            if not existing:
                state["datasets"][identifier] = spec
            result = module.dataset_response(data)
        elif path.startswith("/v1/datasets/"):
            identifier, action = path.split("/")[3:5]
            spec = self._find(state["datasets"], identifier, "dataset")
            self._dataset(module, identifier, spec)
            if action == "schema":
                validated = SchemaRequest.model_validate(payload)
                result = module.update_schema(identifier, validated)
                spec["schema"] = validated.model_dump(by_alias=True, exclude_unset=True)
            else:
                limit = int(parse_qs(query).get("limit", ["30"])[0])
                result = module.preview(identifier, limit)
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
                result = module.assess(request)
                spec = self._spec(result, state["snapshots"][old["dataset"]], state)
            else:
                request = (SearchRequest if path == "/v1/search" else CandidateRequest).model_validate(payload)
                ds = self._find(state["datasets"], request.datasetId, "dataset")
                self._dataset(module, request.datasetId, ds)
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
        self.store.save(record, self._dump(state), self.clock() + TTL)
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
            if path.startswith("/v1/datasets/import") or path.startswith("/v1/audits"):
                raise DemoProblem("fictional_only", "The public demo accepts bundled fictional fixtures only. Uploads and external audits are disabled.", 403)
            if browser and method == "OPTIONS":
                requested_method = headers.get("access-control-request-method", "")
                requested_headers = {value.strip().lower() for value in headers.get("access-control-request-headers", "").split(",") if value.strip()}
                known_route = ((path == "/health" and requested_method in {"GET", "HEAD"})
                               or (path == "/v1/browser-session" and requested_method == "POST")
                               or (path in {"/v1/registry", "/v1/lab"} and requested_method == "GET")
                               or any(requested_method == verb and pattern.fullmatch(path) for verb, pattern in ROUTES))
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
                return await self._send(scope, receive, send, JSONResponse({"status": "ok", "version": "0.1.0", "deploymentMode": "synthetic_demo", "uploadsAllowed": False, "backendProvider": "Archie", "sessionTtlSeconds": TTL, "maxSearchCandidates": MAX_SEARCH, "maxCandidates": MAX_CANDIDATES}), cors_origin=cors_origin)
            handshake = browser and path == "/v1/browser-session" and method == "POST"
            # Authenticate before parsing any cross-origin configuration. Reuse
            # this record for dispatch so authentication needs only one lookup.
            session = await run_in_threadpool(self._session, headers, True) if browser and not handshake else None
            if path == "/v1/registry" and method == "GET":
                return await self._send(scope, receive, send, JSONResponse(registry.get_registry()), cors_origin=cors_origin)
            if path == "/v1/lab" and method == "GET":
                return await self._send(scope, receive, send, JSONResponse(await run_in_threadpool(lab.experiments)), cors_origin=cors_origin)
            if not handshake and not any(method == verb and pattern.fullmatch(path) for verb, pattern in ROUTES):
                raise DemoProblem("fictional_only", "This route is not available in the fictional-only demo.", 403)
            length = headers.get("content-length")
            if length and (not length.isdigit() or int(length) > BODY_LIMIT):
                raise DemoProblem("request_too_large", "Demo configuration is limited to 64 KiB.", 413)
            body = bytearray()
            while True:
                message = await receive()
                if message["type"] == "http.disconnect":
                    return
                body.extend(message.get("body", b""))
                if len(body) > BODY_LIMIT:
                    raise DemoProblem("request_too_large", "Demo configuration is limited to 64 KiB.", 413)
                if not message.get("more_body", False):
                    break
            # Parse before allocating durable storage; never persist invalid or
            # arbitrary JSON bodies even transiently.
            if body and not isinstance(json.loads(body), dict):
                raise ValueError()
            if handshake:
                if body and json.loads(body) != {}:
                    raise ValueError()
                response = await run_in_threadpool(self._browser_session)
                return await self._send(scope, receive, send, response, cors_origin=cors_origin)
            response, token = await run_in_threadpool(self._dispatch, method, path, scope.get("query_string", b"").decode(), bytes(body), headers, browser, session)
            return await self._send(scope, receive, send, response, token, cors_origin)
        except StoreUnavailable:
            response = JSONResponse({"code": "backend_unavailable", "message": "Archie storage is temporarily unavailable. Retry shortly; no local fallback is used.", "details": {}}, status_code=503)
        except StoreConflict:
            response = JSONResponse({"code": "session_changed", "message": "This visitor session changed in another request. Refresh and retry.", "details": {}}, status_code=409)
        except DemoProblem as exc:
            response = JSONResponse({"code": exc.code, "message": exc.message, "details": {}}, status_code=exc.status)
        except (ValidationError, ValueError, UnicodeDecodeError):
            response = JSONResponse({"code": "invalid_configuration", "message": "Check the fictional demo configuration fields and limits.", "details": {}}, status_code=422)
        except Exception as exc:
            # main.py's per-request Problem class is dynamically loaded.
            if all(hasattr(exc, key) for key in ("code", "message", "status")):
                response = JSONResponse({"code": exc.code, "message": exc.message, "details": {}}, status_code=exc.status)
            else:
                raise
        await self._send(scope, receive, send, response, cors_origin=cors_origin)


app = ServerlessDemo()
