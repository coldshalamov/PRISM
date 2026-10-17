# Source package inclusion

`scripts/package.py` includes `api/` and the `pitch/` authoring README/renderer,
along with the existing backend, frontend, docs, examples, schemas, and scripts.
The actual deck, PDF, local fonts, and font licenses live in
`frontend/public/pitch/` and are covered by the frontend source root. Root
deployment files `Dockerfile`, `.dockerignore`, `vercel.json`, and
`requirements.txt` are included so the source archive can reproduce either
deployment path.

The archive excludes environment files, hosting CLI state, credential/key files,
private directories, caches, dependency installations, machine configuration,
and symlinks or resolved paths outside the checkout. `pitch/renders/` is excluded
because the pitch README identifies those images as private visual checks.
`frontend/tools/out/` is excluded as local tooling output. Selected delivery evidence
under `artifacts/` remains an explicit whitelist. Runtime static assets remain
included; they are generated deliberately for the self-contained local package.

The existing copying of MIT/Apache license text, notices, fictional fixtures,
catalog, frontend runtime dependency license text, and the wheel is unchanged.

`source_paths()` is a read-only source inventory helper, and
`source_name_allowed()` can check exclusions without creating a ZIP or wheel.
The packaging script itself should run only after the final frontend production
build is stable. Inventory checks do not certify that a fresh package has been
built or that a deployment succeeded.
