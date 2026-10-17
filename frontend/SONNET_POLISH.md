# PRISM frontend: maturation pass (Claude Sonnet 5.5 xhigh)

Scope: `frontend/src/**`, `frontend/index.html`, this file. Nothing else was edited: no backend, API contract, manifests, lockfile, `vite.config.ts`, fixtures or docs. The information architecture (six views, graphite rail and library, neutral canvas, violet candidate channel, orange exposure) is unchanged. No dependency was added.

## 1. Check results

| Check | Result |
| --- | --- |
| `npm run typecheck` (frontend, final run after all edits) | exit 0, no diagnostics |
| `npm run build` (`tsc -b && vite build`, final run) | exit 0, built in 2.23 s; main chunk 348.26 kB (109.54 kB gzip), Workbench chunk 64.32 kB; no chunk-size warning |
| Real-browser smoke, throwaway mock API (see section 4) | 87 of 88 checks pass (four scripts: 52, 14 of 15, 14, 7); the one "failure" is a console assertion that counts the 404s the mock produces on purpose (audit endpoint not mocked, request after a deliberately deleted session) |

Backend suites were not run, as instructed. The mock API is not the backend, so the browser results prove layout, interaction and wording, not scientific correctness.

## 2. What changed, and why

### 2.1 Hosted fictional demo (new scope)

- `types.ts`: `ApiHealth` gains optional `deploymentMode` and `uploadsAllowed`.
- New `deployment.ts` derives one of three states from origin plus the health payload.
  - **hosted**: `deploymentMode === 'synthetic_demo'`, or a non-local origin before the service has answered (marked provisional, banner says "confirming with the service…").
  - **remote**: a non-local origin whose health payload does not identify the demo. It gets the stricter "not served from this computer, do not load real data" warning, never the demo wording.
  - **local**: everything else. Behaviour is unchanged.
  - Uploads are allowed only when the state is local, `uploadsAllowed !== false`, and health is not still `checking`.
- New `shell/DeploymentBanner.tsx` replaces the old origin warning: dismissible, says every record is invented, that the measurements are real computations run on the hosted demo server rather than on this computer, that uploads are off, and to run PRISM locally for private files. "What this means" opens the Privacy dialog.
- Everywhere an upload used to be offered is now disabled or replaced with the one-sentence reason:
  - File menu (Import, Audit) and Library "+" menu (items disabled with a hint).
  - Workbench empty state (the Import button is removed, the note is shown).
  - Session-lost banner (Import button removed).
  - Prepare/Audit mode toggle (Audit disabled, tooltip with the reason, unless an audit candidate already exists).
  - Import and Audit dialogs render an explanation (no file chooser) when uploads are off.
  - Defence in depth in `workspace.tsx`: `importOriginal` and `runAudit` refuse and notify.
- Wording that said "local" now follows the mode:
  - Top bar mode chip: `Hosted demo` / `Remote origin` / `Local`; violet underline on the top bar for hosted; the document title carries the mode.
  - Session footer: `Hosted fictional demo`, "Service … · fictional records · uploads off".
  - "Clear session…" versus "Clear local session…" in menu, footer, clear dialog and replace dialog.
  - Privacy dialog gains Mode, Where measurements run and Uploads rows, plus a line that demo results are not clinical evidence.
  - Attack Lab, Pareto progress text and footer, Report record header, Workbench empty state, `cancel` toast, export-unavailable toast.
  - The unreachable-service message is neutral on a non-local host (the "start the backend on 127.0.0.1:8000" advice only appears on a local origin).
- Hosted records are always labelled fictional (`isFictional`), whatever the dataset flag says.

### 2.2 Scientific data-truth and unit fixes

- `pct()` and `pointsDelta()` never round a non-zero value to "0%" or "0 pts" and never round a value below 1 to "100%" (they print `<0.1%`, `>99.9%`, `+<0.1 pts`).
- Ledger:
  - Single-guess correctness and row-index uncertainty were still printed when membership was unknown, contradicting their own "not applicable" note; they now abstain.
  - "Rows suppressed" is unknown (not 0) when the source size is unknown; an external release is labelled "Rows fewer than the source" (a smaller file is not proof of suppression) and "More rows than the source" is shown as not applicable instead of a negative percentage.
  - Baseline row loss is computed from the baseline, not hard-coded to 0; an unavailable composite loss says why.
- Research questions in the Ledger and the cohort bars now use the same unit-aware formatter as the Report: percentage points for rates, `rows` for counts, Δr for correlations, and the comparison unit (kg after an explicit lb conversion) for means, including tolerances. The Research Intent tolerance field says "lb in the source; results are compared in kg after an explicit conversion" for an lb weight column. The review dialog notice explains the conversion (new glossary entry).
- Distribution charts paired original and protected bins by array position. A recipe that merges or relabels categories (ZIP prefixes, rare-group merging) drew unrelated categories as if they were the same value. Bins are now paired by label; categories present on one side only are called out and shown as "— not present" in the table. Equal-length numeric bins still align by position (shared edges). Literal label distance (`lexicalTv`) and common-level preservation (`semanticComparison`) are shown separately in a "How this comparison is measured" disclosure, with the unit comparison. Means carry the measured unit.
- Protected table headers now say what the recipe did to each column (`[a,b) bands · width 5`, `3-digit prefix`, `year only`, …) instead of the source type, which no longer describes the values.
- New Workbench Subgroups panel (`charts/SubgroupTable.tsx`): declared-subgroup counts, count change, owner-verified retention (Unknown, never 0, when pairing is not verified), status, bounded coverage text from the evaluator.
- Glossary: the research-query-loss entry claimed an unavailable question "counts as full loss"; it now matches the contract (the composite becomes unavailable). The membership and release-scenario help buttons opened the Pareto-frontier card; they have their own entries. "Frontier" wording is now "nondominated" in the Library.
- Pareto plot axes round to a tidy maximum (loss capped at 1, tick labels 0 / .25 / .5 / .75 / 1 of a round value, one decimal for small x ranges).

### 2.3 Interaction, stale, error and recovery fixes

- **Stale menu closure (real bug).** The top-bar menus were memoised on a short dependency list, so Data > "Apply and evaluate recipe" could evaluate an earlier recipe after two successive edits. Menus are rebuilt each render. Verified in the browser.
- **Skip link reset the view.** `href="#main"` changed the hash, and the hash router answered by switching to the Workbench. It now focuses `<main>` and leaves the route alone.
- Global shortcuts (Alt+1…6, Ctrl+Enter, `[`, `]`, `?`) no longer act behind an open modal dialog.
- **Tooltips and toasts were invisible inside modal dialogs** (the dialog sits in the browser top layer; both rendered at the end of `<body>`). Both now render inside the open dialog. Escape on a tooltip no longer also cancels the dialog.
- New `ErrorBoundary` around each view: a render fault shows "This view could not be displayed" with Try again / Open the Workbench, while the rail, library, candidates and session stay intact. Resets on view change. The Report also tolerates a missing `risk.exposure`.
- Health: polls every 5 s while the service is down (30 s otherwise), re-checks on `online` and tab visibility, loads the registry and counterexamples if they were missing at start-up, and re-loads the demo by itself when the service returns after a failed start.
- Error toasts stay until dismissed (they often carry the only reason for a blocked action); information and warnings clear themselves; identical messages replace each other.
- Review-classifications and in-progress audit dialogs no longer discard edits on a stray backdrop click. Dialogs gain `aria-describedby`.
- Non-JSON or 204 responses become a readable error instead of a raw parse error.
- Library drawer and inspector sheet: focus moves in, Tab is trapped, focus returns to the opener on close.
- Evaluations are announced to assistive technology (pending, "Showing C2", search finished) and each view sets the document title.

### 2.4 Responsive and layout (found in a real browser at 390 px and 768 px)

- Workbench on a phone was 686 px wide: the implicit grid track grew to the widest tab strip. The track is capped.
- Visually hidden (`sr-only`) text is absolutely positioned; inside scroll containers that were not containing blocks it widened the page (Knowledge Map 396 px, Workbench ledger 480 px) and produced a second scrollbar on desktop. The containers are now positioned.
- Attack Lab segment tabs overflowed by 10 px on a phone.
- Banners above a view pushed the measurement ledger off screen because the view was `height: 100%` under them; the canvas now stacks them and gives the view the remaining height (checked: ledger bottom equals the window bottom in local and hosted mode).
- The primary toolbar action stays pinned in a narrow toolbar (it was clipped at 768 px). Ledger figures keep `152 / 480` on one line. Hosted banner stacks its actions on phones; the mode chip stays visible on phones.

### 2.5 Visual hierarchy and readability

- Consistent page headings (21 px, 600) across Knowledge Map, Attack Lab, Research Intent and Pareto; the slogan headings in Knowledge Map and Attack Lab ("Small facts. Distinctive combinations.", "See the failure, understand the assumption.") became plain functional titles.
- 123 declarations below 11 px (down to 8 px) were raised to 11 px. `--ink-4` darkened to `#646d7b` (about 5.2:1 on white and 4.8:1 on the light panel grey by hand calculation; 4.4:1 on the bare canvas grey, where it is rarely used).
- One review call to action per state instead of four near-identical primary buttons in the unreviewed Workbench.
- Whole-view reveal no longer uses a blur filter (cheaper, no flicker on large tables). Reduced motion removes it entirely (verified `animation-name: none`).
- Phone touch targets raised to 36 px; favicon is an inline SVG (the old `/favicon.svg` did not exist); a `<noscript>` message and an updated meta description.

## 3. Files

Added: `src/deployment.ts`, `src/shell/DeploymentBanner.tsx`, `src/ui/ErrorBoundary.tsx`, `src/charts/SubgroupTable.tsx`, `src/styles/polish.css`, this file.

Edited: `index.html`; `src/` `api.ts`, `format.ts`, `glossary.ts`, `hooks.ts`, `main.tsx`, `recipe.ts`, `types.ts`, `workspace.tsx`; `shell/` `Shell.tsx`, `Sidebar.tsx`, `Dialogs.tsx`, `SchemaReview.tsx`; `ui/` `Dialog.tsx`, `Feedback.tsx`, `Tip.tsx`; `charts/` `CohortBars.tsx`, `DistributionChart.tsx`; `views/` `Workbench.tsx`, `AttackLab.tsx`, `KnowledgeMap.tsx`, `ParetoExplorer.tsx`, `ResearchIntent.tsx`, `Report.tsx`, `intent/QueryResults.tsx`, `pareto/ParetoPlot.tsx`, `workbench/` `DataTable.tsx`, `Ledger.tsx`, `RecipeInspector.tsx`, `ThreatPanel.tsx`; styles `tokens.css`, `base.css`, `shell.css`, `controls.css`, `data.css`, `workspace.css` and the five view stylesheets (font-size floor and headings).

Build by-products left in place: `frontend/dist/` and `frontend/tsconfig.tsbuildinfo`.

## 4. Real-browser evidence

Tooling: `playwright-core` (already a dev dependency) driving the installed Google Chrome, headless. No dependency was installed. The page under test was the built `dist/` served by a throwaway Node script in `%TEMP%\prism-mock` on ports 47311-47313 (stopped afterwards). It speaks the `/v1` contract with numbers fabricated by formulas, because this copy has no backend and the parent servers must not be touched. Screenshots (1440, 768, 390 px) were viewed during the pass; they live in `%TEMP%\prism-mock\shots` and are not part of the deliverable.

Verified in that browser:

- All six views render without a fault or console error in local mode; no document-level horizontal overflow at 768 and 390 px in any view.
- Review dialog: the glossary tooltip appears above the modal; Escape closes only the tooltip.
- Skip link keeps the current view; the Data menu applies the latest recipe after two edits.
- Stale banner appears on a recipe change, blocks the owner-audit download, and clears after re-evaluation; a matching snapshot downloads JSON; CSV review stays disabled until all three acknowledgments are ticked and the request carries exactly `authority`, `limitations`, `reviewed`.
- Local mode still offers the import and audit dialogs with file choosers; an original upload opens classification review; an error raised inside the audit dialog is visible inside the modal and persists until dismissed.
- Lost session shows the recovery banner; "Start over" reloads a demo.
- Hosted flag (`deploymentMode: synthetic_demo`, `uploadsAllowed: false`): banner, `Hosted demo` chip, fictional labels, disabled Import/Audit, privacy wording, "Clear session…", phone layout.
- Remote origin (127.0.0.2) with a slowed health response: provisional hosted banner, then the remote warning once health arrives without the flag; unreachable service shows the neutral message and no 127.0.0.1 advice.
- lb source (benchmark fixture): unit arrives as `lb` and must be confirmed; protected header, distribution mean, ledger and Report show kg; the Intent tolerance helper explains the conversion.
- Error boundary: forcing a malformed candidate shows the fault card with the rest of the workspace intact, and recovery returns to the Workbench.
- `prefers-reduced-motion: reduce` disables the view transition.

## 5. Material limitations

- The browser runs used a mock API. Real payload shapes were taken from `types.ts` and the contract; anything the real service returns that the types do not describe was not exercised. In particular the hosted health payload was simulated from the task description (`deploymentMode`, `uploadsAllowed`); the real hosted worker's output was not available to me.
- Local audit with a verified pairing and the full external-CSV path were only exercised as far as the dialog and a rejected request; root's earlier live verification of the real external upload remains the evidence for that path.
- Chrome only. No Firefox, Safari or real touch device. No screen-reader session; accessibility was checked with keyboard-driven scripts, a role-and-name scan of every view (no unnamed visible controls apart from one false positive inside a closed disclosure; no duplicate ids; one `h1` per view after the fixes) and focus assertions, not with an assistive-technology audit or an automated contrast tool.
- The Subgroups panel and the label-paired distributions were validated against mock data shaped like the types; the real evaluator may return fields in forms the types do not predict (all fields are treated as possibly absent).
- Equal-length numeric bins are still paired by position (the service documents shared edges); if the service ever returns shifted edges of equal length the outline would be misaligned.
- Pareto point size for an unknown row loss is still the smallest marker (the table and the accessible name say "unknown").
- Text below 11 px was raised everywhere except the tiny count inside overlapping Pareto markers (`.px-dot`, 8 px, redundant with the accessible name).
- A dismissed deployment banner stays dismissed until reload; the top-bar chip and session footer keep the mode visible.
- No claim here is an audit approval; root's independent audits and live acceptance are still required.
