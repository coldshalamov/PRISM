# PRISM Semantic Workbench — Focused Frontend Audit (`SEMANTIC_GEMINI.md`)

**Verdict:** `CHANGES REQUESTED` (minor, targeted load-bearing fixes in `SemanticPanel.tsx` and `workspace.tsx`; core architecture, evidence discipline, and visual system are sound).

---

## 1. Executive Summary

The semantic workbench extension (`Workbench.tsx`, `SemanticPanel.tsx`, `semantic-panel.css`, `workspace.tsx`, `analysis.ts`, `api.ts`, `types.ts`, `draftPreview.ts`) preserves the mature graphite/neutral IBM Plex workbench design, the six existing views, and PRISM's strict evidence discipline. TypeScript compilation (`npm run typecheck` / `tsc --noEmit`) passes with zero errors.

Three concrete, load-bearing edge-case defects were identified by source analysis:
1. **Nullable / untrusted runtime crash in `SemanticPanel.tsx` (`typeChoices` / `FieldRow` / `findings`)**: `spaced()` (`title()` in `format.ts`) is called on `field.primaryType`, `field.source`, `field.reviewStatus`, and `field.family` without string guards, and `findings` is not element-filtered with `isRecord`, which will throw a fatal `TypeError` (or React child error for `field.model`) if the service returns `null`/`undefined` or non-string values on an untrusted semantic payload.
2. **`ProtectionPreference` slider cannot select index `0` when `active` is not on the scale (`index === -1`), and endpoint buttons ignore recipe drift on `active`**: When no comparable snapshot is currently selected (`index === -1`, e.g., immediately after clicking **Evaluate alternatives** when the prior active snapshot was invalidated by a semantic correction or threat change), `<input type="range" value={Math.max(index, 0)}>` forces `value={0}`. Because the DOM input value is already `0`, clicking or arrowing to position `0` on the slider never triggers `onChange`. Additionally, `choose()` returns early when `target.candidate.candidateId === active?.candidateId` even when `ws.stale.includes('recipe')`, preventing the endpoint buttons from restoring `active`'s frozen recipe.
3. **Stale local `drafts` state across fresh semantic inspections in `SemanticPanel.tsx`**: Unconfirmed `<select>` edits in `drafts` persist across **Inspect fields** / **Interpret ambiguous fields with Jev** runs, masking newly returned `field.primaryType` classifications.

---

## 2. Concrete Load-Bearing Defects & Minimal Repairs

### Defect 1 — Nullable / untrusted field and finding guards in `SemanticPanel.tsx`
- **Location:** `frontend/src/views/workbench/SemanticPanel.tsx:81-94`, `225-228`, `240-241`, `301-309`
- **Why it is load-bearing:** `format.ts:53` defines `title(value: string)` as `value.replaceAll('_', ' ')`. In `SemanticPanel.tsx`, `fields` only filters for `isRecord(field) && typeof field.column === 'string'` (`line 303`). If an untrusted/partial service response omits or nulls `field.primaryType` (or returns non-string `family`, `source`, `reviewStatus`, `model`, or a non-object item in `findings`), `labelOf(field.primaryType)` / `spaced(...)` throws `TypeError: Cannot read properties of undefined (reading 'replaceAll')`, crashing the Workbench into the error boundary.
- **Minimal repair:**
  ```tsx
  // SemanticPanel.tsx:80-94
  const str = (value: unknown): string => (typeof value === 'string' ? value : '');
  const fieldKey = (field: SemanticField) => str(field.fieldId) || field.column;
  const readable = (value: unknown) => {
    const text = str(value);
    return text ? spaced(text.replace(/([a-z0-9])([A-Z])/g, '$1 $2')) : '—';
  };

  function typeChoices(fields: SemanticField[], field: SemanticField, ontology: SemanticOntology | null) {
    const primary = str(field.primaryType);
    const suggested = [...new Set([primary, ...alternativesOf(field.alternatives).map(item => item.type)].filter(Boolean))];
    const fallback = [...new Set(fields.flatMap(item => [str(item.primaryType), ...alternativesOf(item.alternatives).map(alt => alt.type)]).filter(Boolean))];
    const rawTypes = Array.isArray(ontology?.types)
      ? ontology.types.filter((t): t is { id: string; label: string; family: string } => isRecord(t) && typeof t.id === 'string' && typeof t.label === 'string' && typeof t.family === 'string')
      : null;
    const types = rawTypes ?? fallback.map(id => ({ id, label: spaced(id), family: 'dataset' }));
    const labels = new Map(types.map(item => [item.id, item.label]));
    const families = Array.isArray(ontology?.families)
      ? ontology.families.filter((f): f is { id: string; label: string } => isRecord(f) && typeof f.id === 'string' && typeof f.label === 'string')
      : [{ id: 'dataset', label: 'Other types seen in this dataset' }];
    const groups = families.map(family => ({
      label: family.label, id: family.id,
      types: types.filter(item => item.family === family.id && !suggested.includes(item.id)).sort((a, b) => a.label.localeCompare(b.label, 'en')),
    })).filter(group => group.types.length);
    return { suggested, groups, labelOf: (id: unknown) => { const key = str(id); return key ? (labels.get(key) ?? spaced(key)) : '—'; } };
  }
  ```
  And in `FieldRow` (`lines 225-228`, `240-241`) and `findings` (`line 309`):
  - Use `str(field.family)`, `str(field.source)`, `str(field.model)`, `str(field.reviewStatus)`, `str(field.fieldId) || '—'`, `str(field.primaryType) || '—'`.
  - Filter `findings` with `Array.isArray(rawFindings) ? rawFindings.filter((f): f is SemanticFinding => isRecord(f)) : []`.

---

### Defect 2 — `ProtectionPreference` unindexed slider state (`index === -1`) and recipe restoration on `choose()`
- **Location:** `frontend/src/views/workbench/SemanticPanel.tsx:551-560`, `611-618` and `frontend/src/workspace.tsx:680-691`
- **Why it is load-bearing:**
  1. When `pool.length >= 2` (`ready` is true) but `active` is `null` or excluded from `pool` (`index === -1`, which happens right after clicking **Evaluate alternatives** when `active` was made stale by a semantic field correction or threat change), `<input type="range">` is given `value={Math.max(index, 0)}` (`0`). The slider thumb renders at index `0`, and clicking/dragging to index `0` on the slider cannot fire `onChange` because the input's value is already `0`.
  2. In `choose(at)` (`line 553`), `if (!target || lockReason || target.candidate.candidateId === active?.candidateId) return;` blocks restoring `active`'s frozen recipe when `active` has unevaluated recipe edits (`ws.stale.includes('recipe')`) and the user clicks the `Higher uniqueness` / `Lower uniqueness` endpoint button or moves the slider back to `active`.
  3. In `workspace.tsx:681`, `select()` formats the toast with `meta[id]?.label ?? 'this candidate'` instead of `labelOf(id)` (so selecting `baseline` says `'this candidate'` instead of `'Unprotected'`), and `adopt()` (`workspace.tsx:685-691`) does not emit the replacement notice when `dirty` is true.
- **Minimal repair:**
  ```tsx
  // SemanticPanel.tsx:551-560
  const choose = (at: number) => {
    const target = pool[at];
    if (!target || lockReason) return;
    if (target.candidate.candidateId === active?.candidateId && !ws.stale.includes('recipe')) return;
    const candidate = target.candidate;
    if (search?.candidates.some(item => item.candidateId === candidate.candidateId) && !candidates.some(item => item.candidateId === candidate.candidateId)) {
      ws.adopt(candidate.candidateId);
      return;
    }
    ws.select(candidate.candidateId);
  };
  ```
  - In `workspace.tsx:660-670` (`runSearch`), if `!active` or `staleFor(active).some(r => r !== 'recipe')`, or in `SemanticPanel.tsx` when `index === -1`, allow selecting index `0` on pointer/key interaction (or adopt/select the first comparable candidate when **Evaluate alternatives** is triggered from `ProtectionPreference`).
  - In `workspace.tsx:681`, use `labelOf(id)` in `select()`, and notify in `adopt()` when `dirty` is true.

---

### Defect 3 — Unconfirmed `drafts` persist across fresh semantic inspections
- **Location:** `frontend/src/views/workbench/SemanticPanel.tsx:286`, `323-331`
- **Why it is load-bearing:** If a user changes the `Correct meaning` `<select>` for a column without confirming, and then clicks **Inspect fields** or **Interpret ambiguous fields with Jev**, `drafts[fieldKey(field)]` retains the stale local selection and hides the newly returned `field.primaryType`.
- **Minimal repair:**
  ```tsx
  // SemanticPanel.tsx:323-327
  const act = async (kind: 'offline' | 'remote' | 'correction', allowRemote: boolean, overrides?: SemanticOverrides) => {
    setAttempt(null);
    const result = await ws.inspectSemantics(allowRemote, overrides);
    if (result && kind !== 'correction') setDrafts({});
    setAttempt(result ? { kind, state: 'done', fields: Array.isArray(result.fields) ? result.fields.length : 0, provider: isRecord(result.provider) ? result.provider : undefined } : { kind, state: 'failed' });
  };
  ```

---

## 3. Verification of Required Workflows & Contracts

### Checked by execution
- **TypeScript static check (`npm run typecheck`):** Passed (`tsc --noEmit` exited `0` with no diagnostics).

### Checked by source inference (no live browser or backend run in this isolated copy)
1. **Explicit Jev consent & remote call discipline (`SemanticPanel.tsx:292-298`, `323-331`, `360-370`; `workspace.tsx:450-456`, `520-527`; `api.ts:190-191`):**
   - Page load (`workspace.tsx` boot and `SemanticPanel.tsx` mount) never calls `POST /v1/datasets/{id}/semantics`; mount only fetches `GET /v1/semantics/ontology`.
   - `ProtectionPreference` slider (`choose`) only invokes local `ws.adopt` / `ws.select` state updates; zero network requests occur on slider movement.
   - Field correction (`confirm`) calls `ws.inspectSemantics(false, { [field.column]: { primaryType, reviewStatus: 'confirmed' } })` with `allowRemote: false`.
   - Only the **Interpret ambiguous fields with Jev** button passes `allowRemote: true`, and it is bound via `aria-describedby` to the explicit disclosure stating that only column labels, data types, units, and neighboring labels (never row values) are sent.
2. **Semantic revision staleness & export gating (`analysis.ts:157, 181-182`; `workspace.tsx:348-365, 724`; `EvidenceBanner.tsx:31, 38-55`; `SemanticPanel.tsx:348, 424-431`):**
   - `controls.semanticRevision` reads `dataset.semantic?.revision ?? null`.
   - When `current.semanticRevision` differs from `candidate.risk.semantic?.semanticRevision`, `staleReasons()` appends `'classifications'`.
   - This marks active findings as historical in `SemanticPanel`, triggers `EvidenceBanner` (`Evaluate current recipe`), invalidates `baselineUsable` so `apply()` refreshes the baseline too, excludes stale snapshots from `ProtectionPreference` (`excluded.controls`), and blocks all exports (`workspace.tsx:724`, `Shell.tsx:44`, `Report.tsx:103`).
3. **Snapshot selection & recipe restoration (`workspace.tsx:674-691`; `Workbench.tsx:71-73`):**
   - Selecting any non-audit snapshot (including `Unprotected baseline` with `steps: []`) calls `setStepsState(seedSteps(candidate.recipe.steps))`, restoring `[]` for the baseline and clearing recipe drift.
4. **Protection preference ordering & non-monotonic utility (`SemanticPanel.tsx:478-510, 626-631, 646-654`):**
   - Positions include only real evaluated snapshots of the current dataset matching current non-recipe controls with finite `sample_unique`, `k_min`, and `utility.loss`.
   - Sorted by `sample_unique` descending (high $\to$ low), then `utility.loss` ascending (low $\to$ high), `p_guess` descending (when `membershipKnown`), `k_min` ascending, label, and ID.
   - Query loss is displayed alongside sample uniqueness at every position and documented as non-monotonic.
   - **Evaluate alternatives** runs only on explicit user click with `alternativeBudget = Math.min(8, remaining, maxSearchCandidates ?? 8)`.
5. **30-row local draft preview & frozen metrics (`draftPreview.ts:13-167`; `Workbench.tsx:71-76, 154-187`):**
   - `draftPreview` clones `dataset.preview` (never mutating source rows) and previews only the 8 row-local deterministic methods (`drop`, `mask`, `band`, `centered_interval`, `round`, `top_bottom`, `zip_prefix`, `date_generalize`) with strict parameter/cell validation.
   - When any step is unsupported (e.g., `rare_group`, `suppress_rows`, `noise`), `draft.supported` is `false`, the table keeps the frozen candidate preview with an explicit `role="status"` notice, and all full-dataset risk/utility metrics remain frozen on the last evaluated snapshot with export blocked.
6. **Shared column highlighting (`Workbench.tsx:116-119, 134, 168, 241`; `DataTable.tsx:36-43, 56-57, 76`; `SemanticPanel.tsx:166-169, 223`):**
   - Clicking a field chip in `SemanticPanel` (table or finding card) toggles `selectedColumn` (`aria-pressed`), switches `Workbench` to the `table` tab if needed, highlights matching columns in both panes, and scrolls both `DataTable` containers to center the column.
7. **Human labels & raw IDs (`SemanticPanel.tsx:83-94, 225, 240-241, 256-265`):**
   - Table rows and `<select>` options render human-readable ontology labels (`labelOf(field.primaryType)` and family labels), while expanded details expose raw `field.fieldId`, `field.primaryType`, and raw JSON.
8. **Responsive layout (`380px` / `768px` / `1440px`) & accessibility (source inference):**
   - `1440px`: Two-column `.sem-pref` (`head`/`slider` left, `read` right), side-by-side original/protected panes.
   - `768px` (`<= 979px`): `.sem-pref` stacks to single column (`head`, `slider`, `read`, `order`); panes stack with `Both / Source / Candidate` segmented switch; `.sem-table-scroll` scrolls horizontally (`min-width: 760px`).
   - `380px` (`<= 719px`): `.sem-pref-slider` places the range input on row 1 (`grid-column: 1 / -1`) and endpoint links on row 2; `.sem-summary` wraps (`flex-basis: 100%; white-space: normal`). *(Note: `.sem-provider` at `semantic-panel.css:43` has `white-space: nowrap`, which can clip if provider status + error text is long at `380px`; adding `white-space: normal` inside `@media (max-width: 719px)` is recommended.)*
   - Interactive controls have explicit accessible names (`aria-label`, `aria-labelledby`, `aria-describedby`, `aria-valuetext`, `aria-expanded`, `aria-pressed`) and live status regions (`role="status"`).

### Audit Limits
- Source inspection and TypeScript typechecking only; no live browser rendering, DOM layout measurement, or backend service execution was performed in this isolated copy. This review does not constitute a formal WCAG certification or universal privacy guarantee.


## Controller disposition

Gemini reviewed the isolated integration before the later group-highlight and root date-control layout refinements. Its verdict above describes that reviewed candidate, not the final implementation.

All three concrete findings were accepted and repaired in the integration: semantic fields, model labels and findings are normalized at the display boundary, malformed ontology entries are rejected; range pointer/keyboard interaction can adopt position0 from an unselected state and an explicit Select first snapshot action is available, while selecting the current snapshot restores its frozen recipe; fresh offline/remote inspections clear unconfirmed local correction drafts. Mobile provider status can wrap. TypeScript passed after these repairs. Root owns direct browser checks of the repaired workflows and the three subsequent independent approvals; no Gemini re-approval is implied.

The later finding-card interaction highlights every contributing table column, while individual field actions clear that group. A change of evaluated snapshot clears the old contributor group. Provider permission text explicitly includes structural format names, in addition to labels, types, units and neighbors; row values remain excluded from Jev requests.


Narrow post-repair execution: the actual SemanticPanel source was rendered with React server rendering in both the Fields and Privacy findings states, using null field/finding records, missing primary type, object-valued source/model/title and null measured quantities. Both renders passed; Unknown/Needs review and Not measured remained visible. Test instrumentation selected the equivalent open-tab states without editing production source, and mocked only workspace/API transport boundaries. This is a render robustness check, not browser or visual acceptance. The final integrated production build passed after all controller repairs.
