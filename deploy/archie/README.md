# Archie frontend hosting adapter

This isolated Next.js 16.4.2 application serves the reviewed React/Vite build
without generating or replacing its UI. It proxies only the fictional demo's
allowlisted `/v1/*` and `/health` routes to the fixed compute origin
`https://prism-healthcare-taupe.vercel.app`. Python compute remains on Vercel;
durable fictional configuration remains in the existing Archie Core table.
There are no model calls, Archie SDK, database key, or OAuth credentials here.

## Prepare the reviewed bundle

After the owner finishes the final frontend build, from the repository root:

```powershell
node deploy/archie/scripts/sync-vite.mjs
npm ci --prefix deploy/archie
npm test --prefix deploy/archie
npm run build --prefix deploy/archie
```

The sync script only copies `frontend/dist`, rejects hidden files, symlinks,
credential-named files, and Archie key-shaped values, and clears only this
adapter's generated `content/` and `public/` directories. Those directories,
`node_modules/`, `.next/`, and `.env*` are ignored on the working branch. The
adapter code and lockfile can be tracked without generated binary assets.
Rerun sync after any final Vite build; it does not build the frontend itself.

## Publish a branch with the adapter at Git root

The source adapter's ignore rules intentionally exclude built assets on
`main`. For an Archie deployment that builds the Git repository root, run:

```powershell
npm run package:root --prefix deploy/archie
```

This refreshes from the current `frontend/dist` and prepares
`deploy/archie/.hosting-root/`. It makes no Git or remote changes. Copy that
directory's **contents**, including its `.gitignore`, into a fresh isolated
`archie-hosting` worktree. Its publishing ignore file deliberately permits
`content/` and `public/`. Stage exactly these root paths:

```text
.gitignore
README.md
package.json
package-lock.json
next.config.ts
next-env.d.ts
tsconfig.json
app/
lib/
scripts/
test/
content/
public/
```

`content/index.html`, `public/assets/`, and `public/pitch/` are required runtime
artifacts. Do not publish only the source adapter, and do not carry over the
source adapter's `.gitignore` that excludes them. Do not stage `.env*`,
`node_modules/`, `.next/`, `.hosting-root/`, or unrelated main-branch files.
The root package includes the pinned npm lockfile; no root-level `vercel.json`
belongs on this branch. Archie must build this Next app, not the main monorepo.

For first publication, use a **new, clean worktree**, leaving the active main
checkout and its dirty work intact. The following is a recipe for the owner;
the adapter scripts do not execute it:

```powershell
$archieSourceRoot = (Get-Location).Path
$archieBundle = Join-Path $archieSourceRoot "deploy/archie/.hosting-root"
$archieHostWorktree = Join-Path $env:TEMP ("prism-archie-hosting-" + [guid]::NewGuid().ToString("N"))
if (Test-Path -LiteralPath $archieHostWorktree) { throw "Use a new empty worktree path." }
git worktree add --detach $archieHostWorktree HEAD
if ($LASTEXITCODE -ne 0) { throw "Worktree creation failed." }
git -C $archieHostWorktree switch --orphan archie-hosting
if ($LASTEXITCODE -ne 0) { throw "Isolated branch creation failed." }
Get-ChildItem -LiteralPath $archieBundle -Force | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination $archieHostWorktree -Recurse -ErrorAction Stop
}
git -C $archieHostWorktree add -- .gitignore README.md package.json package-lock.json next.config.ts next-env.d.ts tsconfig.json app lib scripts test content public
if ($LASTEXITCODE -ne 0) { throw "Exact-path staging failed." }
git -C $archieHostWorktree diff --cached --stat
if ($LASTEXITCODE -ne 0) { throw "Staged-tree inspection failed." }
git -C $archieHostWorktree commit -m "Host reviewed PRISM frontend through Archie adapter"
if ($LASTEXITCODE -ne 0) { throw "Hosting commit failed." }
git -C $archieHostWorktree push -u origin archie-hosting
if ($LASTEXITCODE -ne 0) { throw "Hosting branch push failed." }
```

Stop if any Git step fails; these commands are for a branch that does not yet
exist. If `archie-hosting` already exists, update it in its own clean worktree
with the prepared tree instead of creating another orphan branch. Refresh the
prepared tree after the final Vite build immediately before publication.

The prepared root's `npm ci`, `npm run build`, and `npm start` are the complete
host commands. It already contains frontend assets and must not run `sync` or
`package:root` in the cloud. Root build tracing includes both HTML entry files.
The exact public origin is still required at runtime, and preview and production
domains need separate configured origins. Do not use the Archie editor's
`app.archie.com/project/...` URL as the origin: the app requires a top-level
deployment origin, and its frame restrictions prevent embedding in that editor.

For local production verification in one PowerShell terminal:

```powershell
$env:PUBLIC_ARCHIE_ORIGIN = "http://127.0.0.1:3088"
npm start --prefix deploy/archie -- --port 3088
```

In another terminal run `npm run smoke --prefix deploy/archie`. That makes one
real 480-row KIT fixture/candidate calculation through this adapter, expects
75 verified matches, and clears only the session it created. It also checks
HTML, a built JS asset, the pitch page, health, and cookie protections.

`npm run smoke:handler --prefix deploy/archie` exercises only the proxy handler
against the actual fixed compute service, without launching a local listener.
The handler check passed with 480 fictional rows and 75 verified matches; its
own visitor record was cleared. Production build and the three focused proxy
tests also passed. The execution environment blocked local server launch, so
the full HTTP-host smoke remains pending. Handler success does not establish
Archie hosting, static asset delivery, or browser acceptance.

## Archie deployment requirements

Use an isolated deployment branch whose root contains this adapter's files
and its freshly synchronized `content/` and `public/` output, or configure
Archie's build root as `deploy/archie` if its UI exposes that option. Do not
run Archie generation against the reviewed working branch. The adapter needs
a server-capable Next.js/Node host; a static-only CDN cannot run the API proxy.
Node 24 is used locally; Next requires Node >=20.9. Install with `npm ci`,
build with `npm run build`, and start with `npm start` (the platform may pass
`PORT`). Set exactly one server environment variable:

| Name | Value |
| --- | --- |
| `PUBLIC_ARCHIE_ORIGIN` | The exact public HTTPS origin assigned by Archie, with no trailing slash, path, query, or fragment |

This value is not a secret and is read at request time. The adapter rejects
unconfigured/mismatched Host, foreign Origin, and cross-site/sibling-site
requests. State changes require the exact Origin. It ignores forwarded-host
headers. Archie must preserve the public Host header when sending requests to
the Next server; verify this on the first deployed health request.

The proxy forwards only `prism_demo_session` from browser cookies. It never
forwards Archie authentication cookies, Authorization, arbitrary proxy
headers, API keys, or OAuth tokens. It sends the fixed compute origin as the
upstream Origin, leaves Vercel's boundary intact, and returns only that demo
cookie as a host-only Secure/HttpOnly/SameSite=Strict/Path=/ cookie. Clear's
Max-Age=0 is preserved. All responses are no-store. Uploads and external audits
are blocked before reading a body; configuration is capped at 64 KiB.

The existing limits still apply: two fictional fixtures, 24 search candidates,
40 total candidates, four jobs, and 30-minute inactivity expiry. Existing
privacy/release limitations remain; this is no clinical or formal privacy
approval. The upstream compute deployment must remain running.

Local functionality does not prove Archie repository import or hosting
availability. No Archie deployment, remote branch, paid service, generation,
or project mutation is performed by these files. After the source-preserving
deployment route is available, deploy the isolated branch, set its actual
origin, run the smoke against that HTTPS origin, then inspect the browser UI.
