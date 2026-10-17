"""Coverage registry, adapted from the supplied Apache-2.0 PRISM catalog.

Original attribution is retained in docs/reference-kit/{LICENSE,NOTICE}.
The source catalog's descriptions are not evidence that this engine executed an
integration: current statuses and implementation notes below are authoritative.
"""
import json
from pathlib import Path

from . import adapters

SOURCES = {
    "S1": {"title": "From the Information Bottleneck to the Privacy Funnel", "url": "https://arxiv.org/abs/1402.1774"},
    "S2": {"title": "ARX official project", "url": "https://github.com/arx-deidentifier/arx"},
    "S3": {"title": "NIST SP 800-188: De-identifying Government Datasets", "url": "https://csrc.nist.gov/pubs/sp/800/188/final"},
    "S5": {"title": "pyCANON official project", "url": "https://github.com/IFCA-Advanced-Computing/pycanon"},
    "S6": {"title": "Anonymeter official project", "url": "https://github.com/statice/anonymeter"},
    "S7": {"title": "OpenDP documentation", "url": "https://docs.opendp.org/en/stable/"},
    "S8": {"title": "NIST SP 800-226: Evaluating Differential Privacy Guarantees", "url": "https://csrc.nist.gov/pubs/sp/800/226/final"},
    "S9": {"title": "SDMetrics quality diagnostics", "url": "https://docs.sdv.dev/sdmetrics/data-metrics/quality"},
    "S10": {"title": "HHS HIPAA de-identification guidance", "url": "https://www.hhs.gov/hipaa/for-professionals/special-topics/de-identification/index.html"},
    "S11": {"title": "sdcMicro documentation", "url": "https://sdctools.github.io/sdcMicro/reference/sdcMicro-package.html"},
    "S12": {"title": "SDV official project and licensing", "url": "https://github.com/sdv-dev/SDV"},
}


def _attack(identifier, name, status, algorithm, metric, requirements, limitations,
            source="S3", modes=None, original=False, auxiliary=False, baseline=None):
    return {"id": identifier, "name": name, "status": status,
            "release_modes": modes or ["row_release"], "required_columns": requirements,
            "requires_original": original, "requires_auxiliary": auxiliary,
            "model_assumptions": ["Declared release mode and row unit are correct", "Results cover only the configured observations and fields"],
            "algorithm": algorithm, "n_trials": None, "baseline": baseline,
            "metric_definition": metric,
            "confidence_interval": "None for fixed-table descriptive values; no inferred population sampling uncertainty",
            "sample_vs_population": "finite released sample only", "sourceId": source,
            "source": SOURCES[source]["url"], "runtime": "native local Python" if status in {"implemented", "partial"} else "not executed",
            "applicability": "; ".join(requirements), "limitations": limitations}


def _method(identifier, name, status, params, tradeoff, limitation, source="S3"):
    return {"id": identifier, "name": name, "status": status, "parameters": params,
            "release_modes": ["row_release"] if identifier not in {"dp_aggregates", "synthetic_generation", "encryption"} else
            ["aggregate_query"] if identifier == "dp_aggregates" else ["synthetic_release"] if identifier == "synthetic_generation" else ["controlled_access"],
            "applicability": "Validated compatible selected columns" if status in {"implemented", "partial"} else "Roadmap; unavailable in this prototype",
            "scientific_tradeoff": tradeoff, "limitations": [limitation],
            "sourceId": source, "source": SOURCES[source]["url"]}


def _kit_register(engine_attacks, engine_methods):
    bundled = Path(__file__).resolve().parent / "fixtures/kit_catalog.json"
    location = bundled if bundled.exists() else Path(__file__).resolve().parents[2] / "docs/reference-kit/backend/prism/catalog.json"
    catalog = json.loads(location.read_text(encoding="utf-8"))
    aliases = {
        "direct-identifiers": ["direct_identifier_exposure"],
        "quasi-uniqueness": ["sample_uniqueness", "sample_guessing", "minimal_distinguishing_subsets"],
        "record-linkage": ["verified_exact_linkage", "auxiliary_linkage"],
        "homogeneity": ["homogeneity"], "skewness": ["t_closeness"],
        "background": ["sensitive_inference"], "rare-subgroups": ["rare_conjunction"],
        "membership": ["membership"], "synthetic-inference": ["synthetic_attacks"],
        "composition": ["composition"], "differencing": ["aggregate_differencing"],
        "dates": ["trajectory_uniqueness"], "genomics": ["genomic_fingerprinting"],
        "free-text": ["free_text"], "multimedia": ["metadata"],
    }
    states = {
        "direct-identifiers": ("partial", "Reviewed identifier roles, structured name/format heuristics and export blocking; no complete PHI recognition"),
        "quasi-uniqueness": ("implemented", "Exact QI classes, sample guessing/entropy and bounded subset maps with explicit missing category"),
        "record-linkage": ("implemented", "Verified exact deterministic generalization replay with owner-only scoring lineage; applicability is checked separately for every candidate"),
        "homogeneity": ("implemented", "Categorical distinct-l and homogeneous-row counts; missing values are one explicit category in this engine"),
        "skewness": ("partial", "Categorical total variation to the released-table distribution; no semantic medical-distance or general t-closeness enforcement"),
        "background": ("partial", "Editable declared QI and categorical guessing, including training-only fixed-split predictability; no universal outside-knowledge model"),
        "missingness": ("partial", "Null-aware exact classes plus separate aggregate and declared-subgroup missingness diagnostics"),
        "rare-subgroups": ("partial", "Small class counts, capped suppression and workload-declared subgroup retention/fidelity with minimum support"),
        "membership": ("unsupported", "No calibrated member/nonmember attack executed"),
        "synthetic-inference": ("unsupported", "Anonymeter prerequisite guard only; no runtime attack adapter executed"),
        "memorization": ("unsupported", "No trained synthesizer, holdout copy audit or membership experiment executed"),
        "composition": ("partial", "Computed synthetic partition-intersection example only; no general multi-release attacker"),
        "differencing": ("partial", "Computed synthetic count differencing counterexample only; no recipient aggregate-query service"),
        "reconstruction": ("unsupported", "No reconstruction solver"),
        "averaging": ("unsupported", "No DP answer endpoint, persistent accountant or repeated-query attack"),
        "hashes": ("partial", "Secret HMAC tokens and stable-token caveats; no key-compromise or dictionary attack evaluator"),
        "ordering": ("partial", "Private lineage/index excluded from reports and CSV; row order may still preserve correspondence and is not a privacy guarantee"),
        "dates": ("partial", "Date precision reduction and experimental row-level shifts; no verified per-entity trajectory model"),
        "genomics": ("unsupported", "Specialist genomic/family inference evaluation is unavailable"),
        "geolocation": ("partial", "ZIP prefix generalization only; no GPS or mobility-route anonymization"),
        "free-text": ("partial", "Bounded selected-field regex redaction; free-text content excluded from utility summaries; no Presidio runtime integration"),
        "multimedia": ("unsupported", "CSV-only workflow; no image/audio/DICOM/embedded-file scanner"),
        "csv-injection": ("implemented", "Formula-leading export headers/cells neutralized; file-handling control, not statistical privacy"),
        "diagnostic-leak": ("partial", "Local confidential audit, no-store responses, aggregate evidence; non-DP exact diagnostics and recipe selection can themselves disclose information"),
        "group-harm": ("unsupported", "Governance consideration; no automated group-harm determination"),
        "transport": ("unsupported", "No sharing, encryption, authorization or regulatory clearance service"),
    }
    engine_by_id = {entry["id"]: entry for entry in engine_attacks}
    attacks = []
    for entry in catalog["attacks"]:
        identifier = entry["id"]
        status, implementation = states[identifier]
        mapped = aliases.get(identifier, [])
        template = next((engine_by_id[alias] for alias in mapped if alias in engine_by_id), {})
        source = catalog["sources"][entry["source"]]
        item = {**template, "id": identifier, "name": entry["name"], "summary": entry["summary"],
                "status": status, "aliases": mapped, "coverage": entry["coverage"],
                "catalogCoverage": entry["coverage"], "implemented": implementation, "algorithm": implementation,
                "mitigation": entry["mitigation"], "limitations": [entry["limitation"], implementation],
                "sourceId": "KIT_" + entry["source"], "source": source,
                "applicability": template.get("applicability", "Only the implemented portion and declared prerequisites; unsupported is unassessed"),
                "runtime": "native local Python" if status in {"implemented", "partial"} else "not executed"}
        item["searchText"] = " ".join([item["name"], item["summary"], implementation, item["mitigation"], *mapped]).lower()
        if identifier == "background":
            item["confidence_interval"] = "No sampling CI for in-sample descriptions; held-out accuracy has an explicitly qualified Wilson binomial interval"
        attacks.append(item)
    method_aliases = {"numeric_band": "band", "prefix": "zip_prefix", "top_bottom_code": "top_bottom",
                      "rare_category": "rare_group", "date_year": "date_generalize", "jitter": "noise",
                      "shuffle": "permute", "redact_patterns": "redact", "k_suppression": "suppress_rows",
                      "arx_models": "microaggregation", "synthetic": "synthetic_generation"}
    methods_by_id = {entry["id"]: entry for entry in engine_methods}
    protections = []
    for entry in catalog["methods"]:
        method = method_aliases.get(entry["id"], entry["id"])
        template = methods_by_id[method]
        item = {**template, "id": entry["id"], "engineMethod": method,
                "name": entry["name"], "summary": entry["summary"], "catalogCoverage": entry["coverage"],
                "limitations": list(dict.fromkeys(template["limitations"] + [entry["limitation"]]))}
        if entry["id"] == "date_shift":
            item.update(status="partial", summary="Experimental seeded per-row offsets; consistent per-entity longitudinal shifts are not implemented")
        if entry["id"] == "top_bottom_code":
            item["summary"] = "Numeric clipping at explicit lower/upper limits; threshold-label interval semantics are not produced"
        if entry["id"] == "round":
            item["summary"] = "Round to decimal places; decimal precision differs from arbitrary numeric-step rounding"
        item["searchText"] = " ".join([item["name"], item["summary"], method, *item["limitations"]]).lower()
        protections.append(item)
    return attacks, protections, [{"id": "KIT_" + key, "title": key, "url": value} for key, value in catalog["sources"].items()]


def get_registry(search: str | None = None) -> dict:
    attacks = [
        _attack("direct_identifier_exposure", "Direct identifier exposure", "partial", "Recognized structured column-name checks; reviewed schema governs export blocking", "Number of recognized identifier columns remaining", ["Reviewed identifier roles"], ["No exhaustive free-text PHI recognition", "Renaming or pseudonymizing fields is not anonymity"]),
        _attack("sample_uniqueness", "QI sample uniqueness and minimum k", "implemented", "Exact-match QI equivalence-class counts, including one explicit missing category", "sum(singleton class counts)/N; k=min class size", ["Declared QI", "One row per person"], ["Not population uniqueness", "Does not protect homogeneous sensitive attributes"]),
        _attack("sample_guessing", "Present-target sample guessing and row entropy", "implemented", "Uniform row prior and uniform within-class guessing", "p_guess=#classes/N; H=sum_g(n_g/N)log2(n_g)", ["Known membership", "Correct observed QI"], ["Not incremental release leakage or sensitive mutual information"], baseline="Uniform source-row prior, correctness 1/N"),
        _attack("minimal_distinguishing_subsets", "Minimum distinguishing knowledge", "implemented", "Exact enumeration through 10 QI; bounded first 128 size<=3 subsets beyond 10", "Aggregate histogram of smallest tested unique subset size", ["Declared QI", "Bounded coverage"], ["Known field count is not acquisition cost", "Incomplete coverage yields upper bounds, not exact minimums"]),
        _attack("rare_conjunction", "Rare conjunction / intersection", "implemented", "Exact multi-column subgroup counts in the exposure surface", "Unique fraction and minimum cohort size per tested subset", ["Categorical or binned QI"], ["Only tested combinations and known-membership threat model"]),
        _attack("homogeneity", "Sensitive-value homogeneity / distinct l-diversity", "implemented", "Distinct sensitive categories and homogeneous-row counts within exact QI classes", "l_min=min_g distinct sensitive categories; homogeneous row fraction", ["Declared QI", "Categorical sensitive attribute"], ["Missing counts as a sensitive category", "No l-diversity enforcement", "k alone cannot establish sensitive-value protection"], "S5"),
        _attack("t_closeness", "Categorical t-distance audit", "implemented", "Maximum class-to-table categorical total variation; optional pyCANON smoke cross-check", "max_g 0.5 sum_s |P(s|g)-P(s)|", ["Categorical sensitive attribute", "Declared QI"], ["Not continuous numeric Earth Mover distance", "Not enforcement or universal privacy"], "S5"),
        _attack("sensitive_inference", "Empirical sensitive-attribute guessing", "partial", "In-sample class mode plus fixed-split held-out training-only class majority (>=5 training rows), global fallback", "In-sample guessing advantage and separate held-out correct-guess fractions", ["Categorical sensitive attribute", "Declared QI prior", "30+ rows for held-out diagnostic"], ["In-sample headline statistic is unsmoothed; rare classes overfit", "Held-out diagnostic uses a fixed split of the same released table, not independent population or incremental disclosure validation"], baseline="Training-global modal category evaluated on the same held-out rows"),
        _attack("auxiliary_linkage", "Synthetic auxiliary exact-match linkage demonstration", "partial", "Deterministic synthetic-only exact-match/blocking example in Attack Lab", "Matching synthetic observations under explicitly disclosed QI; not a field-validated attacker", ["Synthetic auxiliary data", "Known synthetic overlap"], ["Demonstration only; no real public-data linkage", "No probabilistic record-linkage service"], auxiliary=True),
        _attack("trajectory_uniqueness", "Longitudinal trajectory uniqueness", "unsupported", "Sequence fingerprinting not implemented", "Unavailable", ["Longitudinal sequences"], ["Tabular row-unit metrics do not cover trajectories"]),
        _attack("free_text", "Free-text identifiers", "partial", "Selected-field redaction with limited patterns", "No comprehensive scanner metric", ["User-selected text fields"], ["Regex can miss personal and clinical identifiers; manual review required"]),
        _attack("genomic_fingerprinting", "Genomic fingerprinting", "unsupported", "Not implemented", "Unavailable", ["Genomic records and explicit threat model"], ["Rare variants and genotype linkage are outside this prototype"]),
        _attack("synthetic_attacks", "Synthetic singling out / linkability / inference", "unsupported", "Anonymeter guard only; no execution adapter", "Unavailable", ["Training data", "Synthetic release", "Verified disjoint control"], ["Refuses missing or unverified disjoint control inputs", "Never applied to deterministic row-preserving generalization"], "S6", ["synthetic_release"], True, True),
        _attack("membership", "Synthetic memorization / membership inference", "unsupported", "No trained-generator/control attack", "Unavailable", ["Generator", "Training/control partition"], ["Nearest-neighbor proximity alone is not a membership-inference guarantee"], "S6", ["synthetic_release"], True),
        _attack("aggregate_differencing", "Aggregate differencing / reconstruction", "partial", "Executable two-query toy differencing counterexample in Attack Lab", "Exact difference of two illustrative counts", ["Toy aggregate query outputs"], ["No production aggregate query service, reconstruction engine or privacy accountant"], "S8", ["aggregate_query"]),
        _attack("composition", "Repeated release composition", "partial", "Executable synthetic partition-intersection counterexample in Attack Lab", "Combined versus individual sample uniqueness", ["Two synthetic releases"], ["No general multi-release linkage audit", "No DP accountant or composed guarantee"]),
        _attack("metadata", "Metadata / hidden sheets / exported IDs", "partial", "CSV-only import, no exported source index, reviewed identifier/formula checks", "Export checks; no hidden-sheet parser", ["CSV input/export artifacts"], ["No spreadsheet, embedded document or arbitrary file metadata scanning"]),
        _attack("external_linkage_at_scale", "External public-record linkage at scale", "unsupported", "Not implemented and no external data transmission", "Unavailable", ["Authorized external records and legal basis"], ["Local synthetic demonstration does not imply operational linkage capability"], auxiliary=True),
    ]
    methods = [
        _method("drop", "Drop columns / identifiers", "implemented", {"columns": "selected fields"}, "Removes variables and joins", "Remaining QI and text may still disclose individuals"),
        _method("mask", "Mask selected values", "implemented", {}, "Destroys selected field detail", "Masking one identifier leaves other disclosure routes"),
        _method("pseudonymize", "Secret-key HMAC token replacement", "implemented", {"secret": "external; never serialized"}, "Preserves deterministic within-key joins", "Pseudonymization remains linkable; secret and mapping governance required"),
        _method("band", "Numeric interval generalization", "implemented", {"width": "positive interval width"}, "Midpoint approximations blur means and correlations", "Weight kilograms must be validated or explicitly converted; no k guarantee"),
        _method("centered_interval", "Centered integer interval display", "implemented", {"radius": "positive whole-number half-width"}, "Preserves the original integer as an exactly recoverable midpoint", "Not a privacy reduction: distinguishability and linkage remain; fixed bands behave differently"),
        _method("zip_prefix", "ZIP prefix generalization", "implemented", {"length": "1–5 digits"}, "Loses geographic resolution", "Three-digit ZIP is never an automated HIPAA Safe Harbor pass", "S10"),
        _method("round", "Numeric rounding", "implemented", {"decimals": "rounding precision"}, "Loses precision", "Rounding differs from fixed half-open age bands"),
        _method("top_bottom", "Top / bottom coding", "implemented", {"min": "optional lower bound", "max": "optional upper bound"}, "Flattens tails", "May conceal outlier relationships and residual rare conjunctions"),
        _method("rare_group", "Rare category grouping", "implemented", {"min_count": "minimum category frequency"}, "Merges rare groups", "Single-column rarity does not establish joint k"),
        _method("date_generalize", "Date granularity reduction", "implemented", {"precision": "UTC hour, day, ISO week, month, quarter or year"}, "Loses timing structure", "Residual dates and sequences need separate review"),
        _method("date_shift", "Date shifting", "implemented", {"days": "maximum demo shift"}, "Distorts chronology and intervals", "Not a legal safe harbor; longitudinal privacy is untested"),
        _method("noise", "Experimental numeric noise", "implemented", {"scale": "perturbation scale"}, "Changes moments, range and subgroup estimates", "Arbitrary numeric noise is not differential privacy; fixed seeds are demo-only"),
        _method("permute", "Experimental within-stratum permutation", "implemented", {"strata": "optional column list"}, "Preserves marginals while potentially reversing associations", "Fabricates record-level relationships; fine strata can retain sensitive joins"),
        _method("redact", "Selected-field pattern redaction", "partial", {"pattern": "optional selected expression"}, "Removes matched text", "Limited patterns miss free-text PHI; no comprehensive text clearance"),
        _method("suppress_cells", "Cell suppression", "implemented", {}, "Introduces missingness", "Missingness can itself form a distinguishing pattern"),
        _method("suppress_rows", "Capped vulnerable-row suppression", "implemented", {"qi": "declared QI", "k": "required minimum", "max_fraction": "strict cap"}, "Selection bias and subgroup loss", "Final output k/cap are rechecked; infeasible requests are rejected"),
        _method("bounded_search", "Bounded k / research candidate search", "implemented", {"maxCandidates": "1–80; default 24"}, "Trades actual sample risk against workload error", "Finite grammar and finite sample only; infeasible and uncovered outcomes remain visible"),
        _method("microaggregation", "Microaggregation", "unsupported", {}, "Changes joint numeric structure", "Deferred; no ARX or R bridge", "S11"),
        _method("pram", "PRAM / categorical perturbation", "unsupported", {}, "Changes category membership and relationships", "Deferred; permutation is a separately exposed experimental method", "S11"),
        _method("lt_enforcement", "l-diversity / t-closeness enforcement", "unsupported", {}, "May require substantial suppression", "Auditing is implemented; enforcement is not", "S5"),
        _method("dp_aggregates", "Formal differential privacy aggregates", "unsupported", {}, "Requires bounds, sensitivity, secure randomness and budget accounting", "No vetted mechanism/backend or privacy guarantee in this prototype", "S7"),
        _method("synthetic_generation", "Learned synthetic-data generation", "unsupported", {}, "May memorize and lose rare patterns", "Demo fixture generation is not a privacy-preserving trained synthesizer; SDV requires license review", "S12"),
        _method("encryption", "Encryption / controlled enclave", "unsupported", {}, "Protects controlled access, not decrypted record anonymity", "Recommended governance option; production enclave/transport service is not supplied"),
    ]
    engine_attacks = attacks
    attacks, protections, kit_sources = _kit_register(engine_attacks, methods)
    if search:
        needle = search.casefold().strip()
        attacks = [entry for entry in attacks if needle in entry["searchText"]]
        protections = [entry for entry in protections if needle in entry["searchText"]]
    return {"attacks": attacks, "methods": methods, "protectionCatalog": protections,
            "engineAnalyses": engine_attacks, "familyCount": 26, "protectionCount": 17,
            "catalogAttribution": {"title": "PRISM Privacy Workbench", "copyright": "Copyright 2026 PRISM contributors",
                                   "license": "Apache-2.0", "source": "docs/reference-kit/backend/prism/catalog.json",
                                   "notice": "docs/reference-kit/NOTICE", "modifications": "Adapted to current engine status and explicit integration limitations"},
            "integrations": adapters.status(),
            "sources": [{"id": identifier, **source} for identifier, source in SOURCES.items()] + kit_sources,
            "releaseModes": [{"id": "row_release", "status": "implemented"},
                             {"id": "synthetic_release", "status": "unsupported"},
                             {"id": "aggregate_query", "status": "unsupported"},
                             {"id": "controlled_access", "status": "unsupported"}],
            "warning": "Coverage is method-specific. Unsupported, partial, error and untested scenarios never constitute release clearance. No HIPAA compliance determination or universal anonymity score."}
