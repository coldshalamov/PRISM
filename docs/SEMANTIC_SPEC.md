# PRISM — Semantic Intelligence, Privacy Ontology & Live Protection Engine

## Mission

Extend the existing PRISM application with a sophisticated but unobtrusive AI-assisted semantic interpretation system powered by Jev, a structured decision model available through OpenRouter.

**Do not rebuild PRISM from scratch.** Audit the existing implementation, preserve its functioning modules, and integrate this specification into the current application.

The goal is to turn PRISM into a simple, remarkably informative, fast privacy preflight workbench for research datasets.

Its principal innovation is combining:

1. AI-assisted semantic recognition of messy research data.
2. A comprehensive, deterministic privacy ontology and attack-rule registry.
3. Established anonymization and statistical disclosure-control methods.
4. Quantitative information-theoretic risk and scientific-utility evaluation.
5. Immediate, interactive original-versus-protected data visualization.
6. Purpose-aware protection recommendations and user-controlled transformations.

The model understands what the information represents. The ontology identifies which attack mechanisms may be relevant. Deterministic algorithms measure vulnerabilities and apply transformations. The researcher decides what to release.

No chatbot or prompt-based AI interface is wanted.

---

# PART I — PRODUCT EXPERIENCE

## 1. The primary workflow

A researcher imports a CSV, spreadsheet, JSON table, or supported structured dataset.

PRISM performs an initial inspection:

- Recognizes columns, data types, units, ranges, distributions, and unusual values.
- Detects names, identifiers, dates, geographic data, medical data, and other sensitive information.
- Uses deterministic recognition first and Jev for ambiguous semantic meaning.
- Builds a persistent, normalized semantic representation of the dataset.
- Identifies possible disclosure attack vectors and their contributing fields.
- Executes applicable statistical privacy assessments.
- Recommends an initial protected version for review, without altering the original.

The interface displays the original and protected datasets side by side.

Users can switch between:

- Table view.
- Distribution plots.
- Correlation views.
- Attribute-exposure analysis.
- Scientific-utility comparisons.

They can modify protection settings through individual field controls or a global protection-preference slider.

Changes should update the protected preview immediately. Relevant privacy and utility measurements must be recalculated or explicitly marked as pending.

The original dataset always remains unchanged.

The user can inspect Mild, Moderate, Severe, or Needs Assessment findings, discover what information creates each exposure, and try alternative protective transformations.

The application exports the protected dataset, its transformation recipe, and a reproducible risk/utility assessment.

It must also audit data anonymized in another application.

## 2. Simple surface, sophisticated internals

The main interface must remain a single cohesive workbench, not an administrative dashboard.

Primary layout:

**Left:** Original dataset.

**Right:** Protected dataset.

**Between or beneath:** Transformation controls.

**Below:** Privacy findings, research utility, and export.

Each field should have an accessible control for selecting or adjusting applicable transformations.

For example:

Age = 43

- Exact: 43
- Generalized ±1 year: 42–44
- Generalized ±2 years: 41–45
- Generalized ±5 years: 38–48

Support user-centered intervals when explicitly selected, but distinguish them from fixed nonoverlapping age bands, which are often preferable for coherent group-based anonymization. Both must have precisely defined, reproducible boundary behavior.

Geography might progress from exact coordinates to street, ZIP code, ZIP prefix, region, or removal, according to the semantic type and available geographic hierarchy.

Dates might progress from exact timestamps to hour, day, week, month, year, relative intervals, or removal.

The global slider must select among actual evaluated candidate configurations. It must not pretend that every anonymization method shares one universal mathematical protection scale.

The user should see which transformations the slider selected and should be free to adjust individual fields afterward.

Do not obscure real privacy limitations behind a reassuring animation or arbitrary score.

---

# PART II — JEV AS THE SEMANTIC INTELLIGENCE ENGINE

## 3. Jev's exact responsibility

Jev should act as an intelligent semantic compiler.

Its job is to translate the messy vocabulary and structure of research datasets into a controlled internal ontology.

It should answer small, bounded classification questions, rather than producing free-form reasoning or security conclusions.

For each field, determine:

1. What does this field most likely represent?
2. Who or what does the information describe?
3. Which semantic families apply?
4. Which potentially identifying or sensitive characteristics apply?
5. Does the information describe a persistent identity, an event, a location, an observation, or a relationship?
6. Is its interpretation supported by the available metadata?
7. Are there plausible alternative interpretations requiring review?

Jev's output must conform to predefined classifications.

Unknown, ambiguous, none, and needs-review states are first-class possibilities.

Jev must never invent unrecognized transformation algorithms, privacy guarantees, security thresholds, or attack-test identifiers.

## 4. Classification should be layered

Do not ask Jev to select one category from hundreds of unrelated labels.

Instead implement hierarchical classification.

**Stage A — Broad family**

Determine whether the field primarily concerns identity, demographics, geography, time, medicine, genetics, finance, behavior, relationships, technical metadata, another defined family, or unknown.

**Stage B — Specific meaning**

Classify within the selected family.

For example:

Geography → residential location → postal code → three-digit prefix.

**Stage C — Independent properties**

Determine other characteristics, including person-associated, event-associated, stable, timestamped, potentially sensitive, or persistent.

These properties may coexist.

**Stage D — Context validation**

Compare Jev's classification against locally available evidence: declared type, format, neighboring fields, domain terminology, units, and data dictionary.

**Stage E — Final normalized representation**

Store the recognized meaning, alternatives, provenance, confidence-related metadata, and review state.

A single field can carry several semantic properties and privacy roles.

Do not assume multiple answers from the same Jev call provide independent confirmation.

---

# PART III — SEMANTIC ONTOLOGY

## 5. Required classification families

Build an extensible ontology containing the following families and leaf classes.

### Identity

- Legal name
- Alias or preferred name
- Government-issued identifier
- Patient or medical-record identifier
- Customer identifier
- Employee identifier
- Account identifier
- Username or handle
- Email address
- Telephone number
- Persistent pseudonym
- Hashed identifier
- Biometric identifier
- Other unique identifier

### Geography

- Residential address
- Mailing address
- Street
- City
- State or province
- Country
- Full postal code
- Partial postal code
- GPS coordinates
- Workplace location
- Healthcare facility
- Educational facility
- Recruitment site
- Repeated geographic trajectory
- Anatomical location, explicitly separate from physical geography

### Time

- Date of birth
- Age
- Date of death
- Admission date
- Discharge date
- Encounter date
- Treatment date
- Appointment time
- Transaction timestamp
- Relative elapsed time
- Duration
- Repeated event sequence
- Observation window
- Administrative timestamp

### Demographics and social information

- Age or age group
- Sex or gender attribute
- Occupation
- Employer
- Education level
- Household structure
- Marital status
- Nationality
- Language
- Socioeconomic category
- Other population characteristic

### Physical and biometric information

- Height
- Weight
- Eye color
- Hair characteristics
- Body measurements
- Physical disability information
- Biometric template
- Distinguishing physical characteristic
- Physiological measurement

### Medicine and healthcare

- Diagnosis
- Diagnosis code
- Medical history
- Procedure
- Prescription
- Drug exposure
- Treatment regimen
- Laboratory result
- Disease stage
- Treatment outcome
- Prognostic measurement
- Healthcare utilization
- Clinical note
- Rare disease
- Reproductive or other particularly sensitive medical information

### Genetics and biological research

- Genomic sequence
- Genetic variant
- Mutation status
- Gene-expression measurement
- Biological specimen identifier
- Familial marker
- Hereditary condition
- Genetic ancestry
- Protein or molecular assay result

### Financial and transactional

- Bank account
- Payment-card information
- Income
- Balance
- Credit information
- Purchase record
- Transaction amount
- Transaction counterparty
- Transaction timestamp
- Financial institution identifier

### Behavior and mobility

- Movement trace
- Location history
- Device activity
- Website activity
- Purchase history
- Communication pattern
- Sleep/activity record
- Repeated behavioral sequence
- Application usage
- Personal routine

### Relationships

- Parent-child relationship
- Household membership
- Family relationship
- Employer-employee relationship
- Patient-provider relationship
- Caregiver relationship
- Social association
- Organizational membership
- Shared account or device
- Referral relationship

### Technical and document metadata

- IP address
- MAC address
- Device identifier
- Advertising identifier
- Session identifier
- URL
- File path
- Author metadata
- Document creation date
- EXIF or embedded metadata
- Persistent tracking token
- Cryptographic hash
- Network or application identifier

### Free-text and unstructured content

- Narrative clinical notes
- Survey free response
- Personal descriptions
- Quoted conversation
- Contact information embedded in text
- Embedded identifiers
- Sensitive events described narratively
- Other potentially identifying natural-language content

### Unknown and mixed content

- Ambiguous semantic type
- Multiple plausible interpretations
- Unclassified text
- Mixed-value column
- Derived value with unknown source
- Unsupported content
- Unknown data meaning

The ontology must be hierarchical and extensible; these categories are an initial coverage target, not an exhaustive claim about every possible personal-data type.

## 6. Independent ontological properties

Each field also needs separate properties.

Represent at least:

- Subject type: patient, person, household, provider, organization, device, event, other, unknown.
- Personal-data association: direct, indirect, absent, unknown.
- Stability: persistent, relatively stable, transient, unknown.
- Granularity: exact, generalized, rounded, bucketed, aggregated, suppressed.
- Structural representation: numeric, categorical, string, timestamp, geospatial, sequence, narrative, mixed.
- Temporal relationship: observation, event, interval, sequence, unrelated.
- Geographic relationship: residence, workplace, facility, event location, anatomical, unknown.
- Potential sensitivity: ordinary, contextual, sensitive, unknown.
- External matchability hypothesis: plausible, evidence-supported, not established.
- Research role: explanatory variable, outcome, grouping variable, linkage key, nuisance variable, unknown.
- Record relationship: same subject, repeated measure, same event, different subject, unknown.
- Source and classification provenance.
- User-confirmation status.

Do not equate semantic classifications with security conclusions.

For example, a person's age may be a potential quasi-identifier, a demographic feature, and an essential research variable simultaneously.

## 7. Semantic lineage

The initial classification should be cached and reused throughout the session.

If `DOB` becomes five-year age bands, the system should preserve:

Original meaning: date of birth.

Current representation: generalized age.

Current granularity: five-year intervals.

Transformation history: birth date → computed age → interval generalization.

The original classification usually does not require another Jev call.

However, risk calculations always operate on the **current transformed representation**, not the original semantic labels alone.

If a new ambiguous field is introduced, allow incremental reclassification.

---

# PART IV — RISK ONTOLOGY AND DETERMINISTIC RULE ENGINE

## 8. Attack categories

PRISM must recognize the main disclosure mechanisms.

Initial catalog:

1. Direct identifier disclosure.
2. Sample singling out.
3. Population uniqueness estimation.
4. Record linkage.
5. Sensitive-attribute inference.
6. Membership inference.
7. Geographic linkage.
8. Temporal linkage.
9. Spatiotemporal linkage.
10. Longitudinal sequence identification.
11. Persistent pseudonym linkage.
12. Weak pseudonym or hash reversal.
13. Cross-release composition.
14. Small-cell disclosure.
15. Sensitive-group homogeneity.
16. Aggregate-query differencing.
17. Aggregate reconstruction.
18. Synthetic-data information leakage.
19. Residual identifiers in free text.
20. Embedded metadata disclosure.
21. Relationship or household disclosure.
22. Genomic and familial distinguishability.
23. Rare-event disclosure.
24. Repeated-entity or record-joining leakage.

Different release types support different tests. A CSV scanner cannot legitimately claim to test a model-inversion attack without an applicable model artifact.

## 9. Combinatorial risk rules

Construct a declarative risk-rule registry connecting semantic properties to attack hypotheses.

Examples:

| Semantic combination | Relevant hypothesis |
|---|---|
| Exact birth date + residential geography | Demographic distinguishability |
| Approximate age + geographic region + physical characteristics | Multiattribute uniqueness |
| Appointment date + exact time + facility | Clinical appointment linkage |
| GPS coordinates + timestamp | Spatiotemporal linkage |
| Repeated locations + event sequence | Mobility fingerprint |
| Rare diagnosis + narrow demographic group | Sensitive-attribute inference |
| Genomic variant + demographic attributes | Genetic distinguishability |
| Date of death + geographic location | Potential external-record linkage |
| Occupation + employer + region | Occupational identification |
| Stable pseudonym + additional release | Cross-release linkage |
| Persistent identifier + transaction history | Record association |
| Clinical notes + names or dates | Residual textual identifiers |
| Repeated treatment events + exact intervals | Longitudinal uniqueness |
| Small equivalence class + sensitive diagnosis | Attribute-disclosure risk |
| Homogeneous sensitive values within a group | Sensitive-attribute inference |
| Rare event + precise date | Event linkage |
| Family relationships + hereditary conditions | Familial-information inference |
| Overlapping aggregate cohorts | Query differencing |
| Many detailed aggregate outputs | Reconstruction hypothesis |
| Original records + independently generated synthetic output | Applicable synthetic-data attack evaluation |

Each rule must identify:

- Required semantic classes.
- Required relationships among fields.
- Required data representation.
- Type of possible attack.
- What additional information an attacker would need.
- Applicable deterministic test.
- Measurements to collect.
- Relevant mitigation candidates.
- Research-utility risks.
- Limitations and evidence references.

**A matched rule is an attack hypothesis, not proof of an exploitable vulnerability.**

Always run basic identifier detection, high-cardinality profiling, and baseline uniqueness checks even if Jev returns incorrect classifications.

## 10. Quantitative evaluation

Implement real, deterministic statistical computations.

Include:

- Equivalence-class sizes.
- Sample uniqueness.
- Minimum group size.
- Candidate-set distribution.
- Attribute-subset uniqueness.
- Conditional categorical entropy.
- Sensitive-attribute homogeneity.
- Guessing accuracy under defined assumptions.
- Relative prediction improvement over baseline.
- Relevant k-anonymity, l-diversity, and t-closeness evaluations.
- Direct identifier detection.
- Record-linkage experiments when auxiliary information is available.
- Research-specific statistical utility comparisons.

Distinguish exact properties of the supplied dataset from estimates requiring population assumptions or additional datasets.

Use established libraries wherever practical, especially Presidio and pyCANON.

Do not represent a field-combination uniqueness rate as a universal probability of real-world identification.

## 11. Researcher-facing vulnerability language

Do not expose developer priority labels such as P0, P1, or P2 as user-facing risk severity.

Use:

- Mild
- Moderate
- Severe
- Needs Assessment

Keep implementation priority separate from severity.

Severity must depend on actual evidence, affected data sensitivity, tested attack capability, and release context.

Do not mark a finding Severe solely because Jev recognized a date and location.

Each finding should answer five questions:

**What information contributes to the risk?**

**How might it be exploited?**

**What would an attacker need to know or obtain?**

**What did PRISM actually measure?**

**What transformations could reduce the exposure?**

Use deterministic explanation templates populated with measured values and ontology descriptions.

Avoid model-generated security narratives.

---

# PART V — THE LIVE PROTECTION SYSTEM

## 12. Global protection preference

The global slider should be the defining interaction.

It represents the user's preference for privacy preservation versus analytical detail.

The application must generate or select actual protection recipes based on this preference.

It should not directly map arbitrary slider percentages to fictional security guarantees.

Where possible, precompute and cache a collection of evaluated configurations so slider movement selects among ready candidates.

Configurations should be ranked or filtered according to measured disclosure-risk criteria, research utility, and user constraints.

Show when a stronger preference causes scientifically important data to be lost.

A user must be able to inspect and override every resulting transformation.

## 13. Field-specific controls

Support contextual transformation controls based on the ontology.

### Numeric variables

- Exact values.
- User-centered intervals.
- Fixed-width nonoverlapping bins.
- Decimal rounding.
- Top/bottom coding.
- Suppression.
- Controlled perturbation.
- Applicable aggregation.

### Dates and times

- Exact.
- Round to hour.
- Day only.
- Week.
- Month.
- Year.
- Relative time from a reference event.
- Suppression.

### Geography

- Exact address.
- Street suppression.
- Postal code.
- Postal prefix.
- County or region.
- State.
- Country.
- Suppression.

Apply supported geographical hierarchies rather than assuming arbitrary prefixes always correspond to valid generalization levels.

### Identifiers

- Remove.
- Mask.
- Replace with fictional value.
- Consistent pseudonym.
- Controlled tokenization.

Explain that consistent pseudonyms preserve linkage capability.

### Categorical variables

- Original category.
- Broader category in hierarchy.
- Group rare categories.
- Suppress.
- Controlled permutation when appropriate.

### Sensitive numerical or clinical measurements

- Preserve.
- Bin.
- Round.
- Aggregate.
- Suppress.
- Perturb only when scientifically appropriate.

Do not permit transformations to silently corrupt outcome relationships.

## 14. Fast interactive execution

This is a product-critical requirement.

Jev runs during initial classification, not on every slider movement.

A slider change should:

1. Update a deterministic transformation recipe.
2. Apply or retrieve the corresponding protected output.
3. Refresh the relevant displayed cells.
4. Update cached or quickly recomputable statistics.
5. Schedule slower evaluations asynchronously.
6. Replace old findings only when new results correspond to the currently selected dataset version.

Use background workers, caching, incremental computations and dataset hashes where appropriate.

For large datasets, display an immediately responsive preview while full-dataset assessments run separately.

Never display approximate, stale, or sample-based assessments as finalized full-dataset results.

Use virtualized tables and efficient statistics libraries.

The interface must remain interactive even while a more expensive assessment runs.

---

# PART VI — SCIENTIFIC UTILITY AND OPTIMIZATION

## 15. Scientific utility

PRISM must measure the consequences of anonymization, not simply how many values changed.

Implement:

- Mean and median differences.
- Standard-deviation differences.
- Distribution comparisons.
- Quantile differences.
- Categorical frequency differences.
- Correlation changes.
- Joint-distribution changes.
- Subgroup result changes.
- Selected scientific query preservation.
- Suppression rate.
- Relationship sign reversals.

Researchers can identify important variables and analyses.

Offer default preservation of broad statistical properties when the user has not defined any research objectives.

Never suggest that preserving means alone guarantees scientific usefulness.

## 16. Information Value Analysis

For each candidate field transformation, calculate the change in relevant disclosure-risk measurements and scientific utility.

Test individual fields and selected combinations.

PRISM should be able to conclude, using actual measurements, that broadening one field reduces observed distinguishability substantially while barely changing the selected research results.

It should also detect cases where seemingly harmless permutations preserve individual distributions but destroy important correlations.

Show recommended candidate transformations with evidence.

Use bounded deterministic search and identify Pareto-nondominated configurations.

Do not describe a bounded search as proof of global optimality.

---

# PART VII — JEV IMPLEMENTATION DETAILS

## 17. OpenRouter integration

Use the currently documented OpenRouter Decisions API with pinned `typesafe/jev-1.14`, unless current documentation requires an update.

Use typed choice questions for categorical interpretations and yes/no questions for relevant independent properties.

Batch logically related questions when useful.

Avoid giant prompts asking the model to perform all privacy reasoning.

Do not send patient-level records to the provider by default.

Send only approved, minimized schema metadata, such as:

- Column name.
- Declared type.
- Unit if available.
- Dataset domain.
- Neighboring column labels.
- Nonidentifying structural descriptions.

If this context is insufficient, abstain and request user review.

The provider integration must be optional.

Support caching, timeouts, retries, cost ceilings, explicit permission for outbound metadata, and offline deterministic fallbacks.

Never embed the OpenRouter API key in the client bundle or exported configuration.

## 18. Jev must produce structured decisions, not arbitrary prose

The internal normalized output for each field should contain:

- Field ID.
- Primary semantic type.
- Additional semantic families.
- Candidate privacy roles.
- Subject type.
- Independent semantic properties.
- Alternative interpretations.
- Classification source.
- Model version and probability metadata when applicable.
- Local validation result.
- Review status.
- Relevant rule candidates.
- Semantic-lineage reference.

Use the ontology as the allowable classification vocabulary.

All values must be validated against local schemas.

## 19. Robustness against classification errors

Implement an explicit error-tolerant design.

- Unknown is a valid result.
- No Jev output is equivalent to a privacy test.
- Confidence does not prove correctness.
- Core security scans are independent of Jev.
- Contradictory evidence produces review warnings.
- Multiple plausible interpretations may activate several tests.
- Unrecognized fields are not automatically safe.
- User corrections override model suggestions.
- Confirmed corrections should be cached locally.
- An uncertain classification must never automatically reduce protection.

Build deliberately ambiguous test cases involving labels such as `SITE`, `LOC`, `DOS`, `TX`, `ID`, `STAGE`, `LAT`, and `DX`.

Evaluate whether the semantic engine selects suitable downstream tests even when some classifications are incorrect.

Compare rules-only performance with rules-plus-Jev performance.

Measure missed sensitive fields, misclassification, abstention and false positives.

---

# PART VIII — REPORTING AND DESIGN

## 20. Privacy findings interface

Findings should use compact cards in Mild, Moderate and Severe categories, with a distinct Needs Assessment state.

Each card should contain:

- Attack name.
- Contributing columns.
- Brief plain-language explanation.
- Measured finding when available.
- Suggested mitigation.
- Method/evidence details behind a hover or click interaction.

When the user selects a card, highlight the relevant fields in both panes.

Example:

**Potential appointment linkage**

Fields: `VISIT_DATE`, `VISIT_TIME`, `HOSPITAL`

Explanation: Someone with external appointment information could potentially associate a person with a released medical record.

PRISM should then display the actual number of unique or unusually distinguishable records, if measured.

The user can click a suggested transformation and immediately compare the resulting exposure.

No warning card should be generated from an untested semantic hypothesis as though an attack succeeded.

## 21. Review and export

Allow the user to:

- Compare multiple protection candidates.
- Select a candidate.
- Review remaining findings.
- Review preservation of selected analyses.
- Export protected data.
- Export the recipe.
- Export a reproducible assessment report.

The report must identify tested attacks, unsupported tests, unresolved classifications, assumptions and limitations.

Do not automatically certify publication safety or legal compliance.

For sensitive healthcare records, release authorization and any required expert or institutional review remain separate from PRISM's computational assessment.

---

# PART IX — INTEGRATION WITH EXISTING CODEX WORK

## 22. Preserve the current project

Inspect the existing PRISM codebase and original specification.

Reuse functioning dataset schemas, transformation recipes, exposure assessments, research queries, comparison components, and exports.

The previous build specification established a React application, backend data structures, and an Exposure Map, but reported that the actual scan engine was missing.

The new semantic system must be integrated into the actual computation pipeline, not merely represented in additional database tables.

Do not add another disconnected dashboard.

Prioritize the primary workbench and real local computation.

Reconcile any existing cloud storage or hosted processing with PRISM's local-first requirements. Never silently transmit real confidential datasets to a remote backend.

## 23. Parallel engineering workstreams

Organize the implementation into independent modules with shared typed contracts.

**Workstream A — Semantic intelligence**

Ontology taxonomy, deterministic label recognition, Jev provider adapter, semantic validation, review, caching and lineage.

**Workstream B — Attack knowledge engine**

Versioned risk-rule registry, semantic matching, attack prerequisites, test routing and evidence schemas.

**Workstream C — Privacy and transformation engine**

Established library integration, deterministic transformations, field-level controls, exposure tests and recomputation.

**Workstream D — Scientific utility and optimization**

Statistical preservation, counterfactual field analysis, candidate generation, Pareto analysis and caching.

**Workstream E — Frontend integration**

Original/protected split-screen, semantic field details, protection sliders, warning cards, chart comparisons and export workflow.

Establish shared contracts and representative fixtures before parallel work begins.

## 24. Delivery sequence

1. Audit the existing code and document actual functionality.
2. Define shared ontology and assessment contracts.
3. Implement a small end-to-end semantic classification pathway.
4. Connect classifications to functioning deterministic attack tests.
5. Connect classifications to appropriate transformations.
6. Implement cached before/after previews and user controls.
7. Add real findings with evidence and mitigation suggestions.
8. Add scientific utility comparisons and candidate search.
9. Expand ontology leaf classes and attack-rule coverage.
10. Validate behavior, performance, and external audit support.

Start with a complete, verifiable vertical slice, then expand.

Do not replace working software with mock screens or specifications.

## 25. Acceptance demonstration

Build a synthetic oncology dataset containing deliberately ambiguous fields and known privacy issues.

The dataset should include examples such as:

`PAT_ID`, `DOS`, `HOSP_SITE`, `DX_CODE`, `AGE`, `ZIP`, `HT_CM`, `TX_RESP`, `NOTES`.

Jev should help interpret ambiguous labels. The deterministic profiler should independently recognize obvious formats and direct identifiers.

The ontology should activate relevant attack tests.

PRISM should demonstrate a real distinguishing combination involving clinical event timing, facility, and demographic information.

The researcher adjusts protection settings and sees the data change immediately.

The statistical engine measures how the relevant exposure changes.

The utility engine shows how selected clinical outcome analyses survive or change.

The researcher then imports a different externally protected version of the same synthetic dataset and audits it without knowing the generating method.

The final result is a reproducible export.

**This must be a working software demonstration, with measured results—not a staged prototype with invented statistics.**

---

# Final engineering philosophy

The user should not experience PRISM as an AI assistant.

They should experience a technically sophisticated instrument that understands their dataset and helps them make responsible information-release decisions.

The architecture must be:

**Semantic classification → Privacy ontology → Deterministic attack testing → Anonymization → Independent reassessment → Scientific utility comparison → Researcher decision.**

Jev provides imperfect semantic recognition. The ontology supplies a formal vocabulary and attack relationships. Established mathematical and statistical algorithms produce the evidence.

The primary objective is to create the fastest understandable path from an unfamiliar dataset to an informed, reproducible privacy decision.

**Do not build the largest number of superficial features. Build the most convincing combination of intelligent recognition, real mathematical evidence, and effortless interaction.**