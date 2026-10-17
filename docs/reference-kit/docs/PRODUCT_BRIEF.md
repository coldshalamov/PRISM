# PRISM — product description and scope

## One sentence

PRISM lets a researcher see what an anonymization changes, what a modeled attacker can still learn, and which alternatives preserve the scientific questions that matter.

## Thirty-second description

Before sharing a dataset, place the original on the left and a protected candidate on the right. Choose a release recipe or audit a candidate made elsewhere. PRISM runs local disclosure diagnostics and the researcher's actual analytical queries. Explore alternative settings, inspect concrete failure examples, and export the candidate separately from a confidential evidence report. No expensive AI is required.

The product is a **pre-release experiment and review workbench**, not an encryption application or a substitute for release authority.

## The two everyday jobs

**Prepare a collaboration dataset.** A colleague asks for data. The researcher chooses the intended purpose, verifies their right to share, checks field roles, removes unnecessary identifiers, and selects a precision recipe. The application shows residual linkage and attribute-disclosure warnings beside changes in useful statistics. A familiar recipient is a context input—not permission and not a reason to silently downgrade privacy requirements.

**Audit a planned publication.** The researcher imports original and independently protected tables, confirms matching column meanings/units, declares a plausible attacker, and supplies the analyses that must survive. The application reports what can actually be measured. Without trustworthy row correspondence it does not pretend to verify identity matches; without independent control data it does not pretend to validate synthetic-data privacy.

The same product supports both jobs, but a “public” context should surface more questions, not automatically turn a single slider to a magic safe position.

## Product hierarchy

1. **Workbench:** create/audit, inspect schemas, edit methods, compare tables and distributions.
2. **Threat review:** explicit attacker knowledge, applicability, evidence, residual gaps.
3. **Utility review:** distributions, relationships, subgroup tasks, retained rows and missingness.
4. **Alternatives:** bounded search and a Pareto view; select a candidate, inspect its exact recipe, evaluate it, then review export.
5. **Method library:** short explanation, concrete example, appropriate mitigations, assumptions, implementation status, primary source.
6. **Release review:** what is being exported, authorization acknowledgment, unresolved warnings, reproducibility metadata kept with the owner.

The existing code implements connected slices of all six. It does not finish every advanced editor, integration, or scientific evaluator. Those are explicitly assigned in the agent pack.

## Interaction principle: one simple entrance, many honest dimensions

A precision slider is a shortcut through recipes. It is not a measurement of privacy. Sliding may improve one attack outcome and worsen another; neighboring recipes are not necessarily comparable across all objectives. Multiple settings can be dominated—worse privacy and worse utility than another candidate. PRISM should help find those avoidable losses.

Do not assume every loss of identifying detail costs useful science. If the declared study never uses ZIP, removing it may reduce identifying specificity with no change to that workload. Conversely, preserving every column's mean and standard deviation can destroy cross-column relationships. The three computed counterexamples make these distinctions visible.

Keep separate controls for generalization, missing/rare-category policy, pseudonyms, noise/permutation, group constraints, and (eventually) differentially private aggregate releases. Do not combine their parameters into a bogus universal risk scale.

## The present default recipe

- Remove `name` and `subject_id` after role review.
- Replace exact age with half-open five-year intervals.
- Preserve only the first three ZIP characters, including leading zeros.
- Replace weight in kilograms with half-open five-kilogram intervals.
- Replace diagnosis dates with calendar years.
- Shuffle output row order; never export source-row correspondence.
- No k-suppression unless selected.

The individual intervals, ZIP rule, and date rule are inspectable. There is no HIPAA compliance label. The fixture starts with known one-row-per-person structure; an uploaded dataset requires an explicit declaration and checks on a selected entity key.

## What makes the demo interesting

A diagnosis is not exposed only when a name is present. A known combination can point to a record; a nonunique group can reveal a homogeneous secret; two releases can jointly reveal more than either alone. PRISM makes those failures executable and puts the scientific cost of proposed changes beside them.

The actual fictional fixture produces 75 unique correct matches out of 480 under the declared attack with the default recipe. Removing ZIP information lowers that modeled count to 20 while leaving the selected workload unchanged. This is a useful demonstration of finding unnecessary disclosure, not a claim that the candidate is anonymous.

## Differentiation, without inflated novelty

ARX already includes sophisticated transformation, risk, and utility-aware optimization capabilities [S4]. Anonymeter and SDMetrics provide established evaluation components [S5–S6]. PRISM should compete through:

- understandable, local-first workflows that make assumptions and failures legible;
- consistent orchestration of complementary engines, without erasing their different guarantees;
- direct comparison against a user's scientific workload;
- a release-aware evidence/coverage model, not a dashboard with one unexplained score;
- quick practical demonstrations that teach through actual calculations.

This is product and engineering integration. It is not a new cryptographic primitive or a claim to invent privacy auditing.

## Explicit non-goals for this delivery

No automated clinical advice, public recipient query service, population re-identification certificate, remote transmission, multi-institution access policy, clinical text guarantee, genomic anonymization, or newly trained synthetic-data generator. No legal policy score inferred from a friend/stranger slider. No guarantee that an arbitrary high-strength recipe leaks nothing.

## Completion criteria for the next build

A researcher should load unfamiliar CSVs, confirm field meanings and attacker assumptions, compose at least eight methods without JSON, inspect each applicable diagnostic and each skipped one, preserve a meaningful workload, compare multiple measured candidates, and export only the intended artifact. The demo must remain usable with the network disconnected after installation. A novice should understand a warning; a privacy engineer should be able to inspect and challenge its assumptions.

References are indexed in [SOURCES.md](research/SOURCES.md).
