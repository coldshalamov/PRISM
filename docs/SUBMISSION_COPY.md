# PRISM submission copy

## Ready-to-paste fields

**Project name:** PRISM

**Tagline:** See what survives the scrub

**Track:** Enterprise AI

**Project description:**

PRISM gives enterprise research and data-sharing teams a purpose-aware review before internal or partner sharing. Removing names can leave identifying combinations and broad scrubbing can damage study questions. PRISM compares a source table with transformed candidates, measures declared disclosure attacks, and checks selected study questions and tolerances. In a reproduced fictional oncology benchmark of 480 records, removing ZIP reduced unique correct matches from 75 to 20 under an exact-match attack, while three selected protected answers stayed identical between the two recipes. Six views connect schema review, research intent, exposure analysis, bounded search and evidence exports. Its deterministic Python engine needs no generative AI model or GPU. Archie Core provides PostgreSQL/GraphQL. Vercel runs the frontend and Python compute. The public demo uses fictional fixtures and blocks uploads. PRISM documents tradeoffs for human review without clearing a release.

**Technologies:** React, TypeScript, Vite, Python, FastAPI, pandas, NumPy, SciPy. Archie Core provides PostgreSQL and GraphQL. Vercel hosts the frontend and Python compute. Optional pyCANON cross-checks. The runtime uses a deterministic scientific engine with no generative AI model or GPU requirement. Coding agents assisted development. The full Python engine can also run locally for private CSVs.

**PitchDeckURL:** https://prism-healthcare-taupe.vercel.app/pitch/

**Portable PDF:** https://prism-healthcare-taupe.vercel.app/pitch/PRISM-Pitch.pdf

**DemoURL:** https://prism-healthcare-taupe.vercel.app/

**PublicRepo:** https://github.com/coldshalamov/PRISM

The canonical demo uses real Archie Core services with Vercel frontend and Python compute. It serves fictional fixtures and blocks uploads. The repository README contains local setup instructions and scope. The Enterprise AI entry addresses purpose-aware privacy and utility review for enterprise research and data-sharing teams, including regulated research teams. Oncology is a fictional demonstration, not a claim to a sponsored healthcare challenge. The existing URL slug does not determine the track. Do not submit the entry until the user explicitly asks.

## Two-minute speaker flow

**0:00–0:12 · Slide 1**

“PRISM helps enterprise research teams see what survives the scrub. Before internal or partner sharing, teams need to understand what remains identifying and what their selected questions lose.”

**0:12–0:30 · Slide 2**

“Our fictional oncology table illustrates this workflow. Removing names leaves combinations of age, geography and weight. PRISM compares the source, the transformed candidate and the team's declared research purpose.”

**0:30–0:47 · Slide 3**

“Six views connect schema review, research intent, exposure analysis, recipe comparison, attack examples and evidence exports. Tolerances and cohort requirements make the team's priorities explicit.”

**0:47–1:14 · Slide 4**

“In the reproduced fictional benchmark, the declared exact-match attack finds 75 unique correct matches out of 480. Removing ZIP lowers that to 20. Three selected protected answers stay identical between those recipes and meet their source tolerances. These are simulated source-target matches, not population risk estimates. Other scientific properties can change.”

**1:14–1:31 · Slide 5**

“The deterministic engine applies actual recipes and measures disclosure and utility. Request 24 configurations, inspect the frontier and read failed constraints. A frontier point can still fail the requirements.”

**1:31–1:45 · Slide 6**

“The registry states coverage for 26 threat families and 17 protections. Unsupported analyses abstain. Archie Core supplies PostgreSQL and GraphQL. Vercel runs the frontend and Python compute. No generative model is required.”

**1:45–2:00 · Slide 7**

“The public demo blocks uploads. Private CSVs stay in the full local workflow. Enterprise teams get a documented review of tradeoffs before sharing. Human review remains essential, with no automatic release clearance or compliance certification.”

## Short live demo route

1. Open the fictional fixture and review the declared roles and units.
2. Show the source and protected candidate in Workbench, then show the selected Research Intent questions.
3. Open the 480-row benchmark and read the actual declared exact-match values. Keep its two-recipe comparison distinct from the separate 5,000-person demonstration.
4. Open the Knowledge Map, then run the bounded search and select a candidate in Pareto Explorer. Read its failed constraints.
5. Show an Attack Lab counterexample, then open Report and download evidence and the recipe. Protected CSV export requires reviewed authority and limitations acknowledgments.

If presenting only two minutes, use the slide deck and one preloaded workbench view. The benchmark and search are different demonstrations; do not imply that the 24-recipe search produced the specific 75-to-20 comparison.

## Screenshot captions

Use actual captured screens from the deployed fictional demo. The pitch uses an authored data chart instead of simulated app screenshots.

- **Workbench:** “Source and transformed candidate, with declared roles and transformation settings.”
- **Knowledge Map:** “Measured exposure for declared combinations of retained attributes in the finite sample.”
- **Research Intent:** “Selected scientific questions with explicit tolerances and cohort requirements.”
- **Pareto Explorer:** “Actual evaluated recipes, measured tradeoffs and constraint failures.”
- **Report:** “An evidence export records the candidate, assumptions and uncovered analyses.”

## Claim boundaries

- The 75/480 and 20/480 values are verified unique correct matches in the supplied fictional benchmark under known membership, correct known QI and replayable public rules. Owner lineage scores correctness only after matching. They are not general re-identification probabilities.
- “Three answers stay identical” compares the **protected outputs of two recipes**. It does not claim that all source values or every study result remain unchanged. The protected age–weight correlation is approximately 0.6893 versus source 0.6952 and uses interval midpoints.
- The 26/17 counts describe the registry catalogue. They do not mean 26 implemented attacks or 17 protections passed an assessment.
- A nondominated candidate can fail user constraints. Search uses a finite grammar and can finish before the requested count on constrained inputs.
- Unavailable results and unsupported methods do not count as zero risk. pyCANON is an optional categorical diagnostic cross-check, not privacy certification.
- Public hosting serves fictional fixtures and blocks private-file import. Private CSV workflows belong in the local version.
- Enterprise AI is the selected track. The deterministic scientific runtime does not call a generative AI model. Coding-agent use during development is separate from runtime capability.
- The fictional oncology example demonstrates a general enterprise research-sharing workflow. It does not establish fit to a specific sponsored healthcare challenge or clinical validation.
- No claim of HIPAA compliance, clinical validation, automatic release clearance or guaranteed patient protection. No claim that a numbered hackathon challenge is implemented without checking its actual requirements.

## Internal sources

- `README.md`: actual workflow, runtime and limits.
- `docs/KIT_BASELINE.md` and `examples/kit_benchmark/reproduction.json`: reproduced 480-row benchmark and the two recipes' protected task results.
- `docs/KIT_EVALUATION.md`: 26 threat families, 17 catalogued protections, semantic comparisons, threshold abstention and subgroup boundaries.
- `IMPLEMENTATION_CONTRACT.md`: six views, frozen candidates, actual bounded search and export acknowledgments.

The submission description focuses on enterprise research-sharing review and does not claim clinical effectiveness or population privacy statistics.
