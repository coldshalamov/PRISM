# PRISM — Evidence, prior art, and defensible niche
**Prepared 17 October 2026 · Sources checked against publisher, standards-body or package-maintainer pages**

## One-sentence thesis
PRISM is a **local-first, purpose-aware pre-release privacy audit workbench** for researchers. It takes original and protected data (including files produced by other anonymization software), assesses multiple disclosure risks, measures whether predeclared scientific analyses survive, searches for improved release configurations, and produces an explainable evidence report. It **does not** certify anonymity, HIPAA compliance, or universal attack resistance.

## Evidence hierarchy for a hackathon pitch

### A. Does the user problem exist? (Best 2 papers)

**[E1]** Guo, W., Pepitone, P., Aviv, A. J., & Mazurek, M. L. (2025). *How Researchers De-Identify Data in Practice.* 34th USENIX Security Symposium, 2205–2224. https://www.usenix.org/conference/usenixsecurity25/presentation/guo-wentao
- **Finding:** Interviews with 18 researchers and 6 curators found awareness of indirect identification, but substantial reliance on manual/social rather than systematic dataset-wide assessments; three reported barriers concerned perceived threat relevance, weak support/incentives and unsatisfactory tools.
- **Supports saying:** “Recent qualitative research documents a gap between privacy methods and everyday research release workflows.”
- **Does NOT support:** “Most hospitals are unsafe,” “75% of researchers leak data,” or general prevalence estimates.
- **Product implication:** Guided, research-first workflow with auditable checks, short explanations and built-in comparisons.

**[E2]** Guo, W., Kishore, A., Pepitone, P., Aviv, A., & Mazurek, M. (2024). *Understanding De-identification Guidance and Practices for Research Data.* SOUPS 2024 poster. https://www.usenix.org/conference/soups2024/presentation/guo-poster
- **Finding:** The authors analyzed 38 online guides, identifying inconsistent definitions, missing threats and usability problems.
- **Supports saying:** “Even guidance can be inconsistent and hard to apply.”
- **Does NOT support:** “Every institutional guide is wrong.”
- **Product implication:** Tooltips connecting plain-language risk explanations to reproducible methods and sources.

### B. Why does re-identification deserve attention? (Best 3 research papers)

**[E3]** Narayanan, A., & Shmatikov, V. (2008). *Robust De-anonymization of Large Sparse Datasets.* IEEE Symposium on Security and Privacy, 111–125. https://doi.org/10.1109/SP.2008.33
- **Finding:** The authors demonstrated linkage of ostensibly anonymized movie-rating records against external knowledge, including IMDb profiles.
- **Supports saying:** “Names removed ≠ linkage impossible.”
- **Product implication:** Evaluate indirect and joint identifiers; enable auxiliary-data linkage testing on authorized synthetic demo files.
- **Limit:** This paper is an existence demonstration, not an estimate of current clinical dataset breach frequency.

**[E4]** de Montjoye, Y.-A., Hidalgo, C. A., Verleysen, M., & Blondel, V. D. (2013). *Unique in the Crowd: The privacy bounds of human mobility.* Scientific Reports 3, 1376. https://doi.org/10.1038/srep01376
- **Finding:** Four spatiotemporal points uniquely characterized 95% of individuals in a particular 1.5-million-person mobility dataset.
- **Supports saying:** “Apparently innocuous combinations can be highly distinguishing.”
- **Product implication:** Visualize joint-attribute singling out and resolution-dependence; never generalize the 95% figure to all clinical datasets.

**[E5]** Rocher, L., Hendrickx, J. M., & de Montjoye, Y.-A. (2019). *Estimating the success of re-identifications in incomplete datasets using generative models.* Nature Communications 10, 3069. https://doi.org/10.1038/s41467-019-10933-3
- **Finding:** Demonstrates model-based estimates of population uniqueness and re-identification even for incomplete, sampled microdata under assumptions.
- **Supports saying:** “Sample uniqueness is not the whole question; population-level estimates may matter.”
- **Product implication:** Explicit distinction between measured sample properties and population estimators requiring assumptions/reference populations.
- **Limit:** Don't repeat their U.S. extrapolations as guarantees for other datasets/populations.

### C. Is the privacy–utility tradeoff formal and visualizable? (Best 2 papers)

**[E6]** Makhdoumi, A., Salamatian, S., Fawaz, N., & Médard, M. (2014). *From the Information Bottleneck to the Privacy Funnel.* IEEE Information Theory Workshop, 501–505. https://doi.org/10.1109/ITW.2014.6970882
- **Finding:** Formalizes statistical utility preservation versus sensitive-information inference via a Privacy Funnel, including mutual-information interpretations under specific loss functions.
- **Supports saying:** “We can make the tradeoff an explicit optimization objective, not merely a cosmetic slider.”
- **Product implication:** Define protected targets, desired analytical query workload and a vector of empirical privacy and utility metrics; avoid calling estimated mutual information a blanket privacy guarantee.

**[E7]** Thees, O., Müller, R., & Templ, M. (online published October 1, 2026). *Beyond the Trade-Off Curve: Multivariate and Advanced Risk-Utility Maps for Evaluating Anonymized Data.* Journal of Official Statistics. https://doi.org/10.1177/0282423x261487530
- **Finding:** Compares visual techniques for multivariate privacy/utility metrics, including Pareto-efficient alternatives; no single visualization wins on every axis.
- **Supports saying:** “A one-dimensional privacy score hides important tradeoffs; an evidence-rich interactive comparison is better motivated.”
- **Product implication:** Pareto graph + per-metric details, column ablation and query-level utility, not just one red/green indicator.
- **Novelty warning:** This exact risk–utility map direction is existing peer-reviewed research. Claim practical integration and workflow, not invention of Pareto analysis.

### D. What capabilities already exist? (Credit competitors; don't pretend first)

**[E8]** Prasser, F., Eicher, J., Spengler, H., Bild, R., & Kuhn, K. A. (2020). *Flexible data anonymization using ARX—Current status and challenges ahead.* Software: Practice and Experience. https://doi.org/10.1002/spe.2812
- **Finding:** ARX already integrates numerous privacy models, transformations, risk analysis, utility models and an established UI.
- **Supports saying:** “The scientific foundations and software components are mature; we need not reinvent them.”
- **Product implication:** Respect ARX as sophisticated prior art; PRISM specializes in independent audit, accessible guided research-intent evaluation and release-decision evidence.

**[E9]** Morehouse, K. N., Kurdi, B., & Nosek, B. A. (2025 print; online May 2024). *Responsible data sharing: Identifying and remedying possible re-identification of human participants.* American Psychologist 80(6), 928–941. https://doi.org/10.1037/amp0001346
- **Finding:** Introduces MinBlur/MinBlurLite, privacy methods built for researchers and open-science utility.
- **Supports saying:** “Purpose-aware generalization is already academically recognized and viable.”
- **Novelty warning:** User-specified important attributes are not new. Build beyond one k-anonymization workflow with cross-tool auditing, multi-attack tests and actual query-preservation checks.

**[E10]** Giomi, M., Boenisch, F., Wehmeyer, C., & Tasnádi, B. (2023). *A Unified Framework for Quantifying Privacy Risk in Synthetic Data.* Proceedings on Privacy Enhancing Technologies, 2023(2), 312–328. https://doi.org/10.56553/popets-2023-0055
- **Finding:** Presents Anonymeter with singling-out, linkage, and inference attack evaluations specifically for synthetic tabular datasets.
- **Supports saying:** “Multiple attack modes must be evaluated; synthetic data are not automatically disclosure-proof.”
- **Product implication:** Prefer an adapter and proper train/control requirements over copying or misapplying metrics to ordinary row-preserving anonymization.

**[E11]** Templ, M. (2026). *riskutility: Disclosure Risk and Data Utility Metrics for Synthetic and Anonymized Data.* R package version 0.2.0, released September 2, 2026. https://CRAN.R-project.org/package=riskutility
- **Finding:** Ready-to-use risk and utility metrics, including attribute inference and statistical comparisons. GPL-3 license.
- **Supports saying:** “Open-source building blocks exist and can accelerate a prototype.”
- **Novelty warning:** Original/protected before-after risk and utility metrics already exist. License review required before packaging/derivative integration.

### E. Why a usable release decision needs more than a model (Standards + design research)

**[E12]** Panavas, L., Snoke, J., Tyagi, E., Bowen, C. M., & Williams, A. R. (2025). *But Can You Use It? Design Recommendations for Practical Alternatives to Differentially Private Interactive Systems.* Harvard Data Science Review 7(4). https://doi.org/10.1162/99608f92.a1c2b7cb
- **Finding:** Analyzes practical tensions between privacy assurance, statistical validity/utility and usability in research-facing private query systems.
- **Supports saying:** “A mathematically elegant protection can be unusable for working scientists; usability is part of responsible system design.”
- **Product implication:** Clear guarantees, available analyses, uncertainty and constrained release mode must be visible.

**[E13]** Garfinkel, S. et al. (2023). *De-Identifying Government Datasets: Techniques and Governance.* NIST SP 800-188. https://doi.org/10.6028/NIST.SP.800-188
- **Finding:** Describes risks, de-identification approaches, governance and different release models.
- **Supports saying:** “Risk assessment and release context are central, not mere removal of names.”
- **Product implication:** Distinguish microdata release vs aggregate-query vs synthetic release and controlled access.

**[E14]** Near, J., Darais, D., Lefkovitz, N. & Howarth, G. (2025). *Guidelines for Evaluating Differential Privacy Guarantees.* NIST SP 800-226. https://doi.org/10.6028/NIST.SP.800-226
- **Finding:** Framework for understanding real differential privacy assurances and implementation pitfalls.
- **Supports saying:** “Mechanism-level guarantees and empirical risk evaluations are different.”
- **Product implication:** Evidence classes: exact computation, threat-dependent estimate, mechanism proof, not assessed.

**[E15]** U.S. Department of Health and Human Services. *Guidance Regarding Methods for De-identification of Protected Health Information.* https://www.hhs.gov/hipaa/for-professionals/special-topics/de-identification/index.html
- **Finding:** HIPAA discusses Safe Harbor and Expert Determination; the latter requires a qualified expert and documented method/results. It explicitly acknowledges residual risk after de-identification.
- **Supports saying:** “There is a serious, iterative expert review task, and PRISM can improve its evidence workflow.”
- **Important prohibition:** Software results are not themselves Expert Determination, legal authorization or proof of HIPAA compliance.

## Defensible differentiation vs existing tools

| Capability | Established prior art | PRISM's proposed specialization |
|---|---|---|
| Statistical privacy models and anonymization | ARX, sdcMicro, MinBlur | Accessible orchestration around real research work, rather than proposing another core model |
| Privacy+utility numerical metrics | ARX, riskutility | Researcher-declared analysis workload and exposure/utility change explained per release |
| Synthetic data risk tests | Anonymeter | Independent release-type recognition and applicable adapter workflows |
| Pareto/visual risk–utility exploration | Thees et al. 2026 | One interface tied directly to decisions, candidate files and executable analyses |
| Study showing unmet needs | Guo et al. 2025 | Design target: informal share/publish decision with no mandatory privacy expertise |
| Formal guarantees and governance | NIST/HHS | Evidence hierarchy and documented human decision, not bogus “certified anonymous” badge |

## Recommended single feature that sells the idea

**Purpose-Aware Release Audit:** Upload the original data and a protected release made with PRISM *or any other tool*. Name two statistics that the collaborator needs to reproduce. PRISM checks residual singling-out and subgroup inference for stated known-column combinations, quantifies impact on those two analyses, then proposes a less damaging candidate release and shows exactly why. End with a versioned local HTML report specifying method provenance, assumptions, coverage, failed tests and unresolved concerns.

The pitch is not “we built the first anonymizer.” It is “We turn complicated privacy tools and abstract risk–utility research into an intelligible pre-release decision backed by repeatable experiments.”

## 75-second pitch outline (adapt only to features actually working)

1. **Problem (~15 sec):** “Removing identifiers is not the same as removing re-identification risk. USENIX Security 2025 found that researchers often handle this through manual judgment, while data curators lack systematic assessments.” [E1]
2. **Science (~15 sec):** “Information theory frames this as preserving useful signal while limiting sensitive inference; real-world studies show combinations of mundane attributes can become uniquely identifying.” [E6, E4]
3. **Solution/demo (~30 sec):** “PRISM accepts an original dataset and a protected release, including data anonymized elsewhere. It measures the vulnerability of attribute combinations, tests whether the specified research analyses survive, and finds a candidate release with a better measured tradeoff.” [Use real implementation output, no invented metric]
4. **Prior art/honesty (~10 sec):** “ARX, MinBlur and Anonymeter do important parts of this already. PRISM is an accessible, purpose-aware audit and release-decision layer built on that science.” [E8, E9, E10]
5. **Close (~5 sec):** “We don't certify magic anonymity. We give researchers evidence for better decisions.”

## What not to say

- “No tool already does this.” (Incorrect: ARX, riskutility, MinBlur, published risk–utility maps overlap strongly.)
- “Researchers don't understand cybersecurity.” (Not established; interview study is more nuanced.)
- “PRISM knows exactly how private the data is.” (No universal privacy number from two files.)
- “A 100% privacy slider means data cannot leak.” (False.)
- “Removing names and ZIP is HIPAA compliant.” (False.)
- “Differential privacy is proved because our before/after files look different.” (False.)
- “The program uses zero AI and therefore gives mathematical guarantees.” (Determinism is not a privacy guarantee.)

## Originality hypothesis to validate after hackathon

A side-by-side **cross-tool audit + research-specific utility contract + test coverage/exposure map + candidate-search advisor** may reduce time and expertise required for ad hoc sharing decisions. This is a hypothesis, not a verified claim of first-of-its-kind product. Validate via observed researcher workflows, benchmark against ARX/MinBlur/riskutility and test whether users make more accurate release decisions than with existing tools.
