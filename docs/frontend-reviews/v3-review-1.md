# PRISM v3 product review 1

Status: **pending final source checkpoint and public acceptance**.

This reviewer subsequently authored the limited repairs listed below at the controller's request. Those repairs require another agent's independent integration review; this report does not count as an independent approval of the author's own changes.

Scope: independent source review of the six application views and the primary journey: upload an original table, review classifications, adjust a recipe, evaluate, compare a protected external file, inspect evidence, and export. This is a product review, not certification or a claim of a global optimum. Root owns the browser and the integrated test run; this reviewer did not duplicate those checks.

## Material findings

1. **Import concurrency and late responses need the workspace request gate.** `UploadDialog.upload()` calls `api.importDataset` directly and tracks only component-local busy state. The workspace declares an `import` busy key but does not run it. File menu import and audit entries can therefore open during a search or evaluation, and closing an in-flight upload allows another workspace operation while its response may subsequently replace the current dataset. Archie uses optimistic session writes, so this can cause a write conflict or a late workspace replacement. Requested repair: route imports through the workspace's single-flight/epoch-aware request gate, disable menu entry points during another operation, and make cancellation/close behavior explicit.
2. **Incorrect fictional-data limit label — repaired by this reviewer.** The Pareto view's actual hosted session limit now says “Hosted session limits”, independently of whether the source was uploaded or fictional.
3. **Remote deployment notice contradicted enabled capabilities — repaired by this reviewer.** The remote notice now describes enabled uploads when the service reports them, and otherwise uses the service-capability explanation. It no longer unconditionally tells users that uploads are off.
4. **Unnecessary CSV acknowledgment ritual — frontend repaired by this reviewer.** Report now offers one direct “Download protected CSV” action. It does not invent human acknowledgments. Current-evidence, unprotected-original and direct-identifier checks remain, and measurements and limitations remain visible. Workspace/backend owners are removing their matching acknowledgment gates. HTML, JSON and recipe export controls retain their behavior.

The import/audit menu entries in Shell and Sidebar, the Prepare/Audit mode switch and recovery import action now disable while a session operation is in flight. The workspace and dialog import implementation is owned by another agent. `npm run typecheck` passed after these changes.

5. **Desktop toolbar overlap — repaired after the controller's actual 1440 × 1000 screenshot.** The fixed toolbar grid track and sideways scroller allowed the sticky primary button to cover the Semantic example action. `shell.css` now gives the toolbar an automatic grid track, wraps complete action rows with a minimum height, and keeps the primary action in normal flow. Existing phone-specific layout rules remain. Root owns the required desktop/tablet/phone visual recheck; no CSS-only implementation-mirroring test was added.

## Reviewed behavior

- Hosted upload availability follows the service's `hosted_workbench` capability and `uploadsAllowed` response. A visible Workbench import action accepts CSV, JSON and XLSX; format and size errors stay in the dialog.
- Original import moves to field review; confirming the first review creates a candidate through the actual service. Editable roles, units and person keys are explicit.
- Recipe edits produce immediate preview values only when supported; measurements remain tied to the evaluated snapshot and stale export controls explain the recovery action.
- External-file comparison offers unknown pairing by default. Verified pairing requires a matching one-to-one row crosswalk; synthetic output remains a separate mode. Column mappings are explicit.
- Workbench and Knowledge Map direct users to field review/evaluation when evidence is missing. Research Intent edits real query definitions; Pareto evaluates real recipes and distinguishes constraints from nondominance.
- Attack Lab identifies its fixed fictional counterexamples as independent of the user's candidate. Report exports refer to a frozen candidate; missing or unsupported results are not replaced by zero.
- Jev has an inspectable metadata approval step, keeps deterministic operation available, and does not run on candidate-selection slider movements.
- A finite hosted upload/session capacity is a deployment constraint, not a prohibition on the app's core input workflow. Its limits are shown where users import and inspect storage.

Final acceptance requires closure of finding 1, removal of the matching workspace/backend acknowledgment gates for finding 4, a frozen source checkpoint, and root's actual public upload/evaluate/export acceptance evidence. Screenshots and public behavior have not yet been supplied for this checkpoint. An independent reviewer must review the integrated repairs.
