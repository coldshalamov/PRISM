# PRISM v3 agent handoff

Start with `PRISM_Complete_Specification_v3.md`. It is the self-contained specification, not an implemented application.

`semantic_types.json` and `risk_rules.json` are machine-readable extracts of the corresponding normative catalog tables. They are starting registry data; application models, bindings, descriptions and policy enforcement must be implemented as specified in the Markdown. Do not infer that a listed rule is already implemented.

`validate_spec.py` uses the Python standard library to check mathematical fixtures and catalog consistency. Run:

```sh
python validate_spec.py
```

These are specification-level checks, not PRISM application tests or a live Jev integration. The specification separately defines 90 application acceptance tests to implement and run.

The Markdown supersedes conflicting older recommendations, including source-centered numeric ranges, universal safety ratings, confidence-driven release decisions and raw cloud-upload assumptions. Preserve functioning code in the existing repository.
