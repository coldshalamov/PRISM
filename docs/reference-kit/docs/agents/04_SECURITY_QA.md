# Security, QA and packaging agent assignment

Own transport/session/export implementation, packaging, and integration tests. The app is a **local research prototype**. Do not make it remotely reachable merely to simplify testing.

## Highest-priority checks

1. Run the real localhost browser smoke suite on a permitted machine. The delivery's offline TestClient bridge checked rendering/interactions but not actual browser HTTP/CSP/origin behavior.
2. Inspect every source-to-output path. Raw records, names, known-target attributes, seeds, pseudonym keys, lineage and exact owner statistics must not enter protected export, remote logs, telemetry, public fixtures or crash reporting.
3. Confirm Host/origin/session checks, mutation header behavior, body limits with and without Content-Length, malformed CSV/JSON handling, resource exhaustion and session eviction. Do not print rejected payloads in diagnostics.
4. Fuzz quoted CSVs, duplicate headers, long cells, Unicode, whitespace/control formula prefixes, ZIP leading zeroes, numeric/date parsing and missing values. Test malicious strings displayed through every frontend error/tooltip/chart path.
5. Validate stale snapshot/export behavior; close-session and expiry UX; separate confidential audit downloads. Test actual exported bytes and header neutralization. Add an explicit byte digest if release artifact integrity is claimed.
6. Audit dependency versions and licenses. Build a wheel/static asset package and test outside the editable source tree. Do not bundle environment caches, packages, models, fonts or real data accidentally.

## Privacy-specific threat boundaries

The local process is not protected from a compromised machine, browser extension or other privileged user. RAM clearing is not secure erasure. OS swap and exported files have independent retention. Origin controls are not enterprise identity management. No institutional reviewer has approved patient-data use.

The privacy engine itself can be an exfiltration tool if its exact reports are released to untrusted recipients. Never expose an owner endpoint as a recipient query service. Debug reports and status/latency/error signals are outputs that may need protection in a future aggregate service.

## Test deliverables

Run backend tests, example reproduction, live browser workflows and accessibility checks. Capture fictional-only screenshots at 390/768/1440 widths. Record actual results, package versions, blocked tests and remaining gaps in `artifacts/DELIVERY_STATUS.json`. Add regression tests for fixed vulnerabilities; do not mark the whole project “security audited” because tests pass.

## Packaging and release checklist

- One working start path for Windows and Unix-like environments.
- Optional packages do not break the base install.
- Static frontend builds/ships correctly.
- No network traffic after dependency installation, except explicit user navigation to a source.
- No source dataset bundled except clearly fictional fixtures.
- ZIP entries exclude venv/caches/logs/secrets and have stable relative paths.
- README, OpenAPI, examples and tested feature status match the actual build.
- Final pitch uses measured scope and no compliance/zero-leak claim.
