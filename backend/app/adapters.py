"""Optional integrations: distinguish importability from an executed API test."""
from __future__ import annotations

from functools import lru_cache
from importlib import metadata, util

import pandas as pd


def pycanon_cross_check(frame: pd.DataFrame, qi: list[str], sensitive: list[str]) -> dict:
    """Cross-check exact native categorical k/l/TV against installed pyCANON.

    Explicit category coding also makes missing values one category for the
    external library. Numeric sensitive values are deliberately encoded as
    categories: this checks our TV definition, not continuous numeric EMD.
    """
    from pycanon import anonymity
    from . import risk

    native = risk.evaluate(frame, qi, sensitive)
    coded = pd.DataFrame(index=range(len(frame)))
    for column in dict.fromkeys(qi + sensitive):
        coded[column] = pd.Series(pd.factorize(frame[column], sort=False, use_na_sentinel=False)[0]).map(lambda value: f"category-{value}")
    tested_qi = list(qi)
    if not tested_qi:
        constant = "__prism_constant_group__"
        while constant in coded:
            constant += "_"
        coded[constant] = "all"
        tested_qi = [constant]
    if frame.empty:
        return {"status": "not_applicable", "reason": "pyCANON does not assess an empty release", "matches": None}
    k_value = int(anonymity.k_anonymity(coded, tested_qi))
    checks = [{"metric": "k_min", "native": native["metrics"]["k_min"], "adapter": k_value,
               "matches": native["metrics"]["k_min"] == k_value}]
    for target in native["sensitive"]:
        if target["status"] != "implemented":
            continue
        column = target["column"]
        # A sensitive column also declared QI is perfectly revealed, but
        # pyCANON prohibits the same column in both roles. Use an exact copy
        # under a fresh internal name to retain the intended native test.
        external_column = column
        if column in tested_qi:
            external_column = "__prism_sensitive_copy__"
            while external_column in coded:
                external_column += "_"
            coded[external_column] = coded[column]
        l_value = int(anonymity.l_diversity(coded, tested_qi, [external_column]))
        t_value = float(anonymity.t_closeness(coded, tested_qi, [external_column]))
        checks.extend([
            {"metric": "l_min", "column": column, "native": target["l_min"], "adapter": l_value,
             "matches": target["l_min"] == l_value},
            {"metric": "categorical_tv_max", "column": column, "native": target["t_max"], "adapter": t_value,
             "matches": abs(target["t_max"] - t_value) < 1e-10},
        ])
    return {"status": "implemented" if all(check["matches"] for check in checks) else "error",
            "matches": all(check["matches"] for check in checks), "checks": checks,
            "semantics": "Explicit categorical coding including missingness; t is categorical total variation, not numeric EMD."}


def _package(name: str, distribution: str | None = None) -> dict:
    available = util.find_spec(name) is not None
    try:
        version = metadata.version(distribution or name) if available else None
    except metadata.PackageNotFoundError:
        version = "unknown"
    return {"installed": available, "version": version}


@lru_cache(maxsize=1)
def _status_cached() -> tuple[dict, ...]:
    result = []
    package = _package("pycanon")
    pycanon = {"id": "pycanon", "name": "pyCANON", **package, "runtimeTested": False,
               "status": "unsupported", "source": "https://github.com/IFCA-Advanced-Computing/pycanon",
               "applicability": "Categorical exact-match k/l/t cross-check; not a transformer"}
    if package["installed"]:
        try:
            fixture = pd.DataFrame({"q": ["a"] * 3 + ["b"] * 3,
                                    "s": ["x", "x", "y", "y", "y", "y"]})
            check = pycanon_cross_check(fixture, ["q"], ["s"])
            null_fixture = pd.DataFrame({"q": [None, None, "<missing>", "<missing>"],
                                         "s": ["x", None, "y", "y"]})
            null_check = pycanon_cross_check(null_fixture, ["q"], ["s"])
            pycanon.update(runtimeTested=True, status="implemented" if check["matches"] and null_check["matches"] else "error",
                           smokeTest={"standard": check, "nullCategory": null_check})
        except Exception as error:
            pycanon.update(status="error", error=f"Installed-package smoke failed ({type(error).__name__})")
    else:
        pycanon["limitation"] = "Optional package not installed; native metrics still run, external cross-check unavailable"
    result.append(pycanon)
    for name, title, source, limitation in [
        ("sdmetrics", "SDMetrics", "https://docs.sdv.dev/sdmetrics/data-metrics/quality", "No SDMetrics runtime adapter executed; native workload/distribution diagnostics are separate"),
        ("anonymeter", "Anonymeter", "https://github.com/statice/anonymeter", "Synthetic-release adapter not implemented; requires training, release, and disjoint control data"),
        ("opendp", "OpenDP", "https://docs.opendp.org/en/stable/", "Aggregate-only DP module and privacy accountant are outside this prototype; no DP guarantee"),
    ]:
        result.append({"id": name, "name": title, **_package(name), "runtimeTested": False,
                       "status": "unsupported", "source": source, "limitation": limitation})
    result.extend([
        {"id": "arx", "name": "ARX", "installed": None, "runtimeTested": False, "status": "unsupported",
         "source": "https://github.com/arx-deidentifier/arx", "limitation": "Java bridge not implemented; no runtime availability claim"},
        {"id": "sdcmicro", "name": "sdcMicro", "installed": None, "runtimeTested": False, "status": "unsupported",
         "source": "https://sdctools.github.io/sdcMicro/", "limitation": "R bridge not implemented; no runtime availability claim"},
    ])
    return tuple(result)


def status() -> list[dict]:
    import copy
    return copy.deepcopy(list(_status_cached()))


def synthetic_attack(training=None, synthetic=None, control=None, *, disjoint_verified: bool = False) -> dict:
    """Guard the future adapter; never treat row-preserving releases as synthetic."""
    if training is None or synthetic is None or control is None:
        raise ValueError("Synthetic attacks require training, synthetic release, and disjoint control datasets")
    if not disjoint_verified:
        raise ValueError("Disjoint training/control provenance must be explicitly verified")
    return {"status": "unsupported", "runtimeTested": False,
            "reason": "Anonymeter attack execution is not implemented in this row-release prototype"}
