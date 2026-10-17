# PRISM 0.1.1 frontend handoff

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

## Current workflow

The compact hosting notice and concise initial ledger leave room for source rows immediately. Import table and Semantic example are directly accessible. Classification and record-grain review remain deliberate. The duplicate introductory panel was removed, and Protection preference appears after an actual candidate exists. No mock candidate or favorable empty metric is inserted to populate the screen.

The hosted workbench accepts real CSV, JSON and single-sheet XLSX files up to 3 MiB, 100,000 rows and 80 columns, with eight datasets per visitor. Files and external protected versions use the same parsing and engine contracts as local imports. A dataset's `synthetic` flag controls fictional labels; the hosting origin does not. Local intake supports files up to 50 MB. The main workflow has no account/login or permission checklist.

Source data remains unchanged. `draftPreview.ts` previews compatible row-local recipes immediately while full measurements remain pending. Semantic corrections create revisions and stale previous evidence; immutable snapshots keep their original interpretation. Protection preference selects real cached evaluated candidates and displays measured uniqueness and scientific loss. It does not interpolate a universal protection score.

The primary Jev Interpret action prepares a current outbound-metadata digest and requests interpretation directly. View model input is optional and read-only. Only schema metadata goes to the provider; no source rows. Manual corrections and local deterministic inspection remain available. Jev does not run during slider movement or candidate replay. Findings highlight their contributing column combination and show actual evidence or missing prerequisites.

Direct protected-CSV download uses the current selected frozen candidate, recognized direct-identifier checks and version guards. It does not require the former three acknowledgment boxes. JSON/HTML evidence and recipe exports remain available. Main-path download labels should describe the artifact, not an approval or certification.

## Authorship and publication

Sonnet 5.5 XHigh authored the frontend through Devin; Gemini 4 Argon supplied the earlier OpenCode Go audit. Sonnet also produced the bounded v3 first-use changes before its daily quota was exhausted during self-check; the controller reviewed and completed those changes and updated real-upload copy. [v3 product review](v3-review-product.md) records that scope. Earlier three-review sequences apply to their named commits; current acceptance is recorded in [review index](frontend-reviews/README.md), [delivery status](../artifacts/DELIVERY_STATUS.json) and [verification](../artifacts/verification.md).

[Archie is the canonical public origin](https://41d0bdfd-0065-4b0b-a973-efbe1c1a9c5e.archie.site/). Archie serves the HTML entry; Vercel supplies immutable assets and Python; Archie Core stores uploaded source files plus session configuration. The former generated prototype is not the maintained application. GitHub sync has reported an error, so exact Code-editor publication is the established update path.

For each frontend release use a new unused revision with `deploy/archie-static/build-entry.mjs`, deploy its immutable assets to Vercel, then save/publish the exact tracked HTML in Archie. Keep already-published revisions available. `deploy/archie/` is an unused alternative Next adapter. The final revision is in delivery status; do not infer publication from a local build.

Use `npm run typecheck --prefix frontend`, the production build, and focused frontend regression tools as appropriate. Actual acceptance includes the fresh desktop view, imported-table flow, correction/stale recovery, real candidate comparison, external audit and downloads. Browser acceptance belongs to the release verification record, not model agreement alone.
