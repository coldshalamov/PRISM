# V3 deployment reconciliation

Reviewed October 17, 2026 against the supplied Markdown and identical Markdown inside `PRISM_Agent_Handoff_v3.zip`, application source, focused tests and a delegated actual Archie Core acceptance check. The ZIP describes proposed registry data, not an executed application. The user subsequently explicitly requested ordinary hosted uploads and direct Jev actions without additional permission dialogs; that instruction governs the implementation.

## Current topology

Archie hosts the public entry and stores session configuration plus uploaded source files in Archie Core. Vercel serves pinned frontend assets and runs the authoritative Python engine. The local package remains available with its larger 50 MB file limit. This is a desktop-style hosted workbench, not an all-Archie Python hosting claim or a fictional-only upload-disabled application.

`deploy/archie-static/build-entry.mjs` creates a new pinned asset revision and refuses overwriting earlier releases. The exact entry must be saved and published through Archie after the assets are deployed. Git synchronization is not currently the publication mechanism relied upon. Old unused workspace screen metadata is not the public application's authoritative version.

## Data and compute contracts

- `/health` advertises `hosted_workbench`, uploads enabled, a 3 MiB file maximum, 100,000 rows and 80 columns. Multipart request overhead has a separate 64 KiB allowance. CSV, JSON records and single-sheet value-only XLSX imports use the same actual Python parsers as local operation.
- Source files are compressed and persisted separately as visitor-owned `prism_demo_record` records with `kind=dataset`. The bounded 64 KiB configuration stores opaque references, reviewed schemas, semantic results/corrections, recipes, workloads and immutable candidate contexts. Eight datasets, 40 candidates and four searches of at most 24 candidates are supported per session.
- Every cold request reconstructs actual source/protected frames. A request-local byte cache avoids repeating Archie reads during a search; there is no global uploaded-row cache. Schema snapshots and candidate configuration remain frozen.
- External audits preserve the protected source reference, column mapping, mode and any explicitly supplied pairing lineage. Replay and reassessment use that protected frame, never substitute an empty transformation recipe or infer row correspondence.
- Clear session deletes every referenced owned source blob before removing its session record. If deletion fails, the request fails and remains retryable. Sessions expire after 30 minutes of inactivity; expiry blocks reuse and cleanup occurs when the expired visitor returns. There is no background sweeper, so abandoned uploads can remain stored until cleanup. Reloading the page starts a new browser visitor because its token is held in memory.
- Archie browser API requests use exact configured origins, an in-memory visitor token and omitted cookies. Same-origin Vercel sessions remain separate. Compare-and-swap persistence prevents silent concurrent overwrites. Public asset CORS is anonymous and separate from the exact API origin policy.

## Direct Jev action

`Interpret ambiguous fields with Jev` prepares the minimized metadata digest and immediately requests interpretation. No additional permission or approval dialog is required. The existing factual metadata-only disclosure remains visible. Optional `View model input` fetches a read-only JSON view with a Close button and invokes no provider request.

The digest is an internal input-consistency binding to dataset ID, current schema, semantic revision, corrections, bounded metadata, ontology/template version and model. Missing, tampered or stale bindings return `metadata_changed` before provider execution or durable attempt reservation. It is not represented as a consent grant. Outbound context is capped at eight ambiguous fields and twelve neighboring labels, with 200 characters per label. Question text uses those same bounded labels. Row values and filenames are excluded. No provider call occurs on page load, correction, candidate replay or slider movement. Two durable interpretation attempts per visitor and a process-scoped monetary cap remain bounded demonstration resource limits, not a global cross-worker monetary guarantee.

## Verification

- Eighteen focused tests passed: six existing serverless integration checks, seven new hosted-import/audit checks and five metadata-input checks. The existing 24-candidate search replay regression was fixed: its stored recipe version `1.0` must be hashed after restoration, rather than inheriting the replay constructor's `1` hash.
- Actual Archie Core acceptance passed in 17.03 seconds using the existing restricted role: CSV, JSON and XLSX imports of 480 rows/nine columns; reviewed candidate 96 unique rows and zero specified query loss; external audit zero unique rows with 1.2 cm height mean error; fresh-adapter exact candidate/audit/report replay; zero provider attempts; 25.8 KiB state. Clear session removed its session and all four uploaded source records, then absence was rechecked. Receipt: ignored `artifacts/v3-real-core-receipt.json`.
- TypeScript checking passed after simplifying the Jev action and routing uploads through the workspace's abortable, epoch-guarded import flight. Closing the import dialog aborts waiting so a late response cannot replace the current dataset. Protected CSV exports use the ordinary download action without acknowledgment checklists; stale-result and direct-identifier checks remain.

The root agent owns final integrated testing, public browser acceptance, source publication and the new Archie entry release. These source checks do not assert that an earlier published revision already contains the current upload changes.

## Remaining V3 differences

The local service uses loopback Host/Origin/fetch-site checks rather than the distinct local HTTP credential proposed by v3. Provider metadata editing/deselection and background storage cleanup are not implemented. Neither is claimed. The product presents actual measured scope and current deployment behavior instead of promising every proposed v3 adapter or a disclosure guarantee.
