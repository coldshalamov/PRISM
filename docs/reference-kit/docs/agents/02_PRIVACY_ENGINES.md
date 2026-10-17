# Privacy-engine agent assignment

Own optional adapters and their tests. Read the OSS matrix and evaluation contract. The included adapters are source only and **not runtime-verified**; your first job is to establish that distinction honestly, not to flip a capability flag.

## Choose a complete integration, not five partial ones

A useful first milestone is installed SDMetrics plus a clean UI-ready result envelope. A higher-value but larger milestone is ARX through a local JVM worker. Anonymeter inference requires a control-data protocol the current UI does not yet supply. OpenDP is an isolated primitive, not a deployable aggregate service.

For every engine: pin/test package versions, inspect its license and transitive dependencies, make installation opt-in, enforce local execution, suppress sensitive logs, and report `unavailable` when absent. Do not vendor unexplained binaries or models.

## ARX worker contract

Create a typed local job that includes explicit field definitions, hierarchies, privacy-model parameters, suppression limits and quality objectives. Use a subprocess with time/memory limits. Avoid dataset content in process arguments or logs. Use an owner-only temporary workspace and documented cleanup; never imply guaranteed secure deletion.

Return transformed data, achieved constraints, exact ARX version, quality metrics, warnings and structured infeasibility. Compare fixtures against direct native ARX execution. PRISM's synthetic exact-matcher remains an independent diagnostic, not a replacement for ARX model reporting.

## Synthetic evaluation

Start with the actual inference adapter. Original means records used by the generator; control means comparable independent records excluded before fitting. Add metadata/provenance prompts and checks where possible, but acknowledge that code cannot prove a user's provenance declaration.

Expose main/control/baseline results and intervals from the installed package, exact attack count, secret field, known fields, coverage and seed/randomness policy. Validate copied training data, benign independent population data, and an invalid contaminated control. Do not label nearest-neighbor distance alone membership privacy. Add singling-out/linkability only after their distinct requirements are handled.

Anonymeter's project has a Clear BSD/patent notice; obtain the lead's legal/distribution review before product integration.

## OpenDP

Do not expose the current in-memory-budget adapter on a recipient API. For a primitive validation milestone, test domain validation, person contribution bounds, mechanism privacy map, budget exhaustion, concurrent charging, and unseeded randomness. Full release needs durable global composition accounting and a strict boundary excluding raw/owner outputs. Preserve that scope in every result.

## Required artifacts

Adapter contract, exact dependency lock, license notes, installation instructions, vulnerable/control fixture tests, runtime and missing-package behavior, cancellation/cleanup tests, coverage register amendments with evidence, and one UI-ready result JSON. No status change without real execution.
