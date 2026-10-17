"""Build a self-contained local wheel and a source/fixture handoff ZIP.

Run the frontend production build first. No datasets outside examples/ are read.
"""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tomllib
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOTS = ("backend", "frontend", "api", "pitch", "docs", "examples", "schemas", "scripts", "deploy")
ROOT_FILES = ("README.md", "LICENSE", "NOTICE", "THIRD_PARTY_NOTICES.md", "IMPLEMENTATION_CONTRACT.md",
              "setup.ps1", "start.ps1", ".gitignore", "Dockerfile", ".dockerignore", ".vercelignore", "vercel.json", "requirements.txt")
ARTIFACT_FILES = ("DELIVERY_STATUS.json", "prism-workbench-1440.png", "prism-workbench-768.png",
                  "prism-workbench-390.png", "default-report.json", "alternative-report.json", "verification.md")
EXCLUDED_DIRECTORIES = {"node_modules", ".venv", "__pycache__", ".pytest_cache", "build", ".claude", ".codex",
                        ".git", ".vercel", ".netlify", ".next", ".hosting-root", ".ssh", ".aws", ".azure", ".gcloud", ".vscode",
                        "private", "secrets", "credentials"}
EXCLUDED_SUFFIXES = {".pyc", ".log", ".jsonl", ".tsbuildinfo", ".pem", ".key", ".p12", ".pfx", ".jks", ".keystore"}
EXCLUDED_FILES = {".envrc", ".npmrc", ".pypirc", ".netrc", ".git-credentials", ".ds_store", "thumbs.db",
                  "id_rsa", "id_dsa", "id_ecdsa", "id_ed25519", "token.json", "tokens.json", "worker_brief.md"}


def source_name_allowed(relative: Path) -> bool:
    """Exclude machine state, private previews, and conventional secret files."""
    parts = tuple(part.casefold() for part in relative.parts)
    name = parts[-1]
    if any(part in EXCLUDED_DIRECTORIES or part.endswith(".egg-info") for part in parts):
        return False
    if parts[:2] == ("pitch", "renders") or parts[:3] == ("frontend", "tools", "out"):
        return False
    # The source ZIP already carries frontend/dist. The isolated Archie host
    # recreates these duplicate generated assets with scripts/sync-vite.mjs.
    if parts[:3] in {("deploy", "archie", "content"), ("deploy", "archie", "public")}:
        return False
    if name.startswith(".env") or name.endswith(".env") or name in EXCLUDED_FILES:
        return False
    if name.startswith(("credentials.", "secrets.", "client_secret", "service-account", "service_account", "serviceaccount", "private.", "private_", "private-")):
        return False
    return relative.suffix.casefold() not in EXCLUDED_SUFFIXES


def source_paths():
    """Inventory only; does not build, copy, or write any package artifacts."""
    paths = [ROOT / name for name in ROOT_FILES]
    paths.extend(ROOT / "artifacts" / name for name in ARTIFACT_FILES)
    paths.extend(path for name in SOURCE_ROOTS for path in (ROOT / name).rglob("*") if path.is_file())
    for path in sorted(set(paths)):
        if not path.is_file() or path.is_symlink():
            continue
        # Do not follow a junction or other indirect path outside this checkout.
        if not path.resolve().is_relative_to(ROOT):
            continue
        if source_name_allowed(path.relative_to(ROOT)):
            yield path


def main():
    frontend = ROOT / "frontend"
    built = frontend / "dist"
    if not (built / "index.html").is_file():
        raise SystemExit("Build the frontend first: npm run build --prefix frontend")
    package = ROOT / "backend" / "app"
    static = package / "static"
    # Replace only this generated tree, rather than retaining stale bundles.
    # Resolve before deleting so a junction cannot redirect cleanup elsewhere.
    resolved_static = static.resolve()
    if resolved_static.parent != package.resolve() or resolved_static.name != "static":
        raise SystemExit("Refusing to replace a generated static directory outside backend/app.")
    if static.exists():
        shutil.rmtree(static)
    shutil.copytree(built, static, dirs_exist_ok=True)
    fixtures = package / "fixtures"
    shutil.copytree(ROOT / "examples" / "kit_benchmark", fixtures / "kit_benchmark", dirs_exist_ok=True)
    shutil.copyfile(ROOT / "docs" / "reference-kit" / "backend" / "prism" / "catalog.json", fixtures / "kit_catalog.json")
    licenses = package / "licenses"
    licenses.mkdir(exist_ok=True)
    for source, name in [(ROOT / "LICENSE", "PRISM-MIT-LICENSE.txt"),
                         (ROOT / "docs" / "reference-kit" / "LICENSE", "PRISM-KIT-APACHE-LICENSE.txt"),
                         (ROOT / "NOTICE", "NOTICE.txt")]:
        shutil.copyfile(source, licenses / name)

    # Preserve complete license texts for actual production npm packages that
    # may be incorporated into the static bundle; developer tools stay upstream.
    lock = json.loads((frontend / "package-lock.json").read_text(encoding="utf-8"))
    notices = ["PRISM frontend runtime dependency licenses\n"]
    for relative, metadata in sorted(lock.get("packages", {}).items()):
        if not relative or metadata.get("dev"):
            continue
        directory = frontend / relative
        for filename in ("LICENSE", "LICENSE.md", "LICENSE.txt", "LICENCE", "license"):
            source = directory / filename
            if source.is_file():
                notices.append(f"\n{'=' * 72}\n{relative} {metadata.get('version', '')}\n{source.read_text(encoding='utf-8', errors='replace')}\n")
                break
        else:
            raise SystemExit(f"Runtime package needs its complete license text: {relative}")
    (licenses / "FRONTEND-RUNTIME-LICENSES.txt").write_text("".join(notices), encoding="utf-8")
    (static / "THIRD_PARTY_LICENSES.txt").write_text("".join(notices), encoding="utf-8")
    (frontend / "public" / "THIRD_PARTY_LICENSES.txt").write_text("".join(notices), encoding="utf-8")

    output = ROOT / "dist"
    output.mkdir(exist_ok=True)
    # setuptools otherwise retains deleted static chunks in build/lib, even
    # after app/static itself was refreshed from the current frontend build.
    build_cache = ROOT / "backend" / "build"
    resolved_cache = build_cache.resolve()
    if resolved_cache.parent != (ROOT / "backend").resolve() or resolved_cache.name != "build":
        raise SystemExit("Refusing to clear a generated build directory outside backend.")
    if build_cache.exists():
        shutil.rmtree(build_cache)
    subprocess.run([sys.executable, "-m", "pip", "wheel", "--no-deps", str(ROOT / "backend"), "--wheel-dir", str(output)], check=True)
    project = tomllib.loads((ROOT / "backend" / "pyproject.toml").read_text(encoding="utf-8"))["project"]
    wheel_name = project["name"].replace("-", "_")
    wheels = list(output.glob(f"{wheel_name}-{project['version']}-*.whl"))
    if len(wheels) != 1:
        raise SystemExit("Expected exactly one wheel matching the current project version.")
    archive = output / "PRISM-workbench.zip"
    with ZipFile(archive, "w", ZIP_DEFLATED) as destination:
        for path in source_paths():
            relative = path.relative_to(ROOT)
            destination.write(path, "PRISM/" + relative.as_posix())
        for wheel in wheels:
            destination.write(wheel, "PRISM/dist/" + wheel.name)
    print(f"Created {archive} ({archive.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
