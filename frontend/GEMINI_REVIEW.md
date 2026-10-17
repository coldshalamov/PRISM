# PRISM Frontend Audit & Improvement Pass (`GEMINI_REVIEW.md`)

Model: `opencode-go/gemini-4-argon-contributor`
Scope: `frontend/src/**`, `frontend/GEMINI_REVIEW.md` (Sonnet's graphite-shell / neutral-canvas / violet-candidate / orange-exposure design preserved intact; no external dependencies added).

---

## 1. Verification Checks Run

| Check | Command | Result |
| --- | --- | --- |
| TypeScript check | `npm run typecheck` (`tsc --noEmit`) | Exit `0`, zero diagnostics |
| Production build | `npm run build` (`tsc -b && vite build`) | Exit `0`, built in `2.59s`, all lazy view chunks and local IBM Plex font assets emitted cleanly |
| Evidence inspection | Source & desktop screenshot review (`evidence/*-1440.png`) | Audited all 6 real API desktop screenshots (`workbench-local-1440.png`, `map-local-1440.png`, `lab-local-1440.png`, `intent-local-1440.png`, `pareto-local-1440.png`, `stale-report-1440.png`) and full React/TypeScript/CSS source |

---

## 2. Concrete Findings Fixed

### 2.1 Snapshot Integrity & Unsaved Workload Edits (`workspace.tsx`, `analysis.ts`, `ResearchIntent.tsx`, `EvidenceBanner.tsx`, `Report.tsx`)
- **Unsaved Research Intent edits could sneak into downloads or be lost on view switch**: Previously, `dirty` and `draft` state in `ResearchIntent.tsx` were local to the view component. If a user edited a question in Research Intent without clicking *Save question* and navigated to `Report` (or opened `File > Download …`), `ws.stale` remained empty (`[]`), allowing downloads of an earlier snapshot while unsaved workload edits existed, and unmounting `ResearchIntent` discarded the draft silently.
  - **Fix**: Lifted `workloadDirty` and `workloadDraft` into `Workspace` (`workspace.tsx`) and included `workloadDirty` in `CurrentControls` (`analysis.ts`). Unsaved question edits now persist across view navigation, mark `stale` / `staleFor` with `'workload'`, block `apply`, `assess`, `runSearch`, and `exportCandidate`, and surface explicit `Review question edits` / `Discard unsaved edits` actions in `EvidenceBanner` as well as a direct `Discard edits` button in the question editor footer.
- **Person-unit (`rowUnit`) and field `importance` drift in `staleReasons` (`analysis.ts`)**: Changing `entityColumn` or `oneRowPerPersonConfirmed` in *Review classifications* (`SchemaReview.tsx`) without altering column `role`/`dtype`/`unit` previously did not mark existing candidates stale on `'classifications'`.
  - **Fix**: Added `rowUnit` (`entityColumn` and `oneRowPerPersonConfirmed` comparison against `candidate.threatContext`) and column `importance` to `staleReasons` in `analysis.ts`, and normalized `positiveValue` comparisons across rate queries.
- **Frontier calculation consistency between Library and Pareto Explorer (`analysis.ts`)**: `localFrontier` in `analysis.ts` (used by the Library sidebar) previously read raw `metrics.sensitive_guess_advantage` and fallback row-count differences without checking whether sensitive targets were actually implemented or whether the candidate was a `row_release`, whereas `measuredFrontier` in `views/pareto/model.ts` excluded unimplemented/missing objectives.
  - **Fix**: Aligned `objectiveValues` in `analysis.ts` with `views/pareto/model.ts` so missing or unimplemented objective values are never treated as zero and the Library and Pareto Explorer always report the same nondominated set.

### 2.2 Visible Defects in Real API Desktop Screenshots (`evidence/*.png`)
- **`evidence/stale-report-1440.png` — Grammar error in `EvidenceBanner.tsx`**: Single plural stale labels (`research questions`, `attacker assumptions`, `field classifications`) were rendered with `differs` (`"Current research questions differs."`).
  - **Fix**: Updated verb agreement in `EvidenceBanner.tsx` so only singular `'recipe'` uses `differs` and plural control labels use `differ`.
- **`evidence/stale-report-1440.png` — Raw `. mixed` enum token appended in `Report.tsx`**: `.report-decision` appended `{candidate.risk.assessment ?? ''}` directly to the clearance paragraph, rendering `"...permission to publish. mixed"`. Also `.report-deck` displayed internal counter names (`C1 · Candidate 5`).
  - **Fix**: Formatted `candidate.risk.assessment` into an explicit sentence (`"Evaluator summary: mixed (at least one finding is high severity or uncovered)."`) and formatted `.report-deck` to show `{label} · {recipeLabel(candidate.recipe.steps)}` (or external audit pairing state).
- **`evidence/workbench-local-1440.png` — Contradictory `▾ +0` delta in `Ledger.tsx`**: In `MeasureRow`, `Row-index uncertainty (bits)` displayed `0` → `0` with `▾ +0` because small non-zero deltas rounded to `+0` and the arrow glyph was tied to `direction === 'better'` (`▾`) rather than the sign of the change.
  - **Fix**: Added `numDelta` in `format.ts` so non-zero numeric changes never round to `+0`/`−0` (rendering `+<0.01`, `+<0.001`, etc.), and tied the arrow glyph (`▴` vs `▾`) to the sign of the change while preserving semantic color and screen-reader `(improved)`/`(worse)` labels.
- **`evidence/workbench-local-1440.png` — Exposed quasi-identifier border collision (`|birth_date`) in `data.css`**: `.field-row.exposed .field-title b` used `box-shadow: inset 2px 0 0 var(--risk); padding-left: 6px;`, which looked like a pipe character next to the field name and misaligned it from the subtitle below.
  - **Fix**: Applied the orange accent border and subtle wash to `.field-row.exposed` as a whole (`border-left: 2.5px solid var(--risk); padding-left: 8px; background: rgba(217, 72, 15, 0.035);`).
- **`evidence/pareto-local-1440.png` — Pareto scatter plot clipped below the fold at 1440×900 (`pareto-explorer.css`, `ParetoPlot.tsx`)**: Vertical padding in `.px-workspace`, `.px-plan`, and `.px-results` pushed the bottom half of the Pareto chart, X-axis ticks, and legend off screen at 1440×900. Point labels near `x = maxX` (`left: 33px`) also risked right-edge clipping, and `.px-dot` used an `8px` font.
  - **Fix**: Compacted vertical spacing in `pareto-explorer.css` and set `.px-plot-area` to `220px` so the complete plot, X-axis, and legend fit above the fold on 1440×900 desktops; raised `.px-dot` font size to `10px`; added `title` readout with all three objectives (attack metric, query loss, row loss) on markers; and flipped `.px-point-name.edge-right` to the left when `x / maxX > 0.82`.
- **`evidence/intent-local-1440.png` — Research Intent bottom action bar clipped at 1440×900 & rail shortcut badges (`research-intent.css`, `Sidebar.tsx`)**: Tightened `.intent-view`, `.intent-editor`, and `.intent-filter-section` vertical spacing so the question editor and its bottom action bar fit without clipping at 1440×900. Changed left-rail `<kbd className="rail-key">` from bare numbers (`2`, `3`, `4`, `6`) to `Alt+1` … `Alt+6` so focused nav items never look like item count badges.

### 2.3 Hosted Mode (`synthetic_demo`), Archie Core Persistence, Caps & Recovery (`types.ts`, `deployment.ts`, `api.ts`, `workspace.tsx`, `DeploymentBanner.tsx`, `Dialogs.tsx`, `Sidebar.tsx`, `Shell.tsx`)
- **Health flags & runtime disclosure**: Extended `ApiHealth` in `types.ts` for server health fields (`deploymentMode`, `uploadsAllowed`, `backendProvider`, `maxSearchCandidates`, `maxCandidates`, `sessionTtlSeconds`, etc.). Updated `DeploymentBanner.tsx` and `PrivacyDialog` (`Dialogs.tsx`) to explicitly state that compact fictional session configuration is persisted in Archie Core, actual Python calculations execute through Vercel (not on the user's computer), no AI/LLM model is in the application runtime, and uploads are disabled.
- **Local-origin hosted testing guard**: Fixed `Dialogs.tsx` line 336 (`hosted` checked before `origin.local`), `Sidebar.tsx` line 180 (`!hosted && origin.local`), `deployment.ts` (`place` neutral while `health === 'checking'`), and `api.ts` (`markHostedMode`) so hosted mode never claims to run "on this computer" even if tested on a local loopback port.
- **Stored-candidate limit (`maxCandidates: 40`) & storage error recovery**: Added `CANDIDATE_LIMIT_CODES`, `STORAGE_ERROR_CODES`, and `'session_not_found'` / `'session_expired'` handling in `api.ts` and `workspace.tsx`, displayed `Candidates N / 40` in the Library header when `maxCandidates` is active, and added recovery banners in `Shell.tsx` when the session candidate cap is reached or session storage fails.

### 2.4 Scientific Units, Correlation Nulls, Threat Register Coverage & Touch Tooltips (`Ledger.tsx`, `ResearchIntent.tsx`, `CorrelationMatrix.tsx`, `ThreatRegister.tsx`, `ExposureSurface.tsx`, `Tip.tsx`)
- **Weight (`lb` → `kg`) conversion & interval filter bounds**: Added live converted `kg` tolerance preview in `ResearchIntent.tsx` when editing a `lb` weight mean question; surfaced `inputUnit → comparisonUnit` (`lb → kg`) and scaled tolerance notes in the Workbench `Ledger.tsx` *Research questions* table; and labeled/auto-opened interval filter coverage and inclusion bounds when a question is unavailable.
- **Null vs. zero correlations (`CorrelationMatrix.tsx`, `data.css`)**: Added a diagonal slash (`.matrix-null-slash`), `N/A` text down to `28px` cells, and a `Difference (Δr)` column in the `View as table` fallback so undefined/null correlations are unmistakable from `0.000`.
- **Threat register coverage, assumptions, controls & citations (`ThreatRegister.tsx`, `Report.tsx`, `attack-lab.css`)**: Explicitly stated above the 26 threat families that catalog status describes engine capability rather than candidate execution; rendered `assumptions`, `controls`, `mitigation`, both `implemented` and `description`, and reference citation titles alongside external `sourceUrl` links.
- **Touch tooltip support (`Tip.tsx`)**: Added touch pointer toggle and outside-pointer dismissal so tooltips and `<Term>` buttons open and dismiss cleanly on touch screens as well as via keyboard focus and hover.

---

## 3. Files Modified

- `frontend/src/types.ts`
- `frontend/src/format.ts`
- `frontend/src/deployment.ts`
- `frontend/src/api.ts`
- `frontend/src/analysis.ts`
- `frontend/src/workspace.tsx`
- `frontend/src/ui/EvidenceBanner.tsx`
- `frontend/src/ui/Tip.tsx`
- `frontend/src/shell/DeploymentBanner.tsx`
- `frontend/src/shell/Dialogs.tsx`
- `frontend/src/shell/Sidebar.tsx`
- `frontend/src/shell/Shell.tsx`
- `frontend/src/views/workbench/Ledger.tsx`
- `frontend/src/charts/CorrelationMatrix.tsx`
- `frontend/src/views/ResearchIntent.tsx`
- `frontend/src/views/pareto/ParetoPlot.tsx`
- `frontend/src/views/lab/ThreatRegister.tsx`
- `frontend/src/views/map/ExposureSurface.tsx`
- `frontend/src/views/Report.tsx`
- `frontend/src/styles/data.css`
- `frontend/src/views/pareto/pareto-explorer.css`
- `frontend/src/views/intent/research-intent.css`
- `frontend/src/views/lab/attack-lab.css`
- `frontend/GEMINI_REVIEW.md`

---

## 4. Remaining Material Limitations

- **No external browser automation run in this pass**: As instructed in `GEMINI_TASK.md`, verification in this isolated working copy used source audit, inspection of the controller's real API desktop screenshots in `evidence/`, `npm run typecheck`, and `npm run build`. Live browser acceptance across 390 / 768 / 1440 px viewports and live local/hosted backend verification are owned by the root controller.
- **Numeric distribution bin alignment**: Equal-length numeric histogram bins continue to align by shared bin index when exact label strings differ; if a custom backend ever returned equal-length numeric histograms with shifted bin edges, the ghost outline would follow bin index.
- **Scientific scope boundaries**: Tabular measurements remain sample properties conditional on the declared threat model, schema, and person-unit confirmation; genomic, family, longitudinal trajectory, free-text narrative, and operational external record-linkage risks remain explicitly uncovered and require human governance review.
