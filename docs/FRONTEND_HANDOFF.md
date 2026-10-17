# Frontend handoff

PRISM retains six connected views: Workbench, Knowledge Map, Attack Lab, Research Intent, Pareto Explorer and Report. The visual identity is a graphite library/navigation rail, neutral work canvas, violet candidate channel, orange exposure and self-hosted IBM Plex typography. Keep product controls close to the actual tables and measured consequences; do not replace this with a generic SaaS dashboard.

Claude Sonnet5.5 XHigh built and matured the frontend through Devin. Gemini4 Argon completed the original requested audit/improvement pass through OpenCode Go. The original independent approval sequence is reviewer2 recheck → reviewer4 → reviewer5 against source `c5404fd` and immutable revision `r20261017d`. Those approvals do not automatically cover the later semantic extension. Current extension reviews and actual browser checks are recorded in `docs/frontend-reviews/README.md` and `artifacts/verification.md`.

## Semantic workbench extension

Sonnet's additional integration remains inside Workbench. `SemanticPanel.tsx` presents cached field interpretations, controlled-vocabulary corrections, explicit metadata-only Jev permission, current-output measured findings, unsupported prerequisites and contributing-column focus. No chatbot or model-generated security narrative is used. The semantic revision participates in the existing stale-result guards; old frozen findings are never silently relabeled by a new source interpretation.

Protection preference selects actual evaluated snapshots, showing measured uniqueness and scientific loss. It is not a universal privacy percentage. Field controls use `draftPreview.ts` for supported row-local draft transformations; only the preview changes immediately. Full-table assessments remain pending until evaluation. Whole recipes requiring unavailable full-table/random operations abstain from client preview. Original data remains unchanged. The cross-engine regression check compares eleven preview recipes to Python, including conversion, negative rounding ties and ISO-week year boundaries.

The authoritative endpoints are `GET /v1/semantics/ontology`, dataset `semantic`, `POST /v1/datasets/{id}/semantics`, and candidate `risk.semantic`. API keys are server-only. Optional Jev decisions use schema metadata after user permission, while all privacy, transformation and utility calculations remain deterministic.

## Hosting and publication

Canonical public app: https://41d0bdfd-0065-4b0b-a973-efbe1c1a9c5e.archie.site/ . Archie hosts the saved HTML entry/application origin and Archie Core stores fictional session configuration. Vercel supplies pinned immutable JS/CSS/fonts and Python compute. The public route has passed real fixture, evaluation, search and download workflows. The final semantic revision and its browser outcome are in `artifacts/DELIVERY_STATUS.json`.

`frontend/src/api.ts` selects the bridge only when the production module comes from the fixed Vercel origin into the Archie page. The backend separately requires an exact configured origin. The single-flight visitor token is held only in module memory. Expired responses cannot clear a newer session generation. Local/same-origin transport remains separate.

After frontend changes, create a new immutable revision with `deploy/archie-static/build-entry.mjs`. Deploy assets to Vercel first, then save the exact generated tracked HTML through Archie's Code editor/Source Control and publish. Keep every previously published revision available. GitHub synchronization still reports an error; manual source-preserving publication works. Do not run Archie generation over the reviewed application. `deploy/archie/` is an unused alternative Next adapter, not the current host.

## Validation commands

```powershell
npm run typecheck --prefix frontend
npm run build --prefix frontend
node frontend/tools/review-regressions.mjs
node frontend/tools/draft-preview-regressions.mjs
```

Builds and reviewer opinions do not replace the actual browser route. The final acceptance covers original/protected values, consent and correction, stale guards, evaluated-candidate preference, findings details, charts, external audit and exports. Review known limits in `docs/RELEASE_LIMITATIONS.md` without inventing guarantees.
