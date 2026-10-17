"""Validated, deterministic transformations for local row-release experiments.

These methods reduce or alter selected observations; none provides release
clearance or formal differential privacy. Secrets are caller-owned and never
returned in transform reports or accepted as recipe parameters.
"""

from __future__ import annotations

import copy
import hashlib
import hmac
import json
import math
import re

import numpy as np
import pandas as pd

VERSION = "1.0.0"
_ROLES = {"direct_identifier", "quasi_identifier", "sensitive", "research_target", "other"}
_DTYPES = {"integer", "float", "category", "date", "text", "boolean"}
_PARAMS = {
    "drop": set(), "mask": {"value"}, "pseudonymize": {"namespace"},
    "band": {"width", "origin", "convertFrom"}, "zip_prefix": {"length"},
    "round": {"decimals"}, "top_bottom": {"min", "max"},
    "rare_group": {"min_count", "label"}, "date_generalize": {"precision"},
    "date_shift": {"days"}, "noise": {"scale", "distribution"},
    "permute": {"strata"}, "redact": {"pattern", "replacement"},
    "suppress_cells": {"fraction"}, "suppress_rows": {"qi", "k", "max_fraction"},
}


def default_steps(schema: list[dict]) -> list[dict]:
    """Baseline protection; weight unit must still be reviewed before apply."""
    steps = []
    identifiers = [c["name"] for c in schema if c.get("role") == "direct_identifier"]
    if identifiers:
        steps.append({"method": "drop", "columns": identifiers, "params": {}})
    for spec in schema:
        name = spec["name"]
        normalized = re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")
        if name in identifiers:
            continue
        if normalized == "age":
            steps.append({"method": "band", "columns": [name], "params": {"width": 5}})
        elif re.search(r"(^|_)(zip|zipcode|postal|postcode)(_|$)", normalized):
            steps.append({"method": "zip_prefix", "columns": [name], "params": {"length": 3}})
        elif normalized == "weight" or normalized.startswith("weight_"):
            params = {"width": 5}
            if str(spec.get("unit", "")).lower() in {"lb", "lbs", "pounds"}:
                params["convertFrom"] = "lb"
            steps.append({"method": "band", "columns": [name], "params": params})
    return steps


def _number(value, label: str, *, minimum=None, maximum=None) -> float:
    if isinstance(value, bool) or not isinstance(value, (float, int)):
        raise ValueError(f"{label} must be a finite number.")
    try:
        value = float(value)
    except (OverflowError, ValueError) as exc:
        raise ValueError(f"{label} must be a finite number.") from exc
    if not math.isfinite(value):
        raise ValueError(f"{label} must be a finite number.")
    if minimum is not None and value < minimum or maximum is not None and value > maximum:
        raise ValueError(f"{label} is outside the permitted range.")
    return float(value)


def _integer(value, label: str, minimum: int, maximum: int) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or not minimum <= value <= maximum:
        raise ValueError(f"{label} must be an integer between {minimum} and {maximum}.")
    return value


def _numeric(series: pd.Series) -> pd.Series:
    # Coercing category labels or boolean targets would silently alter semantics.
    if not pd.api.types.is_numeric_dtype(series) or pd.api.types.is_bool_dtype(series):
        raise ValueError("This method requires a numeric column.")
    converted = series.astype(float)
    if not np.isfinite(converted.dropna().to_numpy()).all():
        raise ValueError("Numeric transformations require finite values.")
    return converted


def _dates(series: pd.Series) -> pd.Series:
    if pd.api.types.is_numeric_dtype(series):
        raise ValueError("Date methods require dates, not numeric timestamps.")
    parsed = pd.to_datetime(series, errors="coerce", utc=True)
    if parsed.notna().sum() != series.notna().sum():
        raise ValueError("Date method found invalid date values.")
    return parsed


def _group_sizes(frame: pd.DataFrame, columns: list[str]) -> pd.Series:
    if not columns:
        return pd.Series(len(frame), index=frame.index, dtype=int)
    # An internal object sentinel cannot collide with any imported CSV string.
    missing = object()
    keys = frame[columns].astype(object).map(lambda value: missing if pd.isna(value) else value)
    return keys.groupby(columns, dropna=False, sort=False, observed=True)[columns[0]].transform("size")


def _format_number(value: float) -> str:
    return str(int(value)) if value.is_integer() else format(value, ".12g")


def _safe_pattern(pattern: str) -> re.Pattern:
    """Small regex subset avoids user-supplied nested repetition/backtracking."""
    if not isinstance(pattern, str) or not 1 <= len(pattern) <= 256:
        raise ValueError("Redaction pattern must have 1–256 characters.")
    # Permit character classes, anchors, escapes and bounded repetitions; no
    # groups, alternation, backreferences, or multiple unbounded repetitions.
    outside_classes = re.sub(r"\[(?:\\.|[^\]\\])*\]", "X", pattern)
    unescaped = re.sub(r"\\.", "X", outside_classes)
    bounds = re.findall(r"\{(\d+)(?:,(\d*))?\}", unescaped)
    if any(int(bound) > 1000 for pair in bounds for bound in pair if bound):
        raise ValueError("Redaction repetition bounds must be at most 1000.")
    if any(c in unescaped for c in "()|") or re.search(r"\\[1-9]", pattern) or sum(unescaped.count(c) for c in "*+") > 1 or re.search(r"\{\d+,\}", unescaped):
        raise ValueError("Redaction pattern uses unsupported regex constructs.")
    try:
        return re.compile(pattern)
    except (re.error, OverflowError) as exc:
        raise ValueError("Redaction pattern is invalid.") from exc


def apply(frame: pd.DataFrame, schema: list[dict], steps: list[dict], seed: int = 42, secret=None) -> tuple[pd.DataFrame, list[int], dict]:
    """Apply an immutable recipe copy and return output, private lineage, report.

    Band intervals are half-open. Weight bands always use kg; pounds require
    explicit convertFrom='lb'. Row suppression may only be the final step and
    is validated again after removal. All reports contain aggregate data only.
    """
    if not isinstance(frame, pd.DataFrame) or not len(frame) or frame.columns.has_duplicates:
        raise ValueError("A nonempty table with unique column names is required.")
    if not isinstance(schema, list) or any(not isinstance(c, dict) for c in schema):
        raise ValueError("Schema must be a list of column specifications.")
    if any(not isinstance(c.get("name"), str) for c in schema):
        raise ValueError("Schema column names must be strings.")
    specs = {c["name"]: c for c in schema}
    if len(specs) != len(schema) or set(specs) != set(frame.columns):
        raise ValueError("Schema must describe every input column exactly once.")
    if any(c.get("role") not in _ROLES or c.get("dtype") not in _DTYPES for c in schema):
        raise ValueError("Schema contains an invalid role or type.")
    if not isinstance(steps, list) or len(steps) > 100:
        raise ValueError("A recipe must contain at most 100 steps.")
    if isinstance(seed, bool) or not isinstance(seed, int) or seed < 0:
        raise ValueError("Seed must be a nonnegative integer.")
    rng = np.random.default_rng(seed)
    output = frame.copy(deep=True).reset_index(drop=True)
    output.attrs = copy.deepcopy(frame.attrs)
    lineage = np.arange(len(output))
    warnings = ["Transformations do not establish release clearance or legal compliance."]
    step_reports = []
    for offset, step in enumerate(steps):
        if not isinstance(step, dict) or set(step) - {"method", "columns", "params"}:
            raise ValueError("Each recipe step requires only method, columns and params.")
        method, columns, params = step.get("method"), step.get("columns", []), step.get("params", {})
        if not isinstance(method, str) or method not in _PARAMS:
            raise ValueError("Unsupported transformation method.")
        if not isinstance(params, dict) or set(params) - _PARAMS[method]:
            raise ValueError("Transformation parameters include unsupported or secret fields.")
        if not isinstance(columns, list) or any(not isinstance(c, str) for c in columns) or len(columns) != len(set(columns)):
            raise ValueError("Step columns must be a list of distinct column names.")
        if not columns and method != "suppress_rows":
            raise ValueError("Select at least one column for each transformation.")
        if any(column not in output.columns for column in columns):
            raise ValueError("A transformation references a missing or previously dropped column.")
        before_rows = len(output)
        if method == "drop":
            output = output.drop(columns=columns)
        elif method == "suppress_rows":
            if offset != len(steps) - 1:
                raise ValueError("Row suppression must be the final recipe step.")
            qi = params.get("qi", columns)
            if not isinstance(qi, list) or any(not isinstance(c, str) or c not in output.columns for c in qi) or len(qi) != len(set(qi)):
                raise ValueError("Suppression QI must be distinct, present columns.")
            k = _integer(params.get("k"), "k", 1, 100_000)
            cap = _number(params.get("max_fraction"), "Suppression cap", minimum=0, maximum=1)
            keep = _group_sizes(output, qi).to_numpy() >= k
            if (~keep).sum() / len(frame) > cap + 1e-12:
                raise ValueError("Required row suppression exceeds the declared cap.")
            if not keep.any():
                raise ValueError("Suppression would remove every row; minimum k cannot be verified.")
            output = output.iloc[np.flatnonzero(keep)].reset_index(drop=True)
            lineage = lineage[keep]
            if int(_group_sizes(output, qi).min()) < k:
                raise ValueError("Final suppressed output does not satisfy the requested sample k.")
            warnings.append("Row suppression can bias cohorts; sample k applies only to the declared QI.")
        elif method == "permute":
            strata = params.get("strata", [])
            if not isinstance(strata, list) or any(not isinstance(c, str) or c not in output.columns for c in strata) or len(strata) != len(set(strata)):
                raise ValueError("Permutation strata must be distinct, present columns.")
            if set(strata) & set(columns):
                raise ValueError("Permutation targets cannot also be stratum keys.")
            groups = output.groupby(strata, dropna=False, sort=False, observed=True).indices.values() if strata else [np.arange(len(output))]
            for indices in groups:
                for column in columns:
                    location = output.columns.get_loc(column)
                    output.iloc[indices, location] = output.iloc[rng.permutation(indices), location].to_numpy()
            warnings.append("Experimental permutation preserves selected marginals but can destroy research relationships; no formal privacy guarantee.")
        elif method == "suppress_cells":
            fraction = _number(params.get("fraction", 1), "Cell suppression fraction", minimum=0, maximum=1)
            for column in columns:
                chosen = rng.choice(len(output), size=math.floor(len(output) * fraction), replace=False)
                mask = np.zeros(len(output), dtype=bool)
                mask[chosen] = True
                output[column] = output[column].mask(mask)
        else:
            for column in columns:
                values = output[column]
                if method == "mask":
                    replacement = params.get("value", "[masked]")
                    if not isinstance(replacement, str) or len(replacement) > 200:
                        raise ValueError("Mask must be a string of at most 200 characters.")
                    output[column] = values.map(lambda value: np.nan if pd.isna(value) else replacement)
                elif method == "pseudonymize":
                    if isinstance(secret, str):
                        key = secret.encode("utf-8")
                    elif isinstance(secret, bytes):
                        key = secret
                    else:
                        raise ValueError("Pseudonymization requires an external secret key.")
                    if len(key) < 16:
                        raise ValueError("Pseudonymization requires a secret of at least 16 bytes.")
                    namespace = params.get("namespace", "prism")
                    if not isinstance(namespace, str) or not 1 <= len(namespace) <= 100:
                        raise ValueError("HMAC namespace must contain 1–100 characters.")
                    def token(value):
                        if pd.isna(value):
                            return np.nan
                        message = json.dumps([namespace, column, type(value).__name__, str(value)], ensure_ascii=False).encode("utf-8")
                        return hmac.new(key, message, hashlib.sha256).hexdigest()
                    output[column] = values.map(token)
                    warnings.append("Pseudonyms remain linkable within the same key/namespace and are not anonymous identifiers.")
                elif method in {"band", "round", "top_bottom", "noise"}:
                    numeric = _numeric(values)
                    if specs[column]["dtype"] not in {"integer", "float"}:
                        raise ValueError("Numeric method is incompatible with the reviewed schema type.")
                    if method == "band":
                        width = _number(params.get("width"), "Band width", minimum=1e-9, maximum=1e12)
                        origin = _number(params.get("origin", 0), "Band origin")
                        is_weight = "weight" in column.lower() or str(specs[column].get("unit", "")).lower() in {"kg", "lb", "lbs", "pounds"}
                        conversion = params.get("convertFrom")
                        if conversion is not None and conversion != "lb":
                            raise ValueError("Only explicit pounds-to-kg conversion is supported.")
                        if is_weight:
                            unit = str(specs[column].get("unit", "")).lower()
                            if conversion == "lb" and unit not in {"", "lb", "lbs", "pounds"}:
                                raise ValueError("Pounds conversion conflicts with the reviewed unit.")
                            if conversion == "lb":
                                numeric = numeric * 0.45359237
                                warnings.append("Weight converted from pounds to kilograms before banding.")
                            elif unit != "kg":
                                raise ValueError("Weight banding requires reviewed kg units or explicit pounds conversion.")
                        elif conversion:
                            raise ValueError("Pounds conversion is only applicable to a reviewed weight column.")
                        lower = np.floor((numeric - origin) / width) * width + origin
                        if not np.isfinite(lower.dropna().to_numpy()).all():
                            raise ValueError("Band parameters overflow numeric bounds.")
                        upper = lower + width
                        if not np.isfinite(upper.dropna().to_numpy()).all() or ((upper <= lower) & lower.notna()).any():
                            raise ValueError("Band boundaries cannot be represented at the supplied numeric scale.")
                        output[column] = lower.map(lambda value: np.nan if pd.isna(value) else f"[{_format_number(float(value))},{_format_number(float(value + width))})")
                        if is_weight:
                            output.attrs.setdefault("units", {})[column] = "kg"
                            if conversion == "lb":
                                output.attrs.setdefault("unit_conversions", {})[column] = {
                                    "from": "lb", "to": "kg", "factor": 0.45359237, "verified": True,
                                }
                    elif method == "round":
                        decimals = _integer(params.get("decimals"), "Decimals", -10, 10)
                        output[column] = numeric.round(decimals)
                    elif method == "top_bottom":
                        if "min" not in params and "max" not in params:
                            raise ValueError("Top/bottom coding requires a min or max bound.")
                        lower = _number(params["min"], "Lower bound") if "min" in params else None
                        upper = _number(params["max"], "Upper bound") if "max" in params else None
                        if lower is not None and upper is not None and lower > upper:
                            raise ValueError("Lower bound must not exceed upper bound.")
                        output[column] = numeric.clip(lower=lower, upper=upper)
                    else:
                        scale = _number(params.get("scale"), "Noise scale", minimum=0, maximum=1e12)
                        distribution = params.get("distribution", "gaussian")
                        if not isinstance(distribution, str) or distribution not in {"gaussian", "laplace"}:
                            raise ValueError("Noise distribution must be gaussian or laplace.")
                        noise = rng.normal(0, scale, len(values)) if distribution == "gaussian" else rng.laplace(0, scale, len(values))
                        output[column] = numeric + noise
                        warnings.append("Experimental seeded numeric noise is not differential privacy and may produce implausible values.")
                elif method == "zip_prefix":
                    length = _integer(params.get("length"), "ZIP prefix length", 1, 5)
                    if specs[column]["dtype"] not in {"category", "text"}:
                        raise ValueError("ZIP generalization requires a reviewed categorical/text type.")
                    present = values.dropna()
                    if not present.map(lambda value: isinstance(value, str) and bool(re.fullmatch(r"\d{5}(?:-\d{4})?", value))).all():
                        raise ValueError("ZIP prefix requires 5-digit string ZIPs; leading zeroes must be preserved.")
                    output[column] = values.map(lambda value: np.nan if pd.isna(value) else value[:length])
                    warnings.append("Three-digit ZIP generalization alone does not establish HIPAA Safe Harbor; population exceptions and other identifiers remain relevant.")
                elif method == "rare_group":
                    minimum = _integer(params.get("min_count"), "Rare-group count", 2, 100_000)
                    label = params.get("label", "Other")
                    if not isinstance(label, str) or not 1 <= len(label) <= 100:
                        raise ValueError("Rare-group label must contain 1–100 characters.")
                    if specs[column]["dtype"] not in {"category", "text", "boolean"}:
                        raise ValueError("Rare grouping requires a categorical/text/boolean reviewed type.")
                    counts = values.value_counts(dropna=False)
                    rare = values.map(counts).fillna(0) < minimum
                    output[column] = values.astype(object).mask(rare & values.notna(), label)
                elif method in {"date_generalize", "date_shift"}:
                    if specs[column]["dtype"] != "date":
                        raise ValueError("Date method is incompatible with the reviewed schema type.")
                    dates = _dates(values)
                    if method == "date_generalize":
                        precision = params.get("precision")
                        if not isinstance(precision, str) or precision not in {"year", "quarter", "month", "day"}:
                            raise ValueError("Date precision must be year, quarter, month or day.")
                        if precision == "quarter":
                            result = dates.dt.year.astype("Int64").astype(str) + "-Q" + dates.dt.quarter.astype("Int64").astype(str)
                        else:
                            result = dates.dt.strftime({"year": "%Y", "month": "%Y-%m", "day": "%Y-%m-%d"}[precision])
                        output[column] = result.where(dates.notna(), np.nan)
                    else:
                        days = _integer(params.get("days"), "Date shift range", 0, 36_500)
                        shifted = dates + pd.to_timedelta(rng.integers(-days, days + 1, len(dates)), unit="D")
                        output[column] = shifted.dt.strftime("%Y-%m-%d").where(dates.notna(), np.nan)
                        warnings.append("Independent date offsets may disrupt temporal relationships; no formal privacy guarantee.")
                elif method == "redact":
                    if specs[column]["dtype"] not in {"text", "category"}:
                        raise ValueError("Redaction requires a reviewed text/category column.")
                    replacement = params.get("replacement", "[redacted]")
                    if not isinstance(replacement, str) or len(replacement) > 200:
                        raise ValueError("Redaction replacement must be a string of at most 200 characters.")
                    pattern = _safe_pattern(params["pattern"]) if "pattern" in params else re.compile(r"[^\s@]{1,128}@[^\s@]{1,128}\.[^\s@]{1,32}|\b\d{3}-\d{2}-\d{4}\b|\b\d{3}[- .]\d{3}[- .]\d{4}\b")
                    output[column] = values.map(lambda value: np.nan if pd.isna(value) else pattern.sub(lambda _: replacement, str(value)))
                    warnings.append("Pattern redaction is a limited scanner and can miss identifiers in free text.")
        step_reports.append({"method": method, "columns": columns, "rows_before": before_rows, "rows_after": len(output)})
    output = output.reset_index(drop=True)
    return output, lineage.tolist(), {
        "version": VERSION, "rows_before": len(frame), "rows_after": len(output),
        "suppressed_rows": len(frame) - len(output),
        "suppression_rate": (len(frame) - len(output)) / len(frame),
        "steps": step_reports, "warnings": list(dict.fromkeys(warnings)),
    }
