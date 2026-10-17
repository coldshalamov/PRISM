"""Research-workload utility with aggregate, unpaired-safe diagnostics."""
from __future__ import annotations

import itertools
import math
import re
from typing import Any

import numpy as np
import pandas as pd

_BAND = re.compile(r"^\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)$")


def _scalar(value: Any):
    if pd.isna(value):
        return None
    if isinstance(value, np.generic):
        return value.item()
    if isinstance(value, pd.Timestamp):
        return value.isoformat()
    return value


def _numeric(series: pd.Series) -> tuple[pd.Series, bool]:
    """Decode declared numerical bins by midpoint; never silently treat as exact."""
    approximate = False
    values = []
    for value in series:
        if isinstance(value, str) and (match := _BAND.fullmatch(value)):
            low, high = map(float, match.groups())
            values.append((low + high) / 2)
            approximate = True
        elif isinstance(value, str) and value.strip().lower() in {"true", "false", "yes", "no", "positive", "negative"}:
            values.append(1 if value.strip().lower() in {"true", "yes", "positive"} else 0)
        else:
            values.append(value)
    result = pd.to_numeric(pd.Series(values, index=series.index), errors="coerce").astype(float)
    return result.replace([np.inf, -np.inf], np.nan), approximate


def _binary(series: pd.Series, positive: Any = None) -> pd.Series:
    if positive is not None:
        return series.map(lambda value: np.nan if pd.isna(value) else float(_equivalent(value, positive)))
    yes = {"1", "true", "yes", "positive"}
    no = {"0", "false", "no", "negative"}
    def convert(value):
        if pd.isna(value):
            return np.nan
        token = str(value).strip().lower()
        if token in yes:
            return 1.0
        if token in no:
            return 0.0
        # Numeric CSV import sometimes represents 0/1 as floats.
        if isinstance(value, (float, int, np.number)) and value in (0, 1):
            return float(value)
        raise ValueError("Rate target is not binary; declare positiveValue for categorical rates")
    return series.map(convert).astype(float)


def _equivalent(left, right) -> bool:
    if pd.isna(left) or pd.isna(right):
        return bool(pd.isna(left) and pd.isna(right))
    if left == right:
        return True
    aliases = {"true": "1", "1.0": "1", "false": "0", "0.0": "0"}
    return aliases.get(str(left).strip().lower(), str(left).strip().lower()) == aliases.get(
        str(right).strip().lower(), str(right).strip().lower())


def _predicate(series: pd.Series, operator: str, threshold) -> tuple[pd.Series, pd.Series]:
    """Definite/possible truth over each represented half-open interval."""
    if operator in {"gt", "gte", "lt", "lte"}:
        threshold = float(threshold)
    definite, possible = [], []
    for value in series:
        match = _BAND.fullmatch(value) if isinstance(value, str) else None
        if match and operator in {"eq", "ne"} and isinstance(threshold, str):
            try:
                threshold = float(threshold)
            except ValueError:
                pass
        if match and (isinstance(threshold, (int, float)) or operator == "in"):
            low, high = map(float, match.groups())
            if high <= low:
                raise ValueError("Invalid numeric interval in a filter column")
            if operator == "in":
                if not isinstance(threshold, list) or any(not isinstance(item, (int, float)) for item in threshold):
                    raise ValueError("Interval membership filters require numeric values")
                certain, potential = False, any(low <= item < high for item in threshold)
            elif operator in {"eq", "ne"}:
                contains = low <= threshold < high
                certain, potential = (False, contains) if operator == "eq" else (not contains, True)
            elif operator == "gt":
                certain, potential = low > threshold, high > threshold
            elif operator == "gte":
                certain, potential = low >= threshold, high > threshold
            elif operator in {"lt", "lte"}:
                certain = high <= threshold
                potential = low < threshold if operator == "lt" else low <= threshold
            else:
                raise ValueError("Unsupported filter operator")
        elif operator in {"gt", "gte", "lt", "lte"}:
            numeric = pd.to_numeric(value, errors="coerce")
            if pd.isna(numeric):
                if not pd.isna(value):
                    raise ValueError("Nonnumeric value cannot be evaluated against a numeric filter threshold")
                certain = potential = False
            else:
                limit = float(threshold)
                certain = potential = {"gt": numeric > limit, "gte": numeric >= limit,
                                        "lt": numeric < limit, "lte": numeric <= limit}[operator]
        elif operator in {"eq", "ne"}:
            equal = _equivalent(value, threshold)
            certain = potential = equal if operator == "eq" else not equal
        elif operator == "in" and isinstance(threshold, list):
            certain = potential = any(_equivalent(value, item) for item in threshold)
        else:
            raise ValueError("Unsupported filter operator")
        definite.append(bool(certain))
        possible.append(bool(potential))
    return pd.Series(definite, index=series.index, dtype=bool), pd.Series(possible, index=series.index, dtype=bool)


def _filter_selection(frame: pd.DataFrame, filters: dict | None):
    definite = pd.Series(True, index=frame.index)
    possible = definite.copy()
    for column, condition in (filters or {}).items():
        if column not in frame:
            raise ValueError(f"Filter column unavailable: {column}")
        if isinstance(condition, dict):
            predicates = condition.items()
        else:
            predicates = [("in", condition)] if isinstance(condition, list) else [("eq", condition)]
        for operator, threshold in predicates:
            certain, potential = _predicate(frame[column], operator, threshold)
            definite &= certain
            possible &= potential
    coverage = {"definite": int(definite.sum()), "possible": int(possible.sum()),
                "uncertain": int((possible & ~definite).sum()), "total": len(frame),
                "exact": bool(definite.equals(possible)),
                "definition": "Definite rows satisfy all filters for every represented value; possible rows may satisfy them. Conjunctive bounds can be conservative."}
    return definite, possible, coverage


def _filtered(frame: pd.DataFrame, filters: dict | None) -> pd.DataFrame:
    definite, _, coverage = _filter_selection(frame, filters)
    if not coverage["exact"]:
        raise ValueError("Numeric intervals span a filter threshold; exact cohort membership is unavailable")
    return frame.loc[definite]


def _wilson(successes: float, total: int) -> list[float] | None:
    if not total:
        return None
    z = 1.959963984540054
    rate = successes / total
    center = (rate + z * z / (2 * total)) / (1 + z * z / total)
    half = z * math.sqrt(rate * (1 - rate) / total + z * z / (4 * total * total)) / (1 + z * z / total)
    return [max(0.0, center - half), min(1.0, center + half)]


def _group_key(group: dict) -> str:
    # Keys are for matching aggregate groups internally, not a row crosswalk.
    import json
    return json.dumps(group, sort_keys=True, default=str, ensure_ascii=True)


def _records(frame: pd.DataFrame, query: dict) -> tuple[list[dict], list[str]]:
    data = _filtered(frame, query.get("filter"))
    groups = list(query.get("groupBy") or [])
    kind, target = query["type"], query.get("target")
    needed = groups + ([] if kind == "group_count" else [target])
    if any(column is None or column not in data for column in needed):
        raise ValueError("A required research column is unavailable in this release")
    warnings = []
    if kind == "correlation":
        if len(groups) != 1 or not target:
            raise ValueError("Correlation requires groupBy=[x] and target=y")
        x, approximate_x = _numeric(data[groups[0]])
        y, approximate_y = _numeric(data[target])
        pairs = pd.DataFrame({"x": x, "y": y}).dropna()
        value = float(pairs.x.corr(pairs.y)) if len(pairs) > 1 and pairs.x.nunique() > 1 and pairs.y.nunique() > 1 else None
        if approximate_x or approximate_y:
            warnings.append("Numeric interval midpoints approximate correlation; within-bin structure is unknown")
        if value is None:
            warnings.append("Correlation is undefined for an empty, singleton, or constant cohort")
        return [{"group": {}, "value": value, "count": len(pairs)}], warnings
    if kind not in {"group_rate", "group_count", "group_mean", "difference_in_rates"}:
        raise ValueError("Unsupported research query type")
    if len(groups) != len(set(groups)):
        raise ValueError("Repeated groupBy fields are not supported")
    # Factorization gives missing groups one category and avoids groupby dropping
    # missing keys. Labels remain JSON-safe aggregate cohort labels.
    if groups:
        indices = data.groupby(groups, dropna=False, sort=False, observed=True).indices
        cohorts = [(key if isinstance(key, tuple) else (key,), data.iloc[offsets])
                   for key, offsets in indices.items()]
    else:
        cohorts = [((), data)]
    records = []
    for keys, cohort in cohorts:
        record = {"group": {column: _scalar(value) for column, value in zip(groups, keys)}}
        if kind == "group_count":
            record.update(value=int(len(cohort)), count=int(len(cohort)))
        elif kind in {"group_rate", "difference_in_rates"}:
            values = _binary(cohort[target], query.get("positiveValue")).dropna()
            count = len(values)
            successes = float(values.sum())
            record.update(value=float(values.mean()) if count else None, count=count,
                          missing=int(len(cohort) - count), ci95=_wilson(successes, count))
        else:
            values, approximate = _numeric(cohort[target])
            count = int(values.notna().sum())
            record.update(value=float(values.mean()) if count else None, count=count,
                          missing=int(len(cohort) - count))
            if approximate:
                warnings.append("Means use numeric interval midpoints; exact within-bin means are unavailable")
        records.append(record)
    records.sort(key=lambda record: _group_key(record["group"]))
    if kind == "difference_in_rates":
        if len(groups) != 1 or len(records) != 2:
            raise ValueError("Difference in rates requires exactly two observed cohorts on one groupBy field")
        first, second = records
        value = second["value"] - first["value"] if first["value"] is not None and second["value"] is not None else None
        records = [{"group": {}, "value": value, "count": min(first["count"], second["count"]),
                    "cohorts": records, "direction": {"minus": first["group"], "plus": second["group"]}}]
    return records, list(dict.fromkeys(warnings))


def _public(records: list[dict], grouped: bool):
    return records if grouped else records[0]["value"] if records else None


def _query(original: pd.DataFrame, protected: pd.DataFrame, query: dict, forbidden: set[str] | None = None,
           unavailable_columns: dict | None = None) -> dict:
    identifier, kind = str(query.get("id", "query")), query.get("type")
    tolerance = float(query.get("tolerance", .05))
    weight = float(query.get("weight", 1))
    minimum = int(query.get("minCohort", 1))
    if not math.isfinite(tolerance) or tolerance <= 0 or not math.isfinite(weight) or weight < 0 or minimum < 1:
        raise ValueError("Queries require positive finite tolerance, nonnegative finite weight, and minCohort >= 1")
    label = query.get("label") or (f"{kind}: {query.get('target') or 'rows'}" +
                                   (" by " + ", ".join(query.get("groupBy") or []) if query.get("groupBy") else ""))
    if query.get("comparisonUnit"):
        label += f" [{query['comparisonUnit']}; source {query['inputUnit']} converted]"
    result = {"id": identifier, "label": label, "type": kind, "original": None, "protected": None,
              "error": None, "tolerance": tolerance, "weight": weight, "pass": False,
              "issues": [], "warnings": [], "normalizedError": 1.0, "minCohort": minimum,
              "signFlip": False, "status": "implemented"}
    requested = set(query.get("groupBy") or []) | set(query.get("filter") or {}) | ({query["target"]} if query.get("target") else set())
    if requested & set(unavailable_columns or {}):
        result.update(status="unavailable", unitStatus="unverified_conversion",
                      issues=["Unit conversion is unverified for a required research field; cross-unit differences are not calculated"])
        return result
    if requested & (forbidden or set()):
        result.update(status="unavailable", issues=["Direct identifiers and free-text values are excluded from research outputs; review field roles or use supported aggregate fields"])
        return result
    try:
        _, _, original_coverage = _filter_selection(original, query.get("filter"))
        _, _, protected_coverage = _filter_selection(protected, query.get("filter"))
        result["filterCoverage"] = {"original": original_coverage, "protected": protected_coverage}
        if not original_coverage["exact"] or not protected_coverage["exact"]:
            result.update(status="unavailable", inclusionBounds={"original": [original_coverage["definite"], original_coverage["possible"]],
                          "protected": [protected_coverage["definite"], protected_coverage["possible"]]},
                          issues=["Intervals span a filter threshold: exact counts/rates are unavailable; no midpoint-derived cohort is reported"])
            return result
        before, original_warnings = _records(original, query)
        after, protected_warnings = _records(protected, query)
    except (ValueError, TypeError, KeyError) as error:
        result.update(status="unavailable", issues=[str(error)])
        return result
    grouped = bool(query.get("groupBy")) and kind not in {"correlation", "difference_in_rates"}
    result.update(original=_public(before, grouped), protected=_public(after, grouped),
                  originalDetails=before, protectedDetails=after,
                  warnings=list(dict.fromkeys(original_warnings + protected_warnings)))
    before_map = {_group_key(record["group"]): record for record in before}
    after_map = {_group_key(record["group"]): record for record in after}
    errors = []
    for key in sorted(before_map.keys() | after_map.keys()):
        left, right = before_map.get(key), after_map.get(key)
        if left is None or right is None:
            result["issues"].append("A cohort is absent on one side of the comparison")
            continue
        if left["count"] < minimum or right["count"] < minimum:
            result["issues"].append(f"A cohort is below the required minimum of {minimum}")
        if left["value"] is None or right["value"] is None:
            result["issues"].append("A research estimate is undefined or has no valid observations")
            continue
        errors.append(abs(float(right["value"]) - float(left["value"])))
        if kind in {"correlation", "difference_in_rates"} and float(left["value"]) * float(right["value"]) < 0:
            result["signFlip"] = True
            result["issues"].append("The direction of the research association reversed")
        if "direction" in left and left["direction"] != right.get("direction"):
            result["issues"].append("The rate-difference cohort definitions changed")
        if left.get("ci95") and right.get("ci95"):
            separated = left["ci95"][1] < right["ci95"][0] or right["ci95"][1] < left["ci95"][0]
            if separated:
                result["warnings"].append("Approximate Wilson intervals for a rate cohort no longer overlap")
    if not before or not after:
        result["issues"].append("The query selected an empty cohort")
    result["issues"] = list(dict.fromkeys(result["issues"]))
    if errors:
        result["error"] = max(errors)
    if result["error"] is not None and not result["issues"]:
        result["normalizedError"] = min(1.0, result["error"] / tolerance)
        result["pass"] = result["error"] <= tolerance + 1e-12
    return result


def _tv(left: pd.Series, right: pd.Series):
    a, b = left.dropna().astype(str), right.dropna().astype(str)
    if not len(a) or not len(b):
        return None
    p, q = a.value_counts(normalize=True), b.value_counts(normalize=True)
    labels = p.index.union(q.index)
    return float(.5 * sum(abs(float(p.get(label, 0)) - float(q.get(label, 0))) for label in labels))


def _common_domain(left: pd.Series, right: pd.Series, field: dict) -> dict:
    """Align only validated interval/prefix rules or a declared category map."""
    missing = {"status": "unavailable", "domain": None, "tv": None,
               "limitation": "No validated common semantic domain; lexical category distance is encoding-only, not scientific damage"}
    if not right.notna().any() or not left.notna().any():
        return {**missing, "limitation": "One side has no nonmissing observations"}
    declaration = field.get("generalization") or {}
    kind, params = declaration.get("type"), declaration.get("params") or {}
    a, b = left.copy(), right.copy()
    basis = "unchanged category vocabulary"
    domain = "original category labels"
    if field.get("dtype") in {"integer", "float"}:
        bands = [_BAND.fullmatch(value) for value in right.dropna() if isinstance(value, str) and _BAND.fullmatch(value)]
        if not bands:
            return {**missing, "limitation": "No numeric interval hierarchy; numeric histograms use shared edges and native measurements"}
        bounds = [tuple(map(float, match.groups())) for match in bands]
        widths = [high - low for low, high in bounds]
        width = float(params.get("width", widths[0]))
        origin = float(params.get("origin", bounds[0][0] % width)) if width > 0 else 0
        if width <= 0 or any(abs(value - width) > 1e-8 for value in widths) or any(abs((low - origin) / width - round((low - origin) / width)) > 1e-8 for low, _ in bounds):
            return {**missing, "limitation": "Observed intervals do not form one consistent declared-width partition"}
        def map_numeric(value):
            if pd.isna(value):
                return None
            interval = _BAND.fullmatch(value) if isinstance(value, str) else None
            if interval:
                low, high = map(float, interval.groups())
                start = origin + math.floor((low - origin) / width + 1e-10) * width
                if high <= low or high > start + width + 1e-8:
                    raise ValueError("A source interval crosses the common hierarchy")
            else:
                numeric = float(value)
                if not math.isfinite(numeric):
                    raise ValueError("Non-finite interval-domain value")
                start = origin + math.floor((numeric - origin) / width) * width
            return f"[{start:g},{start + width:g})"
        try:
            a, b = left.map(map_numeric), right.map(map_numeric)
        except (ValueError, TypeError, OverflowError):
            return {**missing, "limitation": "Values cannot be mapped wholly into the common numeric interval partition"}
        domain, basis = f"half-open numeric intervals of width {width:g}, origin {origin:g}", "declared interval hierarchy" if kind in {"band", "numeric_band"} else "validated partition inferred from released interval labels; recipe origin unverified"
    elif kind in {"category_map", "hierarchy"} and isinstance(params.get("mapping"), dict):
        mapping = {str(key): str(value) for key, value in params["mapping"].items()}
        labels = set(mapping.values())
        if any(str(value) not in mapping for value in left.dropna()) or any(str(value) not in labels for value in right.dropna()):
            return {**missing, "limitation": "Declared hierarchy does not cover all source/released labels"}
        a = left.map(lambda value: None if pd.isna(value) else mapping[str(value)])
        b = right.map(lambda value: None if pd.isna(value) else str(value))
        domain, basis = "declared category hierarchy", "user-declared mapping; no inferred semantic similarity"
    elif re.search(r"zip|postal|postcode", field["name"], re.I) and left.dropna().astype(str).str.fullmatch(r"\d+").all() and right.dropna().astype(str).str.fullmatch(r"\d+").all():
        lengths = right.dropna().astype(str).str.len().unique()
        length = int(params.get("length", lengths[0]))
        if len(lengths) != 1 or length != lengths[0] or left.dropna().astype(str).str.len().min() < length:
            return missing
        a = left.map(lambda value: None if pd.isna(value) else str(value)[:length])
        b = right.map(lambda value: None if pd.isna(value) else str(value))
        domain, basis = f"ZIP/postal prefix, {length} characters", "declared prefix hierarchy" if kind in {"zip_prefix", "prefix"} else "validated uniform postal prefix inferred from labels; recipe unverified"
    elif field.get("dtype") == "date" and right.dropna().astype(str).str.fullmatch(r"\d{4}(?:-\d{2})?").all():
        lengths = right.dropna().astype(str).str.len().unique()
        if len(lengths) != 1:
            return missing
        precision = int(lengths[0])
        a = left.map(lambda value: None if pd.isna(value) else str(value)[:precision])
        b = right.map(lambda value: None if pd.isna(value) else str(value))
        domain, basis = "year" if precision == 4 else "year-month", "validated date prefix; chronology and trajectories remain unassessed"
    elif not set(right.dropna().astype(str)) <= set(left.dropna().astype(str)):
        return missing
    counts = pd.concat([a.dropna().astype(str), b.dropna().astype(str)]).value_counts()
    labels = counts.index[:20].tolist()
    def chart(values):
        distribution = values.dropna().astype(str).value_counts()
        output = [{"label": label, "count": int(distribution.get(label, 0)),
                   "fraction": int(distribution.get(label, 0)) / len(values) if len(values) else 0.0} for label in labels]
        if len(counts) > 20:
            tail = int(distribution[~distribution.index.isin(labels)].sum())
            output.append({"label": "Other common-domain categories", "count": tail,
                           "fraction": tail / len(values) if len(values) else 0.0, "tail": True})
        return output
    return {"status": "implemented", "domain": domain, "basis": basis, "tv": _tv(a, b),
            "original": chart(a), "protected": chart(b),
            "definition": "Total variation over nonmissing frequencies after both tables are mapped into the stated common domain",
            "limitations": ["Mapping aligns the named hierarchy; it does not establish preservation of finer-grained or future analyses", "Missingness and retention are reported separately"]}


def _distributions(original: pd.DataFrame, protected: pd.DataFrame, schema: list[dict], unavailable_columns=None):
    results = []
    for field in schema:
        column = field["name"]
        if field.get("role") == "direct_identifier" or column not in original:
            continue
        left = original[column]
        right = protected[column] if column in protected else pd.Series(dtype=object)
        item = {"column": column, "unit": field.get("unit"), "missing_original": int(left.isna().sum()),
                "missing_protected": int(right.isna().sum()), "dropped": column not in protected,
                "total_original": len(left), "total_protected": len(right)}
        if column in (unavailable_columns or {}):
            item.update(type="numeric", status="unavailable", original=[], protected=[], mean_original=None,
                        mean_protected=None, unitComparison=unavailable_columns[column],
                        semanticComparison={"status": "unavailable", "tv": None, "limitation": "Units are not verified comparable"})
            results.append(item)
            continue
        if field.get("dtype") != "text":
            item["lexicalTv"] = _tv(left, right)
            item["lexicalTvDefinition"] = "Total variation of nonmissing literal encodings; domain changes can inflate it without measuring scientific harm"
            item["semanticComparison"] = _common_domain(left, right, field)
        if field.get("dtype") == "text":
            def text_mass(values):
                count = int(values.notna().sum())
                return [{"label": "Nonempty text (content withheld)", "count": count,
                         "fraction": count / len(values) if len(values) else 0.0}]
            item.update(type="text", original=text_mass(left), protected=text_mass(right),
                        limitation="Free-text content is not exported in aggregate diagnostics; semantic preservation is untested")
        elif field.get("dtype") in {"integer", "float"}:
            a, _ = _numeric(left)
            b, approximation = _numeric(right)
            joined = pd.concat([a.dropna(), b.dropna()])
            if len(joined):
                low, high = float(joined.min()), float(joined.max())
                edges = np.linspace(low - .5, high + .5, 11) if low == high else np.linspace(low, high, 11)
                def histogram(values):
                    counts, _ = np.histogram(values.dropna(), bins=edges)
                    return [{"label": f"{edges[index]:.3g}–{edges[index+1]:.3g}",
                             "lower": float(edges[index]), "upper": float(edges[index+1]),
                             "count": int(count), "fraction": int(count) / len(values) if len(values) else 0.0}
                            for index, count in enumerate(counts)]
                before, after = histogram(a), histogram(b)
            else:
                before = after = []
            item.update(type="numeric", original=before, protected=after,
                        mean_original=float(a.mean()) if a.notna().any() else None,
                        mean_protected=float(b.mean()) if b.notna().any() else None,
                        midpoint_approximation=approximation,
                        unparseable_original=int(a.isna().sum() - left.isna().sum()),
                        unparseable_protected=int(b.isna().sum() - right.isna().sum()))
        else:
            # Combined top-20 vocabulary with an explicit tail prevents chart
            # truncation from hiding mass. Missingness remains separate.
            a, b = left.dropna().map(str), right.dropna().map(str)
            combined = pd.concat([a, b]).value_counts()
            labels = combined.index[:20].tolist()
            def categorical(values, total):
                counts = values.value_counts()
                entries = [{"label": label, "count": int(counts.get(label, 0)),
                            "fraction": int(counts.get(label, 0)) / total if total else 0.0} for label in labels]
                other = int(counts[~counts.index.isin(labels)].sum())
                if len(combined) > 20:
                    entries.append({"label": "Other categories (combined tail)", "count": other,
                                    "fraction": other / total if total else 0.0, "tail": True})
                return entries
            item.update(type="categorical", original=categorical(a, len(left)), protected=categorical(b, len(right)),
                        categories_total=len(combined), categories_shown=min(20, len(combined)))
        results.append(item)
    return results


def _correlations(original: pd.DataFrame, protected: pd.DataFrame, schema: list[dict], unavailable_columns=None):
    columns = []
    encoded = {}
    for field in schema:
        column = field["name"]
        if column not in original or field.get("role") == "direct_identifier":
            continue
        if field.get("dtype") in {"integer", "float", "boolean"}:
            a, _ = _numeric(original[column])
            b, approximate = _numeric(protected[column]) if column in protected else (pd.Series(dtype=float), False)
        else:
            try:
                a = _binary(original[column])
                b = _binary(protected[column]) if column in protected else pd.Series(dtype=float)
                approximate = False
            except ValueError:
                continue
        if a.notna().any():
            columns.append(column)
            encoded[column] = a, b, approximate
    output = []
    for x, y in itertools.combinations(columns[:12], 2):
        if {x, y} & set(unavailable_columns or {}):
            output.append({"x": x, "y": y, "original": None, "protected": None, "sign_flip": False,
                           "status": "unavailable", "reason": "Required unit conversion is unverified"})
            continue
        values = []
        counts = []
        for side in (0, 1):
            pair = pd.concat([encoded[x][side].rename("x"), encoded[y][side].rename("y")], axis=1).dropna()
            counts.append(len(pair))
            values.append(float(pair.x.corr(pair.y)) if len(pair) > 1 and pair.x.nunique() > 1 and pair.y.nunique() > 1 else None)
        output.append({"x": x, "y": y, "original": values[0], "protected": values[1],
                       "sign_flip": values[0] is not None and values[1] is not None and values[0] * values[1] < 0,
                       "n_original": counts[0], "n_protected": counts[1],
                       "midpoint_approximation": encoded[x][2] or encoded[y][2]})
    return output


def _subgroups(original, protected, schema, workload, lineage, forbidden, subgroup_by=None, unavailable_columns=None):
    """Predeclared workload cohorts; counts stay descriptive at low support."""
    specifications = []
    for query in workload:
        groups = query.get("groupBy") or []
        if query.get("type") != "correlation" and groups:
            specification = (tuple(groups), int(query.get("minCohort", 5)))
            if specification not in specifications:
                specifications.append(specification)
    if subgroup_by:
        specifications.append((tuple(subgroup_by), max([int(query.get("minCohort", 5)) for query in workload] or [5])))
    output, skipped = [], []
    for columns, minimum in specifications[:8]:
        if set(columns) & forbidden or any(column not in original for column in columns):
            skipped.append({"columns": list(columns), "reason": "Unavailable, identifier or free-text subgroup field"})
            continue
        original_groups = original.groupby(list(columns), dropna=False, sort=False, observed=True).indices
        for keys, offsets in original_groups.items():
            if len(output) >= 64:
                break
            keys = keys if isinstance(keys, tuple) else (keys,)
            group = {column: _scalar(value) for column, value in zip(columns, keys)}
            source = original.iloc[offsets]
            source_mask = pd.Series(False, index=range(len(original)))
            source_mask.iloc[offsets] = True
            observed = None
            if all(column in protected for column in columns):
                observed = pd.Series(True, index=protected.index)
                for column, value in group.items():
                    observed &= protected[column].map(lambda actual: _equivalent(actual, value))
            if lineage is not None:
                retained_mask = source_mask.iloc[lineage].to_numpy()
                release = protected.iloc[np.flatnonzero(retained_mask)]
                retained = len(release)
                retention = retained / len(source)
                alignment = "owner_lineage; never attacker knowledge"
            else:
                release = protected.loc[observed] if observed is not None else protected.iloc[:0]
                retained = retention = None
                alignment = "unpaired observed cohort labels; count changes are not verified retention"
            sufficient = len(source) >= minimum and len(release) >= minimum
            item = {"group": group, "status": "implemented" if sufficient else "insufficient_evidence",
                    "minSupport": minimum, "countOriginal": len(source), "countProtected": len(release),
                    "observedCountProtected": int(observed.sum()) if observed is not None else None,
                    "cohortCountDifference": int(observed.sum()) - len(source) if observed is not None else None,
                    "retainedCount": retained, "retention": retention, "alignment": alignment,
                    "missingness": [], "queries": [], "correlations": []}
            for field in schema:
                column = field["name"]
                if column in forbidden or column not in source:
                    continue
                before = float(source[column].isna().mean())
                after = float(release[column].isna().mean()) if column in release and len(release) else None
                item["missingness"].append({"column": column, "original": before, "protected": after,
                                            "delta": after - before if after is not None else None,
                                            "dropped": column not in release})
            if sufficient:
                for query in workload:
                    try:
                        _, _, source_coverage = _filter_selection(source, query.get("filter"))
                        if source_coverage["possible"] == 0:
                            continue  # This declared task does not cover the cohort.
                    except (ValueError, TypeError):
                        pass
                    compared = _query(source, release, query, forbidden, unavailable_columns)
                    item["queries"].append({key: compared[key] for key in ("id", "type", "original", "protected", "error", "tolerance", "pass", "issues", "status", "normalizedError", "signFlip")})
                    if query.get("type") == "correlation":
                        item["correlations"].append({"queryId": compared["id"], "original": compared["original"],
                                                     "protected": compared["protected"], "sign_flip": compared["signFlip"]})
            else:
                item["reason"] = "One side has fewer observations than the declared support threshold; research fidelity is not assessed"
            output.append(item)
        if len(original_groups) > 64 or len(output) >= 64:
            skipped.append({"columns": list(columns), "reason": "64-cohort diagnostic cap; unreported cohorts are unassessed"})
    retention_entries = [item for item in output if item["retention"] is not None]
    query_entries = [(item, query) for item in output for query in item["queries"] if query["status"] == "implemented"]
    missing_entries = [(item, change) for item in output if item["status"] == "implemented" for change in item["missingness"] if change["delta"] is not None]
    worst_retention = min(retention_entries, key=lambda item: item["retention"]) if retention_entries else None
    worst_query = max(query_entries, key=lambda pair: pair[1]["normalizedError"]) if query_entries else None
    worst_missing = max(missing_entries, key=lambda pair: abs(pair[1]["delta"])) if missing_entries else None
    summary = {"assessed": sum(item["status"] == "implemented" for item in output),
               "insufficientEvidence": sum(item["status"] != "implemented" for item in output),
               "worstRetention": {"group": worst_retention["group"], "retention": worst_retention["retention"],
                                  "countOriginal": worst_retention["countOriginal"], "retainedCount": worst_retention["retainedCount"],
                                  "status": worst_retention["status"]} if worst_retention else None,
               "worstQuery": {"group": worst_query[0]["group"], **worst_query[1]} if worst_query else None,
               "worstMissingness": {"group": worst_missing[0]["group"], **worst_missing[1]} if worst_missing else None,
               "unavailableQueries": sum(query["status"] != "implemented" for item in output for query in item["queries"]),
               "coverage": {"cap": 64, "evaluated": len(output), "skipped": skipped,
                            "definition": "Cohorts declared in workload groupBy, with caller-supplied subgroup_by optional. No undisclosed population-wide worst-case claim."}}
    return output, summary


def _canonical_units(original, protected, schema, workload):
    """Require explicit protected-unit and known-conversion metadata."""
    source, fields, queries = original.copy(deep=False), [dict(field) for field in schema], []
    unavailable, conversions, comparisons = {}, {}, []
    for field in fields:
        column = field["name"]
        unit = str(field.get("unit", "")).lower()
        if column not in protected or unit not in {"lb", "lbs", "pounds"}:
            continue
        bands = protected[column].dropna().map(lambda value: isinstance(value, str) and bool(_BAND.fullmatch(value))).any()
        declared = protected.attrs.get("units", {}).get(column)
        if not bands and declared != "kg":
            continue
        conversion = protected.attrs.get("unit_conversions", {}).get(column, {})
        verified = (declared == "kg" and conversion.get("verified") is True and
                    conversion.get("from") == "lb" and conversion.get("to") == "kg" and
                    isinstance(conversion.get("factor"), (int, float)) and abs(conversion["factor"] - .45359237) < 1e-12)
        if not verified:
            entry = {"column": column, "status": "unavailable", "originalUnit": unit, "protectedUnit": declared,
                     "reason": "Pound source and interval output require verified lb-to-kg provenance; external units are not inferred from labels"}
            unavailable[column] = entry
            comparisons.append(entry)
            continue
        values = pd.to_numeric(original[column], errors="coerce")
        if values.isna().sum() != original[column].isna().sum():
            entry = {"column": column, "status": "unavailable", "reason": "Source unit normalization requires actual numeric measurements"}
            unavailable[column] = entry
            comparisons.append(entry)
            continue
        factor = .45359237
        source[column] = values * factor
        field["unit"] = "kg"
        conversions[column] = factor
        comparisons.append({"column": column, "status": "implemented", "originalUnit": unit,
                            "protectedUnit": "kg", "comparisonUnit": "kg", "factor": factor,
                            "basis": "Explicit verified protected-unit conversion metadata"})
    for query in workload:
        adjusted = {**query, "filter": dict(query.get("filter") or {})}
        for column, factor in conversions.items():
            if column in adjusted["filter"]:
                condition = adjusted["filter"][column]
                def scale(value):
                    if value is None:
                        return None
                    if isinstance(value, list):
                        return [scale(item) for item in value]
                    return float(value) * factor
                adjusted["filter"][column] = {op: scale(value) for op, value in condition.items()} if isinstance(condition, dict) else scale(condition)
            if adjusted.get("target") == column and adjusted.get("type") == "group_mean":
                adjusted["tolerance"] = float(adjusted.get("tolerance", .05)) * factor
                adjusted["inputTolerance"] = query.get("tolerance", .05)
                adjusted["inputUnit"] = "lb"
                adjusted["comparisonUnit"] = "kg"
        queries.append(adjusted)
    return source, fields, queries, unavailable, comparisons


def evaluate(original: pd.DataFrame, protected: pd.DataFrame, schema: list[dict],
             workload: list[dict], lineage: list[int] | None = None,
             subgroup_by: list[str] | None = None) -> dict:
    """Compare actual declared queries; no row correspondence is assumed.

    Loss is weighted mean min(1, max-cohort absolute error / declared tolerance).
    Unavailable required queries make composite loss unavailable; undefined
    estimates and failed cohort requirements contribute 1.
    Query tolerance and cohort checks remain separate hard pass/fail constraints.
    """
    if not original.columns.is_unique or not protected.columns.is_unique:
        raise ValueError("Duplicate column names are not supported")
    if lineage is not None:
        if (len(lineage) != len(protected) or len(set(lineage)) != len(lineage)
                or any(not isinstance(index, (int, np.integer)) or isinstance(index, bool)
                       or index < 0 or index >= len(original) for index in lineage)):
            raise ValueError("Lineage must contain one unique valid original iloc offset for each released row")
    original, schema, workload, unavailable_units, unit_comparisons = _canonical_units(original, protected, schema, workload)
    forbidden = {field["name"] for field in schema if field.get("role") == "direct_identifier" or field.get("dtype") == "text"}
    queries = [_query(original, protected, query, forbidden, unavailable_units) for query in workload]
    for query, specification in zip(queries, workload):
        if specification.get("comparisonUnit"):
            query.update(comparisonUnit=specification["comparisonUnit"], inputUnit=specification["inputUnit"], inputTolerance=specification["inputTolerance"])
    denominator = sum(query["weight"] for query in queries)
    complete = all(query["status"] == "implemented" for query in queries if query["weight"] > 0)
    loss = sum(query["weight"] * query["normalizedError"] for query in queries) / denominator if denominator and complete else None
    distributions = _distributions(original, protected, schema, unavailable_units)
    subgroups, worst_subgroup = _subgroups(original, protected, schema, workload, lineage, forbidden, subgroup_by, unavailable_units)
    warnings = []
    if lineage is None:
        warnings.append("Unpaired comparison: query and distribution differences are aggregate, not individual patient changes")
    if not queries or not denominator:
        warnings.append("No positively weighted research workload: scientific-query loss is unavailable")
    if not complete:
        warnings.append("A required research query is unavailable; composite workload loss is unavailable rather than imputed")
    if unavailable_units:
        warnings.append("Pound-source versus interval-output units are unverified; affected means, filters, histograms and correlations are unavailable")
    if len(original) != len(protected):
        warnings.append("Row-count change can induce selection bias; analyses compare the full original and actual released cohorts")
    if any(item.get("midpoint_approximation") for item in distributions):
        warnings.append("Numeric bands are decoded by interval midpoints; exact within-bin research values are unavailable")
    if len([field for field in schema if field.get("dtype") in {"integer", "float", "boolean"}]) > 12:
        warnings.append("Pairwise diagnostic matrix is capped at 12 numeric/binary columns; declared queries are still evaluated")
    warnings.append("Wilson rate intervals are approximate binomial intervals, not evidence of clinical validity or privacy")
    return {"loss": loss, "queries": queries, "distributions": distributions,
            "correlations": _correlations(original, protected, schema, unavailable_units), "warnings": warnings,
            "loss_definition": "weighted mean min(1, max-cohort absolute error / declared tolerance); unavailable required query makes loss unavailable; cohort-failed query loss=1",
            "subgroups": subgroups, "worstSubgroup": worst_subgroup, "workloadCoverageComplete": complete,
            "unitComparisons": unit_comparisons,
            "alignment": "verified" if lineage is not None else "unpaired",
            "rows_original": len(original), "rows_protected": len(protected)}
