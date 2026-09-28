# Errors

Record deterministic errors, root causes, and fixes here.

## 2026-09-28 patch context mismatch
- Error: A multi-file `apply_patch` did not apply because the Store description's privacy sentence was part of a longer paragraph, not a standalone line.
- Cause: Patch context assumed a line break that the source file did not contain.
- Fix: No files from the failed patch were changed; inspect and patch the exact paragraph as stored.
- Graduated to: future Store-copy patches must use the literal current paragraph as context.

## 2026-09-28 review findings (unfixed)
- Phone pin persistence: save catches localStorage errors without returning failure; pin then sends SAVED. Storage quota or write failure can silently lose a pin.
- Emulator W9: amber footer pixels also match PINNING or PIN FAILED; test does not establish a saved pin or incremented count.

- Current emulator run exited 1: W8 cyan, W8 list, W9 amber checks failed. Investigating screenshots; not treating prior captures as current.

- Session capture found an existing daily capture, then stalled reading inbox files during index refresh; interrupted. Ancillary index refresh remains incomplete.

- Map build: stale generated message-key header after package.json change; clean build required. GTextOverflowModeClip is not an SDK enum; use GTextOverflowModeTrailingEllipsis.

- Clean build invoked from repository root failed to find project info; rerun from watchface/.

- Map geometry tests caught 5–9 km closest-approach error from joining orbit samples 180 seconds apart. Replacing the long chord with a local tangent through the actual closest-approach point, preserving coverage at the observer.

- Emulator left running overnight failed install/capture commands; previous review driver did not check subprocess status. Interrupted capture and restoring clean emulator connection before retry. Process diagnostics must use process names, not full argument lists (SDK process arguments contain credentials).

- 2026-09-28 ancillary session capture exceeded 15 seconds; stopped. Project handoff is saved locally. No inference made about infrastructure cause.

## 2026-09-28 Pin persistence fix
Cause: save() swallowed localStorage failures; pin/clear still acknowledged success. Fix: save returns boolean; pin and clear return explicit storage-failure status. Regression checks cover failed pin, successful GeoJSON persistence and failed clear. Graduated to procedural/publish_release.md.

- Optional SVG renderer cairosvg is not installed in default Python; using available native/vector rendering tooling instead. No dependency installed.

- Release quality commands cannot run with system Python: ruff and mypy are absent. Checking project .venv before using isolated tooling.

- Project .venv is absent; using isolated uv tool runs for Ruff/Mypy. Quick Look SVG thumbnail placed artwork at half size; replacing with deterministic native vector rendering at required dimensions.

- Workspace-inherited Ruff rules reported 26 findings, including pre-existing scaffold checks. Fixing new-file findings and checking default CI rules separately.

- Release CI preflight found scaffold lint findings and a make_reference.py dictionary inference error. Fixing explicit subprocess checks, script executable bits, unused declarations and dictionary typing so repository checks can pass.

- Lint cleanup initially removed a required global declaration from health-check counter function as well as unused main declaration. Restoring the counter declaration; lint caught this before execution.

- Release package guard initially rejected the empty dev fixture because Webpack appends source-map footer comments. Guard updated to accept only an empty module export followed by comments.

- Store GET /api/dashboard/apps/{id} returned 401 with SDK bearer authentication, although publication and developer lookup succeeded. Public listing verified in browser; inspection script now checks the unauthenticated public page and optional published PBW instead of dashboard GET.

- GitHub CI: lint, typecheck, Python tests and JS tests passed; Project Health Audit failed. Inspecting remote audit output before declaring CI complete.

- CI health root cause: template audit required .env even when .env.example contains no variable definitions. Fix: require .env only when example keys exist; regression test uses a clean temporary root with no .env.

- Store verification follow-up had an extra import separator; Ruff caught it and auto-fix removed it.
- 2026-09-28: Constellation validation commands were first run with incorrect working-directory assumptions and the Node harness omitted a PebbleKit global stub; corrected by adding the stub and using project-relative paths, after which focused JS tests and a clean emery build passed.
- 2026-09-28: `python3 -m ruff check ...` could not run because the active system Python has no Ruff module; the chained Mypy check therefore did not execute. The JS and pytest suites passed before this tool failure. Locate the repository's managed lint tools or isolated uv tool and rerun both checks.
- 2026-09-28: `uvx mypy execution` reported missing request/Pebble/Pillow/dotenv/Skyfield type modules, not errors in the edited logic. Ruff and the application test suites pass. Check the project's configured checker/dependency environment and rerun Mypy there; otherwise record the missing-stub limitation.
- 2026-09-28: New release-copy regression test assumed the adjacent phrase `coordinates to Element 84` and missed the actual wording `and to Element 84`; adjust the assertion to check the supported claim without prescribing sentence order.
- 2026-09-28: A second quality gate used `python3 -m ruff` even though only the isolated `uvx ruff` entrypoint is available; run Ruff through `uvx`. Tests themselves passed (37 JS, 24 Python), while the chained later checks were skipped.
- 2026-09-28: Running `execution/release_store.py` under system Python failed because Pebble Tool's `pebble_tool` package exists only in its isolated uv environment. Use `/Users/danielbally/.local/share/uv/tools/pebble-tool/bin/python` for authenticated RePebble metadata checks.
- 2026-09-28: Overpass public-copy regression expected the phrase `to Element 84 Earth Search`; the accurate copy says `and Element 84 Earth Search`. Updating the assertion to match the user-visible disclosure without weakening the coordinate disclosure check.
- 2026-09-28: Overpass copy regression used stale privacy wording (`not sent in those requests`); the updated copy says saved pins are not included in requests. Aligning the assertion with the actual disclosure.
- 2026-09-28: Overpass public 0.3.2 PBW metadata resolves correctly, but exact byte comparison with the current local build failed. Inspect archive contents and published build provenance before attaching a GitHub release asset; do not claim byte identity until resolved.
- 2026-09-28: RePebble PBW archive assertion used an incorrectly formatted guessed UUID. Resolve the canonical UUID from `watchface/package.json` and compare public metadata directly before attaching the Store artifact.
- 2026-09-28: Public 0.3.2 and current local PBWs differed only in JavaScript comments and generated manifest timestamps; application code/resource bytes match. The GitHub release will attach the exact published RePebble PBW for byte identity.
- 2026-09-28: Workspace `session_capture.py` was started as required but remained blocked in its remote LLM capture call for over three minutes with no output; terminated the hung process. Session facts are recorded directly in this project's SESSION.md.
- 2026-09-28: Developer dashboard editor accepts and retains the corrected Overpass description, but the public app page still serves its older description on a cache-busted fetch; investigate the dashboard-to-store propagation path before calling public copy complete.
- 2026-09-28: Dashboard edits initially did not appear in the public listing; after propagation, browser verification confirmed the corrected Overpass text on the public app page.

- 2026-09-28: A bundled-file lookup targeted the nonexistent `watchface/appinfo.json`; the package version lives in `watchface/package.json`, and generated app metadata lives under `watchface/build/`.
