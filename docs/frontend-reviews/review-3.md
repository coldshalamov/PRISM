# Independent final frontend review

**CHANGES REQUESTED** for the scoped final frontend at source checkpoint `ae4bbca`.

## Material handoff blocker

**[P2] Verified external pairing is mistaken for matching preview order.** `frontend/src/analysis.ts:108-112` considers a same-size external audit aligned whenever `alignment` is `verified`. The supported import flow explicitly accepts an original-row index for every protected row **in protected-file order** (`frontend/src/shell/Dialogs.tsx:193,205`), so a valid crosswalk can be reversed or otherwise reordered. The service returns `frame.head(30)` in protected-file order (`backend/app/main.py:232`), without its private lineage. Nevertheless, Workbench supplies `dataset.preview` as the positional comparison (`frontend/src/views/Workbench.tsx:146`), and DataTable compares `compareTo[index]` (`frontend/src/views/workbench/DataTable.tsx:75`). This highlights differences between unrelated records, synchronizes their row hover/scroll, and says rows correspond in the preview (`frontend/src/views/Workbench.tsx:162`). Verified owner lineage is not proof of equal preview order.

**Minimum fix:** make `rowsAligned` return false for external audits (`isAudit(candidate)`) until the API supplies an explicitly aligned owner preview. Retain verified pairing for aggregate utility, but use the existing independent-preview behavior for table inspection. Directly check a same-length protected file in reversed row order with a correct reversed lineage: aggregate pairing may remain verified; positional cell highlighting, synchronized row interaction and positional correspondence wording must be absent.

This finding follows the supported source path; I did not execute a new browser reproduction.

**[P2] Omitted frozen membership metadata becomes a positive assumption.** `frontend/src/threat.ts:54` returns `membershipKnown: context?.membershipKnown ?? true`, and `frontend/src/views/workbench/Ledger.tsx:186` independently applies the same default. Frozen context is optional in the frontend contract. An incomplete response therefore yields known-membership wording in Knowledge Map, the recipe inspector and Pareto inspector, while the ledger can display membership-dependent numbers as applicable. Report already treats omitted membership as unrecorded/unknown. The current final service normally supplies both frozen contexts, so this is a response-compatibility defect rather than a reproduced failure of the ordinary demo route.

**Minimum fix:** preserve a distinct unknown/unrecorded frozen-membership state in the shared display helper and its sentences; show membership-dependent ledger metrics only when the frozen value is explicitly `true`. Do not infer the frozen assumption from the current editable controls. A focused check with both frozen membership contexts omitted should show unrecorded/unknown wording and unavailable conditional metrics, while explicit `true` and `false` retain their intended meanings.

## Inspected scope

- Read the final review brief, implementation contract, reference UX specification and verification record. Did not read other review verdicts.
- Inspected all six view sources, shared shell/navigation/dialogs/tabs, draft/stale/export guards, deployment/API bridge, table alignment, charts, exposure surface, query results and Pareto objective handling.
- Viewed `artifacts/prism-workbench-{1440,768,390}.png` and desktop/mobile map, lab, intent, pareto and report screenshots in `artifacts/final-ui/` using `view_image`.
- The graphite navigation, neutral work surface, violet candidate treatment, orange exposure channel and document-style report form a consistent mature application. Captures show usable mobile stacking and retained navigation. Sample uniqueness and verified linkage, missing values and zero, registry support and executed evidence, and feasibility and measured nondominance are visibly distinguished. Finite search is not presented as a global optimum. Export review separates confidential owner evidence from protected CSV and its three acknowledgments.
- Reviewed keyboard names/focus styles, roving tabs, native modal dialogs, chart/table alternatives and reduced-motion rules against [WCAG 2.2](https://www.w3.org/TR/WCAG22/) and the [WAI-ARIA modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/). This is not a formal accessibility-conformance determination.

## Evidence limits

This was a read-only source and supplied-image review, with only this report written. Controller-reported live typing, unsaved-draft navigation/export blocking, actual search, downloads and mobile overflow checks remain separate runtime evidence. Screenshots predate the transport bridge and cannot prove its live operation. Static Archie import/publish acceptance remains pending with the controller; this review does not certify deployment, runtime behavior or global optimality.
