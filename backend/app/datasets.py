"""Bounded local CSV intake and reproducible, explicitly synthetic examples."""

from __future__ import annotations

import csv
import io
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
