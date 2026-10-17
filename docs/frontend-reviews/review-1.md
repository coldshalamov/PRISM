# Independent final frontend review 1

**CHANGES REQUESTED**

Reviewed the frozen frontend under `artifacts/FINAL_FRONTEND_AUDIT.md`. One material interaction defect remains.

## Required correction

**[P2] Keep the research editor mounted when its first edit becomes dirty.** `frontend/src/views/ResearchIntent.tsx:203` puts the workspace `dirty` flag in `QueryEditor`'s React key. The editor computes its local dirty state and reports it through the effect at lines 79–81; `setWorkloadDraft` then changes `ws.workloadDirty` from false to true. That changes the key and remounts the form and focused input. Ordinary typing therefore loses focus after the first change of a previously clean question, interrupting entry of filter values, tolerances and positive outcomes. Filling the entire value in one event does not exercise this failure.

The controller subsequently reproduced the focus loss in the real UI: one ArrowUp change in a clean numeric input left `document.activeElement` at `BODY`.

Minimum fix: keep editor identity stable across clean-to-dirty transitions, and reset its local draft with an explicit reset revision or equivalent synchronization when edits are discarded. Preserve both the local Discard action and the evidence banner's Discard action. Directly verify sequential keystrokes in a clean question retain input focus and accumulate the complete value, then verify discard restores the saved value and disables Save.

## Inspected evidence

- Actual images viewed: `artifacts/prism-workbench-1440.png`, `-768.png`, `-390.png`; `artifacts/final-ui/{map,lab,intent,pareto,report}-local-{1440,390}.png`.
- Read the implementation contract, UX specification and verification record; inspected all six primary view sources, frozen-evidence/staleness and export state, recipe and classification controls, scientific formatting and objective/frontier code, distribution/correlation/query table alternatives, shared keyboard/dialog/menu/tooltip code, motion and focus styling, and hosted/local deployment labeling.
- The captured graphite navigation, neutral data canvas, violet candidate and orange exposure treatment meet the requested application direction. No additional material visual handoff blocker was found in the inspected captures. The inspected scientific presentation separates sample uniqueness from verified linkage, unknown from zero, measured nondominance from constraint feasibility, registry support from executed evidence, and owner audits from protected CSV releases.
- Review criteria: [WCAG 2.2](https://www.w3.org/TR/WCAG22/) and the [WAI-ARIA modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/), applied as review guidance rather than a formal conformance claim.

## Limits

Read-only review: no browser interaction, source changes, Git operations, new tests or backend audit by this reviewer. The focus defect was found from the exact React identity/state path and separately reproduced live by the controller. API/export success and recovery actions also come from the controller's separate live verification; screenshots do not establish those behaviors. Background-tab focus wrapping remains unverified as disclosed in `artifacts/verification.md`. This verdict does not certify global optimality, formal accessibility conformance or privacy/release clearance.
