# Semantic extension: independent frontend review 3

**Disposition: APPROVED.** No material design, responsiveness or workflow blocker was found in this scope. This completes the third fresh, successive review of the semantic extension, following semantic-review-1 and semantic-review-2.

Reviewed frozen application source: **`9f40ec12e0178d4eabe4c9bc2663ceb0938c861d`**. The working frontend source was confirmed unchanged from that freeze. Only this report was written by the reviewer.

## Independent pixel and source review

Inspected the actual desktop, tablet and phone images `artifacts/semantic-workbench-1440.png`, `semantic-workbench-768.png`, `semantic-workbench-390.png`, and the expanded `semantic-findings-1440.png` image. The findings image precedes the date-control wrap repair; the current desktop image shows the repaired two-row control. Read SemanticPanel, DataTable, Workbench, workspace snapshot selection/export guards, stale-evidence analysis and the relevant styles.

The workbench has the density and continuity of a working instrument. The persistent dark shell, small document-style controls, comparable table panes, recipe inspector and measurement ledger have distinct jobs. The extension retains that structure: semantic interpretation is a disclosure within the existing work, and evaluated alternatives are a compact selection control rather than another dashboard. Meaningful field information, correction, provenance and measured findings fill the disclosure with useful actions.

The current desktop image preserves simultaneous access to source, candidate, recipe and measurements. At tablet width the toolbar wraps and the main content expands; the explicit pane controls retain access to both tables. The phone image keeps an intelligible preference summary and persistent bottom navigation, with table content scrolling within its region. Dense tables retain usable column widths. No material outer overflow or hidden primary action appears in these images.

## Interaction and recovery judgment

- Source values, immediate draft values and frozen measurements are clearly separated. Draft changes announce that full assessment is pending. Unsupported previews explicitly retain the previous values instead of presenting a partial transformation as complete.
- Semantic interpretation distinguishes source/model, probability, review status, meaning and statistical role. The complete native correction selector is usable without a custom menu. Provider abstention, failed inspection, absent findings, missing ontology and unmet prerequisites have explicit explanations or next actions.
- The final correction repair clears unconfirmed drafts after a successful fresh inspection. Malformed field/finding records are normalized before rendering. Neither model confidence nor missing findings is presented as a privacy pass.
- Findings expose the contributing fields, attacker knowledge, actual measurement, mitigations and utility costs. Selecting a finding shares its field highlight across the two tables. Severity and coverage also have text and icons.
- Protection preference selects actual evaluated snapshots, discloses ordering and excluded results, and shows query cost separately from uniqueness. An external audit outside the scale has an explicit recovery action. Selecting an endpoint restores the stored recipe even when that candidate is already selected.
- Export is guarded against stale classifications, recipe, assumptions and workload, unsaved research questions, an expired session and concurrent operations. CSV export routes through the acknowledgment flow. Snapshot selection warns when it replaces unevaluated recipe edits.

Native action controls, labeled selects/range inputs, disclosure state, semantic table headings, async status announcements, reduced-motion rules and bottom-navigation safe-area padding are present. The release owner's existing direct browser observations cover the 480-row route, real Jev abstention, confirmed correction and reassessment, AGE draft preview, source preservation, stale export blocking, all contributing-column highlights, unpaired-audit exclusion and snapshot restoration. Those observations were considered without duplicating the route or backend suite; the owner is separately verifying the final public deployment.

## Non-blocking follow-up and limits

`frontend/src/views/workbench/semantic-panel.css:61` — the focusable semantic-table scroll region removes its outline without a matching region-level `:focus-visible` replacement. Native controls inside the region retain their focus styles. Add a visible region outline in a future accessibility pass; this does not prevent the reviewed workflow from being used and does not block this release.

Reviewed with the current [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md). This is a practical, scoped maturity approval, not universal optimality, exhaustive device coverage or formal WCAG certification. Public deployment behavior remains the release owner's direct acceptance check.
