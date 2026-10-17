# PRISM Archie hosting root

This branch contains the reviewed, prebuilt React/Vite frontend and a minimal
Next.js server adapter. It does not run Archie generation or replace the UI.
Python compute remains at https://prism-healthcare-taupe.vercel.app and durable
fictional configuration remains in Archie Core.

Use Node 24, run npm ci, then npm run build, then npm start. The platform may
set PORT. Set PUBLIC_ARCHIE_ORIGIN to the actual public HTTPS origin with no
trailing slash or path. This is the only adapter runtime environment variable;
do not add Archie API keys or OAuth credentials. The platform must preserve
the public Host header. A static-only CDN cannot execute the API proxy.

content/index.html and public/ are deliberately tracked on this deployment
branch. Do not run npm run sync or package:root here: the original Vite source
lives on main, where deploy/archie/scripts/package-root.mjs prepares this tree.
Run npm test for focused proxy checks. After hosting is live, set
PRISM_ADAPTER_URL to its actual HTTPS origin and run npm run smoke.

The hosted demo is fictional-only. Uploads and external audits are disabled;
24 candidates/search, 40 candidates/session, four jobs, 64 KiB configuration,
and 30-minute inactivity limits remain. There is no formal privacy or clinical
approval. An upstream outage returns 503; no fallback data is fabricated.
