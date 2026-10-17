# PRISM release checklist

This is the final-work checkpoint, not a claim that every release task is finished. The owner maintains [delivery status](../artifacts/DELIVERY_STATUS.json) and [verification evidence](../artifacts/verification.md) as work completes.

| Item | Current state / required completion |
| --- | --- |
| Track | **Enterprise AI — AI safety, trust and governance.** No prescribed Enterprise dataset brief; fictional oncology is an example, not a sponsored healthcare entry. |
| Public repository | [coldshalamov/PRISM](https://github.com/coldshalamov/PRISM) exists and source is published. Push the final reviewed source and docs after integration; confirm the resulting remote commit. |
| Canonical demo | [prism-healthcare-taupe.vercel.app](https://prism-healthcare-taupe.vercel.app/). The legacy hostname does not determine the track. Deployed fixture calculations reproduced 75 then 20 correct matches. Final frontend deployment and browser acceptance remain to be confirmed. |
| Current topology | Archie Core Postgres/GraphQL stores isolated fictional-session replay configuration; Vercel serves the frontend and executes deterministic Python. No runtime generative model calls. |
| Archie frontend hosting | Source-preserving Next adapter exists at `deploy/archie/`; actual Archie repository import, public hosting and HTTPS acceptance are **pending**. Keep the canonical working hybrid URL until an Archie-hosted URL is verified. Do not use the unfinished generated prototype as the demo. |
| Frontend implementation | All six views and Sonnet polish implemented. OpenCode Go `gemini-4-argon-contributor` completed its audit/improvement pass. Final integration and required **three successive independent design approvals remain pending**; record actual verdicts and fix material findings. |
| Functional verification | 120 backend tests and nine later focused hosted/health checks passed. Local six-view route, real 24-candidate search/six frontier points, adoption, stale workload and four export formats passed. Recheck the final deployed frontend after integration. |
| Pitch | [Web deck](https://prism-healthcare-taupe.vercel.app/pitch/) and [PDF](https://prism-healthcare-taupe.vercel.app/pitch/PRISM-Pitch.pdf) exist. Ensure the final build retains the Enterprise AI copy, exact working URLs and license files. |
| Screenshots and evidence | Capture final actual deployed screens, including responsive review images. Refresh the default/alternative evidence exports and verification metadata before packaging and form upload. |
| Local release | Installed-wheel/static/fixture/catalog smoke passed at the earlier checkpoint. Rebuild the final wheel and source ZIP after all frontend, pitch, deployment-adapter and metadata changes; include the Archie adapter source. See [LOCAL_PACKAGE_VERIFICATION.md](LOCAL_PACKAGE_VERIFICATION.md). |
| Disclosures | README identifies supplied background material and successful development AI tools; notices retain kit Apache attribution and runtime font/dependency licenses. Preserve those disclosures. See [HACKATHON_REQUIREMENTS.md](HACKATHON_REQUIREMENTS.md). |
| Submission draft | Enterprise AI and project text/URLs have been entered. Final screenshot upload, **Save Draft**, and verification of saved fields/links are **pending**. Use [SUBMISSION_COPY.md](SUBMISSION_COPY.md) and the actual verified deployment URLs. |
| Submission authority | **Do not click Submit Project.** Leave a saved draft for the user's review; submission requires the user's explicit instruction. |

The public demo permits only the two fictional fixtures and rejects file intake. Private CSVs and external-file audits run in the loopback application. Candidate constraints, frontier membership and completed reviews never constitute release clearance, clinical validation or compliance certification.
