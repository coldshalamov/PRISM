# Local package verification

Verified on 2026-10-17 at approximately 15:02 Eastern using the wheel and source ZIP built at 14:56. This records a working package checkpoint; final screenshots, report exports, submission copy, and subsequent frontend changes still require rebuilding the release artifacts.

## Installed wheel

The wheel installed successfully without dependency downloads into a new target outside the editable backend tree:

```powershell
.\.venv\Scripts\python.exe -m pip install --no-deps --target artifacts/wheel-smoke/20261017-150123/installed dist/prism_local_workbench-0.1.0-py3-none-any.whl
```

The smoke script ran from `artifacts/wheel-smoke/20261017-150123/`, using the existing Python 3.11.15 virtual environment with `-I` and explicitly prepending only the installed package target. It asserted that `app.__file__` resolved inside `installed/app/`, rather than the editable `backend/app/` tree. Existing dependencies supplied the runtime; this was not a fresh dependency installation.

`TestClient` used the allowed loopback origin `http://127.0.0.1:8000`. All checks below passed against the installed wheel:

| Route | Result |
| --- | --- |
| `/health` | HTTP 200; package version 0.1.0 |
| `/` | HTTP 200; production frontend HTML |
| HTML-referenced `/assets/index-EgU1iSKI.js` | HTTP 200; 349,305 bytes |
| HTML-referenced `/assets/index-sAhFYr1D.css` | HTTP 200; 56,281 bytes |
| `/pitch/` | HTTP 200; HTML deck |
| `/pitch/PRISM-Pitch.pdf` | HTTP 200; 52,264 bytes; valid PDF header |
| `/v1/demo?fixture=kit` | HTTP 200; 480 records and 9 schema fields |
| `/v1/registry` | HTTP 200; 26 threat families and 17 protection entries |

The installed package also contains the fictional benchmark CSV, bundled catalog JSON, and complete frontend runtime license notices. The run emitted the existing Starlette warning that its `httpx` TestClient integration is deprecated; the checks passed.

Reproduction script and machine-readable results are retained locally in `artifacts/wheel-smoke/20261017-150123/verify.py` and `verification.json`. These machine-specific smoke artifacts are excluded from the source release.

## Source ZIP

`dist/PRISM-workbench.zip` passed ZIP CRC validation. Its 344 members include all 24 checked release paths, including:

- Backend source, pinned dependency lock, bundled static app and benchmark/catalog fixtures.
- Frontend source, dependency manifest and lock, and the production build.
- `api/index.py`, `pitch/render.mjs`, the web deck and PDF.
- `Dockerfile`, `.dockerignore`, `.vercelignore`, `vercel.json`, and root `requirements.txt`.
- `setup.ps1`, `start.ps1`, README, implementation contract, license and attribution files, and the wheel under `PRISM/dist/`.

No archive member had a conventional `.env` filename, private credential path or key filename, machine credential directory, `node_modules`, virtual environment, Git state, logs, or JSONL transcript. A bounded content scan found no recognized GitHub token, AWS access-key identifier, Anthropic API-key, or private-key signature. This is a release-content check, not a general security certification.

The following planned review artifacts were absent at this checkpoint and must be generated before rebuilding the final handoff ZIP:

- `artifacts/prism-workbench-1440.png`
- `artifacts/prism-workbench-768.png`
- `artifacts/prism-workbench-390.png`
- `artifacts/default-report.json`

The archive already included `artifacts/DELIVERY_STATUS.json`, `artifacts/verification.md`, and `artifacts/alternative-report.json`; their final metadata may still change.

The later source-inventory update includes `deploy/archie/` source, lockfile and regeneration instructions. Its `.next`, `node_modules`, generated `.hosting-root/` staging directory, and generated `content/` and `public/` assets are excluded. The archive's existing `frontend/dist/` plus `node deploy/archie/scripts/sync-vite.mjs` recreates the adapter's assets after extraction. This is an inventory change only: the earlier archive hashes and wheel smoke above do not verify the final adapter-hosted release. A final package rebuild and archive check remain pending after the frontend freezes.

## Checkpoint hashes and scope

| Artifact | SHA-256 |
| --- | --- |
| Wheel | `3495adb535a7fb2807a3804f04a7fecb97b9aa5289a93424b9821879f20cedc6` |
| Source ZIP | `048d2b6eee9896e584bfdd88fd8061013cabcdae6b712510fcabfcb68b31bd3e` |

These hashes identify only the tested checkpoint. This smoke check establishes that the packaged local frontend, pitch assets, and fixture/catalog backend routes are available from the installed wheel. It does not replace browser interaction checks, hosted deployment verification, or the final release rebuild.
