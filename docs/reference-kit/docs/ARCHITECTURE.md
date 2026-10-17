# Architecture and data boundary

## Runtime

The browser loads static ES modules served by the Python process on 127.0.0.1:8787. Data moves **from the browser to this local Python process**; it does not remain purely browser-side. The backend uses pandas/NumPy/SciPy and FastAPI. Runtime has no model/API/network requirement. The source checkout's included frontend is served directly; no Node build is required.

A future React/Vite implementation should remain same-origin using a development proxy and a built static directory. Do not deploy a raw-data API on a free public host as a demo convenience.

## Code ownership and flow

```
CSV bytes -> data.load_csv -> schema/role confirmation
                              |
                     EvaluateRequest
                  /            |             
          transforms       threat model     workload
             |                 |               |
      candidate + private lineage -> privacy.assess
             |                                 |
             +--------------------------> utility.compare
                                               |
                                  immutable report + preview
                                               |
                            local session variant store
                             /                        
                 protected CSV export        owner-only audit
```

`engine.optimize` generates bounded alternative recipes and evaluates each through the same core; there is no separate fake scoring path. `demos.py` uses deliberately fictional fixtures. `catalog.json` is the method/explanation register, regenerated from `scripts/write_catalog.py`.

Module boundaries:
- `models.py`: public request types and parameter validation.
- `data.py`: lexical CSV preservation, size/schema checks, profiling, regex heuristics, synthetic fixture.
- `transforms.py`: pure source-to-candidate operations and owner-only lineage.
- `privacy.py`: applicable structural/linkage diagnostics and coverage statuses.
- `utility.py`: whitelisted scientific tasks and distribution/relationship metrics.
- `engine.py`: evaluation orchestration and candidate search.
- `api.py`: sessions, input/output boundaries, exports, frontend serving.
- `security.py`: bounded HTTP bodies, including absent Content-Length/chunked bodies.
- `adapters/`: optional integrations, not verified in this delivery.

## API contract

The generated OpenAPI file in `docs/api/openapi.json` is authoritative with `models.py`. Requests use `X-Prism-Client: local-workbench`. Session-specific calls also use the random `X-Prism-Session` returned by session creation.

| Endpoint | Purpose |
|---|---|
| POST `/api/session?demo=true` | Create an isolated local session and fictional fixture |
| GET / DELETE `/api/session` | Inspect session / discard stored references |
| POST `/api/source` | Load raw UTF-8 CSV body, not multipart |
| POST `/api/candidate` | Load externally protected CSV body |
| POST `/api/evaluate` | Transform, evaluate, save one candidate |
| POST `/api/audit` | Evaluate an imported candidate after semantic compatibility acknowledgment |
| POST `/api/optimize` | Return measured/infeasible recipes and Pareto objectives |
| GET `/api/variants` / `/api/variants/{id}` | Candidate history / immutable report snapshot |
| POST `/api/export` | Export selected candidate only, with explicit review acknowledgments |
| GET `/api/report/{id}` | Download confidential owner audit, not recipient evidence |
| GET `/api/catalog`, `/api/demos`, `/api/capabilities` | Explanations, computed fixtures, optional-package status |
| GET `/api/health` | Local runtime status, not a security attestation |

CSV requests preserve strings and leading zeroes. They are not multipart uploads and do not intentionally spool patient files to disk. Limits: 12 MiB/body, 30,000 rows, 80 columns, 4,000 characters/cell. Sessions are in memory, capped at four; each has a 96 MiB data budget, up to eight saved candidates, and one-hour activity TTL. These controls are not a complete denial-of-service defense.

## State semantics

Changing settings marks the displayed evaluation stale and disables candidate export until reevaluated. Reports include the recipe, field specifications, and threat snapshot. Selecting a candidate applies its actual recipe; sliders are then explicitly labeled shortcuts that would replace it. Never attach an old score to new slider positions.

Current optimizer returns recipes and results, not all candidate datasets. Applying a deterministic recipe reevaluates it. If stochastic methods are kept in a base recipe, selecting it can produce different results. A future job store should freeze candidate bytes, secret randomness, and result snapshots atomically; secrets must remain owner-only.

## Release boundary

The candidate CSV does not include source rows, matching indices, keys, random seeds, source statistics, or audit files. Row order is shuffled unless explicitly disabled. Spreadsheet-safe export adds a leading apostrophe where formula/control prefixes are detected and quotes cells. This can change lexical/numeric interpretation—including negative-looking strings—and is disclosed; machine-read CSV users can explicitly turn it off after considering the consumer application.

The audit intentionally contains exact source statistics, field information, and limited owner-side attack evidence. Removing the table preview does **not** make it publication-safe. Do not bundle it with the recipient CSV. A future public audit summary needs its own release analysis; hiding names is not enough.

The report's candidate digest describes the internal canonical serialization. It is not an attestation of privacy or necessarily the byte hash of spreadsheet-neutralized exported CSV. The export response separately provides `X-PRISM-Export-SHA256` for the actual exported bytes; it is an integrity digest, not a privacy guarantee.

## Local safety controls

Host allowlist, browser-origin allowlist, session tokens, custom mutation header, no-store responses, CSP, no public telemetry/CDNs, body caps, and non-echoing schema-validation errors are implemented. `prism.cli` binds loopback only and suppresses HTTP access logs. Tokens and datasets are not stored in browser localStorage.

The CLI is not a secure enclave. Other processes, compromised browser extensions, memory snapshots, swap, filesystem exports, screenshots, shared OS accounts, or a compromised dependency can expose data. Deleting a session removes references, not guaranteed memory erasure. Clinical deployment needs institutional approval, authenticated users, hardened packaging, a retention policy, tested logging, and an independent review.

## Future integration boundary

Use a narrow adapter result:

```
engine_id, engine_version, status, applicability,
assumptions, metrics, baselines, uncertainty,
evidence_owner_only, limits, elapsed_ms, warnings
```

No adapter may turn missing data/dependency failure into a zero risk score. A Java ARX worker should run as a local subprocess with typed input/output and temporary-file cleanup, not a remotely accessible service. A DP recipient service must be a distinct process/permission boundary; it must never expose this owner's exact-data endpoints.

## Verification model

Core unit and API tests run in-process. The supplied offline Chromium harness uses real FastAPI responses with fictional data but replaces HTTP transport with an in-process bridge. It verifies rendering and interactions, not the browser's actual enforcement of response headers. The live localhost browser test was blocked by the build environment administrator and must be rerun on the developer's machine before release.
