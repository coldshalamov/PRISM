# Third-party dependency notices

New PRISM implementation code uses the root MIT license. The adapted `backend/app/linkage.py`, copied kit benchmark fixtures/catalog, and preserved `reference-kit/PRISM` and `docs/reference-kit` materials retain the supplied Apache-2.0 license and original notice. See `NOTICE`, `reference-kit/PRISM/LICENSE` and `docs/KIT_BASELINE.md`. The MIT grant does not relicense these materials or dependencies. This inventory records installed Python and frontend lockfile metadata on 2026-10-17; it is not a certification of all licensing or redistribution obligations.

## Python

The declared direct requirements and optional extras are in `backend/pyproject.toml`. `backend/requirements.lock.txt` records the installed resolved versions. The following license labels come from installed `License-Expression`, `License` or bundled license metadata:

| Package | Recorded version | Package license | Role / upstream |
|---|---|---|---|
| FastAPI | 0.143.3 | MIT | HTTP framework; [upstream](https://github.com/fastapi/fastapi) |
| Uvicorn | 0.54.0 | BSD-3-Clause | ASGI server; [upstream](https://github.com/Kludex/uvicorn) |
| python-multipart | 0.0.32 | Apache-2.0 | CSV upload parser; [upstream](https://github.com/Kludex/python-multipart) |
| pandas | 2.3.3 | BSD-3-Clause | Table operations; [upstream](https://github.com/pandas-dev/pandas) |
| NumPy | 2.0.2 | BSD-3-Clause, with bundled notices | Arrays/statistics; [upstream](https://github.com/numpy/numpy) |
| SciPy | 1.15.3 | BSD-3-Clause, with bundled notices | Scientific runtime dependency; [upstream](https://github.com/scipy/scipy) |
| pytest | 9.1.1 | MIT | Optional development tests; [upstream](https://github.com/pytest-dev/pytest) |
| HTTPX | 0.28.1 | BSD-3-Clause | Hosted Archie transport and HTTP/API tests; [upstream](https://github.com/encode/httpx) |
| openpyxl | 3.1.5 | MIT | Bounded read-only XLSX table intake; [upstream](https://openpyxl.readthedocs.io/en/stable/) |
| et_xmlfile | 2.0.0 | MIT | Resolved openpyxl XML writer dependency |
| pyCANON | 1.3.6 | Apache-2.0 | Optional categorical k/l/t verification; [upstream](https://github.com/IFCA-Advanced-Computing/pycanon) |
| Pydantic | 2.13.5 | MIT | Resolved schema validation dependency; [upstream](https://github.com/pydantic/pydantic) |
| Starlette | 1.8.0 | BSD-3-Clause | Resolved FastAPI dependency; [upstream](https://github.com/Kludex/starlette) |

The complete license texts are supplied inside installed distribution metadata: commonly `<package>-<version>.dist-info/licenses/`, or the pandas/NumPy/SciPy `.dist-info/LICENSE*` files. NumPy and SciPy also carry notices in their own package subdirectories. Wheels can bundle additional numerical runtimes with separate notices; the single package label above is not a complete inventory of those components. Optional pyCANON installation brings additional packages listed in the lockfile; those packages are not all enumerated in this top-level table.

## Frontend

These exact versions and declared license labels were read from `frontend/package-lock.json`; `package.json` contains version ranges while `npm ci` uses the lockfile.

| Package | Locked version | Declared license |
|---|---|---|
| react | 19.3.1 | MIT |
| react-dom | 19.3.1 | MIT |
| scheduler | 0.28.0 | MIT |
| lucide-react | 0.468.0 | ISC |
| @fontsource/ibm-plex-mono | 5.3.0 | OFL-1.1 |
| @fontsource/ibm-plex-sans | 5.3.0 | OFL-1.1 |
| @fontsource/ibm-plex-serif | 5.3.0 | OFL-1.1 |
| @types/react | 19.3.0 | MIT |
| @types/react-dom | 19.3.0 | MIT |
| @vitejs/plugin-react | 4.7.0 | MIT |
| TypeScript | 5.9.3 | Apache-2.0 |
| Vite | 6.4.4 | MIT |
| playwright-core | 1.64.1 | Apache-2.0 |

React, React DOM and the transitive scheduler package are published by the React project; type declarations are from DefinitelyTyped. Lucide icons retain their upstream notices. Playwright is a development-only package, not part of the application runtime bundle. Installed npm packages include their own LICENSE/NOTICE files; the lockfile includes resolved transitive packages and integrity hashes.

The IBM Plex Mono, Sans and Serif font files are self-hosted from the three Fontsource packages above. Their installed `LICENSE` files contain IBM's copyright notices and the full SIL Open Font License 1.1; the package metadata and lockfile both identify version 5.3.0 and `OFL-1.1`. The pitch preserves separate copies at `frontend/public/pitch/fonts/IBM-Plex-Mono-LICENSE.txt`, `IBM-Plex-Sans-LICENSE.txt` and `IBM-Plex-Serif-LICENSE.txt`, alongside the local WOFF2 files. No remote font service is needed.

`scripts/package.py` reads the actual locked production npm package inventory and copies each package's complete installed license text into `backend/app/licenses/FRONTEND-RUNTIME-LICENSES.txt`. The same generated text is distributed in the static app as `THIRD_PARTY_LICENSES.txt` and retained at `frontend/public/THIRD_PARTY_LICENSES.txt`; it covers the three Fontsource packages, Lucide, React, React DOM and scheduler. The packager fails if an included production package lacks a recognized license-text file. Development-tool license files remain in their upstream distributions.

## Distribution boundaries

The repository contains source and synthetic fixtures. Package installation downloads upstream distributions. If distributing a built application, vendored code, wheels, `node_modules` or a desktop bundle, preserve the applicable full copyright, license and NOTICE texts from every redistributed component, including transitive dependencies and bundled numerical libraries. This table is not a replacement for those texts. The generated frontend production-license bundle is included as described above. A complete redistribution review, or a review of every Python transitive dependency and bundled numerical runtime, has not been performed; those dependency distributions retain their own full license and notice files.

ARX, sdcMicro, SDMetrics, Anonymeter, OpenDP and SDV are references or unimplemented integrations, not bundled adapters. Their absence here does not grant rights to bundle them later. In particular, do not infer that a generator or its models share PRISM's MIT license; re-check the precise artifact and version before adding it.

No proprietary patient datasets, downloaded stock images, remote fonts or paid API assets are required for the synthetic demonstration. Fixture records are generated by `examples/generate.py` and the backend's deterministic generator.

Optional Jev semantic decisions use the hosted OpenRouter `typesafe/jev-1.14` service. This is an external service, not redistributed model weights. The deterministic core and bundled fictional datasets work without it. Request schema and pinned provider documentation are recorded in `docs/SEMANTIC_ENGINE.md`.
