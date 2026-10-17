/** Prepare a complete Git-root deployment without Git or remote mutations. */
import { copyFile, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const adapter = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(adapter, ".hosting-root");
const inside = relative(adapter, output);
if (!inside || inside.startsWith("..") || isAbsolute(inside)) throw new Error("Unsafe hosting-output path.");

// Synchronize the current reviewed dist first. The optional CLI argument is
// the same explicit source-dist argument accepted by sync-vite.mjs.
await import("./sync-vite.mjs");
await rm(output, {recursive: true, force: true});
await mkdir(output, {recursive: true});

async function copyTree(source, destination) {
  await mkdir(destination, {recursive: true});
  for (const item of await readdir(source, {withFileTypes: true})) {
    if (item.isSymbolicLink() || item.name.startsWith(".env")) throw new Error("Refusing linked or environment content.");
    const from = join(source, item.name);
    const to = join(destination, item.name);
    if (item.isDirectory()) await copyTree(from, to);
    else if (item.isFile()) await copyFile(from, to);
    else throw new Error("Unrecognized deployment file.");
  }
}

for (const file of ["package.json", "package-lock.json", "next.config.ts", "next-env.d.ts", "tsconfig.json"]) {
  await copyFile(join(adapter, file), join(output, file));
}
for (const directory of ["app", "lib", "scripts", "test", "content", "public"]) {
  await copyTree(join(adapter, directory), join(output, directory));
}
// The source adapter ignores generated assets on main. The publishing branch
// must track them, so use a distinct root ignore file that includes both trees.
await writeFile(join(output, ".gitignore"), "node_modules/\n.next/\n.env*\n.hosting-root/\n*.tsbuildinfo\n");
await writeFile(join(output, "README.md"), `# PRISM Archie hosting root

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
`);
console.log("Prepared the complete Git-root deployment in deploy/archie/.hosting-root.");
console.log("Stage exactly: .gitignore README.md package.json package-lock.json next.config.ts next-env.d.ts tsconfig.json app/ lib/ scripts/ test/ content/ public/");
console.log("No Git commands, remote updates, environment files, or credentials were copied.");
