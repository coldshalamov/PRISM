# Original hackathon-kit benchmark

This directory preserves the user's supplied 480-row fictional PRISM benchmark. `fictional_oncology.csv`, `fictional_protected.csv`, `default_request.json`, `default_report.json`, `LICENSE` and `NOTICE` are **unmodified byte copies** from `PRISM-hackathon-kit.zip`. Their SHA-256 values and archive provenance are recorded in `PROVENANCE.json`. The original package is Apache-2.0; retain its LICENSE and NOTICE when redistributing these artifacts.

`current_contract.json` maps the original schema, default recipe, threat fields and three research tasks into this application's interfaces. `reproduction.json` records current-engine aggregate results and the isolated original-suite result. These two files are new integration artifacts, not files purported to have come from the ZIP.

With age five-year bands, three-digit ZIP, five-kg weight bands and the original known fields `age`, `zip`, `weight_kg`, the verified exact matcher reproduces **75/480** unique correct matches. Removing ZIP yields **20/480**. The original workload's three tasks pass in both variants. These are known-membership full-fixture results, not independent external linkage, clinical evidence or release authorization.

The original archived report follows the original owner-confidential report format. The new linkage finding contains only aggregate counts, assumptions and limits; it omits target positions, match values and row alignment. See `docs/KIT_BASELINE.md` for reproduction and compatibility boundaries.
