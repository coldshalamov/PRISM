/** Copy only the already-reviewed Vite output; never run a generator. */
import { access, copyFile, mkdir, readFile, readdir, rm } from "node:fs/promises";
import { dirname, extname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const adapter = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(process.argv[2] ?? join(adapter, "..", "..", "frontend", "dist"));
await access(join(source, "index.html"));
await access(join(source, "assets"));
const allowed = new Set([".html", ".js", ".css", ".svg", ".png", ".webp", ".jpg", ".jpeg", ".ico", ".pdf", ".txt", ".woff", ".woff2", ".ttf", ".json"]);
const files = [];

async function collect(directory, prefix = "") {
  for (const item of await readdir(directory, {withFileTypes: true})) {
    const name = join(prefix, item.name);
    if (item.isSymbolicLink() || item.name.startsWith(".") || /(^|[._-])(secret|credential|token)([._-]|$)/i.test(item.name)) {
      throw new Error(`Refusing hidden, credential-named, or linked build content: ${name}`);
    }
    if (item.isDirectory()) await collect(join(directory, item.name), name);
    else if (item.isFile() && allowed.has(extname(item.name).toLowerCase())) {
      if ([".html", ".js", ".css", ".json", ".txt"].includes(extname(item.name))) {
        const content = await readFile(join(source, name), "utf8");
        if (/archie_[A-Za-z0-9_-]{32}/.test(content)) throw new Error("Refusing build content containing an Archie key-shaped value.");
      }
      files.push(name);
    } else throw new Error(`Unrecognized build asset: ${name}`);
  }
}
await collect(source);

// Verify resolved absolute cleanup targets remain inside this adapter before
// removing only its generated public/content directories.
for (const directory of ["public", "content"]) {
  const target = resolve(adapter, directory);
  const inside = relative(adapter, target);
  if (!inside || inside.startsWith("..") || isAbsolute(inside)) throw new Error("Unsafe generated-content path.");
  await rm(target, {recursive: true, force: true});
  await mkdir(target, {recursive: true});
}
for (const file of files) {
  const destination = file === "index.html" ? join(adapter, "content", "index.html") : join(adapter, "public", file);
  await mkdir(dirname(destination), {recursive: true});
  await copyFile(join(source, file), destination);
}
console.log(`Synchronized ${files.length} reviewed build files into the isolated Archie adapter.`);
