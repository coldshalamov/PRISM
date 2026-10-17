"""Bounded local CSV intake and reproducible, explicitly synthetic examples."""

from __future__ import annotations

import csv
import io
import ipaddress
import re

import numpy as np
import pandas as pd

MAX_CSV_BYTES = 50 * 1024 * 1024
MAX_ROWS = 100_000
MAX_COLUMNS = 200
MAX_CELL_CHARS = 65_536
FIXTURE_DATE = pd.Timestamp("2026-10-17")


def synthetic_oncology(n: int = 5000, seed: int = 42) -> pd.DataFrame:
    """Generate demonstration people with designed, nonclinical relationships.

    No source patient data, public-record linkage, or trained generator is used.
    The fixed reference date makes repeated installations produce identical data.
    """
    if isinstance(n, bool) or not isinstance(n, int) or not 1 <= n <= MAX_ROWS:
        raise ValueError(f"Synthetic row count must be between 1 and {MAX_ROWS}.")
    if isinstance(seed, bool) or not isinstance(seed, int) or seed < 0:
        raise ValueError("Seed must be a nonnegative integer.")
    rng = np.random.default_rng(seed)
    age = np.clip(np.rint(rng.normal(59, 14, n)), 18, 92).astype(int)
    stage_number = rng.choice(4, n, p=[0.27, 0.32, 0.26, 0.15])
    mutation = rng.random(n) < (0.035 + 0.025 * stage_number + 0.0005 * (age - 18))
    treatment = rng.choice(["A", "B", "C"], n, p=[0.48, 0.33, 0.19])
    # Intentional treatment/mutation/stage association; not a clinical model.
    probability = np.clip(
        0.82 - 0.12 * stage_number - 0.20 * mutation
        + 0.12 * (treatment == "B") * mutation - 0.0015 * (age - 50),
        0.05, 0.95,
    )
    response = rng.random(n) < probability
    first = np.array(["Avery", "Jordan", "Morgan", "Riley", "Taylor", "Casey", "Alex", "Sam"])
    last = np.array(["River", "Vale", "Stone", "Meadow", "Brook", "Cedar", "Lake", "Reed"])
    birth = FIXTURE_DATE - pd.to_timedelta(age * 365.2425 + rng.integers(0, 365, n), unit="D")
    # A mixture of dense and uncommon synthetic geographic codes, including 0.
    prefixes = rng.choice(["021", "009", "100", "331", "606", "752", "900", "981"], n)
    suffixes = rng.integers(0, 100, n)
    frame = pd.DataFrame({
        "record_id": [f"SYN-{i + 1:06d}" for i in range(n)],
        "name": [f"{a} {b}" for a, b in zip(rng.choice(first, n), rng.choice(last, n))],
        "email": [f"synthetic-{i + 1:06d}@example.invalid" for i in range(n)],
        "birth_date": birth.strftime("%Y-%m-%d"),
        "age": age,
        "zip": [f"{prefix}{suffix:02d}" for prefix, suffix in zip(prefixes, suffixes)],
        "weight": np.round(np.clip(rng.normal(73 + 0.12 * (age - 50), 14, n), 38, 155), 1),
        "eye_color": rng.choice(["brown", "blue", "hazel", "green", "gray"], n, p=[0.48, 0.24, 0.14, 0.12, 0.02]),
        "mutation": mutation,
        "stage": np.array(["I", "II", "III", "IV"])[stage_number],
        "treatment": treatment,
        "response": response,
    })
    frame.attrs.update({"synthetic": True, "units": {"age": "years", "weight": "kg"}, "seed": seed})
    return frame


def semantic_fixture(n: int = 480, seed: int = 73) -> dict:
    """A fictional, deliberately ambiguous event/facility oncology workbench.

    Labels are research shorthand, not evidence of clinical source records.
    Five records share a designed appointment context; exact ages/heights make
    their combinations distinguishable until concrete coarsening is applied.
    """
    rng = np.random.default_rng(seed)
    groups = np.arange(n) // 5
    offsets = np.arange(n) % 5
    ages = 40 + (groups % 8) * 5 + offsets
    stages = np.array(["C50", "C18", "C34", "C61"])[groups % 4]
    outcome = rng.random(n) < (.8 - .12 * (groups % 4) - .002 * (ages - 40))
    dates = pd.Timestamp("2026-01-01") + pd.to_timedelta(groups % 96, unit="D")
    frame = pd.DataFrame({
        "PAT_ID": [f"FICTION-{i + 1:05d}" for i in range(n)],
        "DOS": dates.strftime("%Y-%m-%d"),
        "HOSP_SITE": np.array(["North fictional centre", "South fictional centre", "East fictional centre", "West fictional centre"])[groups % 4],
        "DX_CODE": stages,
        "AGE": ages,
        "ZIP": [f"{[331, 606, 981, 100][int(g % 4)]}{int(g % 96):02d}" for g in groups],
        "HT_CM": (150 + (groups % 20) + offsets * .4).astype(float),
        "TX_RESP": outcome,
        "NOTES": [f"Fictional protocol note; appointment {date}. synthetic-{i}@example.invalid" if i % 12 == 0
                  else "Fictional protocol note; no real person." for i, date in enumerate(dates.strftime("%Y-%m-%d"))],
    })
    frame.attrs.update(synthetic=True, units={"AGE": "years", "HT_CM": "cm"}, seed=seed)
    schema = profile(frame)
    role_map = {"PAT_ID": "direct_identifier", "DOS": "quasi_identifier", "HOSP_SITE": "quasi_identifier",
                "DX_CODE": "sensitive", "AGE": "quasi_identifier", "ZIP": "quasi_identifier",
                "HT_CM": "quasi_identifier", "TX_RESP": "research_target", "NOTES": "sensitive"}
    for spec in schema:
        spec["role"] = role_map[spec["name"]]
        spec["sensitivityReason"] = "Declared fictional demonstration schema; semantic interpretation is separately reviewable."
    return {"frame": frame, "name": "Semantic oncology · fictional appointments", "schema": schema,
            "defaultSteps": [
                {"method": "drop", "columns": ["PAT_ID", "NOTES"], "params": {}},
                {"method": "band", "columns": ["AGE"], "params": {"width": 10, "origin": 0}},
                {"method": "zip_prefix", "columns": ["ZIP"], "params": {"length": 3}},
                {"method": "date_generalize", "columns": ["DOS"], "params": {"precision": "month"}},
                {"method": "round", "columns": ["HT_CM"], "params": {"decimals": 0}},
            ],
            "defaultWorkload": [
                {"id": "response-by-diagnosis", "type": "group_rate", "groupBy": ["DX_CODE"], "target": "TX_RESP",
                 "positiveValue": True, "weight": 3, "tolerance": .05, "minCohort": 5},
                {"id": "height-by-diagnosis", "type": "group_mean", "groupBy": ["DX_CODE"], "target": "HT_CM",
                 "weight": 1, "tolerance": 2, "minCohort": 5},
            ]}


def _normalized_name(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")


def _is_zip(name: str) -> bool:
    return bool(re.search(r"(^|_)(zip|zipcode|postal|postcode)(_|$)", _normalized_name(name)))


def _identifier_name(name: str) -> bool:
    value = _normalized_name(name)
    return value in {"id", "name", "first_name", "last_name", "full_name", "email", "email_address", "phone", "telephone", "ssn", "address", "street_address", "medical_record_number"} or value.endswith("_id")


def _unit(name: str, frame: pd.DataFrame) -> str | None:
    declared = frame.attrs.get("units", {}).get(name)
    if declared:
        return str(declared)
    normalized = _normalized_name(name)
    if normalized.endswith(("_kg", "_kilograms")):
        return "kg"
    if normalized.endswith(("_lb", "_lbs", "_pounds")):
        return "lb"
    if normalized == "age":
        return "years"
    return None


def profile(frame: pd.DataFrame) -> list[dict]:
    """Suggest types/roles; these suggestions require human review.

    Generic weight has no inferred unit. Pattern-based classification cannot
    discover every identifier or unstructured health detail.
    """
    if not isinstance(frame, pd.DataFrame) or frame.columns.has_duplicates:
        raise ValueError("A table with unique column names is required.")
    schema = []
    for column in frame.columns:
        if not isinstance(column, str):
            raise ValueError("Column names must be strings.")
        series = frame[column]
        values = series.dropna()
        normalized = _normalized_name(column)
        if _is_zip(column):
            dtype = "category"
        elif pd.api.types.is_bool_dtype(series):
            dtype = "boolean"
        elif pd.api.types.is_integer_dtype(series):
            dtype = "integer"
        elif pd.api.types.is_numeric_dtype(series):
            dtype = "float"
        elif pd.api.types.is_datetime64_any_dtype(series):
            dtype = "date"
        elif len(values) and values.astype(str).str.fullmatch(r"\d{4}-\d{2}-\d{2}(?:[T ].*)?").all():
            dtype = "date"
        elif values.nunique() <= 30 or values.nunique() <= max(1, len(values) * 0.02):
            dtype = "category"
        else:
            dtype = "text"
        direct = _identifier_name(column)
        if len(values) and values.astype(str).str.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+").mean() >= 0.5:
            direct = True
        if len(values):
            sample = values.astype(str).head(512)
            # These baseline format checks are independent of semantic/model
            # labels and cannot be disabled by a user correction.
            structured = (sample.str.fullmatch(r"[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}")
                          | sample.str.fullmatch(r"(?:[a-fA-F0-9]{2}[:-]){5}[a-fA-F0-9]{2}"))
            def is_ip(value):
                if "." not in value and ":" not in value:
                    return False
                try:
                    ipaddress.ip_address(value)
                    return True
                except ValueError:
                    return False
            if structured.mean() >= .8 or sample.map(is_ip).mean() >= .8:
                direct = True
        if direct:
            role, reason = "direct_identifier", "Column name or structured format suggests a direct identifier; review required."
        elif _is_zip(column) or normalized in {"age", "birth_date", "date_of_birth", "dob", "eye_color", "weight"} or normalized.startswith("weight_"):
            role, reason = "quasi_identifier", "Demographic or physical attribute may distinguish records in combination."
        elif normalized in {"mutation", "diagnosis", "disease", "condition", "genotype"}:
            role, reason = "sensitive", "Health/genetic attribute requires a declared inference threat model."
        elif normalized in {"stage", "treatment", "response", "outcome"}:
            role, reason = "research_target", "Likely analytical target; confirm before applying transformations."
        else:
            role, reason = "other", "Automatic suggestion only; identifiers and analytical importance may be missed."
        spec = {"name": column, "dtype": dtype, "role": role, "importance": 1.0, "sensitivityReason": reason}
        unit = _unit(column, frame)
        if unit:
            spec["unit"] = unit
        schema.append(spec)
    return schema


def read_csv_bytes(content: bytes) -> pd.DataFrame:
    """Read a strict UTF-8 CSV locally, preserving ZIPs and identifier strings."""
    if not isinstance(content, bytes):
        raise ValueError("CSV content must be bytes.")
    if not content or len(content) > MAX_CSV_BYTES:
        raise ValueError("CSV must contain data and be at most 50 MB.")
    try:
        decoded = content.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise ValueError("CSV must use UTF-8 encoding.") from exc
    if "\x00" in decoded:
        raise ValueError("CSV cannot contain NUL characters.")
    try:
        reader = csv.reader(io.StringIO(decoded, newline=""), strict=True)
        headers = next(reader)
        headers = [header.strip() for header in headers]
        if not headers or len(headers) > MAX_COLUMNS or any(not h or len(h) > 200 or any(ord(c) < 32 for c in h) for h in headers):
            raise ValueError("CSV requires 1–200 nonempty column names of at most 200 characters.")
        if len(headers) != len(set(headers)):
            raise ValueError("Duplicate CSV column names are not allowed.")
        rows = []
        for row in reader:
            if not row:
                continue
            if len(row) != len(headers):
                raise ValueError("CSV contains a row with an inconsistent number of cells.")
            if any(len(cell) > MAX_CELL_CHARS for cell in row):
                raise ValueError("CSV cells must be at most 65536 characters.")
            rows.append(row)
            if len(rows) > MAX_ROWS:
                raise ValueError(f"CSV must contain at most {MAX_ROWS} data rows.")
    except (csv.Error, StopIteration) as exc:
        raise ValueError("CSV is empty or malformed.") from exc
    if not rows:
        raise ValueError("CSV must contain at least one data row.")
    frame = pd.DataFrame(rows, columns=headers)
    frame = frame.mask(frame.eq(""), np.nan)
    if frame.isna().all(axis=None):
        raise ValueError("CSV must contain at least one nonempty data cell.")
    for name in headers:
        if _is_zip(name) or _identifier_name(name):
            continue
        present = frame[name].dropna()
        if not len(present):
            continue
        lowered = present.astype(str).str.lower()
        if lowered.isin(["true", "false"]).all():
            frame[name] = frame[name].map(lambda v: pd.NA if pd.isna(v) else str(v).lower() == "true").astype("boolean")
        else:
            numeric = pd.to_numeric(frame[name], errors="coerce")
            if numeric.notna().sum() == len(present):
                if not np.isfinite(numeric.dropna().to_numpy(dtype=float)).all():
                    raise ValueError("Numeric CSV columns cannot contain infinity.")
                frame[name] = numeric
    frame.attrs.update({"synthetic": False, "units": {}, "schemaReviewRequired": True})
    return frame
