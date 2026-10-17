# Archie static frontend

Archie's actual project workspace builds a static Vite application. It cannot
run the server routes in the alternative Next adapter. This entry replaces
the generated prototype with the reviewed six-view PRISM application.

Typecheck `frontend`, then run `node deploy/archie-static/build-entry.mjs r20261017a`
(use a new revision for every subsequent frontend release). Copy the
resulting `index.html` into the Archie Code editor's root `index.html`, save
through Source Control, and publish. It pins exact reviewed JS/CSS assets on
the public Vercel CDN under `frontend/public/archie-assets/<revision>/`; Archie
hosts the entry document and application origin. Keep those versioned assets
in Git: subsequent Vercel deployments must retain the currently published
Archie bundle. The script refuses to overwrite an existing revision.
The old generated view code is no longer an application entrypoint.

The API bridge is fictional-only. Configure `PUBLIC_ARCHIE_ORIGINS` on the
Vercel backend as comma-separated exact Archie HTTPS origins. No wildcard
API CORS, cookies, Archie account tokens, URLs or browser storage carry visitor
credentials. One single-flight handshake returns a random 256-bit visitor
token, retained only in module memory and sent in a dedicated header. The
existing same-origin cookie flow remains separate. Reload starts a new visitor;
the old visitor expires after inactivity. Uploads and external audits remain
blocked, and existing capacity/release restrictions remain in force.

Public JS/CSS/font assets allow anonymous cross-origin loading. This does not
expose API responses. Python runs on Vercel and durable fictional-session
configuration remains in Archie Core. This is not an all-Archie runtime.

Archie assigned `https://41d0bdfd-0065-4b0b-a973-efbe1c1a9c5e.archie.site/`
during publishing. The preview already rendered the real 5,000-row fixture
through the bridge. Both that public origin and the exact project preview
origin are configured in `PUBLIC_ARCHIE_ORIGINS`; the public route still needs
its final live acceptance check at this checkpoint. See the deployment document
for the final outcome.
