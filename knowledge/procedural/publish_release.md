---
generated_by: "OpenAI Codex (GPT-6)"
timestamp: "2026-09-28T06:36:21.546600-05:00"
---

# Publish Overpass 0.2.0

User explicitly authorized commit-all, GitHub push and public RePebble store publication.

Preflight: 19 JavaScript tests, 14 Python tests, Ruff and Mypy passed; production emery build passed. `python3 execution/publish_release.py --dry-run` verifies version and the actual PBW source-map dev module is empty. Fresh verifier approved pin persistence failure handling.

Commands:
- `python3 execution/publish_release.py --dry-run`
- `git push origin main`
- `python3 execution/publish_release.py`
- `/Users/danielbally/.local/share/uv/tools/pebble-tool/bin/python3 execution/release_store.py`

Listing assets are in store/. Public app visibility must be checked separately from upload success. Physical watch and phone export validation remain open.

Status: Ready to push and publish; no store app mapping existed during preflight.

## Publication verified — 2026-09-28
- Source commit: 32d5fb67ce8255c73f0f073600c86ebdf76cc829 pushed to GitHub main.
- GitHub release: https://github.com/globe-and-atlas/overpass-watch/releases/tag/v0.2.0 (production PBW attached).
- Public RePebble listing: https://apps.repebble.com/6e920a2fa6304e45b4644116
- Browser showed Overpass, version 0.2.0, three screenshots, Tools & Utilities, Time 2, and ADD TO MY APPS.
- Downloaded public PBW without credentials; bytes match local production package. SHA256: 721b051447c286b7751328b62e0ad5a747cafa5b8ed435715887604f33bcd2d4.
- First GitHub CI passed lint, typecheck, Python and Node tests; health failed because template required an unused .env. Corrected to require .env only when example keys exist; four regression cases pass.
- Final local verification: 19 JavaScript tests, 18 Python tests, Ruff and Mypy pass.
- Store publication does not establish physical-watch installation or hardware GPS/export behavior.

Closing audit: Delivered requested public release with an inspectable source commit and byte-verified public package.

## Publication verified — 0.3.0, 2026-09-28 (Claude Code CLI)
- Source commit 7b22465 on main; GitHub CI "Quality" passed; release https://github.com/globe-and-atlas/overpass-watch/releases/tag/v0.3.0 (production PBW).
- `python3 execution/publish_release.py` → RePebble release 0.3.0 (published 2026-09-28T14:05Z), release notes live, 3 screenshots replaced (`--replace-screenshots`): list screenshot byte-identical; map screenshots identical in content (store re-encodes the stippled swath).
- **Gotcha:** `pebble publish --description` only applies when creating an app. The listing description stays at the 0.2.0 text until updated in the dashboard (https://appstore-api.repebble.com/dashboard) from `store/description.txt`.
- Screenshots come from `execution/render_store.py` (public downtown-Houston fixture); review them before publishing — live data decides what the past pass shows.


## 0.3.3 label correction — 2026-09-28
- Changed list abbreviation for catalogue status from `NO SCENE` to `NO MATCH`; hero text and description explicitly say this is only a catalogue no-match.
- 37 Node tests, 24 Python tests, Ruff, production emery build, publisher dry run, and emulator Store render passed. Refreshed list screenshot was visually inspected.
- Commit `09fa920` is pushed to GitHub main. RePebble 0.3.3 PBW and GitHub release asset match local build at SHA-256 `0f4a0f50b94772f59528cd37bf13a8b173c2e0083d49057d49b6172e377e04e9`. Public listing shows 0.3.3.
- Historical 0.3.0 note was edited and persists in developer dashboard, but public changelog continues to show old text after reload/cache-busted navigation; do not claim that note fixed publicly.


## Publisher-account correction — 2026-09-28
The prior account-mismatch note is superseded: the linked dashboard session identified Daniel Bally and listed both Constellation and Satellite Overpass. The corrected current listing descriptions were saved and publicly verified. Historical changelog edits remain a separate public-propagation gap.
