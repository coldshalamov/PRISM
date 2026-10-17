# Primary-source reading map

Research checked for this delivery on **17 October 2026**. This is a selected bibliography supporting the design, not a systematic review of every privacy paper or an exhaustive vulnerability feed. Descriptions are paraphrases; PRISM's implementation decisions are our own. Follow the sources for their full assumptions and limitations.

| ID | Primary source | Why it matters here |
|---|---|---|
| S1 | [NIST SP 800-188 — De-Identifying Government Datasets: Techniques and Governance](https://www.nist.gov/publications/de-identifying-government-datasets-techniques-and-governance) | Treat de-identification as a combination of release model, technical assessment and governance, rather than removing identifiers alone. |
| S2 | [NIST SP 800-226 — Guidelines for Evaluating Differential Privacy Guarantees, final March 2025](https://csrc.nist.gov/pubs/sp/800/226/final) | A formal privacy claim needs an identified mechanism and attention to implementation hazards. |
| S3 | [HHS — HIPAA de-identification guidance](https://www.hhs.gov/hipaa/for-professionals/special-topics/de-identification/index.html) | Explains Expert Determination and Safe Harbor. Three-digit ZIP handling has population conditions; a generic ZIP-prefix operation is not a compliance decision. |
| S4 | [ARX — supported models, methods, quality objectives and Java API](https://arx.deidentifier.org/overview/) | Substantial prior art and a candidate mature engine. Already covers risk/quality-aware transformations and interactive adjustment. |
| S5 | [Anonymeter — official repository, methodology and license notice](https://github.com/statice/anonymeter) | Synthetic-data singling-out, linkability and inference evaluation; separate source, synthetic and independent control data; baseline and control comparisons. |
| S5a | [Giomi et al., A Unified Framework for Quantifying Privacy Risk in Synthetic Data, PoPETs 2023](https://petsymposium.org/popets/2023/popets-2023-0055.php) | Research basis for the Anonymeter framework; use the actual experimental protocol, not just its name. |
| S6 | [SDMetrics — official documentation](https://docs.sdv.dev/sdmetrics) | Statistical and task-oriented evaluation components; a quality score is not interchangeable with a privacy guarantee. |
| S7 | [OpenDP — additive-noise mechanisms](https://docs.opendp.org/en/stable/api/user-guide/measurements/additive-noise-mechanisms.html) | Explicit domains, metrics and privacy maps for the experimental count adapter. |
| S8 | [Presidio — official documentation](https://presidio.dataprivacystack.org/) | Optional local entity-detection/anonymization route; should supplement, not replace, context-specific review. The former Microsoft documentation address redirects here. |
| S9 | [OWASP — CSV Injection](https://community.owasp.org/attacks/CSV_Injection) | A privacy tool must also avoid turning spreadsheet exports into formula execution vectors. |
| S10 | [Li, Li and Venkatasubramanian, t-Closeness: Privacy Beyond k-Anonymity and l-Diversity, ICDE 2007](https://doi.org/10.1109/ICDE.2007.367856) | Separates group size/diversity from sensitive-value distribution distance. |
| S11 | [Stadler, Oprisanu and Troncoso, Synthetic Data—Anonymisation Groundhog Day](https://arxiv.org/abs/2011.07018) | Empirical caution about treating synthetic generation as automatic anonymization; not proof that all synthetic methods are equally unsafe. |
| S12 | [NIST SDNist — synthetic-data report tool](https://www.nist.gov/services-resources/software/sdnist-synthetic-data-report-tool) | Existing privacy/utility evaluation infrastructure; another reason not to claim to invent before/after evaluation. |

## License sources and integration review

- [ARX imprint/license](https://arx.deidentifier.org/imprint/): Apache-2.0 notice.
- [SDMetrics license](https://raw.githubusercontent.com/sdv-dev/SDMetrics/main/LICENSE): MIT.
- [OpenDP license](https://raw.githubusercontent.com/opendp/opendp/main/LICENSE): MIT.
- [Anonymeter license and patent statement](https://github.com/statice/anonymeter): Clear BSD and a stated patent-pending code notice, application US-20230401336-A1. Check legal implications before distribution or commercial integration; a source license is not automatically a patent clearance.
- Presidio and all transitive dependencies need version-specific license verification before packaging. They are not bundled in this delivery.

## What this research changes in the product

Use established engines where their applicability matches the data. Keep formal mechanism guarantees separate from empirical attack outcomes. Make release context and missing evidence visible. Explain rather than conceal a weak test. Never mix confidential original-data diagnostics into a supposedly protected recipient release. These are design constraints, not marketing footnotes.

## What this research does not establish

No source here establishes that PRISM itself has been independently audited, meets a legal de-identification standard, supports every clinical data type, or can certify arbitrary release safety. There is no published validation study of this prototype. The tests and fictional examples establish bounded software behavior, not clinical deployment approval.
