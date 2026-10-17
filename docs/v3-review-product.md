# PRISM v3 product reconciliation

Reviewed 17 October 2026 against the current source and the supplied desktop screenshot. The supplied v3 Markdown and ZIP catalogs are design inputs, not proof that their listed capabilities exist.

## Product fit

The existing six-view application is already the right product shape for v3 sections 1 and 16: the main workbench contains synchronized source/candidate tables, real transformation controls, deterministic measurements, research questions, findings, and intentional exports. Knowledge Map is a secondary view. There is no chatbot or invented overall safety score. Semantic corrections produce revisions; old evidence is marked stale; the preference control selects real evaluated snapshots rather than interpolating a privacy promise. Classification and records-versus-people review remain explicit user actions.

The v3 architecture is broader than the enabled release. Its 144 leaves, 60 rules, 25 detectors, 23 transforms, and 90 proposed acceptance cases are not a reason to replace a working tested registry or advertise unimplemented attacks. Existing unsupported/artifact-dependent findings must remain uncovered. The supplied ZIP README explicitly distinguishes specification arithmetic checks from application verification.

## Immediate maturity gap

The supplied desktop screenshot shows a real first-use layout defect, not a different phone layout. A long hosted deployment notice, a second review introduction, an unavailable preference panel, and a padded empty ledger consume nearly all visible workbench height. The source table exists below these panels but is not immediately visible. That conflicts with v3 section 1.3's table-first workflow and makes the product appear empty compared with a prepared demonstration screenshot.

Minimum scoped repair, retaining the established visual design:

1. Compact the hosted notice to the essential fictional-record, hosted-computation and uploads-off summary, with the existing Privacy and limits dialog retaining the complete hosting, optional-model and session explanation. Leave the stronger unidentified-remote warning intact.
2. Remove the duplicate review introduction above the tables. Keep the toolbar, candidate placeholder and inspector review actions and their existing evaluation gate.
3. Do not render Protection preference until an actual candidate exists. Once a candidate exists retain the truthful unavailable/alternatives state until at least two comparable snapshots exist.
4. Replace the padded no-candidate ledger with a compact, actionable state: review fields before measuring; no measurements yet. Do not manufacture a candidate or display favorable zero metrics.
5. Make the semantic ambiguity example available directly in the Workbench toolbar, using the existing replacement-confirmation flow. Its current entry is hidden below the tables inside the collapsed semantic panel.

Exact implementation scope: `frontend/src/shell/DeploymentBanner.tsx`, `frontend/src/views/Workbench.tsx`, `frontend/src/views/workbench/Ledger.tsx`, and small scoped rules in `frontend/src/styles/data.css` / `polish.css`. No theme replacement or feature proliferation is needed.

## Other material v3 distinction

The current Jev action is explicit and metadata-only; a disclosure says what categories leave the app. It does not yet show an exact outbound payload with label deselection/editing and a payload-specific consent grant as specified in sections 5.3 and 18.3. This distinction should be implemented deliberately or described accurately, rather than claiming the complete v3 consent system. Confirmed user meanings must remain authoritative and model failure must leave deterministic review available.

## Smallest useful verification for the scoped layout fix

- Fresh desktop session at the user's 1920×1080 scale and at 1440×1000: source headers and multiple source rows appear without dismissing any notice; candidate pane shows the review action; no measurement or candidate is invented.
- Load the semantic example using the visible action, honor the replacement dialog, review classifications manually, and confirm the real first candidate appears.
- Check one narrow 390px render for containment and review access; run the production TypeScript/Vite build. The established backend scientific suite does not need rerunning for copy/layout-only changes.
- Publish a fresh immutable asset revision and verify the public Archie origin serves that revision. Archive exact before/after first-run evidence; do not substitute only a populated demonstration screenshot.

This review is a targeted product reconciliation. It is not a claim of full v3 implementation, formal accessibility certification, or global optimality.

## Implemented targeted repair

Sonnet 5.5 XHigh was invoked through authenticated Devin CLI 3000.11.92 in the isolated `artifacts/v3-sonnet` worktree, session `accessible-tuck`, base `44de58b`. It produced the five scoped file changes above. The daily Devin quota was exhausted during its final self-check (exit 1); this was not a completed model verification. The controller reviewed and integrated the actual diff, then completed the bounded corrections described below.

The user subsequently explicitly required real hosted imports and external audit. The compact banner therefore describes a **hosted workbench**, enabled CSV/JSON/XLSX imports, Vercel Python execution and Archie Core session table/recipe storage. It does not claim fictional-only operation or require local execution. The unknown-remote warning remains unchanged. The Workbench toolbar now exposes **Import table** and **Semantic example** directly, with session-busy guards; the accessible example label contains its visible text. Source labels rely on the dataset's synthetic flag rather than deployment origin (engine teammate owns that helper).

The redundant introduction is removed, preference is absent until a real selected candidate exists, and the ledger's initial state is a concise actionable statement rather than a padded empty card. Review and record-grain acknowledgments remain deliberate; no candidate or measured value is generated in the browser to make the screen look populated. The source dataset is unchanged.

Controller check: `npm run typecheck` in `frontend` passed (exit 0). No integrated build, source commit or deployment was performed by this worker. Parent owns actual rendered desktop/phone acceptance and final Archie publication; visual success is not inferred from type checking or model agreement.

The metadata consent implementation is owned by the separate metadata worker; the earlier distinction in this review describes the pre-change source and must not be read as that worker's final result.
