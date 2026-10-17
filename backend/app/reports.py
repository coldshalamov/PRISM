"""Portable reports exclude table previews, row lineage, and session secrets."""
import csv
import html
import importlib.metadata
import io
import json
from datetime import datetime, timezone

LIMITATION = "Not cleared for release. These are sample measurements under stated assumptions, not anonymity, legal compliance, population risk, or a publication approval. Consider controlled access or a governed aggregate interface where required."


def versions():
    result = {}
    for name in ["fastapi", "pydantic", "pandas", "numpy", "scipy", "pycanon"]:
        try:
            result[name] = importlib.metadata.version(name)
        except importlib.metadata.PackageNotFoundError:
            result[name] = "not installed"
    return result


def evidence(candidate, dataset, registry):
    public = {k: v for k, v in candidate.items() if k not in {"preview", "_frame", "_lineage"}}
    return {"application": "PRISM", "version": "0.1.0", "generatedAt": datetime.now(timezone.utc).isoformat(),
            "classification": "CONFIDENTIAL — owner audit; exact source aggregate statistics and workload definitions may disclose sensitive information. Review before forwarding.",
            "decision": LIMITATION, "candidate": public,
            "dataset": {"name": dataset["name"], "rowCount": len(dataset["frame"]), "synthetic": dataset["synthetic"], "schema": dataset["schema"],
                        "semantic": {"revision": candidate["risk"].get("semantic", {}).get("semanticRevision"),
                                     "fields": candidate["risk"].get("semantic", {}).get("lineage", []),
                                     "provider": candidate["risk"].get("semantic", {}).get("classificationProvider")}},
            "libraries": versions(), "registry": registry,
            "coverage": {"executed": [f["attackId"] for f in candidate["risk"]["findings"] if f.get("status") == "implemented"],
                         "uncovered": [a for a in registry.get("attacks", []) if a.get("status") not in {"implemented"}]},
            "assumptions": ["One record is treated as one person; repeated-person records require a different model.", "Sample row-index uncertainty assumes uniform prior and known source membership.", "Grouped sensitive inference is descriptive in-sample analysis, not held-out incremental disclosure.", "Band midpoints approximate numeric diagnostics; scientific tolerances remain user-defined.", "Prior releases, external knowledge, free text, genomics and trajectories may require additional assessment."],
            "privacy": "Raw rows, row alignment and HMAC keys are excluded from this report. Query definitions and aggregate values can still be sensitive; review before sharing."}


def render_html(report):
    data = html.escape(json.dumps(report, indent=2, ensure_ascii=False, allow_nan=False))
    return f"""<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>PRISM confidential owner audit</title><style>body{{font:15px system-ui;max-width:1100px;margin:40px auto;padding:0 24px;color:#14243d;background:#f6f8fb}}h1{{font-size:36px}}aside{{border-left:4px solid #c26925;background:white;padding:20px;line-height:1.6}}pre{{background:white;border:1px solid #dce2ec;padding:24px;white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;line-height:1.6}}</style><h1>PRISM · confidential owner audit</h1><p>Exact source statistics may be sensitive. Review before forwarding.</p><p>Reproducible local assessment · {html.escape(report['generatedAt'])}</p><aside>{html.escape(report['decision'])}</aside><h2>Measured results, recipe, coverage and assumptions</h2><pre>{data}</pre></html>"""


def protected_csv(frame):
    """Escape spreadsheet formula cells without altering genuine numeric negatives."""
    def safe(value):
        if isinstance(value, str) and value.lstrip().startswith(("=", "+", "-", "@", "\t", "\r")):
            return "'" + value
        return value
    output = io.StringIO(newline="")
    writer = csv.writer(output)
    writer.writerow([safe(str(col)) for col in frame.columns])
    for row in frame.itertuples(index=False, name=None):
        writer.writerow([safe(v) if v is not None else "" for v in row])
    return output.getvalue()
