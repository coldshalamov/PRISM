# Hosted workbench and legacy Docker demo

## Current Archie deployment

PRISM 0.1.1 is a hosted desktop-style workbench, not a fictional-only public adapter. It accepts CSV, JSON and single-sheet XLSX original tables and externally protected tables. The public application is [PRISM on Archie](https://41d0bdfd-0065-4b0b-a973-efbe1c1a9c5e.archie.site/); final publication and browser results are in [delivery status](../artifacts/DELIVERY_STATUS.json) and [verification](../artifacts/verification.md).

The current entrypoint is `app.serverless_demo:app` on Vercel. Archie serves the static app entry; Vercel serves immutable assets and deterministic Python calculations; Archie Core stores compact visitor configuration and uploaded original bytes in gzip/base64 `kind: dataset` records. New Python workers reconstruct tables and candidate evidence from these records. Optional Jev receives schema metadata only when interpretation is requested; deterministic calculations and replay do not need it.

Hosted intake is limited to **3 MiB per file**, 100,000 rows and 80 columns. A visitor may hold eight datasets and 40 candidates, with four search jobs and 24 candidate evaluations per search. Clear session deletes the visitor's session and owned file records. Inactive sessions expire after 30 minutes; cleanup occurs when the expired visitor returns. The current adapter does not claim a proactive deletion scheduler for abandoned records. Local loopback use supports 50 MB input files.

The actual Archie Core probe exercised CSV/JSON/XLSX imports, cold candidate replay, an unpaired external audit and cleanup of all four uploaded records. It passed in 17.03 seconds. Public-browser acceptance is a separate release check. [ARCHIE_DEPLOYMENT.md](ARCHIE_DEPLOYMENT.md) documents the maintained configuration and publishing path.

## Legacy fictional-only Docker adapter

`app.hosted_demo:app` is retained as a separate legacy, memory-only demonstration. The repository Dockerfile runs that adapter. Its fictional-fixture restriction is an adapter-specific property, **not the policy of the current Archie workbench**. Do not configure the current frontend or serverless API to disable uploads on its account.

For an intentionally fictional-only local container:

```sh
docker build -t prism-demo .
docker run --rm -p 7860:7860 -e PUBLIC_DEMO_HOST=localhost:7860 prism-demo
```

The container uses one worker/replica and in-process visitor state. Restarting it loses that state. It has different session/admission bounds and no Archie-backed uploaded-file replay. Its health reports the legacy synthetic-demo mode. It should not be substituted for the current Archie deployment when demonstrating real imports or external protected-file audits.

The complete local workbench remains `app.main:app`, served by `start.ps1` on loopback. These are three distinct deployment entrypoints; follow the one required for the intended workflow.
