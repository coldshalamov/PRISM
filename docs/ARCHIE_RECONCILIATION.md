# Archie source reconciliation

All six generated views exported through Archie's documented Code editor →
Download file action were read on 2026-10-17. The raw exports remain ignored in
artifacts/archie-generated-source/. The earlier HTTP 401 obstacle is resolved
by these authenticated exports; no credentials or authentication bypass were
used.

This is a source comparison with the [six-view contract](../IMPLEMENTATION_CONTRACT.md),
not a visual playtest or certification. Localized label catalogues and imported
calculation modules were not included in the exports.

## What was worth keeping

The old version was not entirely a mockup. Its review.view.jsx implements a
client-side workbench using imported CSV, profiling, transformation, assessment,
utility, search and export functions. The recipe, assessment and companion
views inspect supplied records. Research Queries and Evidence Export explicitly
declare themselves **unbuilt plan cards**.

| Export reviewed | Concrete useful idea | Current implementation and decision |
| --- | --- | --- |
| review-companion.view.jsx | Review/dataset/candidate identity; observation summary; tested versus unsupported counts; limitations beside results; up to three candidates with hide/restore. | [Report](../frontend/src/views/Report.tsx) retains frozen context, findings, gaps and human review. [Pareto Explorer](../frontend/src/views/ParetoExplorer.tsx) compares three removable snapshots and flags differing assumptions. Keep these ideas within the existing views. |
| recipes.view.jsx | Search/sort by recipe, dataset, version and origin; ordered step details; experimental flags; two-version Added/Removed/Changed step diff. | [Library](../frontend/src/shell/Sidebar.tsx), [recipe inspector](../frontend/src/views/workbench/RecipeInspector.tsx) and [Pareto inspector](../frontend/src/views/pareto/ParetoInspector.tsx) retain immutable IDs, exact ordered methods/parameters, seed/version, warnings and comparisons. A dedicated step-delta display and cross-dataset catalogue are useful optional refinements, not missing session-workflow requirements. |
| risk-assessments.view.jsx | Assessment/date/assumption selection; sample uniqueness and minimum class; coverage/search limits; unsupported-first results; expandable limitations; sortable known-field subsets; explicit pyCANON “Not run.” | [Knowledge Map](../frontend/src/views/KnowledgeMap.tsx), Report and [Attack Lab](../frontend/src/views/AttackLab.tsx) retain bounded coverage, assumptions, metric scope and unsupported visibility. Engine capability, candidate findings and optional-adapter execution remain separate. |
| review.view.jsx | Original/protected tables, distributions, correlations and profiles; field-role controls; age/ZIP/weight treatment; non-DP noise warnings; query tolerances; bounded search, constraint failures and field-ablation explanations. | [Workbench](../frontend/src/views/Workbench.tsx), [schema review](../frontend/src/shell/SchemaReview.tsx), Research Intent and Pareto Explorer preserve this action → measurement → comparison workflow through the maintained Python engine. Explicit units, records-versus-people review and subgroup diagnostics strengthen it. |
| research-queries.view.jsx | Planned weighted questions, tolerances, minimum cohorts, source/candidate answers, bounded search outcomes and nondominated choice. | [Research Intent](../frontend/src/views/ResearchIntent.tsx) and Pareto Explorer implement those jobs. Replace the “Generate Queries” plan card with working controls. |
| evidence-export.view.jsx | Planned reproducible report: findings, assumptions, limitations, untested attacks, recipe provenance and labelled alignment; private files remain local. | Report implements HTML/JSON owner evidence, recipe JSON and reviewed protected CSV, with identifier blocking and private-lineage exclusion. Replace the generation placeholder; retain the local/private versus hosted/fictional distinction. |

Attack Lab also preserves the educational value of showing protection failures:
its computed fictional differencing, composition, correlation and linkage
examples are expressly separate from an assessment of the active candidate.

## Deliberate differences

- **Review without automatic clearance.** The old companion's stepFor selects
  “Ready to conclude” when untestedAttackCount is zero. The replacement keeps
  limitations and exact-candidate acknowledgments visible; an empty gap count
  cannot establish release safety. A persisted review/conclusion lifecycle is
  outside the present contract.
- **Explicit owner pairing.** The old audit view calls detectAlignment.
  Maintained paired utility requires explicit owner-supplied correspondence;
  unpaired files receive aggregate comparisons. Owner lineage never becomes
  attacker knowledge.
- **Distinct objectives and scope.** Do not port the old preference slider as
  a universal privacy dial, or generic best-guess accuracy as one verdict.
  Current views expose separate metrics, assumptions, constraints, incomplete
  results and measured snapshots; unknown is never zero.
- **No fictional substitute claim or unchecked CSV export.** The old workbench
  offers fictional identifiers and a direct protected-CSV download. Retain
  explicit transformations/HMAC limitations instead; trained synthetic
  generation and formal DP remain unavailable. Current CSV export checks
  identifiers and requires authority, limitations and candidate-review
  acknowledgments.
- **Preserve ideas, not a second runtime.** Do not copy the old module-global
  recipe-step accumulator, duplicate client-side analysis path, generation
  placeholders or browser acceptance-check button into the maintained app.
  Self-tests and catalogue counts cannot certify an active candidate.

No material gap in the current six-view contract was established. Recipe-delta
presentation, cross-dataset catalogue and persistent review lifecycle are
recorded as optional ideas without adding features or cloning the old design.

## Canonical app and actual integration

The maintained source is [coldshalamov/PRISM](https://github.com/coldshalamov/PRISM);
the working public fallback is [prism-healthcare-taupe.vercel.app](https://prism-healthcare-taupe.vercel.app/).
Its views remain **Workbench, Knowledge Map, Attack Lab, Research Intent,
Pareto Explorer and Report**. The fictional KIT example computes 75 verified
unique matches among 480 records, and 20 after ZIP removal; these are modelled
matches, not population probabilities.

The reviewed public application now opens at the Archie `archie.site` origin. Archie serves its saved HTML entry; Vercel supplies immutable React assets and Python compute. Archie Core provides genuine
durable fictional-session configuration through prism_demo_record and the
restricted prism_demo_service role. It stores fixture/schema/recipe/threat/
workload specifications and aggregate metadata, reconstructing source and
candidate frames. Public limits remain two fixtures, 24 candidates per search,
40 total candidates, four jobs, 64 KiB configuration and 30-minute inactivity.
Uploads/external audits are blocked publicly and remain available locally.

The published [static Archie entry](../deploy/archie-static/index.html) has replaced the old generated entry. Actual public fixture evaluation, bounded search and downloads passed. The old generated modules are preserved locally as reference exports and their useful ideas are retained above; they are not a second active app. GitHub sync still reports an error, so source-preserving Code-editor save and Publish is the working path. The Next adapter is retained only as an alternative for a server-capable host. See [deployment details](ARCHIE_DEPLOYMENT.md).

The semantic extension is implemented in the maintained repository and the same deployment path, rather than reviving the generated prototype. The source, model adapter, deterministic measurements and frontend continue to share one contract.
