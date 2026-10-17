# Frontend handoff

PRISM retains six connected views: Workbench, Knowledge Map, Attack Lab, Research Intent, Pareto Explorer and Report. The visual identity is an indigo-ink frame (navigation rail and top bar) holding one rounded light sheet. Colour keeps the product's own channels: graphite for the original, violet for the protected candidate, orange for exposure and grey for what the research questions lost. Green is intentionally absent because nothing in PRISM is a safe signal. Type is self-hosted: Bricolage Grotesque for headings and figures, Instrument Sans for the interface, and IBM Plex Mono only for hashes and identifiers. Keep product controls close to the actual tables and measured consequences; do not replace this with a generic SaaS dashboard.

## Interface refresh

The Workbench opens with `Hero.tsx`: a four-step workflow position (`Journey.tsx`), a refraction diagram of the evaluated snapshot (`Refraction.tsx`) and measured tiles (`MeasureTiles.tsx`). The tiles read the same `Measure` objects as the ledger (`measuresFor` in `Ledger.tsx`), so an unavailable value keeps its reason and is never drawn as zero, and the suppression line uses the measure's own label (an external file is "Rows fewer than the source", not proof of suppression). In the diagram the entering beam is the unprotected baseline's sample uniqueness, orange is the shown snapshot's, violet is the measured reduction (what the recipe protected), and grey is the normalised research-query loss. A measured zero is a hollow terminal mark, "not reduced" is its own state, and only an unmeasured value is dashed. Widths are measured fractions; a real but tiny value is drawn at a 3 px minimum and labelled with its exact figure; an unmeasured value is a dashed hairline and a dash.

Rules for later changes:

- Nothing may read as a pass mark. The last workflow step counts what was tried and never shows a completion mark, and no gauge has a "good" end.
- Motion answers an action. The border beam runs only while a job runs, the sheen plays twice when Apply carries unapplied edits, and the rays draw once per snapshot shown. All of it stops under `prefers-reduced-motion`.
- Long explanations stay verbatim behind the page head's info button or a disclosure; release-clearance wording, fictional/hosted labels, unit and pairing notes stay inline.
- One shared set of pieces: `PageHead`, `ViewEmpty`, `RoleIcon` (`ROLE_META`) and `BorderBeam`. The "Magic UI" effects are written natively because the content-security policy rules out CDN scripts and the app has no Tailwind.
- The measurement ledger starts collapsed (a stored preference still wins); its release-clearance chip is always visible.

Existing Archie revisions under `frontend/public/archie-assets/` are immutable and were not touched. This interface reaches the Archie page only through a new revision (see Hosting and publication).

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
