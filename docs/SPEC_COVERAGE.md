# PRISM specification coverage

The original and branch planning chats describe the same central job: a researcher should understand an unfamiliar table, inspect an externally protected version or make a new one, and see the disclosure/analysis tradeoff before sharing. The added [semantic specification](SEMANTIC_SPEC.md) extends the working application. It does not replace the scientific engines or create a chatbot.

## Connected implementation

| Specification area | Implementation |
| --- | --- |
| Import and original/protected workflow | Local CSV, JSON record tables and single-sheet XLSX intake; original frame copied before transforms; explicit external-pair audit and column mapping. The hosted demonstration accepts fictional fixtures only. |
| Layered semantic classification | `semantics.py`, `ontology.json`, `jev.py`: 13 families and 145 types, independent properties, deterministic format/cardinality checks, family-to-leaf typed decisions, alternatives and unknown states. |
| Optional Jev | Real OpenRouter Decisions API, pinned `typesafe/jev-1.14`, metadata-only permission, bounded calls/timeouts/retry, local fallback, caching and per-process cost ceiling. Public sessions reserve two attempts durably. |
| Normalized state and corrections | Stable field IDs, source/model/probabilities, validation evidence, confirmation and semantic revision. Confirmed corrections override suggestions. Candidate revisions and provider receipts are frozen for replay/export. |
| Semantic lineage | Source meaning persists through actual ordered transformations. Current representation/granularity is derived from each protected frame; external algorithms remain unknown. Measurements use current output. |
| Attack knowledge | `semantic_rules.py`: 25 categories connect field meanings/combinations, required artifacts, attacker prerequisites, deterministic evidence, mitigations, utility costs and unsupported states. Original 26-family threat register remains separately documented. |
| Independent baseline checks | Identifier name/format scans, field cardinality, declared-QI uniqueness and existing risk calculations run regardless of model interpretation. Confirmed identifiers also guard research queries and protected CSV exports. |
| Quantitative privacy evidence | Exact sample groups, uniqueness, minimum class size, candidate sets, conditional row entropy, bounded subsets, categorical conditional entropy/homogeneity/l-diversity/t-distance and defined guessing diagnostics. Verified linkage uses the existing explicit ground-truth boundary. |
| Researcher-facing findings | Mild, Moderate, Severe and Needs Assessment; contributing fields, measured values, attacker prerequisites and deterministic explanations. A semantic match alone does not become a successful attack. |
| Protection controls | Existing field/recipe controls for removal, mask, HMAC pseudonyms, fixed bands, rounding, top/bottom coding, ZIP prefixes, rare grouping, UTC hour/day/ISO-week/month/quarter/year, shifts, limited redaction, experimental noise/permutation and suppression. |
| Centered intervals | Explicit closed integer interval `CI[x−r,x+r]`. Its midpoint is recoverable, so it earns no reduction in distinguishability. Fixed nonoverlapping bands are a separate option with `[a,b)` boundaries. |
| Interactive preference | The preference control selects actual cached evaluated snapshots, with measured uniqueness and scientific loss visible. It does not interpolate security guarantees. Field drafts preview supported row-local transformations; full assessments remain pending until evaluation. |
| Scientific utility | Means, medians, standard deviations, quantiles, distributions, category frequencies, missingness, correlations, selected joint/subgroup diagnostics, weighted research queries, cohort support and sign reversals. No mean-preservation shortcut. |
| Information value and optimization | Bounded field/subset analysis and deterministic recipe search; actual candidate metrics, four-objective nondominance and separate constraint feasibility. No global-optimality claim. |
| Export | Protected CSV, ordered recipe JSON and confidential JSON/HTML assessment with measurements, original/current semantics, provenance, assumptions, unsupported coverage and limitations. Source rows/private correspondence and API keys are excluded from reports. |

## Demonstrations and checks

- Original fictional benchmark: 480 records; default public-rule linkage yields 75 unique correct matches, and removing ZIP yields 20. Three selected protected analytical answers are identical between those recipes.
- Semantic fictional benchmark: `PAT_ID`, `DOS`, `HOSP_SITE`, `DX_CODE`, `AGE`, `ZIP`, `HT_CM`, `TX_RESP`, `NOTES`. Current event/place/demographic combinations have 480 unique rows in the source and 96 in the default protected output. The selected diagnosis-response query has zero error. These are sample distinctions, not population identification probabilities.
- Eight deliberately ambiguous labels remain reviewable. A real metadata-only Jev integration demonstration resolved two under the configured probability threshold and abstained on six; repeated interpretation used cached decisions. This small case is not a calibrated classifier accuracy benchmark.
- A deliberately incorrect interpretation cannot disable identifier evidence. External unknown-mechanism audits do not infer the producing algorithm or positional correspondence.
- The integrated backend suite passed **157 tests** at the semantic checkpoint. Client draft previews matched the real Python engine on eleven recipes, including pound conversion, negative rounding ties and ISO-week year boundaries. New changes receive focused checks; final browser and release outcomes are in [verification](../artifacts/verification.md).

## Explicit capability boundaries

The ontology recognizes more data types and attack prerequisites than this tabular release contains. Population estimation, real auxiliary-record linkage, prior-release composition, query-history reconstruction, specialist genomic/household/sequence attacks, model membership/inversion and embedded-container scanning require artifacts and implementations this release does not supply. They remain Needs Assessment rather than a fabricated pass. Attack Lab examples are educational executable examples, separately labeled.

Arbitrary geographic hierarchies are not invented from ZIP prefixes. Supplied units and roles still require review. Generalization can harm selected outcome relationships; those consequences remain visible. Presidio, ARX, trained synthetic generation, formal DP accounting and production enclave services are not represented as installed integrations. Optional pyCANON cross-checks remain explicit.

The current tables show bounded previews rather than rendering 100,000 DOM rows. More expensive whole-table computations run on the backend; the browser displays pending/stale state and rejects mismatched results. This is not a distributed large-data platform.

The application makes no publication, clinical, legal or compliance determination. That boundary is part of the requested evidence-driven workflow, not a substitute for implementing its computations. User submission authority remains separate: save the Enterprise AI draft and leave **Submit Project** untouched.
