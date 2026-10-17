# PRISM 0.1.1

PRISM is a desktop privacy preflight workbench: compare an original table with a protected candidate, understand measured exposure, and check what happens to selected research questions before sharing.

- Import CSV, JSON and single-sheet XLSX files in the hosted Archie workbench, or run locally. Hosted intake supports 3 MiB per file, 100,000 rows and 80 columns; local intake supports 50 MiB. Uploaded table bytes and session configuration are stored in Archie Core; deterministic Python calculations run through Vercel.
- Review 145 semantic types across 13 families. Optional Jev 1.14 interpretation uses schema metadata through OpenRouter Decisions; record cells are excluded. Corrections retain provenance and frozen candidates retain their own interpretation.
- Inspect 25 semantic evidence categories, including output-visible recovery of exact midpoints from explicitly encoded centered intervals. Shared fixed bins are distinct, and unknown external protection mechanisms remain unknown.
- Compare source and candidate, preview compatible field edits immediately, evaluate actual data, inspect bounded recipe alternatives and read failed constraints. The refreshed frontend keeps the working tool and its evidence in one workspace.
- Audit an independently protected table without assuming its row order matches the original. Download a protected CSV directly, or export the owner audit and recipe. Direct identifiers and stale/mismatched UI evidence remain explicit blocks; no authority checklist or fabricated human approval is required.
- Clear session deletes its uploaded files and stored configuration after the service confirms cleanup. Hosted sessions become inaccessible after 30 minutes of inactivity; expired records are removed lazily when that session is revisited. Reloading starts a new browser visitor session.

Archie hosts the application entry and durable session data. Vercel serves immutable frontend assets and Python compute. This is a split deployment, with the real app published through the tracked static entry rather than an old generated approximation. The public pitch and portable PDF remain available from the Vercel pitch URL.

The release wheel was installed into a separate target and executed with Python isolation enabled. The actual installed app served current UI assets and the seven-page pitch, imported all three table formats, exposed 25 semantic categories, reproduced the 480-to-96 sample-uniqueness example, downloaded CSV without acknowledgment flags, and reproduced an unpaired external audit. A separate check used actual Archie Core storage to verify uploaded-file persistence, exact cold replay, report bindings and deletion of all four owned upload records. The controller records complete suite and public-browser acceptance separately.

The wheel includes the local application and built frontend. The source ZIP includes source, documentation, fictional examples, deployment adapters and this same tested wheel. Use `setup.ps1` and `start.ps1` for the source workflow; the wheel requires its documented Python dependencies. External checksums accompany the release assets.

Measurements support human judgment. Sample uniqueness and simulated verified matches are different quantities, and neither establishes population identification probability. Unsupported analyses remain unassessed; this proof of concept does not certify compliance or authorize publication.

The hackathon entry remains an **Enterprise AI draft** until the user chooses to submit it.
