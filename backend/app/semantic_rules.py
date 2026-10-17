"""Versioned semantic hypotheses routed to finite-table, deterministic evidence.

Recognizing a field never establishes an attack. This registry deliberately
retains unsupported categories rather than turning absent prerequisites into a
zero-risk score. All measurements use the current release, not source values.
"""
from __future__ import annotations

import copy
import math
import re

import numpy as np
import pandas as pd

from . import datasets

VERSION = "1.0"
CATALOG = [
    ("direct_identifier_disclosure", "Direct identifier disclosure", "direct"),
    ("sample_singling_out", "Sample singling out", "partition"),
    ("population_uniqueness", "Population uniqueness estimation", "population"),
    ("record_linkage", "Record linkage", "auxiliary"),
    ("sensitive_attribute_inference", "Sensitive-attribute inference", "conditional"),
    ("membership_inference", "Membership inference", "membership"),
    ("geographic_linkage", "Geographic linkage hypothesis", "geography"),
    ("temporal_linkage", "Temporal linkage hypothesis", "time"),
    ("spatiotemporal_linkage", "Event, place and demographic distinguishability", "spatiotemporal"),
    ("longitudinal_identification", "Longitudinal sequence identification", "sequence"),
    ("persistent_pseudonym_linkage", "Persistent pseudonym linkage", "pseudonym"),
    ("weak_hash_reversal", "Weak pseudonym or hash reversal", "hash"),
    ("cross_release_composition", "Cross-release composition", "composition"),
    ("small_cell_disclosure", "Small-cell disclosure", "small_cell"),
    ("sensitive_group_homogeneity", "Sensitive-group homogeneity", "homogeneity"),
    ("aggregate_differencing", "Aggregate-query differencing", "aggregate"),
    ("aggregate_reconstruction", "Aggregate reconstruction", "aggregate"),
    ("synthetic_leakage", "Synthetic-data information leakage", "synthetic"),
    ("free_text_identifiers", "Residual identifiers in free text", "text"),
    ("embedded_metadata", "Embedded metadata disclosure", "metadata"),
    ("household_disclosure", "Relationship or household disclosure", "relationship"),
    ("genomic_distinguishability", "Genomic and familial distinguishability", "genetics"),
    ("rare_event_disclosure", "Rare-event disclosure", "rare"),
    ("repeated_entity_leakage", "Repeated-entity or record-joining leakage", "repeated"),
]


def registry():
    """The catalog describes prerequisites and implementation, not certification."""
    return {"version": VERSION, "rules": [
        {"id": attack, "title": title, "test": test,
         "releaseRepresentation": "tabular row release",
         "relationships": "same released record; repeated subjects are not presumed independent",
         "requiredSemanticClasses": _classes(test),
         "prerequisites": _prerequisite(test),
         "evidenceReference": "PRISM finite-table definitions; sample measurements are not identity probabilities"}
        for attack, title, test in CATALOG]}


def _classes(test):
    return {
        "direct": ["identity.*"], "partition": ["declared quasi-identifiers or contextual demographic fields"],
        "geography": ["geography.* excluding anatomical_location"], "time": ["time.* excluding age and duration"],
        "spatiotemporal": ["event date/time", "physical geography or facility", "optional demographics"],
        "conditional": ["quasi-identifiers", "categorical sensitive target"],
        "homogeneity": ["quasi-identifiers", "categorical sensitive target"],
        "text": ["free_text.*"], "pseudonym": ["persistent_pseudonym", "hashed_identifier"],
        "hash": ["hashed_identifier", "cryptographic_hash"], "sequence": ["event_sequence", "movement_trace", "geographic_trajectory"],
        "genetics": ["genetics.*"], "relationship": ["relationships.*"],
        "metadata": ["technical.*", "embedded metadata container"],
        "repeated": ["declared entity key"], "rare": ["categorical sensitive event"],
    }.get(test, ["An additional release, population, query history or model artifact is required"])


def _prerequisite(test):
    return {
        "population": "A defensible population sampling model and population reference counts.",
        "auxiliary": "A separate auxiliary reference table, matching protocol and verified ground truth.",
        "membership": "A membership attack artifact, disjoint controls and a specified adversary.",
        "sequence": "Verified repeated-subject identity, ordered events and a sequence matching protocol.",
        "composition": "At least two releases, overlap/lineage and a defined adversary.",
        "aggregate": "A history of overlapping query outputs and their release mechanism.",
        "synthetic": "A generating model or synthetic output with disjoint training and control records.",
        "metadata": "The original document/container, not only parsed table cells.",
        "relationship": "Verified relationship edges and a relation-specific inference experiment.",
        "genetics": "Validated genomic/familial representation and a domain-specific attack protocol.",
        "hash": "The pseudonym/hash mechanism, salt/key policy and a defensible candidate dictionary.",
        "text": "Structured residual-pattern scanning only; exhaustive entity recognition is not provided.",
    }.get(test, "Current released columns, finite-table exact values and reviewed field meaning.")


def _attacker_needs(test, columns):
    """Separate an adversary's knowledge from this diagnostic's inputs."""
    known = ", ".join(columns) if columns else "the contributing fields"
    return {
        "direct": "Access to the released table is enough to read a remaining direct identifier. No auxiliary matching database is required.",
        "partition": f"Correct outside knowledge of a target's values for {known}, compatible encodings and knowledge that the target appears in this release. Unique groups alone do not establish those prerequisites.",
        "small_cell": f"Knowledge of which small group a target belongs to on {known}, plus target membership. A small group is descriptive evidence, not a verified identification.",
        "geography": f"Outside knowledge of the target's location or facility on {known}, matching geographic codes and release membership. No external geographic records were tested.",
        "time": f"Outside knowledge of the target's dates or event times on {known}, compatible time precision and release membership. No appointment calendar was supplied.",
        "spatiotemporal": f"External information about the target's appointment/event date, facility or location and demographic values on {known}, with compatible precision and known membership. PRISM counted current-table groups; it did not obtain or test that outside information.",
        "conditional": f"Known group-defining values on {known} and knowledge of target membership, under the displayed majority-guessing assumptions. In-sample prediction is not a tested incremental disclosure attack.",
        "homogeneity": f"Knowledge that the target belongs to a group defined by {known}. Homogeneous released values can reveal the group's sensitive value under those membership assumptions.",
        "text": "Access to retained narrative cells can expose literal contact or identifier patterns directly. Contextual names and events may need outside background knowledge; the bounded pattern scan does not cover them exhaustively.",
        "pseudonym": "Another record or release carrying the same stable token or a compatible mapping. Equality joins can associate records without reversing the token to a real identity.",
        "rare": "Outside knowledge of a target's rare condition or event, compatible dates or group attributes and target membership. Rare-category counts do not show that this outside knowledge exists.",
        "repeated": "Access to repeated entity keys or a trustworthy cross-record association. Real-world identity still requires an identifying mapping or outside information.",
        "auxiliary": "Correct target-known attributes, compatible public transformation rules and known source membership for the simulated exact-match experiment. A real external attack additionally requires an independent auxiliary table and validation.",
        "composition": "At least one additional overlapping release and a compatible join key or matching attributes. Single-release measurements do not test this combination.",
    }.get(test, _prerequisite(test))


def _partition(frame, columns):
    n = len(frame)
    if not n:
        return {"rows": 0, "uniqueRows": 0, "uniqueFraction": 0.0, "minimumGroupSize": 0,
                "distinctGroups": 0, "rowsInGroupsBelowFive": 0, "conditionalRowEntropyBits": 0.0}
    if not columns:
        counts = np.array([n], dtype=int)
    else:
        codes = np.column_stack([pd.factorize(frame[c], sort=False, use_na_sentinel=False)[0] for c in columns])
        _, counts = np.unique(codes, axis=0, return_counts=True)
    return {"rows": n, "uniqueRows": int(np.sum(counts == 1)),
            "uniqueFraction": float(np.sum(counts == 1) / n), "minimumGroupSize": int(counts.min()),
            "distinctGroups": int(len(counts)), "rowsInGroupsBelowFive": int(counts[counts < 5].sum()),
            "conditionalRowEntropyBits": float(np.sum(counts / n * np.log2(counts))),
            "uniformPresentTargetGuessing": float(len(counts) / n)}


def _conditional(frame, qi, secrets):
    """In-sample conditional entropy/homogeneity; never a held-out attack claim."""
    if not qi or not secrets or not len(frame):
        return None
    codes = np.column_stack([pd.factorize(frame[c], sort=False, use_na_sentinel=False)[0] for c in qi])
    _, inverse = np.unique(codes, axis=0, return_inverse=True)
    results = []
    for column in secrets:
        values = frame[column]
        if pd.api.types.is_numeric_dtype(values) and values.nunique(dropna=False) > 30:
            continue
        y = pd.factorize(values, sort=False, use_na_sentinel=False)[0]
        global_counts = np.bincount(y)
        baseline = float(global_counts.max() / len(y))
        # Sparse group/category counts avoid O(rows * distinct-groups) scans
        # and a dense cross-product on high-cardinality clinical text.
        cells = pd.DataFrame({"group": inverse, "value": y}).value_counts(sort=False).rename("count").reset_index()
        sizes = cells.groupby("group")["count"].sum()
        diversity = cells.groupby("group")["value"].count()
        probabilities = cells["count"].to_numpy() / cells["group"].map(sizes).to_numpy()
        entropy = float(-np.sum(cells["count"].to_numpy() / len(y) * np.log2(probabilities)))
        correct = int(cells.groupby("group")["count"].max().sum())
        homogeneous = int(sizes[diversity == 1].sum())
        min_diversity = int(diversity.min())
        accuracy = correct / len(y)
        results.append({"column": column, "conditionalEntropyBits": entropy,
                        "homogeneousRows": homogeneous, "homogeneousFraction": homogeneous / len(y),
                        "minimumDistinctSensitiveValues": min_diversity,
                        "inSampleMajorityAccuracy": accuracy, "globalMajorityBaseline": baseline,
                        "relativeImprovementOverBaseline": (accuracy - baseline) / baseline if baseline else None})
    return results or None


def lineage(semantic, frame, steps=None, *, external=False):
    """Keep original meaning; derive representation solely from actual output."""
    fields = copy.deepcopy((semantic or {}).get("fields", []))
    for field in fields:
        column = field["column"]
        active = column in frame.columns
        applied = [copy.deepcopy(s) for s in (steps or []) if column in s.get("columns", [])]
        history = field.setdefault("lineage", {})
        history.setdefault("originalMeaning", field.get("primaryType", "unknown_data_meaning"))
        history["transformations"] = applied
        history["active"] = active
        history["mechanismKnown"] = not external
        props = field.setdefault("properties", {})
        if not active:
            representation, granularity = "removed", "suppressed"
        elif external:
            representation, granularity = str(frame[column].dtype), "unknown"
        else:
            representation, granularity = props.get("representation", str(frame[column].dtype)), props.get("granularity", "exact")
            for step in applied:
                method = step["method"]
                if method == "band":
                    representation, granularity = "numeric interval", "bucketed"
                elif method == "centered_interval":
                    representation, granularity = "recoverable centered integer interval", "exact"
                elif method == "centered_interval":
                    representation, granularity = "user-centered interval (midpoint recoverable)", "generalized"
                elif method == "round":
                    representation, granularity = "rounded numeric", "rounded"
                elif method in {"date_generalize", "zip_prefix", "rare_group", "top_bottom"}:
                    representation, granularity = method, "generalized"
                elif method in {"suppress_cells", "mask", "redact"}:
                    representation, granularity = method, "suppressed"
                elif method == "pseudonymize":
                    representation, granularity = "persistent pseudonym", "exact"
                elif method in {"noise", "date_shift", "permute"}:
                    representation, granularity = method, "modified"
        history.update(currentRepresentation=representation, granularity=granularity)
        props.update(representation=representation, granularity=granularity)
    return fields


def evaluate(frame, semantic, schema, qi, sensitive, *, steps=None, external=False, context=None):
    fields = lineage(semantic, frame, steps, external=external)
    by_name = {field["column"]: field for field in fields if field["column"] in frame.columns}
    profile = datasets.profile(frame)
    normalized = lambda c: re.sub(r"[^a-z0-9]+", "_", c.lower()).strip("_")
    def select(families=(), types=(), patterns=()):
        selected = []
        for column in frame.columns:
            field = by_name.get(column, {})
            meanings = [{"primaryType": field.get("primaryType"), "family": field.get("family")}] + field.get("alternatives", [])
            if (any(meaning.get("family") in families or meaning.get("primaryType") in types for meaning in meanings)
                    or bool(set(field.get("families", [])) & set(families))
                    or any(re.search(p, normalized(column)) for p in patterns)):
                selected.append(column)
        return selected
    direct = sorted({c["name"] for c in profile if c["role"] == "direct_identifier"}
                    | {c["name"] for c in schema if c["role"] == "direct_identifier" and c["name"] in frame.columns}
                    | {c for c, field in by_name.items() if "direct_identifier" in field.get("privacyRoles", [])}
                    | set(select(types=("legal_name", "patient_identifier", "email_address", "telephone_number", "government_identifier"))))
    geo = select(families=("geography",), types=("postal_code", "postal_prefix", "healthcare_facility", "recruitment_site"),
                 patterns=(r"(^|_)(zip|postal|hospital|hosp_site|facility)(_|$)",))
    # Anatomical locations are never treated as physical-geography evidence.
    geo = [c for c in geo if by_name.get(c, {}).get("primaryType") != "anatomical_location"]
    time = select(families=("time",), types=("encounter_date", "date_of_birth", "appointment_time"),
                  patterns=(r"(^|_)(dos|dob|date|timestamp|visit_time)(_|$)",))
    time = [c for c in time if by_name.get(c, {}).get("primaryType") not in {"age", "duration", "relative_elapsed_time"}]
    demographic = select(families=("demographics", "physical"), types=("age", "height", "weight", "sex_gender"),
                         patterns=(r"^(age|sex|gender|ht_cm|height|weight|eye_color)$",))
    semantic_qi = list(dict.fromkeys([c for c in qi if c in frame.columns] + geo + time + demographic))[:20]
    secrets = list(dict.fromkeys([c for c in sensitive if c in frame.columns] + select(
        families=("medicine", "healthcare", "genetics"), types=("diagnosis_code", "diagnosis", "treatment_outcome"),
        patterns=(r"^(dx_code|diagnosis|mutation|tx_resp)$",))))[:10]
    partitions = {}
    def partition(columns):
        key = tuple(dict.fromkeys(columns))
        if key not in partitions:
            partitions[key] = _partition(frame, list(key))
            if (context or {}).get("membershipKnown") is not True:
                partitions[key]["uniformPresentTargetGuessing"] = None
        return partitions[key]
    conditional = _conditional(frame, semantic_qi, secrets)
    findings = []
    limits = ["Matched semantics describe attack hypotheses; finite-table uniqueness is not a probability of real-world identity disclosure.",
              "Unknown and incorrect classifications cannot disable the independent identifier profiler or declared-QI assessment.",
              "No population model, external auxiliary database, prior release, model artifact or original document container was supplied."]
    for attack, title, test in CATALOG:
        columns, measured, status = [], None, "unsupported"
        explanation = _prerequisite(test)
        severity = "Needs Assessment"
        mitigation = ["Review field meaning and release context; evaluate a concrete protective recipe before release."]
        if test == "genetics":
            columns = select(families=("genetics",), patterns=(r"^(mutation|genotype|variant|gene|genomic)",))
        elif test == "relationship":
            columns = select(families=("relationships",), patterns=(r"(household|family|parent|caregiver)",))
        elif test == "sequence":
            columns = select(types=("event_sequence", "movement_trace", "geographic_trajectory"))
        elif test == "hash":
            columns = select(types=("hashed_identifier", "cryptographic_hash"))
        elif test == "composition":
            columns = select(types=("persistent_pseudonym", "hashed_identifier", "tracking_token", "other_unique_identifier", "patient_identifier", "account_identifier", "customer_identifier"))
            columns += [column for step in (steps or []) if step.get("method") == "pseudonymize"
                        for column in step.get("columns", []) if column in frame.columns]
            columns = list(dict.fromkeys(columns))
        elif test == "metadata":
            columns = select(families=("technical",), patterns=(r"(exif|file_path|author|device|ip_address)",))
        if test == "direct":
            columns, status = direct, "implemented"
            obscured = {c for step in (steps or []) if step.get("method") in {"mask", "pseudonymize", "redact"} for c in step.get("columns", [])}
            varied = [c for c in direct if frame[c].nunique(dropna=True) > 1 and c not in obscured]
            measured = {"recognizedColumns": len(direct), "rows": len(frame),
                        "nonconstantUnobscuredColumns": len(varied),
                        "distinctNonNullValues": {c: int(frame[c].nunique(dropna=True)) for c in direct},
                        "mechanismKnown": not external}
            severity = "Severe" if varied and not external else "Moderate" if direct else "Mild"
            explanation = ("Recognized direct-identifier columns remain in the current output. Severity also considers observed distinct values and the known recipe; an identifier label alone does not establish literal identity disclosure. Masked or pseudonymous fields and unknown external mechanisms require representation review." if direct else
                           "The independent structured-name/format profiler found no recognized direct-identifier columns; this does not clear free text.")
            mitigation = ["Remove direct identifiers; consistent pseudonyms still permit association across records."]
        elif test in {"partition", "small_cell", "geography", "time", "spatiotemporal"}:
            columns = semantic_qi if test in {"partition", "small_cell"} else geo if test == "geography" else time if test == "time" else list(dict.fromkeys(time + geo + demographic))
            applicable = bool(columns) and (test != "spatiotemporal" or bool(time and geo))
            if applicable:
                status, measured = "implemented", partition(columns)
                severity = "Moderate" if measured["uniqueFraction"] > .1 or measured["rowsInGroupsBelowFive"] else "Mild"
                explanation = f"Exact-value groups on the current output contain {measured['uniqueRows']} unique rows out of {len(frame)}. This measures distinguishability, not an external linkage attack."
                mitigation = ["Try broader date precision, fixed demographic bands, validated geography levels or field removal, then compare measured utility."]
            else:
                status, severity = "not_applicable", "Mild"
                explanation = "The current release lacks the required semantic field combination; this rule did not execute."
        elif test in {"conditional", "homogeneity"}:
            columns = list(dict.fromkeys(semantic_qi + secrets))
            if conditional:
                worst = max(conditional, key=lambda item: item["homogeneousFraction"])
                status, measured = "implemented", worst
                severity = "Moderate" if worst["homogeneousFraction"] > .1 else "Mild"
                explanation = "Conditional entropy, class homogeneity and majority guessing are descriptive in-sample measurements. They do not establish incremental disclosure or a successful held-out attack."
                mitigation = ["Inspect small sensitive groups, reduce distinguishing precision and compare clinical subgroup utility."]
            else:
                status, severity = "not_applicable", "Mild"
                explanation = "No supported categorical sensitive target and conditioning fields remain. Continuous target inference was not substituted."
        elif test == "text":
            columns = select(families=("free_text", "unstructured"), types=("clinical_note", "narrative_clinical_notes"), patterns=(r"(^|_)(notes?|free_text|narrative)(_|$)",))
            hits = 0
            for column in columns:
                values = frame[column].dropna().astype(str)
                hits += int(values.str.contains(r"[^\s@]+@[^\s@]+\.[^\s@]+|\b\d{3}-\d{2}-\d{4}\b|\b\d{4}-\d{2}-\d{2}\b", regex=True).sum())
            if columns:
                status, measured = "implemented", {"columnsScanned": len(columns), "cellsWithStructuredPatterns": hits, "rows": len(frame)}
                severity = "Moderate" if hits else "Needs Assessment"
                explanation = "A deterministic email, structured government-number and ISO-date pattern scan ran on narrative cells. Names and contextual identities require additional review."
                mitigation = ["Remove narrative fields or use an explicitly reviewed entity-redaction workflow; simple patterns cannot clear clinical text."]
            else:
                status, severity = "not_applicable", "Mild"
                explanation = "No recognized narrative columns remain in this release. Unrecognized text can still contain identifiers."
        elif test == "pseudonym":
            columns = select(types=("persistent_pseudonym", "hashed_identifier"))
            columns += [s["columns"][0] for s in (steps or []) if s.get("method") == "pseudonymize" and s.get("columns") and s["columns"][0] in frame.columns]
            columns = list(dict.fromkeys(columns))
            if columns:
                status, measured = "implemented", {"persistentColumns": len(columns), "distinctValues": sum(frame[c].nunique(dropna=False) for c in columns)}
                severity = "Moderate"
                explanation = "Stable tokens remain and preserve equality joins. This is an observed association capability; no identity reversal was tested."
                mitigation = ["Remove persistent tokens from public releases or use separately governed, release-specific linkage keys."]
            else:
                status, severity = "not_applicable", "Mild"
                explanation = "No recognized persistent pseudonym remains in this release."
        elif test == "rare":
            columns = secrets
            if columns:
                counts = [frame[c].value_counts(dropna=False) for c in columns]
                rare_rows = max(int(c[c < 5].sum()) for c in counts)
                status, measured = "implemented", {"rowsInCategoriesBelowFive": rare_rows, "rows": len(frame)}
                severity = "Moderate" if rare_rows else "Mild"
                explanation = "Current sensitive categories with fewer than five records were counted. External event association was not attempted."
                mitigation = ["Inspect rare categories and exact event dates; assess justified category grouping against scientific objectives."]
            else:
                status, severity = "not_applicable", "Mild"
                explanation = "No recognized categorical sensitive event field remains."
        elif test == "repeated":
            entity = (context or {}).get("entityColumn")
            columns = [entity] if entity in frame.columns else []
            if columns:
                repeated = int((frame[entity].notna() & frame[entity].duplicated(keep=False)).sum())
                status, measured = "implemented", {"rowsWithRepeatedEntityValue": repeated,
                                                    "missingEntityRows": int(frame[entity].isna().sum()), "rows": len(frame)}
                severity = "Moderate" if repeated else "Mild"
                explanation = "Repeated values of the declared entity key were counted. Entity identity and event-sequence attacks were not inferred."
            else:
                explanation = "The current output has no declared entity key. Repeated people cannot be resolved from row similarity."
        uncertain = [{"column": column, "primaryType": by_name[column].get("primaryType", "unknown"),
                      "reviewStatus": by_name[column].get("reviewStatus", "needs_review"),
                      "alternatives": copy.deepcopy(by_name[column].get("alternatives", []))}
                     for column in columns if column in by_name and
                     (by_name[column].get("reviewStatus") == "needs_review" or by_name[column].get("alternatives")
                      or by_name[column].get("family") == "unknown")]
        if uncertain:
            explanation += " Field meaning is unresolved for " + ", ".join(item["column"] for item in uncertain) + "; these classifications activate a hypothesis, not proof of the named attack."
        findings.append({"id": "semantic-" + attack, "attackId": attack, "title": title, "status": status,
                         "severity": severity, "columns": columns, "explanation": explanation,
                         "uncertainSemantics": uncertain,
                         "attackerNeeds": _attacker_needs(test, columns), "testPrerequisites": _prerequisite(test), "measured": measured, "mitigations": mitigation,
                         "requiredSemanticClasses": _classes(test), "testId": test,
                         "utilityRisks": ["Coarsening, removal or perturbation can alter associations and subgroup estimates; compare the selected research workload."],
                         "limitations": limits[:1] + (["This category's prerequisites were not supplied; no attack was run."] if status == "unsupported" else []),
                         "sourceIds": ["S3"]})
    return {"version": VERSION, "findings": findings, "lineage": fields,
            "coverage": {"tested": sum(f["status"] == "implemented" for f in findings),
                         "needsAssessment": sum(f["status"] == "unsupported" for f in findings),
                         "notApplicable": sum(f["status"] == "not_applicable" for f in findings)},
            "baselineProfile": [{"column": c, "distinctValues": int(frame[c].nunique(dropna=False)),
                                 "distinctFraction": float(frame[c].nunique(dropna=False) / len(frame)) if len(frame) else 0,
                                 "uniqueRows": int((frame[c].value_counts(dropna=False) == 1).sum()),
                                 "uniqueFraction": float((frame[c].value_counts(dropna=False) == 1).sum() / len(frame)) if len(frame) else 0}
                                for c in frame.columns],
            "limitations": limits}
