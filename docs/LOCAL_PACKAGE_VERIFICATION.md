# PRISM 0.1.1 local package verification

Verified October 17, 2026 after cloud frontend merge `162fd18`, using the controller's completed standard frontend production build. The public immutable Archie entry is a separate deployment artifact; this check exercises the actual installed local wheel.

## Tested wheel

| Artifact | Value |
| --- | --- |
| Filename | `prism_local_workbench-0.1.1-py3-none-any.whl` |
| Size | 4,699,562 bytes |
| SHA-256 | `82038a8cfffba763cdc179c17b6cfd4a67ecca03cccbf507261810d11a40f851` |
| Python | 3.11.15 |
| Distribution and health version | 0.1.1 |

The wheel installed with `pip install --no-deps --target artifacts/wheel-smoke/20261017-final-cloud-v011/installed`. The smoke script executed with Python `-I` from that smoke directory and asserted that `app.__file__` resolved inside the installed target, outside the editable backend. Existing virtual-environment dependencies supplied the runtime; this was **not a fresh dependency installation**. Jev was disabled and no model requests occurred.

## Installed execution

All routes were exercised through the installed application's TestClient at its allowed loopback origin.

| Check | Result |
| --- | --- |
| Health | HTTP 200, application 0.1.1 |
| Production entry | HTTP 200, 1,767 bytes |
| Referenced JavaScript | `/assets/index-APEoAvhJ.js`, HTTP 200, 358,547 bytes |
| Referenced stylesheet | `/assets/index-BEDwOuCr.css`, HTTP 200, 65,666 bytes |
| Pitch | HTML 10,089 bytes; PDF 76,682 bytes, PDF signature and seven page objects |
| Semantic registry | 25 registered semantic categories |
| Original threat registry | 26 threat families |
| Bundled fictional kit | 480 records |
| CSV / JSON / XLSX intake | Each imported 480 records and nine fields with identical previews and `synthetic=false` |
| Explicit semantic recipe | 96 combination-unique rows from 480, both selected query errors zero |
| Frozen recipe provenance | 64-character hash retained in owner evidence |
| Direct protected CSV | HTTP 200, 29,282 bytes, 480 rows plus header, removed identifier/narrative columns absent; no acknowledgment flags sent |
| External protected-file audit | Unpaired 480-row output, zero sample-unique fraction, response error zero, height mean error 1.2 cm, verified linkage unavailable |
| Local session clear | HTTP 200 and confirmed cleanup |

The tested recipe hash is `58aadf56e4416e19689d854e5334874b36faf4558e1e4bc1ec84f17a32fdb435`. This identifies a recipe, not release authorization. Sample uniqueness is distinct from the kit's verified-linkage benchmark.

The installed smoke completed in 1.69 seconds. It emitted the existing Starlette TestClient deprecation warning; all checks passed. The script and machine-readable receipt remain locally in ignored `artifacts/wheel-smoke/20261017-final-cloud-v011/`.

## Package construction and handoff

`scripts/package.py` now replaces its generated static tree and setuptools build cache after verifying each resolved target stays at its exact intended path. This avoids retained obsolete bundles. The wheel's **358 static files exactly match** the current built frontend inventory; there were no missing or extra static files. Bundled ontology, fixtures, pitch and complete frontend runtime license notices are included.

The source ZIP includes only the wheel matching the version in `backend/pyproject.toml`; the older 0.1.0 wheel is retained locally for history but excluded from the new handoff. The source inventory excludes machine configuration, private directories, environment files, caches, logs, Git state, installed dependencies and ignored smoke artifacts. It includes source, tests, pinned dependency manifests, both deployment adapters, fictional examples and the current static release files.

The controller refreshes the source ZIP after final documentation and screenshots are frozen, reusing this **same tested wheel**. Its final CRC/inventory and external checksum receipt are recorded separately. A ZIP cannot contain its own final checksum without a circular dependency.

This establishes installed-wheel execution and current package inventory. It does not replace the independently completed real Archie Core upload/persistence/deletion check or the controller's public-browser acceptance. The previous 0.1.0 verification belongs to the earlier release, not this one.

The installed-wheel checks were repeated after the cloud frontend merge because the actual shipped assets changed. An initial smoke assertion expected the former pitch phrase “attack categories”; it was updated to the reviewed plain-language phrase “exposure patterns,” and the complete installed smoke then passed. No application source was changed by packaging.
