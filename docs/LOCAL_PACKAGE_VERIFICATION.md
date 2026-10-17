# Final local package verification

Verified on October 17, 2026 at approximately 16:32 Eastern, after the application freeze at `9f40ec1` and immutable Archie release `r20261017e` at `7759f22`. The frontend production build and `scripts/package.py` completed successfully. The wheel below contains the final application, semantic engine, intake adapters, current frontend, pitch and bundled fictional fixtures.

## Installed wheel

| Artifact | Value |
| --- | --- |
| Filename | `prism_local_workbench-0.1.0-py3-none-any.whl` |
| Size | 2,561,779 bytes |
| SHA-256 | `22968326a7914105b52bf06a7cc5cc14467f815f25a8b532ddf5c15dd49e4edc` |
| Python | 3.11.15 |
| Package version | 0.1.0 |

The wheel installed without dependency downloads into a new directory outside the editable backend:

```powershell
.\.venv\Scripts\python.exe -m pip install --no-deps --target artifacts/wheel-smoke/20261017-final-e/installed dist/prism_local_workbench-0.1.0-py3-none-any.whl
```

The smoke script ran with Python `-I`, with its working directory at `artifacts/wheel-smoke/20261017-final-e/`. It explicitly prepended the installed target and asserted that `app.__file__` resolved to `installed/app/__init__.py`, outside `backend/`. Existing virtual-environment dependencies supplied the runtime; this was **not a fresh dependency installation**. Remote Jev execution was disabled for the smoke check, and no model calls were made.

All checks used `TestClient` against the allowed loopback origin, `http://127.0.0.1:8000`:

| Check | Result |
| --- | --- |
| `/health` | HTTP 200; package version 0.1.0 |
| `/` | HTTP 200; production HTML, 1,760 bytes |
| HTML-referenced `/assets/index-BUB_Zi3l.js` | HTTP 200; 360,453 bytes |
| HTML-referenced `/assets/index-DyXvwGmB.css` | HTTP 200; 57,005 bytes |
| `/pitch/` | HTTP 200; revised semantic pitch |
| `/pitch/PRISM-Pitch.pdf` | HTTP 200; 76,959 bytes; PDF header, seven page objects, canonical Archie demo annotation |
| `/v1/demo?fixture=kit` | 480 fictional records and nine schema fields |
| `/v1/registry` | 26 threat families and 17 protection entries |
| `/v1/semantics/ontology` | 145 types, 13 families and 24 semantic attack categories |
| Semantic fixture | 480 fictional records; initial classification made zero provider calls |
| Default semantic candidate | 96 combination-unique rows; selected diagnosis-response query error zero |
| Candidate provenance | 64-character hexadecimal recipe hash retained in evidence JSON |
| Semantic evidence JSON | HTTP 200; 340,909 bytes; no literal fictional source record identifier |
| JSON record-array intake | Two imported rows |
| XLSX intake | Two imported rows using existing openpyxl 3.1.5 |

The tested semantic recipe hash was `58aadf56e4416e19689d854e5334874b36faf4558e1e4bc1ec84f17a32fdb435`. This identifies a recipe, not a release approval. The 96-row result describes sample combination uniqueness; it is separate from the kit's verified-linkage benchmark.

The installed wheel also contains the fictional benchmark CSV, catalog JSON, ontology JSON, Jev adapter and complete frontend runtime license notices. The run emitted the existing Starlette warning that its `httpx` TestClient integration is deprecated; all checks passed.

The reproduction script and machine-readable receipt are retained locally at `artifacts/wheel-smoke/20261017-final-e/verify.py` and `verification.json`. These machine-specific files and the installed smoke target are excluded from the source release.

## Source handoff inventory

The package-time `dist/PRISM-workbench.zip` checkpoint was 10,520,408 bytes with 794 members. Its CRC check passed. All 38 required release paths were present, including:

- Backend source, pinned requirements, production static app, benchmark and catalog fixtures.
- Semantic ontology, Jev adapter, deterministic rule engine, structured intake and integration tests.
- Frontend source, manifests and lockfile, production build, web pitch and portable PDF.
- Both Archie deployment adapters: the published static HTML entry/build utility and the alternative Next.js source/lockfile/regeneration utility.
- All 39 assets for immutable Archie revision `r20261017e`; the static entry references that revision.
- API entry, deployment configuration, local setup/start scripts, license/attribution material, documentation and the tested wheel.

The inventory excluded conventional environment files, credential directories, private key filenames, caches, logs, transcripts, Git state, `node_modules`, virtual environments, `.next`, `.hosting-root`, private pitch renders and generated duplicate Next.js assets. A bounded content check found no recognized OpenRouter/GitHub/Anthropic credential, AWS key identifier or private-key signature. This is a release-content check, not a general security certification.

The release owner refreshes the source ZIP from the same `source_paths()` inventory after final documentation, screenshots and submission-draft evidence are complete. That refresh reuses the **tested wheel above**. Source ZIP checksums belong in the external release receipt or checksum file; embedding a ZIP's own final hash inside a document contained by that ZIP would be circular. The package-time ZIP hash is retained in the ignored machine-readable receipt rather than represented here as the final handoff hash.

This verification establishes installed-package execution and release inventory. It does not replace the separate hosted browser checks, semantic provider verification or full backend suite recorded by the release owner.
