# PRISM verification record

This record distinguishes calculation/API checks from live browser use. The application is a local row-release prototype; this record is not de-identification certification or release authorization.

## Completed before final frontend integration

- Python3.11.15 environment: current backend suite111 passed (22.53s), with one Starlette TestClient legacy-HTTPX deprecation warning. The final backend change includes the directly reproduced session-clear race regression: an in-flight operation cannot recreate session data after clear.
- Preserved original source kit:61 passed in its isolated reference package (worker-executed; installed dependency versions are recorded in the reconciliation notes).
- Direct live IAB workflow at127.0.0.1:5173 against the current loopback API: opened the480-row fictional benchmark, reviewed classifications, created C1 and observed75/480 verified exact matches; removed ZIP, observed stale evidence until evaluation, created C2 and observed20/480 matches. The displayed C2 selected scientific answers were0.3625,0.4503 and0.6893; correlation error versus the source was about0.0058. These answers agree with C1, rather than claiming exact source correlation preservation.
- Actual file-chooser upload of `examples/kit_benchmark/fictional_protected.csv`, explicit unknown-pairing mode and external audit completed. UI showed15.6% sample uniqueness while verified exact linkage was **Not applicable**, with no implied row correspondence.
- Shared frontend export guards now enforce reviewed/current evidence and local-session availability across both Report and File menu; CSV menu entry routes to explicit review. Missing objective values are excluded from client frontier classification; missing membership metadata remains unknown. Protected table units follow the measured comparison unit after conversion.

## Final integration checks

Sonnet 5.5 XHigh polish and the OpenCode Go Gemini 4 Argon improvement pass are integrated. TypeScript and production build passed. The following live checks used the real Python service, separately from Sonnet's mocked browser exercise:

- All six local views rendered with the 5,000-row fixture. A real 24-candidate search evaluated 24 recipes (27 attempts), found six measured frontier members, and correctly reported zero candidates meeting all constraints. A comparison candidate was adopted.
- Saved research-question changes marked frozen evidence stale and blocked exports. Restoring the saved workload restored matching evidence. JSON, HTML, recipe JSON and three-acknowledgment CSV downloads completed. The CSV contained 5,000 rows and no direct identifier headers.
- Responsive views were inspected at 390, 768 and 1440 pixels. A reproduced tablet toolbar/header clipping issue was corrected with wrapping rows. Reduced-motion emulation disabled view animation. Skip-to-content moved focus to main; native dialog Escape dismissal passed. Background-tab focus wrapping was inconclusive and is not claimed as verified.
- The public browser initially reproduced an optimistic Archie session-write conflict when candidate and baseline were created simultaneously. Their writes are now sequential. Repeating the public schema-review/create flow returned C1 with 75/480 matches and no conflict notification.

Final Gemini editor/recovery fixes, the final deployed frontend check, refreshed packages and three successive independent design approvals remain pending at this checkpoint.

## Initial deployed backend check

- Public origin `https://prism-healthcare-taupe.vercel.app`: Vercel Services build passed with Python3.12 from `backend/.python-version`. Health returns fictional demo mode, uploads disabled and Archie backend provider.
- Actual HTTPS workflow against that origin loaded480 fictional rows, computed75 then20 verified exact matches after ZIP removal, and returned an identical protected comparison on a subsequent request. Intake returned403; pitch PDF returned200 with a valid PDF header. The probe cleared only its own visitor session. This verifies the deployed Python → Archie path, separately from the frontend polish still in progress.
- Full backend suite after adding the hosted adapters:120 passed, one Starlette TestClient legacy-HTTPX deprecation warning. The two hosted adapters account for nine added focused checks.

## Design review references

Review criteria include the source kit's workflow/accessibility requirements and current primary guidance: [WCAG2.2](https://www.w3.org/TR/wcag/), [WAI-ARIA modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/), and [MDN reduced-motion media query](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion). These are review references, not a claim of formal conformance certification.


## Semantic extension checkpoint (2026-10-17)

The complete backend suite passed **157 tests** in 37.09 seconds after semantic integration; one existing Starlette HTTPX deprecation warning remained. Three later alternative-routing checks and nine focused semantic pipeline/alternative checks passed. Root also directly checked stable SHA-256 recipe identity, changed-recipe identity, and representation-aware direct-identifier severity. These focused runs overlap; their counts are not added to the full-suite total.

OpenRouter's actual Decisions API served `typesafe/jev-1.14-20261014` on minimized fictional schema metadata. The provider demonstration made two logical requests, cost $0.000326886 and reused two cached decisions with zero repeated requests. This verifies the provider adapter, not a calibrated accuracy claim. The local browser separately requested Jev for DOS, observed an honest abstention after two calls, confirmed encounter-date meaning and reassessed the candidate.

Actual local semantic workbench: 480 fictional records, source uniqueness480/480, default candidate96/480 and selected response-query error0. Changing AGE width10→11 immediately changed the protected first value `[40,50)`→`[33,44)` while source40 remained unchanged; full measurements/export were explicitly stale/pending. Restoring the recipe and selecting cached baseline→candidate changed100%→20% uniqueness without new Jev calls. Opening the event/place finding highlighted DOS,HOSP_SITE,AGE,ZIP,HT_CM in both pane headers. Desktop1440,tablet768,phone390 screenshots were inspected; no outer horizontal overflow at768 or390. The expanded six-option date control was corrected to two rows.

The actual local unpaired audit imported `examples/semantic_benchmark/external_protected.csv`:480rows,6fields,0%sampleuniqueness,k20,verifiedlinkageNotApplicable,queryloss0.15(responseerror0; heightmeanerror1.2cm). Rows were explicitly independent; no correspondence or generating mechanism was inferred. Source CSV/JSON/XLSX acceptance files and measured report are committed with the fixture package.

The previous three frontend approvals apply to c5404fd/revisiond only. The semantic extension receives new approvals after Gemini's concrete edge-case repairs. Final public revision, downloads, screenshots, package and saved submission updates will be recorded below after execution.
