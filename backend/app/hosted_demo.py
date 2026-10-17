"""Fictional-only public adapter; the local workbench remains loopback-only.

Each visitor owns an independent instance of main.py's state and handlers. The
outer boundary authenticates the public authority/origin before rewriting the
inner request to loopback. Only explicitly listed, fictional-data routes pass.
Run one process/replica: sessions intentionally live only in process memory.
"""
from __future__ import annotations

import importlib.util
import json
import os
import re
import secrets
import threading
import time
from dataclasses import dataclass, field
from http.cookies import SimpleCookie
from pathlib import Path
from types import ModuleType
from urllib.parse import urlsplit

from starlette.datastructures import Headers
from starlette.responses import JSONResponse, Response
from starlette.staticfiles import StaticFiles

from . import lab, registry

COOKIE = "prism_demo_session"
BODY_LIMIT = 64 * 1024
SECURITY_HEADERS = {
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "x-frame-options": "DENY",
    "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
}
# Explicit allowlist: adding a new local intake route cannot expose it publicly.
ROUTES = (
    ("GET", re.compile(r"/v1/demo")),
    ("GET", re.compile(r"/v1/datasets/[A-Za-z0-9_-]+/preview")),
    ("PATCH", re.compile(r"/v1/datasets/[A-Za-z0-9_-]+/schema")),
    ("POST", re.compile(r"/v1/candidates")),
    ("POST", re.compile(r"/v1/assessments")),
    ("POST", re.compile(r"/v1/search")),
    ("GET", re.compile(r"/v1/search/[A-Za-z0-9_-]+")),
    ("GET", re.compile(r"/v1/candidates/[A-Za-z0-9_-]+/comparison")),
    ("POST", re.compile(r"/v1/reports/export")),
    ("DELETE", re.compile(r"/v1/session")),
)


def _authority(value: str) -> str:
    """Validate an explicit Host authority, never a URL, path, or wildcard."""
    if not value or any(c.isspace() for c in value) or any(c in value for c in "/\\@?#,*"):
        raise ValueError("PUBLIC_DEMO_HOST must be one explicit hostname, optionally with a port.")
    parsed = urlsplit("//" + value)
    if not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("Invalid public demo hostname.")
    parsed.port  # Validate port syntax/range.
    return value.lower()


@dataclass
class Visitor:
    module: ModuleType
    touched: float
    busy: threading.Lock = field(default_factory=threading.Lock)


class HostedDemo:
    def __init__(self, public_host: str | None = None, *, max_sessions: int = 4,
                 ttl_seconds: float = 1800, max_candidates: int = 40,
                 max_search_candidates: int = 24, max_jobs: int = 4,
                 max_concurrent: int = 1, clock=time.monotonic):
        host = public_host or os.environ.get("PUBLIC_DEMO_HOST") or os.environ.get("RENDER_EXTERNAL_HOSTNAME") or "localhost:7860"
        self.host = _authority(host)
        self.local = urlsplit("//" + self.host).hostname in {"localhost", "127.0.0.1", "::1"}
        # Deliberately ignore Forwarded/X-Forwarded-* headers for trust decisions.
        self.origin = ("http" if self.local else "https") + "://" + self.host
        self.secure_cookie = not self.local
        if not 1 <= max_sessions <= 16 or not 1 <= max_candidates <= 40 or not 1 <= max_search_candidates <= 24:
            raise ValueError("Hosted session/candidate limits exceed the demo ceiling.")
        if not 0 < ttl_seconds <= 3600 or not 1 <= max_jobs <= 4 or not 1 <= max_concurrent <= 2:
            raise ValueError("Hosted TTL/job/concurrency limits exceed the demo ceiling.")
        self.max_sessions, self.ttl = max_sessions, ttl_seconds
        self.max_candidates, self.max_search_candidates, self.max_jobs = max_candidates, max_search_candidates, max_jobs
        self.clock = clock
        self.sessions: dict[str, Visitor] = {}
        self.lock = threading.Lock()
        self.cpu = threading.BoundedSemaphore(max_concurrent)
        static = Path(__file__).resolve().parent / "static"
        if not static.is_dir():
            static = Path(__file__).resolve().parents[2] / "frontend" / "dist"
        self.static = StaticFiles(directory=static, html=True) if static.is_dir() else None

    def _new_module(self) -> ModuleType:
        # No sys.modules registration: expired visitors leave no global module
        # registry entries. Functions retain their own module globals naturally.
        name = f"{__package__}._demo_{secrets.token_hex(12)}"
        spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name("main.py"))
        if spec is None or spec.loader is None:
            raise RuntimeError("The local engine entry point is unavailable.")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module

    def _visitor(self, headers: Headers) -> tuple[str, Visitor] | None:
        cookies = SimpleCookie()
        try:
            cookies.load(headers.get("cookie", ""))
        except Exception:
            cookies = SimpleCookie()
        morsel = cookies.get(COOKIE)
        token = morsel.value if morsel else ""
        now = self.clock()
        with self.lock:
            for key, visitor in list(self.sessions.items()):
                if now - visitor.touched >= self.ttl and not visitor.busy.locked():
                    del self.sessions[key]
            visitor = self.sessions.get(token) if re.fullmatch(r"[A-Za-z0-9_-]{43}", token) else None
            fresh = visitor is None
            if fresh:
                if len(self.sessions) >= self.max_sessions:
                    return None
                token = secrets.token_urlsafe(32)
                visitor = Visitor(self._new_module(), now)
                self.sessions[token] = visitor
            visitor.touched = now
            return token, visitor

    async def _respond(self, scope, receive, send, response: Response):
        for key, value in SECURITY_HEADERS.items():
            response.headers[key] = value
        return await response(scope, receive, send)

    async def _problem(self, scope, receive, send, code, message, status, retry=False):
        response = JSONResponse({"code": code, "message": message, "details": {}}, status_code=status)
        if retry:
            response.headers["Retry-After"] = "10"
        return await self._respond(scope, receive, send, response)

    async def __call__(self, scope, receive, send):
        if scope["type"] == "lifespan":
            while True:
                message = await receive()
                if message["type"] == "lifespan.startup":
                    await send({"type": "lifespan.startup.complete"})
                elif message["type"] == "lifespan.shutdown":
                    self.sessions.clear()
                    await send({"type": "lifespan.shutdown.complete"})
                    return
        if scope["type"] != "http":
            if scope["type"] == "websocket":
                await send({"type": "websocket.close", "code": 1008})
            return
        headers = Headers(scope=scope)
        if len(headers.getlist("host")) != 1 or headers["host"].lower() != self.host:
            return await self._problem(scope, receive, send, "host_denied", "This hostname is not configured for the public demo.", 403)
        origins = headers.getlist("origin")
        if len(origins) > 1 or (origins and origins[0] != self.origin):
            return await self._problem(scope, receive, send, "origin_denied", "Use the demo's own origin.", 403)
        if headers.get("sec-fetch-site") not in {None, "same-origin", "none"}:
            return await self._problem(scope, receive, send, "cross_site_denied", "Cross-site and sibling-site access are not permitted.", 403)
        method, path = scope["method"], scope["path"].rstrip("/") or "/"
        if path.startswith("/v1/datasets/import") or path.startswith("/v1/audits"):
            return await self._problem(scope, receive, send, "fictional_only", "This public demo accepts built-in fictional fixtures only. Uploads and external-data audits are disabled. Run PRISM locally for CSV workflows.", 403)
        if method not in {"GET", "HEAD", "OPTIONS"} and origins != [self.origin]:
            return await self._problem(scope, receive, send, "origin_required", "Changing demo state requires its exact same-origin Origin header.", 403)
        if path == "/health" and method in {"GET", "HEAD"}:
            return await self._respond(scope, receive, send, JSONResponse({
                "status": "ok", "version": "0.1.0", "deploymentMode": "synthetic_demo", "uploadsAllowed": False,
                "sessionTtlSeconds": self.ttl, "maxSearchCandidates": self.max_search_candidates, "maxCandidates": self.max_candidates,
            }))
        if path == "/v1/registry" and method == "GET":
            return await self._respond(scope, receive, send, JSONResponse(registry.get_registry()))
        if path == "/v1/lab" and method == "GET":
            if not self.cpu.acquire(blocking=False):
                return await self._problem(scope, receive, send, "demo_busy", "The demo is calculating for another visitor. Retry shortly.", 429, True)
            try:
                return await self._respond(scope, receive, send, JSONResponse(lab.experiments()))
            finally:
                self.cpu.release()
        is_api = path.startswith("/v1")
        if not is_api:
            async def static_send(message):
                if message["type"] == "http.response.start":
                    message["headers"] = [(k, v) for k, v in message.get("headers", []) if k.decode().lower() not in SECURITY_HEADERS]
                    message["headers"].extend((k.encode(), v.encode()) for k, v in SECURITY_HEADERS.items())
                await send(message)
            if self.static is not None and method in {"GET", "HEAD"}:
                try:
                    return await self.static(scope, receive, static_send)
                except Exception as exc:
                    from starlette.exceptions import HTTPException
                    if not isinstance(exc, HTTPException) or exc.status_code != 404:
                        raise
            return await self._problem(scope, receive, send, "not_found", "Page not found.", 404)
        if not any(method == verb and pattern.fullmatch(path) for verb, pattern in ROUTES):
            return await self._problem(scope, receive, send, "fictional_only", "This route is not available in the fictional-only public demo.", 403)
        length = headers.get("content-length")
        if length and (not length.isdigit() or int(length) > BODY_LIMIT):
            return await self._problem(scope, receive, send, "request_too_large", "Demo configuration is limited to 64 KiB; data uploads are disabled.", 413)
        # Bound the bytes before the inner middleware/Pydantic can parse them.
        body = bytearray()
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            body.extend(message.get("body", b""))
            if len(body) > BODY_LIMIT:
                return await self._problem(scope, receive, send, "request_too_large", "Demo configuration is limited to 64 KiB.", 413)
            if not message.get("more_body", False):
                break
        budget = 1 if path in {"/v1/candidates", "/v1/assessments"} and method == "POST" else 0
        if path == "/v1/search" and method == "POST":
            try:
                payload = json.loads(body)
                budget = payload.get("maxCandidates", 24) if isinstance(payload, dict) else 0
            except (ValueError, UnicodeDecodeError):
                budget = 0  # Original strict request validation returns 422.
            if type(budget) is not int or not 1 <= budget <= self.max_search_candidates:
                return await self._problem(scope, receive, send, "search_limit", "Public searches require 1–24 candidates.", 422)
        if not self.cpu.acquire(blocking=False):
            return await self._problem(scope, receive, send, "demo_busy", "The demo is calculating for another visitor. Retry shortly.", 429, True)
        visitor = None
        visitor_acquired = False
        try:
            selected = self._visitor(headers)
            if selected is None:
                return await self._problem(scope, receive, send, "demo_full", "All temporary demo sessions are occupied. Try again after an idle session expires.", 503, True)
            token, visitor = selected
            visitor_acquired = visitor.busy.acquire(blocking=False)
            if not visitor_acquired:
                return await self._problem(scope, receive, send, "session_busy", "This visitor already has a request in progress. Retry shortly.", 429, True)
            if len(visitor.module.CANDIDATES) + budget > self.max_candidates:
                return await self._problem(scope, receive, send, "session_capacity", "This demo session has reached its candidate limit. Clear it before calculating more.", 409)
            if path == "/v1/search" and method == "POST" and len(visitor.module.JOBS) >= self.max_jobs:
                return await self._problem(scope, receive, send, "session_capacity", "Clear this demo session before starting more searches.", 409)
            # Authenticated outer requests only. Never mutate original scope.
            inner = dict(scope)
            inner["scheme"], inner["server"] = "http", ("127.0.0.1", 8000)
            inner["headers"] = [(k, v) for k, v in scope["headers"] if k.lower() not in {b"host", b"origin", b"cookie", b"forwarded", b"x-forwarded-host", b"x-forwarded-proto"}]
            inner["headers"].append((b"host", b"127.0.0.1:8000"))
            if origins:
                inner["headers"].append((b"origin", b"http://127.0.0.1:8000"))
            sent_body = False

            async def replay():
                nonlocal sent_body
                if not sent_body:
                    sent_body = True
                    return {"type": "http.request", "body": bytes(body), "more_body": False}
                return await receive()

            async def visitor_send(message):
                if message["type"] == "http.response.start":
                    # No inner CORS, redirects to loopback, or shared caching.
                    message["headers"] = [(k, v) for k, v in message.get("headers", []) if not k.lower().startswith(b"access-control-")]
                    cookie_response = Response()
                    cookie_response.set_cookie(COOKIE, token, max_age=int(self.ttl), httponly=True,
                                               secure=self.secure_cookie, samesite="strict", path="/")
                    message["headers"].extend((k, v) for k, v in cookie_response.raw_headers if k == b"set-cookie")
                await send(message)

            # Canonical routing avoids framework slash redirects to loopback.
            inner["path"] = path
            inner["raw_path"] = path.encode("ascii")
            await visitor.module.app(inner, replay, visitor_send)
        finally:
            if visitor is not None and visitor_acquired:
                visitor.touched = self.clock()
                visitor.busy.release()
            self.cpu.release()


app = HostedDemo()
