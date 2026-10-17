# PRISM submission copy

## Reference fields

**Project name:** PRISM

**Tagline:** See what survives the scrub

**Track:** Enterprise AI

**Theme:** AI safety, trust and governance

**Project description:**

Built for eMerge AI Hackathon 2026 (Enterprise AI track), PRISM helps teams check data before sharing it with colleagues, partners, or AI tools. Removing names can leave clues: age, location, and dates can still single out records. PRISM lets you upload CSV, JSON, or XLSX tables (up to 3 MiB), spot distinguishing fields, test protection recipes, and check whether your key answers still hold.

Optional AI (OpenRouter Jev) interprets column headers, but row data never goes to the model. Python computes the actual results. In a 480-row benchmark, removing ZIP cut simulated correct matches from 75 to 20; three selected answers stayed the same between recipes. In a separate table, rows with a unique combination fell from 480 to 96. Compare tested options, audit externally protected files, and download protected CSVs directly. Hosted on Archie and Vercel. PRISM shows what it tested; you decide whether to share. README discloses AI tools and background material.

**Technologies:** React, TypeScript, Vite, Python, FastAPI, pandas, NumPy, SciPy, OpenRouter (Jev), Archie Core, PostgreSQL, Vercel

**PitchDeckURL:** https://prism-healthcare-taupe.vercel.app/pitch/

**Portable PDF:** https://prism-healthcare-taupe.vercel.app/pitch/PRISM-Pitch.pdf

**DemoURL:** https://41d0bdfd-0065-4b0b-a973-efbe1c1a9c5e.archie.site/

**PublicRepo:** https://github.com/coldshalamov/PRISM

The canonical demo opens on Archie, which manages entry and session state, while Vercel serves UI assets and Python compute. The app accepts real CSV, JSON, and XLSX uploads up to 3 MiB (up to 8 datasets per session) and can audit externally protected files. Pitch slides and PDF are hosted on Vercel. Fictional examples illustrate general enterprise data-sharing workflows; oncology data is a demonstration, not a clinical validation claim.

## Two-minute speaker flow

**0:00–0:12 · Slide 1: Cover**

“PRISM helps teams see what survives the scrub before sharing data with colleagues, external partners, or AI tools.”

**0:12–0:30 · Slide 2: The sharing problem**

“Removing names and IDs can leave clues. Combinations of age, location, and dates can still single out records. PRISM lets you clean the file, spot what still distinguishes records, and check whether your important answers still hold.”

**0:30–0:50 · Slide 3: How it works**

“Optional AI reads column headers to infer field types, but row data never touches any model. Python code computes the measurements on Vercel in the hosted app, or on your computer when run locally. You review the columns, test exposure, check your calculations, and download the protected file.”

**0:50–1:15 · Slide 4: Fictional benchmark results**

“In our simulated 480-row benchmark, removing ZIP dropped unique exact matches from 75 to 20. Crucially, three key answers stayed identical between the recipes: 6-month failure rate at 36.25%, liver subgroup at 45.03%, and age-weight correlation at 0.6893. Those three answers stayed useful; other analyses may change.”

**1:15–1:32 · Slide 5: Recipe search**

“Instead of guessing, PRISM tests up to 24 protection recipes automatically. It plots privacy against utility so you can spot which options miss your accuracy limits and choose the best tradeoff.”

**1:32–1:48 · Slide 6: Technical foundation**

“The catalog covers 145 column meanings and 25 exposure patterns. Missing tests are shown clearly. In a separate fictional appointment table, unique combinations dropped from 480 to 96 and the selected response calculation stayed the same.”

**1:48–2:00 · Slide 7: Ready to share**

“PRISM shows what it tested; you decide whether to share. You can upload your own spreadsheets up to 3 MiB on Archie today and download protected CSVs directly, without an account.”

## Short live demo route

1. **Open app & load data:** Launch on Archie and view the appointment table fixture, or upload a CSV/XLSX file (up to 3 MiB).
2. **Review columns:** Check what PRISM thinks each column means. Optional AI infers ambiguous labels; you can confirm or override them directly.
3. **Inspect measured exposure:** See how combination-unique rows fall from 480 to 96 under default protection while key query answers remain unchanged.
4. **Compare benchmark recipes:** Show the 480-row benchmark where removing ZIP drops simulated matches from 75 to 20 while preserving three target calculations identically.
5. **Explore tradeoffs & export:** Run recipe exploration to test up to 24 configurations, verify constraints, and download the protected CSV directly.

## Screenshot captions

- **Workbench:** Original and protected tables side-by-side with active transformation controls and live metric deltas.
- **Knowledge Map:** Exposure breakdown highlighting combinations of columns that single out individual rows.
- **Research Intent:** Key business or research questions with tolerances showing whether protected values remain accurate.
- **Recipe Explorer:** Tested protection options plotted to compare privacy gains against data loss.
- **Audit Report:** A report of the checks, settings, results and changes for the selected version.
- **Semantic Fields:** Column meanings, how PRISM chose them, and optional AI suggestions you can correct.

## Claim boundaries (internal notes)

- **75 to 20 matches:** Simulated exact-match lookup on a 480-row fictional benchmark with known membership. Measures sample-level linkage under declared rules, not general population re-identification probabilities.
- **Three identical answers:** 36.25% failure, 45.03% liver subgroup, and 0.6893 correlation are identical *between the two compared protected recipes* and meet source tolerances. Does not imply all possible analyses remain identical.
- **480 to 96 unique rows:** Separate appointment fixture measuring rows unique on date/facility/demographic combinations. Distinct metric from the 75-to-20 benchmark.
- **145 types & 25 attack categories:** Catalog totals in the registry. 25 categories include documented gap states that abstain when prerequisites are unmet, not 25 fully executed attacks.
- **24 search configurations:** Standard search explores up to 24 recipe configurations and flags those failing declared constraints.
- **No automatic privacy guarantee:** PRISM shows what it tested; human decision-makers decide whether to share. No claim of legal immunity or HIPAA certification.
- **Architecture & hosting:** Archie manages entry and session state; Vercel serves assets and Python compute. Local calculations work without a model; optional Jev interpretation requires a connection.

This document is reference copy. The user’s existing hackathon submission and all deployed URLs are left unchanged by this copy pass.
