import importlib.util

import pandas as pd
import pytest

from backend.app import adapters, registry


def test_synthetic_adapter_refuses_missing_and_unverified_control():
    with pytest.raises(ValueError, match="disjoint control"):
        adapters.synthetic_attack(training=pd.DataFrame(), synthetic=pd.DataFrame())
    with pytest.raises(ValueError, match="provenance"):
        adapters.synthetic_attack(pd.DataFrame(), pd.DataFrame(), pd.DataFrame())
    result = adapters.synthetic_attack(pd.DataFrame(), pd.DataFrame(), pd.DataFrame(), disjoint_verified=True)
    assert result["status"] == "unsupported"


@pytest.mark.skipif(importlib.util.find_spec("pycanon") is None, reason="Optional pyCANON not installed")
def test_native_metrics_cross_checked_with_installed_pycanon_including_null():
    frame = pd.DataFrame({"q": [None, None, "<missing>", "<missing>", "a", "a"],
                          "s": ["x", None, "y", "y", "x", "y"]})
    result = adapters.pycanon_cross_check(frame, ["q"], ["s"])
    assert result["status"] == "implemented"
    assert result["matches"]
    assert {check["metric"] for check in result["checks"]} == {"k_min", "l_min", "categorical_tv_max"}
    package = next(item for item in adapters.status() if item["id"] == "pycanon")
    assert package["installed"] and package["runtimeTested"]
    assert package["status"] == "implemented"


def test_registry_covers_threats_methods_sources_and_unsupported_roadmap():
    result = registry.get_registry()
    attacks = {attack["id"]: attack for attack in result["attacks"]}
    methods = {method["id"]: method for method in result["methods"]}
    assert len(attacks) == 26
    assert attacks["synthetic-inference"]["status"] == "unsupported"
    assert attacks["background"]["status"] == "partial"
    assert "verified_exact_linkage" in attacks["record-linkage"]["aliases"]
    assert len(result["protectionCatalog"]) == 17
    assert result["catalogAttribution"]["license"] == "Apache-2.0"
    assert registry.get_registry("trajectory")["attacks"]
    assert methods["dp_aggregates"]["status"] == "unsupported"
    assert "never" in methods["zip_prefix"]["limitations"][0]
    assert all(entry["source"].startswith("https://") for entry in result["attacks"] + result["methods"])
    assert all(not entry["runtimeTested"] for entry in result["integrations"] if entry["id"] != "pycanon")
