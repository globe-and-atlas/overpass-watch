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
