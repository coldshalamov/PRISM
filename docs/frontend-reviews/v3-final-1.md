# V3 merged frontend review 1 — PASS

Reviewed the merged frontend frozen at `8edb1e1` after PR #1, and the actual 1440 px rendered capture `artifacts/v3-merged-1440.png`. This is a focused frontend review; the reviewer did not re-audit their own backend upload implementation. Final public Archie route acceptance is owned by the root agent and is not inferred from this local screenshot.

## Result

PASS. No unresolved material frontend finding remains in the reviewed scope.

The rendered interface has a consistent ink navigation frame, readable self-hosted typography, clear source/candidate panes and a distinctive prism illustration. File intake and field review are readily available; the initial candidate state explains the next action without inventing measurements. The screenshot has no overlapping controls or outer horizontal overflow at its captured desktop size. Wide table content uses its own visible horizontal scrollbar.

Source checks confirmed that the new hero reads the ledger's actual measurement objects. Missing measurements remain unavailable, external-file row differences are not labeled proven suppression, and the external prism comparison says “Lower by” rather than attributing an unknown mechanism. Stale evidence is explicitly named before the hero and dims the old measured presentation. Fictional labels depend on the dataset's synthetic flag, not simply the hosting origin.

The Jev action remains direct, with an optional informational model-input view. Upload lifecycle cancellation and ordinary report downloads survived the merge. Snapshot/version, current-control and direct-identifier guards remain in place. Bundled fonts and motion respect the existing resource policy and reduced-motion treatment.

## Finding repaired before approval

The File menu's “Download protected CSV” action initially navigated to Report while its label promised a download. The controller repaired the callback in `8edb1e1` to call the ordinary export action directly, preserving the same busy/stale guards. The repaired source was checked before this approval.

## Focused regressions

- `node frontend/tools/review-regressions.mjs`: passed external-preview ordering and missing frozen membership checks.
- `node frontend/tools/draft-preview-regressions.mjs`: passed eleven recipe comparisons with the Python engine, source immutability, six unsupported-method abstentions and ten invalid-recipe abstentions.

This approval covers the inspected source and rendered desktop layout. It does not certify all devices, every possible dataset, a privacy standard, or deployment reachability.
