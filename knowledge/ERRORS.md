# Errors

Record deterministic errors, root causes, and fixes here.

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
