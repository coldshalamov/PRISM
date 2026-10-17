# Maintainer handoff

The runnable application implements the hackathon's local row-release workbench. The preserved architecture in `docs/spec/PRISM_MASTER_ARCHITECTURE.md` describes a broader program; roadmap references are not implementation claims. `IMPLEMENTATION_CONTRACT.md` freezes the engine/HTTP integration conventions.

## Runtime and ownership map

| Area | Files and responsibility |
|---|---|
| Application boundary | `backend/app/main.py`, `models.py`: loopback API, validated requests, process-memory state, immutable candidate IDs, export gates |
| Data | `datasets.py`, `examples/`: bounded CSV intake, suggested roles/types, reviewed units and deterministic fixtures |
| Transform | `transforms.py`: ordered validated copy-on-write recipes; lineage returned separately; aggregate reports; no serialized secret |
| Risk | `risk.py`: exact factorized missing categories, QI partitions/subsets, categorical inference/homogeneity/TV and separate fixed-split within-release majority diagnostic |
| Utility | `utility.py`: real workload queries, loss, distributions and correlations; midpoint caveats; aggregate unpaired semantics |
| Search | `optimizer.py`: memoized deterministic finite grammar, actual evaluations, separate feasibility/frontier and evaluated ablations |
| Registry/adapters | `registry.py`, `adapters.py`: explicit implemented/partial/unsupported statuses; optional pyCANON runtime smoke checks |
| Evidence/lab | `reports.py`, `lab.py`: local reports/CSV hygiene and executable fictional counterexamples |
| Frontend | `frontend/`: React/TypeScript workspace; same-origin API/proxy; no imported data in localStorage |

Do not add a universal privacy percentage or release approval state. Current risk output always has `release_cleared:false`. Maintain the distinction between installation, executed API smoke test, deterministic calculation and genuine external validation.

## Reproduce a working checkout

Follow the root README for Python 3.11–3.13, editable backend install, `npm ci`, frontend build and the `prism` loopback launcher. Exact observed Python versions are recorded in `backend/requirements.lock.txt`; npm uses `frontend/package-lock.json`. pyCANON is the only executed optional library integration. Native metrics work without it, while external cross-check status becomes unavailable.

Validation commands:

```powershell
.\.venv\Scripts\python.exe -m pytest backend
npm run typecheck --prefix frontend
npm run build --prefix frontend
```

Run the [demo route](DEMO_SCRIPT.md) to check the actual browser/API workflow. Do not substitute a process startup or unit count for full route acceptance. This handoff deliberately does not pin a final suite count while integration continues.

## Contract details worth preserving

- `apply(frame,schema,steps,seed=42,secret=None)` returns output, original iloc offsets in output order, and aggregate transform report. Neither lineage nor secret belongs in an export.
- All engine interfaces use plain dictionaries/DataFrames. HTTP payloads use camelCase; nested scientific metric keys retain their documented engine names.
- Missing risk values form an explicit category. Never replace them with a string sentinel that could collide with real data.
- Bands use `[a,b)` and numeric utility decodes midpoints with a warning. Weight banding requires reviewed kg or explicit lb conversion.
- Row suppression is final-only, capped and rechecked. Automated search must not mutate `research_target` roles.
- External audit column mapping is original-name to protected-name. Paired mode requires explicit unique valid original offsets; provenance is an owner assertion, not an inferred attack input.
- Candidate assessments create new IDs rather than overwrite existing results. Schema changes after candidate creation do not rewrite that candidate's schema snapshot.
- The search call is synchronous, one at a time, and can report grammar/attempt exhaustion. Search results retain failed constraints and exact evaluated recipes.
- CSV export rechecks identifiers and formula-like strings. Reports remove table previews and private alignment; aggregates and query definitions still need review.
- API research queries reject reviewed direct-identifier references in target, groupBy and filter fields, preventing those known identity labels from entering query result reports.
- Session deletion clears in-memory references and rotates HMAC key; all old IDs become invalid. It does not remove external files or promise secure RAM erasure.

## Coverage and known boundaries

Read [RELEASE_LIMITATIONS.md](RELEASE_LIMITATIONS.md) before broadening claims. Unimplemented capabilities include real auxiliary/public-record linkage, held-out inference calibration, longitudinal/genomic attacks, trained synthetic-data generation/attacks, DP mechanisms/accounting, ARX/R bridges, l/t enforcement and production controlled/aggregate deployment modes. Attack Lab's composition/differencing examples are demonstrations, not those missing services.

Future work should extend a named evidence gap and its applicable threat model. Preserve source data locally, the owner/attacker alignment boundary, capped computation and explicit unsupported statuses. If adding a dependency or redistributing a bundle, update both locks and the notice inventory; installed top-level metadata is not a complete transitive license review.
