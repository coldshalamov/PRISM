# Frontend completion specification

## Direction

A scientific instrument, not a security marketing dashboard. Use a light canvas, restrained violet accent, strong data typography, comfortable whitespace, and precise labels. The starter in `frontend/src` and screenshots in `artifacts/` establish the information architecture. The assigned frontend agent should substantially polish and componentize it, not retain giant string templates.

One dominant action: compare a source and candidate. Avoid animated shields, decorative hacker terminals, unearned green badges, or arbitrary risk percentages. Motion should explain a transformation; it should never stand in for a completed measurement.

## Main workbench

Desktop: fixed-width left recipe rail, flexible main area, four diagnostic readouts, side-by-side table workspace, findings and task panels, then candidate explorer. A right-side inspector may appear when a cell, warning, or candidate is selected. Keep dense controls legible on a typical laptop, not only a large presentation screen.

Small screens: recipe controls become a disclosure drawer, original/protected become tabs, diagnostics wrap, and tables scroll within their own regions. Never squeeze eight columns into phone width or introduce document-level horizontal overflow. Preserve the research workflow, not merely the visual layout.

### Create and audit modes

Create: load original -> review roles/units/person key -> choose attacker -> choose methods -> evaluate -> explore -> review export.

Audit: load original and protected -> confirm semantics and transformation/synthetic provenance -> choose tests appropriate to available evidence -> compare. Candidate-only inspection may eventually work, but must show that source-dependent measurements are unavailable.

### Tables and charts

- Synchronized **column selection**, not falsely synchronized identity rows. The current candidate is shuffled. Owner-aligned row inspection may be added as an explicit private view, never exported as a join key.
- Highlight removed fields, generalized values, missing-value changes, and suppressed rows with accessible text/legend—not color alone.
- Charts use shared scales/bin edges; show native units, counts, sample size, missingness, and interval-midpoint approximations.
- Add correlation-difference heatmap with exact values and accessible table fallback. Null/undefined correlations must look different from zero correlation.
- Add subgroup utility comparison after the evaluator supports it. Do not generate a “clinical survival curve” from columns that cannot establish a survival endpoint.

## The controls to build

Replace advanced JSON dependence with a typed method composer. Each method card has enabled state, selected columns, applicable types, parameters, preview of the transformation rule, expected limitations, and remove/reorder actions. Backend validation remains authoritative.

Group the methods as identifiers, precision, suppression/rare groups, experimental perturbation, and advanced engines. Pseudonymization must say “still linkable,” noise/permutation must say “not differential privacy,” and unavailable optional engines must say “not installed” or “not verified,” not present a runnable button.

The main precision slider selects an explicit named recipe. Its extrema are **minimal edits** and **coarser data**, never unsecure/secure. Show exact changes before a new evaluation. Per-field controls remain editable. Resetting a preset must not silently undo extra privacy methods without confirmation.

For rapid preview, debounce deterministic local work and cancel stale requests. Mark results pending/stale until a matching recipe/threat/data fingerprint completes. Do not resample noise on every animation frame. Do not spend a DP budget on hover or slider movement; DP releases require a separate confirmed action.

## Attacker builder

Ask what the attacker knows, how precisely, whether they know source membership, what they seek, and which other releases/auxiliary sources they can access. The existing request model supports field selection and known membership, not all those extensions. Add new controls only with backend support or explicit planned-state explanations.

Display a readable sentence from the frozen report: “This test assumes the attacker knows age, ZIP and weight, knows source membership, and knows the public generalization rule.” Next to a number show denominator, unit, applicability, and control/validation status.

## Explanations

Use three depths:

1. **One-line tooltip:** “A few ordinary attributes can form a distinctive combination.”
2. **Why this warning appears:** measured class size or attack evidence, fields involved, and exact assumptions.
3. **Technical drawer:** method, equation, limitations, source, baselines, and suggested compatible repairs.

Tooltips must open by keyboard/focus and touch, not hover alone. Never expose a real sensitive value in a public demo tooltip. Source links open only when explicitly clicked; no automatic network prefetching.

## Candidate explorer

X: selected measured attack metric, lower better. Y: selected workload loss, lower better. Inspect the third Pareto objective (row loss) in tooltip/inspector and optionally encode it by marker size. Highlight nondominated candidates only with respect to shown/declared objectives. A missing risk metric cannot become the leftmost zero point.

Select a point -> show complete method recipe and measurement scope -> apply/freeze candidate -> compare with current. Support keyboard selection and a sortable table alternative. Later compare multiple attack scenarios as small multiples, not a weighted “safety” score that hides the worst case.

## Export review

Separate two buttons and explanations:
- **Export protected CSV:** transformed data only; spreadsheet neutralization choice; unresolved warnings; role, authority, and limitations acknowledgments.
- **Download owner audit:** explicit confidential banner; exact source statistics and private evidence may be present; not safe to forward by default.

Neither button says “certify,” “approve compliant,” or “safe to publish.” Show the actual chosen candidate snapshot, not current unmeasured controls. Define an optional release record later; current acknowledgments are not a signed regulatory approval.

## Frontend acceptance checklist

- No data leaves the local application except a user-directed file download.
- All thirteen methods can be configured without writing JSON, or are visibly deferred with an explanation.
- Files with leading-zero ZIPs and awkward headers retain their meaning.
- Every displayed metric comes from a result snapshot; unsupported metrics are never fabricated.
- Before/after charts and task results update only for the matching candidate.
- Uploading an externally protected file visibly disables ground-truth-dependent identity claims.
- Original source cannot be mistaken for the export target.
- Screen-reader names, focus trapping/return, Escape, keyboard chart alternatives, contrast, reduced-motion and 390/768/1440px layouts are tested.
- Failed queries, schema mismatches, missing packages, size limits, expired sessions and empty/suppressed outputs each have useful recovery paths.
- Demo mode is visibly fictional, including screenshots and downloaded fixtures.
