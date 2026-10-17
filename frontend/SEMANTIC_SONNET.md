# PRISM semantic workbench extension (Claude Sonnet 5.5 XHigh via Devin)

Scope: only the files named in `TASK.md` were written. `shell/Dialogs.tsx` and every other file were not touched. No dependency, provider key, server start, deploy or backend call was made. `DataTable.tsx` did not need a change.

## 1. Checks actually run

| Check | Result |
| --- | --- |
| `npm run typecheck` (in `frontend/`, after the final edit) | exit 0, no diagnostics |
| `npm run build` (`tsc -b && vite build`, after the final edit) | exit 0, built in 2.68 s; Workbench chunk 96.12 kB (28.80 kB gzip), its CSS 9.41 kB |

Not done, on purpose or by constraint: no browser, no DOM or visual acceptance, no keyboard or screen-reader pass, no 390/768/1440 px check, no backend contract test against a real service, no unit tests (no files could be added). The ordering logic, gating and request flow below were verified by reading and typechecking only. Root must do the real DOM pass.

## 2. Files changed

| File | Change |
| --- | --- |
| `src/types.ts` | `SemanticField`, `SemanticProvider`, `DatasetSemantics`, `SemanticOverride(s)`; optional `Dataset.semantic`; `SemanticFinding`, `SemanticSeverity`, `CandidateSemantic`; optional `RiskResult.semantic`. Loosely shaped members (`properties`, `privacyRoles`, `alternatives`, `validation`, `lineage`, `coverage`, `provider.error/message`) are typed `unknown`. |
| `src/api.ts` | `Fixture` adds `'semantic'`; `api.demo` requests `/v1/demo?fixture=<fixture>` (identical URL for `kit`, plain `/v1/demo` for `architecture`); new `api.inspectSemantics(datasetId, allowRemote, overrides, signal)` posting `{ allowRemote, overrides }` to `/v1/datasets/{id}/semantics` and returning the semantic object directly. |
| `src/workspace.tsx` | New `inspectSemantics(allowRemote, overrides = {})`; the `schema` busy label now reads "saving classifications or inspecting field semantics". |
| `src/views/Workbench.tsx` | Mounts `ProtectionPreference` above the panes and `SemanticPanel` below them (both inside the existing scrolling pane area, above the ledger); passes the existing shared `column` state as the field highlight; adds a "Semantic ambiguity demo" button to the empty start panel. |
| `src/views/workbench/SemanticPanel.tsx` (new) | `SemanticPanel` and `ProtectionPreference`. |
| `src/views/workbench/semantic-panel.css` (new) | Imported by the component. Every class is prefixed `sem-`; tokens only (graphite/neutral, violet accent, orange exposure, no green). |

## 3. Workspace request flow (`inspectSemantics`)

- It goes through the existing `run('schema', …)`: single flight, the same cross-kind global gate (it refuses and warns while any other operation runs, and blocks them while it runs), the epoch check, and abort support. `ws.cancel('schema')` aborts it; the panel shows "Stop waiting" while it runs.
- The `run` callback only calls the API (`datasetId` captured before the call). `setDataset` runs only after `await run(...)` returns a non-null result, which `run` returns only for the latest, same-epoch, un-aborted flight. The update is functional and checks `current.datasetId === datasetId`; it replaces only `dataset.semantic`.
- It never calls `beginDataset` or `resetEverything`, and never touches schema, steps, threat, workload, candidates, baseline or search results. Candidate `risk.semantic` evidence stays frozen.
- `loadDemo('semantic')` uses the existing boot path. The button uses `ws.requestReplace('the semantic ambiguity demo', …)`, so the existing replace confirmation appears when candidates exist.

## 4. Semantic intelligence section

- A collapsed one-line header by default: field count, the three most common actual review statuses, finding count for the active candidate, and provider status plus remote-call count (and "error reported" when the provider returned one). Expanding it shows everything below; it does not add height to the comparison until opened.
- Actions, with the permission disclosure first (aria-linked to the Jev button): "Interpret ambiguous fields with Jev" (`allowRemote: true`, the only remote path, click only), "Inspect fields" (`allowRemote: false`), "Semantic ambiguity demo". The disclosure says only column labels, data types, units and neighboring column labels are sent, never row values, and that nothing is sent on load, slider movement or correction. An aria-live status line reports the last attempt using the provider status and calls the service actually returned; a failed or abandoned attempt says nothing was changed.
- Provider block: actual `status`, `calls`, `error` ("None reported" when absent), `message`, and any other provider keys as JSON.
- Tabs: **Fields** and **Measured findings**.
  - Fields: a table (max height 260 px, scrolls inside itself) with column, `primaryType` + `family`, source + model, probability (shown only if returned), review status, privacy roles. The column name is a toggle button that sets the shared column highlight. A row expands to field ID, statistical role (read from the reviewed schema, labelled unchanged), properties, validation, lineage, alternatives, raw JSON, and the correction control.
  - Correction: a select plus a button; sends `allowRemote: false` with `{ [column]: { primaryType, reviewStatus: 'confirmed' } }`. It says that values and the statistical role are not changed.
  - Findings: header shows the active candidate label and id and time. A historical-evidence notice appears when the active snapshot is stale against current controls or an evaluation is running. Cards are collapsed disclosure buttons showing accessible severity text (glyph + "Severity: …", never colour alone, nothing green), title, measured/uncovered status and the contributing fields. Each opened card answers the five questions: which fields contribute (toggle buttons that highlight the field in both panes); how it could be exploited (`explanation`); what the attacker must have (`attackerNeeds`); what was measured (`measured`; `null` or null entries read "Not measured", with the status when unsupported or not applicable); mitigations, utility risks, limits and source ids. Snapshot-level `limitations`, `coverage` and `lineage` are shown under the list. Absence of `risk.semantic` or of findings reads as "not a pass and not zero risk".
- Unknown-shaped values are never React children: they are summarised to a clipped string or shown as JSON text (`pre`, capped at 5,000 characters).
- Findings and field meanings are never turned into a score; the section states that a meaning is not a vulnerability.

## 5. Protection preference

- Pool: `ws.candidates` + `ws.search.candidates` + `ws.baseline`, unique by `candidateId`. A snapshot is included only if it has the same `datasetId`, is not an audit (no recipe to restore), has `ws.staleFor(candidate)` empty after ignoring the `recipe` reason, and has finite `sample_unique`, `k_min` and `utility.loss`. Excluded counts and reasons are listed in the "How positions are ordered" disclosure.
- Order, left to right (single comparator, `byDetail`): 1. `utility.loss` ascending (more analytical detail); 2. `sample_unique` descending; 3. `p_guess` descending (only when membership is known); 4. `k_min` ascending; 5. label (natural order), then `candidateId`. Nothing is interpolated or shown as a percentage of protection. If sample uniqueness does not fall at every step the panel says so.
- Moving the slider (or the two end links) is synchronous and local: search candidates use `ws.adopt`; others use `ws.select`. The unprotected baseline additionally gets `ws.setSteps(seedSteps([]))` so the composer matches the selected snapshot, with a warning toast if that replaced unevaluated edits. No request is made.
- Visible per position: label, full candidate id (clipped with a title), recipe label, sample uniqueness, query loss, rows suppressed (or "Not measured"), smallest group k, single-guess correctness when membership is known, and a hard-check line: "Hard-check conflict · n of m not met" (expandable reasons) for infeasible snapshots, "not evaluated" when no checks exist, and a "planning limits, not a release clearance" note when met.
- Locked (slider and end links disabled, reason shown) during any busy operation, while `workloadDirty`, and after session loss. The recipe controls in the Inspector stay editable.
- Fewer than two eligible snapshots: a disabled slider plus "Evaluate alternatives", which calls `ws.runSearch(8)` and is enabled only when reviewed, nothing is busy, no unsaved question edits, the session is live and the selected sharing context is a searched one (the same blocks the Pareto view applies). `runSearch` still enforces the service search cap and the stored-candidate limit. If not reviewed, the button becomes "Review classifications first". No search runs on mount or on slider/correction.

## 6. Interpretations and limitations to reconcile

1. **Ordering reading.** "From analytical detail (lower utility loss) toward lower sample_unique, then p_guess / higher k_min" was implemented with loss as the primary key. A sample-uniqueness-first order is a one-line change to `byDetail` if that was intended.
2. **Correction choices.** `GET /v1/semantics/ontology` was not guessed. The selector offers the field's current and alternative types first, then every other `primaryType` and alternative type seen in this dataset. Alternatives are parsed from strings, or from objects with `primaryType`/`type`/`label`/`name`/`id` and `probability`/`score`/`confidence`; unrecognised shapes are summarised, not parsed. A correction to a type outside that set is not possible until the ontology list is wired in.
3. **Override persistence is assumed.** Only the single new correction is sent. If the service does not retain earlier confirmed overrides across calls, they are not re-sent by the UI.
4. **`PATCH /schema` response.** `saveSchema` still replaces the dataset with the service reply. If that reply omits `semantic`, the panel returns to its "not inspected" state (Inspect fields restores it). The UI does not splice it client-side.
5. **Shared busy flag.** Semantic inspection uses the `schema` busy flag, so the Review dialog's save button reads "Saving…" while an inspection runs.
6. **Snapshot staleness.** Stale detection uses existing `staleFor`/`stale`. The UI cannot tell whether a candidate's semantic findings predate a later field correction (their `lineage` shape is unknown and client/server clocks are not compared); it says corrections never rewrite a finished snapshot.
7. **Identical recipes.** Positions are unique by candidate id, per the brief, so two snapshots with the same recipe (for example after a re-evaluation) are two positions.
8. **Highlight behaviour.** Choosing a field while the Workbench shows Correlations or Subgroups switches to the Table tab so the shared highlight is visible; Table and Distribution tabs are left alone.
9. **Landmarks.** The new sections sit inside the existing pane area, which carries the "Pane contents" tabpanel role and stale dimming; no shell or layout CSS was changed to move them.
10. **Not verified in a browser:** grid layout of the preference bar, range-input styling at the end positions, table/detail row layout, horizontal scrolling of the fields table at narrow widths, focus order, and contrast of the new text.


## Controller integration after Sonnet return

The preceding sections describe Sonnet's isolated candidate. The integrated frontend additionally:

- Loads the actual 145-type, 13-family ontology and groups correction choices by family; visible meanings and privacy roles use human labels. Raw type IDs remain in field details.
- Binds source `semantic.revision` to frozen `risk.semantic.semanticRevision` through the existing field-classification stale guard. An interpreted/corrected source requires re-evaluation before export. Provider-only diagnostics do not change the backend revision. Confirmations accumulate server-side.
- Separates measured, needs-assessment and not-applicable finding counts. Untested hypotheses are not presented as successful attacks. Provider disclosure is accurate in both local and hosted modes.
- Orders cached protection positions by measured sample uniqueness, highest to lowest; ties use query loss, single-guess correctness, group size, label and ID. Analytical loss is displayed independently and is not assumed monotonic. The range has no outbound request. Evaluate alternatives honors remaining stored-candidate and search caps.
- Restores every selected non-audit snapshot's exact recipe, including empty baseline recipes. An active baseline with a newly edited recipe becomes stale; baseline comparisons still ignore recipe differences.
- Wires the separate, backend-matched `draftPreview` helper into the protected table. Supported row-local drafts update the first preview rows immediately; full risk, utility and charts remain frozen and labeled pending. Any unsupported ordered step declines the whole draft preview. Source rows remain unchanged.
- Keeps semantics component state bound to the dataset ID, and clicking a contributing field switches to the table and highlights that shared column in both panes.

Direct controller checks: semantic revision guard passed matching, changed, missing-frozen and legacy-source cases; integrated TypeScript check and production build passed after these changes. The controller did not repeat the separately completed 11-recipe cross-engine preview tests. Root owns live browser acceptance and deployment. A separate, bounded OpenCode Go Gemini 4 Argon source review follows this integration; earlier frontend approvals do not automatically apply to the new extension.


### Final controller and live acceptance additions

Sonnet's isolated follow-up caveats about ordering, ontology choices, retained semantic schema replies, accumulated corrections and frozen semantic revision binding are superseded by the integrated contracts above. The review-dialog busy text remains the existing shared schema-operation state.

Opening a privacy finding now highlights all of its contributing columns in both source/candidate table headers and cells; the first column controls horizontal focus. Clicking an individual field clears the group. This change is scoped to Workbench, SemanticPanel and DataTable; the integrated TypeScript check passed.

Root's direct browser acceptance (not a Sonnet browser claim) verified the real 480-row semantic fixture; actual Jev metadata opt-in made two calls and abstained on DOS; confirming DOS recorded User Confirmed, then re-evaluation created C2. Changing age-band width10 to11 immediately changed the protected preview from [40,50) to [33,44), while source40 stayed unchanged and export remained stale-blocked. Restoring the recipe and moving the cached preference from Home to End selected the actual unprotected100% versus protected20% sample-uniqueness snapshots without extra Jev calls. The24 finding entries rendered, and opening the demographic combination highlighted all five relevant table headers in both panes. Root separately owns desktop/phone checks and final hosted acceptance.
