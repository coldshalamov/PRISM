# Threat coverage register

Main tabular threat families; deliberately not an exhaustive list of all known exploits.

Coverage refers to shipped functionality, not whether a dataset is safe.

## Direct identifiers — core
Names and contact details identify people without statistical tricks.

**Implemented:** Field-name and pattern scans; masks, drops and keyed pseudonyms.
**Mitigation:** Review all fields; remove unnecessary identifiers. Pseudonyms still permit linkage.
**Boundary:** Heuristics miss names and unfamiliar formats.
Source: https://www.nist.gov/publications/de-identifying-government-datasets-techniques-and-governance

## Quasi-identifier uniqueness — core
Age, location and body measurements can form a distinctive combination.

**Implemented:** Exact equality-class sizes on explicitly chosen fields.
**Mitigation:** Generalize or remove unnecessary identifying precision.
**Boundary:** Sample uniqueness is not population identification probability.
Source: https://arx.deidentifier.org/overview/

## Record linkage — core
Outside knowledge can point to a matching protected record.

**Implemented:** Verified exact-match replay for internally transformed data with private scoring lineage.
**Mitigation:** Reduce distinguishing attributes and test stronger attacker knowledge.
**Boundary:** No external identity database or fuzzy-match calibration is included.
Source: https://www.nist.gov/publications/de-identifying-government-datasets-techniques-and-governance

## Homogeneity / attribute disclosure — core
Everyone in a plausible matching group may share the same sensitive fact.

**Implemented:** Distinct-l and homogeneous-group diagnostics.
**Mitigation:** Protect sensitive distributions, not just group sizes.
**Boundary:** Semantic similarity between different medical labels is not modeled.
Source: https://doi.org/10.1109/ICDE.2007.367856

## Skewness and similarity — core
A group can have multiple labels yet overwhelmingly suggest one condition.

**Implemented:** Categorical total-variation shift from the released-table distribution.
**Mitigation:** Consider a vetted t-closeness or related model with meaningful category distances.
**Boundary:** This diagnostic is not general t-closeness enforcement.
Source: https://doi.org/10.1109/ICDE.2007.367856

## Background-knowledge inference — partial
An attacker may already know more than the fields you selected.

**Implemented:** Editable known/secret roles and warnings for excluded quasi-identifiers.
**Mitigation:** Evaluate multiple plausible knowledge profiles.
**Boundary:** Unknown outside knowledge cannot be exhaustively enumerated.
Source: https://www.nist.gov/publications/de-identifying-government-datasets-techniques-and-governance

## Missingness fingerprints — partial
The pattern of blank tests can itself distinguish a patient or imply a diagnosis.

**Implemented:** Nulls participate in equality classes; missing-rate utility comparisons.
**Mitigation:** Review missingness as information, not harmless empty space.
**Boundary:** Clinical meaning of missing tests is not inferred.
Source: https://www.nist.gov/publications/de-identifying-government-datasets-techniques-and-governance

## Rare subgroup exposure — partial
Rare combinations can remain identifying after names disappear.

**Implemented:** Small equality-class diagnostics and suppression.
**Mitigation:** Review tails and rare cohorts separately; measure suppression bias.
**Boundary:** No population-frequency model or rare-genome analysis.
Source: https://www.nist.gov/publications/de-identifying-government-datasets-techniques-and-governance

## Membership inference — adapter
A release may reveal whether a person was in a study.

**Implemented:** Catalog and adapter boundary only; no built-in calibrated membership attacker.
**Mitigation:** Use independent member/nonmember evaluation and appropriate formal mechanisms.
**Boundary:** Not assessed must never appear as a passed test.
Source: https://arxiv.org/abs/2011.07018

## Synthetic-data inference — adapter
Fake rows can still reveal facts learned from real participants.

**Implemented:** Optional Anonymeter inference adapter with independent-control requirements.
**Mitigation:** Audit generation provenance, controls, attack baselines and uncertainty.
**Boundary:** Adapter was not installed or runtime-verified in this delivery.
Source: https://github.com/statice/anonymeter

## Exact and near-copy memorization — planned
A synthetic generator may reproduce unusual training examples.

**Implemented:** A future copy-distance audit is specified.
**Mitigation:** Test holdout-calibrated attacks, not distance alone.
**Boundary:** Nearest-neighbor distance is not a privacy guarantee.
Source: https://arxiv.org/abs/2011.07018

## Cross-release intersection — demo
Different coarse releases can become precise when combined.

**Implemented:** Computed synthetic 3-by-3 composition counterexample.
**Mitigation:** Review release history and alignment keys together.
**Boundary:** General multi-release attacker is not implemented.
Source: https://www.nist.gov/publications/de-identifying-government-datasets-techniques-and-governance

## Aggregate differencing — demo
Subtract two large, overlapping statistics to expose a small difference.

**Implemented:** Computed synthetic count/sum counterexample.
**Mitigation:** Limit release surfaces; prefer a correctly accounted DP query service when suitable.
**Boundary:** Naive small-cell suppression and pairwise checks do not stop every attack.
Source: https://csrc.nist.gov/pubs/sp/800/226/final

## Database reconstruction — planned
Enough statistical constraints can determine hidden individual values.

**Implemented:** Described threat; no general reconstruction solver shipped.
**Mitigation:** Restrict exact query workloads or use carefully composed DP.
**Boundary:** A query-result scanner alone cannot certify safety.
Source: https://csrc.nist.gov/pubs/sp/800/226/final

## Repeated-query noise averaging — planned
Repeated noisy answers can be averaged to recover an accurate statistic.

**Implemented:** Budget design and regression-test requirements documented.
**Mitigation:** Use one global accountant and a deliberate cache/requery policy.
**Boundary:** The optional in-memory DP demonstration is not a persistent service.
Source: https://docs.opendp.org/en/stable/api/user-guide/measurements/additive-noise-mechanisms.html

## Hash and pseudonym attacks — partial
Unsalted hashes of predictable values can be guessed; stable tokens enable joins.

**Implemented:** Keyed HMAC pseudonyms, secret not exported, retained-identifier warnings.
**Mitigation:** Use appropriate key management; avoid unnecessary cross-release stability.
**Boundary:** HMAC does not anonymize other fields or conceal duplicate frequencies.
Source: https://www.nist.gov/publications/de-identifying-government-datasets-techniques-and-governance

## Row order and hidden correspondence — partial
Unchanged ordering can reveal a direct original-to-release mapping.

**Implemented:** Output rows shuffled by default; scoring lineage never exported.
**Mitigation:** Remove row numbers and inherited export metadata.
**Boundary:** Other attributes may still align rows, and audit reports are sensitive.
Source: https://www.nist.gov/publications/de-identifying-government-datasets-techniques-and-governance

## Date and trajectory linkage — partial
A distinctive sequence of dates can identify someone even after shifting.

**Implemented:** Date year extraction and optional per-subject offsets.
**Mitigation:** Review temporal patterns and clinical intervals explicitly.
**Boundary:** Sequence/trajectory attacks are not implemented.
Source: https://www.nist.gov/publications/de-identifying-government-datasets-techniques-and-governance

## Genomic and family inference — planned
Genomes and relatives create identification routes that ordinary table checks miss.

**Implemented:** Scope warning and specialist-evaluation requirements.
**Mitigation:** Use domain-specific release review and access restrictions.
**Boundary:** No genomic safety determination is made.
Source: https://www.nist.gov/publications/de-identifying-government-datasets-techniques-and-governance

## Location and mobility — planned
A few distinctive places or routes can connect records to a person.

**Implemented:** ZIP prefix transform only.
**Mitigation:** Treat trajectories as high-dimensional identifiers.
**Boundary:** No GPS/mobility anonymization engine.
Source: https://www.nist.gov/publications/de-identifying-government-datasets-techniques-and-governance

## Free-text identifiers — partial
Narratives can identify a person through names, events or unusual details.

**Implemented:** Regex pattern redaction; Presidio integration plan.
**Mitigation:** Review with domain-aware tools and human oversight.
**Boundary:** Regex is not reliable narrative de-identification.
Source: https://presidio.dataprivacystack.org/

## Images, audio and file metadata — out_of_scope
Faces, voices, headers or embedded metadata can disclose identities.

**Implemented:** Non-CSV formats rejected by the starter workflow.
**Mitigation:** Use specialist DICOM, image, audio and document pipelines.
**Boundary:** No OCR, voice anonymization or medical-image scrubber is shipped.
Source: https://www.hhs.gov/hipaa/for-professionals/special-topics/de-identification/index.html

## Spreadsheet formula injection — core
Untrusted cells can execute spreadsheet formulas when opened.

**Implemented:** Formula-leading cells and headers neutralized on export by default.
**Mitigation:** Keep formula-safe export enabled and disclose lexical changes.
**Boundary:** This is file-handling security, not statistical anonymization.
Source: https://community.owasp.org/attacks/CSV_Injection

## Audit and selection leakage — partial
Exact before/after metrics, rare examples or a selected recipe can expose source facts.

**Implemented:** Owner-only reports, no-store headers, no raw witnesses in release CSV.
**Mitigation:** Keep diagnostic artifacts confidential; privatize selection if it becomes public.
**Boundary:** The optimizer is non-DP and does not certify public report release.
Source: https://csrc.nist.gov/pubs/sp/800/226/final

## Group and inferential harms — planned
A private individual contribution can coexist with harmful conclusions about a group.

**Implemented:** Documented release-review criterion.
**Mitigation:** Evaluate purpose, governance and possible group harms.
**Boundary:** Individual privacy mechanisms do not erase true population associations.
Source: https://csrc.nist.gov/pubs/sp/800/226/final

## Sharing authorization and transport — out_of_scope
A protected file can still be sent to the wrong person or over an unsafe channel.

**Implemented:** Explicit export acknowledgment, no transmission function.
**Mitigation:** Check permission and use an approved encrypted transfer route.
**Boundary:** PRISM is not encryption, authorization, or a compliance determination.
Source: https://www.hhs.gov/hipaa/for-professionals/special-topics/de-identification/index.html
