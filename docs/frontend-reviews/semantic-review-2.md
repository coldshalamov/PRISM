# Semantic extension: independent frontend review 2

**Disposition: APPROVED.** No material design or interaction defect remains in the reviewed scope.

Reviewed frozen application source: **`9f40ec12e0178d4eabe4c9bc2663ceb0938c861d`**. This is the second fresh, successive review of the semantic extension after semantic-review-1 approved that source. It does not reuse the older, pre-extension approval sequence.

## Design and responsive inspection

Independently inspected the actual `artifacts/semantic-workbench-1440.png`, `semantic-workbench-768.png`, `semantic-workbench-390.png` and `semantic-findings-1440.png` images, plus Workbench, SemanticPanel, DataTable, workspace state, stale-evidence logic and their styles. The findings image precedes the date-control wrap repair; the later desktop workbench image shows the corrected two-row control.

The extension belongs to the existing instrument: persistent graphite navigation, compact typography, paired source/candidate tables, violet selection and orange exposure warnings. Semantic interpretation occupies a disclosure within the workflow rather than introducing a separate chat or a generic dashboard. Its substantive field details, correction controls, measured findings and coverage gaps provide useful next actions; empty and unavailable states explain how to proceed.

At 1440 px the source, candidate, recipe controls and measurements can be compared together. At 768 px the toolbar wraps and the working column expands, while Source/Candidate controls preserve access to both panes. At 390 px the preference control, metrics and actions reflow without compressing the table into unreadable columns; table scrolling is contained and the bottom navigation remains available. Dense tables use deliberate horizontal scrolling. No material clipping or obscured primary action appears in the reviewed current-layout images.

## Interaction and evidence clarity

- Native buttons, selects, range inputs, semantic tables and keyboard-operable tabs carry accessible names. Disclosures expose expanded state, column selection exposes pressed state, async interpretation announces status, and shared focus/reduced-motion styles remain present.
- Model probability, semantic meaning, statistical role and measured privacy results have separate labels. Confirmation explicitly preserves the source values and reviewed statistical role. Measured, Needs Assessment and Not applicable findings are distinguished by text and icons, not color alone.
- Expanded findings explain contributing fields, attacker prerequisites, the actual measurement, mitigations and analytical costs. Selecting a finding highlights its contributing columns in both table panes; choosing an individual field returns to a focused selection.
- Protection preference uses finite, evaluated snapshots under the current assumptions. It shows measured uniqueness, query loss, suppression and minimum k, discloses ordering and exclusions, and explicitly avoids interpolating a protection percentage. An excluded external audit has a clear Select first snapshot recovery action.
- Selecting an existing snapshot restores its exact recipe even if that candidate is already active. Immediate draft values are labeled preview-only and assessment pending. Measurements remain attached to the frozen snapshot, stale semantic findings are labeled historical, and current-control differences block export until reevaluation or restoration.
- A successful fresh semantic inspection clears unconfirmed local corrections. Malformed service records are normalized before rendering; missing probabilities and unavailable ontology choices have explicit fallback states.

The release owner supplied direct live checks of the real 480-row workflow, Jev abstention followed by user confirmation and reassessment, AGE 10→11 draft preview, unchanged source, stale export protection, five-column highlighting in both panes, cached baseline/candidate selection, unpaired external-audit exclusion and the three final Gemini repairs. Those observations were not duplicated in this source-and-pixel review. No extra test or implementation change was needed.

Reviewed against the current [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) and the user's request for a mature, cohesive working tool. This approval is scoped to the inspected extension and evidence; it is not a claim of global optimality or formal accessibility certification.
