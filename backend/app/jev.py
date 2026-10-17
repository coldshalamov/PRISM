"""Bounded, optional typed decisions; no chat completions or patient cells.

The API key is read only from server environment. A caller must independently
obtain permission to send the minimized metadata supplied in ``state``.
"""
from __future__ import annotations

from collections import OrderedDict
from copy import deepcopy
import hashlib
import json
import math
import os
import threading
import time

import httpx

MODEL = "typesafe/jev-1.14"
ENDPOINT = "https://openrouter.ai/api/alpha/decisions"
INPUT_USD_PER_MILLION = 0.042  # Pinned model, official OpenRouter catalog, 2026-10-17.
MAX_REQUEST_BYTES = 32_768
_lock = threading.RLock()
_reserved_usd = 0.0
_cache: OrderedDict[str, dict] = OrderedDict()
_CACHE_LIMIT = 128


def _budget() -> float:
    try:
        configured = float(os.getenv("PRISM_JEV_BUDGET_USD", "0.10"))
        return max(0.0, min(0.10, configured)) if math.isfinite(configured) else 0.0
    except ValueError:
        return 0.0


def status() -> dict:
    enabled = os.getenv("PRISM_JEV_ENABLED", "").lower() in {"1", "true", "yes"}
    available = bool(os.getenv("OPENROUTER_API_KEY", "").strip())
    with _lock:
        remaining = max(0, _budget() - _reserved_usd)
    return {
        "enabled": enabled,
        "configured": available,
        "model": MODEL,
        "costCeilingUsd": _budget(),
        "costCeilingScope": "server_process",
        "remainingBudgetUsd": round(remaining, 8),
        "metadataOnly": True,
        "requiresExplicitPermission": True,
    }


def _failure(reason: str, calls: int = 0, **extra) -> dict:
    return {"status": reason, "answers": {}, "calls": calls, "cacheHit": False, **extra}


def _validate_answers(answers: object, questions: dict) -> dict:
    if not isinstance(answers, dict):
        return {}
    valid = {}
    for name, question in questions.items():
        answer = answers.get(name)
        if not isinstance(answer, dict) or answer.get("type") != question.get("type"):
            continue
        if question["type"] == "choice":
            choices = question["criteria"]
            choice = answer.get("choice")
            probabilities = answer.get("probabilities")
            if choice not in choices or not isinstance(probabilities, dict):
                continue
            if set(probabilities) - set(choices):
                continue
            if not all(isinstance(p, (float, int)) and not isinstance(p, bool) and math.isfinite(p) and 0 <= p <= 1 for p in probabilities.values()):
                continue
            if choice not in probabilities or abs(sum(probabilities.values()) - 1) > 0.03:
                continue
            confidence = answer.get("confidence")
            if confidence is not None and (not isinstance(confidence, (int, float)) or isinstance(confidence, bool) or not math.isfinite(confidence) or not 0 <= confidence <= 1):
                continue
            valid[name] = {"type": "choice", "choice": choice, "probabilities": dict(probabilities), "confidence": confidence}
        elif question["type"] == "noul":
            value = answer.get("noul")
            if isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value) and 0 <= value <= 1:
                valid[name] = {"type": "noul", "noul": value}
    return valid


def decide(state: dict, questions: dict) -> dict:
    """One bounded batch. Payload is restricted to caller-approved metadata.

    Each attempt reserves a conservative upper bound: UTF-8 bytes bound the
    number of input tokens, plus 4096 tokens for the provider's wrapper. The
    pinned model has free output. Failed/unknown-charge attempts retain their
    reservation. A deployment-wide cap requires the caller's durable ledger.
    """
    current = status()
    if not current["enabled"]:
        return _failure("disabled")
    if not current["configured"]:
        return _failure("not_configured")
    if not isinstance(state, dict) or not questions or len(questions) > 40:
        return _failure("invalid_request")
    payload = {"model": MODEL, "state": state, "questions": questions}
    raw = json.dumps(payload, ensure_ascii=True, separators=(",", ":")).encode("utf-8")
    if len(raw) > MAX_REQUEST_BYTES:
        return _failure("request_too_large")
    fingerprint = hashlib.sha256(raw).hexdigest()
    with _lock:
        if fingerprint in _cache:
            _cache.move_to_end(fingerprint)
            result = deepcopy(_cache[fingerprint])
            result.update({"calls": 0, "cacheHit": True})
            return result
    reserve = (len(raw) + 4096) * INPUT_USD_PER_MILLION / 1_000_000
    attempts = 0
    for retry in range(2):
        with _lock:
            global _reserved_usd
            if _reserved_usd + reserve > _budget():
                return _failure("budget_exhausted", attempts)
            _reserved_usd += reserve
        attempts += 1
        try:
            with httpx.Client(timeout=httpx.Timeout(8.0, connect=3.0), follow_redirects=False) as client:
                response = client.post(ENDPOINT, content=raw, headers={
                    "Authorization": "Bearer " + os.environ["OPENROUTER_API_KEY"].strip(),
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://github.com/coldshalamov/PRISM",
                    "X-Title": "PRISM schema semantics",
                })
            if response.status_code in {429, 502, 503, 504} and retry == 0:
                time.sleep(0.15)
                continue
            if response.status_code != 200:
                return _failure("provider_unavailable", attempts, httpStatus=response.status_code)
            if len(response.content) > 256_000:
                return _failure("invalid_response", attempts)
            data = response.json()
            if not isinstance(data, dict):
                return _failure("invalid_response", attempts)
            served_model = data.get("model", "")
            if not isinstance(served_model, str) or not (served_model == MODEL or served_model.startswith(MODEL + "-")):
                return _failure("unexpected_model", attempts)
            answers = _validate_answers(data.get("answers"), questions)
            usage = data.get("usage") if isinstance(data.get("usage"), dict) else {}
            cost = usage.get("cost")
            cost = float(cost) if isinstance(cost, (int, float)) and not isinstance(cost, bool) and math.isfinite(cost) and cost >= 0 else None
            if cost is not None:
                with _lock:
                    _reserved_usd += cost - reserve
            result = {
                "status": "ok" if len(answers) == len(questions) else "partial" if answers else "invalid_response",
                "answers": answers,
                "model": served_model[:120],
                "requestId": str(data.get("id", ""))[:120],
                "calls": attempts,
                "cacheHit": False,
                "costUsd": cost,
                "inputTokens": usage.get("input_tokens") if isinstance(usage.get("input_tokens"), int) else None,
                "invalidAnswers": sorted(set(questions) - set(answers)),
            }
            if answers:
                with _lock:
                    _cache[fingerprint] = deepcopy(result)
                    while len(_cache) > _CACHE_LIMIT:
                        _cache.popitem(last=False)
            return result
        except (httpx.HTTPError, ValueError, KeyError):
            return _failure("provider_unavailable", attempts)
    return _failure("provider_unavailable", attempts)
