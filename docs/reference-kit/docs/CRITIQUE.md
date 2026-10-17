# Critical review and completion gates

## Where the idea is strong

The product makes an invisible tradeoff inspectable and lets a researcher test the questions they actually care about. It can demonstrate a non-obvious failure with elementary, verifiable computation. It needs no large AI system. A local interface can lower the friction of using established methods without claiming to replace them.

The example where removing ZIP information changes none of the declared tasks is especially instructive: privacy and utility are not an unavoidable one-dimensional seesaw. Good design can remove unnecessary information first. The reverse-correlation example shows why preserving simple summary statistics is insufficient.

## Where the original premise needed correction

“Cover all known exploits” is not a finite guarantee for arbitrary data. Attack success depends on auxiliary knowledge, future releases, populations, data type, and access model. PRISM has a maintained 26-family register, not exhaustive verified coverage.

“Far right means definitely no leakage” is not true of an arbitrary sequence of transformations. Nor does adding more independent noise always improve a composed system. Release history and side channels matter. “Encryption for data” is the wrong category: encryption controls access to plaintext; statistical disclosure control changes what the released information reveals.

“A friend can get a light scrub” omits the authorization question. The application must not encourage a researcher to upload/share restricted clinical data merely because the recipient is trusted.

“Task-aware optimization is new” is too strong. ARX already includes sophisticated risk and quality optimization [S4]. PRISM's near-term defensible distinction is workflow/integration/interpretability, not a new privacy theorem.

## Release gates, in priority order

### Gate 0 — presentable, synthetic-only demonstration

Current backend and connected UI satisfy much of this: measured default evaluation, 13 methods, a bounded alternative search, three executable counterexamples, separate exports, source explanations, tests. Keep a verified demo script and fixed fictional fixtures. Complete real localhost browser testing on a permitted machine; the current offline browser test is not an HTTP deployment test.

### Gate 1 — safe local engineering prototype

Finish schema/units/entity controls; modal accessibility and end-to-end upload/export cases; dependency version lock and supply-chain review; session-close UX; input fuzzing; cancellation and resource limits; error/log/screenshot leakage tests. Consider subprocess isolation for expensive or third-party engines. Current loopback/origin/body guards are useful defenses, not a penetration-test certification.

Package the frontend with distributable builds rather than depending on an editable checkout. Review CSP and reverse proxy behavior independently. OS swap and exported file retention remain environmental responsibilities.

### Gate 2 — credible privacy evaluation

Add independent auxiliary-data linkage, applicable approximate attacks, held-out controls for synthetic evaluation, repeated-release testing, worst-subgroup reporting, and documented coverage gaps. Validate each attack on both vulnerable and properly protected controls. Do not train and evaluate thresholds on the same targets. Structural diagnostics cannot substitute for calibrated attack evaluation.

Current optimizer selects and scores with the same attack suite and source. It can overfit its tests. Current class-based inference is not independent prediction. Current numeric midpoint approximations and pairwise correlations do not establish full research utility. Histories of relational/longitudinal records require person-level models.

### Gate 3 — useful OSS integration

Run actual version-pinned integrations, not only import checks. ARX should be a local worker with resource limits, typed schema/hierarchy translation, and comparison tests against native ARX. Presidio should be pattern-only/local first; any downloaded NLP model requires explicit setup, provenance, and residual-risk messaging. Anonymeter needs independent control-data workflow and license/patent review. OpenDP needs a separate protected release boundary and durable global accounting before any public service.

### Gate 4 — real institutional release workflow

Require institution-approved data handling, research/consent/contractual review, a competent privacy review process, lawful access, appropriate storage/transport encryption, secure identity/access management, incident response, and documented accountable human approval. There is no automatic software substitute for these. Do not run this hackathon prototype on real patient data as the sole release gate.

## Known code limitations

- CSV only; no clinical narrative guarantee, images, DICOM, genomics, trajectories, relational databases or multi-table joins.
- No external auxiliary-dataset upload flow, original/candidate row-mapping confirmation flow, or independent-control upload flow in the starter UI.
- Exact replay abstains on stochastic/secret-key quasi-identifiers. This gap is not a successful defense result.
- Categorical sensitive diagnostics are capped at 50 values; not general numeric inference or semantic disclosure control.
- Candidate search explores eighteen possible precision configurations at most, not arbitrary method sequences or global optima.
- Workload filters on generalized numerics use interval midpoints; tasks near boundaries may be unreliable and need an interval-aware evaluator.
- Stochastic candidate reapplication can change results. Freeze candidate objects before extending interactive noisy optimizations.
- Spreadsheet formula neutralization changes some lexical values; downstream type handling requires review.
- The report digest is the internal CSV serialization; exported byte identity has its own response-header digest. Neither proves privacy.
- User review notes/acknowledgments do not constitute a durable signed release-approval ledger.
- Four-session/96-MiB/row caps are prototype limits, not exhaustively benchmarked performance envelopes.
- Optional adapter code has not been executed with actual packages in this build. No synthetic membership attack or recipient aggregate API is implemented.

## Fit to the hackathon

The supplied brief's Healthcare Challenge 10 asks for a restricted **aggregate-only** analytical layer over authorized GENIE patient records. PRISM's current main workflow produces modified microdata. Do not represent it as completing that brief. To submit there, build the recipient-side aggregate path described in `agents/05_AGGREGATE_TRACK10.md` and obtain the sponsor's required access/acceptance. Otherwise pitch this as an enterprise data-safety/research-governance tool under the applicable open-ended theme, subject to organizer rules.

No patient datasets or sponsor data are included. Do not claim sponsor validation, compliance, prize eligibility, or winning likelihood from this package.
