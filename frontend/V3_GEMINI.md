# PRISM v3 frontend review — Gemini 4 Argon

Invoked the requested model `opencode-go/gemini-4-argon-contributor` through the authenticated canonical OpenCode Go installation, `C:\Users\93rob\AppData\Roaming\npm\opencode.cmd`, version 2.0.31. One fresh read-only `plan` pass, exit 0; session `ses_eb4428737ffe6dKNRbc9cnfeya`. No source edits, tests, builds, deployments or secondary agents were requested or performed by this review.

Scope: the current v3 working-tree frontend and related HTTP contracts, based on repository HEAD `44de58ba58d7f34030488ce592b9305beba03a8f` plus the integrated uncommitted 0.1.1 changes. This review does not inherit earlier approval sequences. The parent records final commit/revision binding and actual browser acceptance.

Raw provider/tool stream and prompt are ignored artifacts: `artifacts/v3-gemini.jsonl`, `artifacts/V3_GEMINI_TASK.md`. The text below is the returned source-review verdict; “verified contracts” means code inspection in this pass, not independently exercised browser behavior. No changes were suggested because this bounded pass found no material defects.

## Returned review

PASS — no material findings in this scoped source review

Visual and public-browser acceptance remains controller-owned.

### Verified Contracts (Current Working Tree)
1. **Public Upload, Review, Candidate Evaluation, Unpaired Audit & Direct CSV Export**:
   - `frontend/src/deployment.ts:32-49` and `frontend/src/shell/Dialogs.tsx:64-144` enable CSV, JSON, and single-sheet XLSX uploads up to 3 MiB (`3 * 1024 * 1024` bytes), 100,000 rows, and 80 columns in `hosted_workbench` mode backed by Archie Core (`backend/app/archie_store.py:21-40`) and Vercel Python (`backend/app/serverless_demo.py:158-287, 321-337, 463`).
   - `frontend/src/shell/SchemaReview.tsx:23-139` enforces role, type, explicit weight unit (`kg`/`lb`), and row-unit/person-key review before first candidate evaluation (`frontend/src/workspace.tsx:498-524, 568-612`).
   - External audit defaults to `unpaired_microdata` (`frontend/src/shell/Dialogs.tsx:74, 132-144`) and posts to `/v1/audits/import-pair` (`frontend/src/api.ts:201-207`, `frontend/src/workspace.tsx:711-730`).
   - Protected CSV export is a direct download (`frontend/src/views/Report.tsx:101-107, 171`, `frontend/src/workspace.tsx:732-746`, `frontend/src/api.ts:210-240`) with the old 3-box acknowledgment checklist removed from both UI and backend (`backend/app/main.py:509-530`).
2. **Single-Flight Busy/Cancel/Abort & Late-Response / Current-Version Guards**:
   - `frontend/src/workspace.tsx:245-276, 391-414` enforces single-flight operations per key, cross-key serialization against concurrent session writes, `AbortController` cancellation (`Dialogs.tsx:80-90`), and `flight === flights.current[key] && flight.epoch === epoch.current` checks so late responses from older datasets, schemas, semantics (`workspace.tsx:530-541`), or candidates cannot overwrite newer state.
   - `frontend/src/views/Report.tsx:93-100` and `backend/app/main.py:514-522` block export when controls are stale (`ws.stale.length > 0`) or when direct identifiers remain in the schema, profiler, or semantic lineage.
3. **Jev Metadata-Only Flow & Confirmed Meaning Preservation**:
   - `frontend/src/views/workbench/SemanticPanel.tsx:350-358, 406-412` and `frontend/src/workspace.tsx:530-541` make **Interpret ambiguous fields with Jev** the primary action (`prepareRemote`: fetches `previewOnly: true` digest then calls `inspectSemantics(true, undefined, preview.metadataDigest)` directly without a forced consent modal), while **View model input** opens a read-only dialog (`SemanticPanel.tsx:380-389`).
   - No row values are sent (`backend/app/semantics.py:199-219`), slider movement (`ProtectionPreference` in `SemanticPanel.tsx:596-605`) never invokes the service or LLM, and user-confirmed meanings (`reviewStatus: 'confirmed'`) are excluded from remote overrides and preserved (`SemanticPanel.tsx:359-362`, `backend/app/semantics.py:301-302, 361-375`).
4. **First-Use Workspace Layout & Controls**:
   - Compact hosted banner (`frontend/src/shell/DeploymentBanner.tsx:32-48`, `frontend/src/styles/shell.css:145-150`), no redundant intro notice (`frontend/src/views/Workbench.tsx:246-254`), `ProtectionPreference` hidden until an evaluated candidate exists (`Workbench.tsx:248`), concise single-line idle ledger (`frontend/src/views/workbench/Ledger.tsx:176-198`, `frontend/src/styles/data.css:133-136`), and visible **Import table** and **Semantic example** buttons in the Workbench toolbar (`Workbench.tsx:231-236`).
