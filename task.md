# Task: overpass-watch

## Objective

Overpass watch app: next Landsat/Sentinel-2 passes with cloud and confidence, one-button ground-truth pins.

## Acceptance Criteria

- [x] W1–W11 (directives/build_watchapp.md): build, JS = Python reference, C parse/countdown, emulator list + pin, hygiene
- [ ] Creator-verifier pass
- [ ] Physical watch: pin with real GPS
- [ ] Physical phone: settings-page export opens and the GeoJSON copies
- [ ] Demand test (see ../overpass/task.md) before appstore

## Review and renders — 2026-09-27
- [x] Review findings cite source lines.
- [x] Current emulator pass-list screenshot is inspected.
- [x] Current emulator selected-pass screenshot is inspected.
- [x] Current emulator pin-result screenshot is inspected.
- [x] Python suite result is recorded.
- [x] JavaScript suite result is recorded.
- [x] Production dev.json remains empty.

## Map feature contract
- [x] Default screen displays a geographic map centered on the prediction location.
- [x] Selected pass displays an orbit-derived ground track.
- [x] Selected pass displays its nominal imaging swath.
- [x] Observer marker is distinguishable from the track.
- [x] UP/DOWN changes the selected pass.
- [x] Holding DOWN toggles the list.
- [x] SELECT retains pin behavior.
- [x] Cached map corresponds to cached passes after restart.
- [x] Map geometry tests pass.
- [x] Existing Python tests pass.
- [x] Existing JavaScript tests pass.
- [x] Production build passes.
- [x] Fresh emulator map renders are inspected.
- [x] Production dev.json is empty after captures.
- [x] Fresh verifier approves the map feature.

## Publish 0.2.0
- [x] Pin-save failure returns a failure status.
- [x] Release tests pass.
- [x] Production PBW version matches listing version.
- [x] GitHub main contains committed source changes.
- [x] RePebble store contains the release.
- [x] Public app listing is verified.

## Publish 0.3.0 — past + future timeline
- [x] H1–H8, H10, H13 node tests pass (37 total).
- [x] H9, H10 host C tests pass (pytest 23).
- [x] H11, H12 emulator checks pass (execution/render_store.py).
- [x] Offline restart restores the cached map with 0.3 data (execution/render_map.py).
- [x] Fresh verifier: APPROVE WITH NITS; fixed low-cloud wording, offline passed/stale-pending states, ±30 min scene matching, version, pin state, scene flag doubt.
- [x] Ruff, mypy, health: no failures.
- [ ] Physical watch: past list with live catalogue over real GPS.

## Accuracy and privacy correction — 0.3.2

### Contract
- Target directive: `directives/build_watchapp.md`.
- Intended execution scripts: `execution/render_map.py`, `execution/render_store.py`, `execution/publish_release.py`, `execution/release_store.py`.
- Expected artifacts: corrected app source and copy, production PBW, inspected emulator renders, GitHub commit/release, updated RePebble listing.
- Safety: preserve existing user changes; do not read or commit secrets, `.env`, or `.tmp/` artifacts.
- Publication: user explicitly authorized updating GitHub and RePebble editions.

### Validation Contract
- Store and README copy disclose that current coordinates are sent to Open-Meteo and Earth Search during refresh.
- Historical no-match status says no scene was found in the queried catalogue and does not assert non-acquisition.
- Pass confidence copy describes the swath-margin heuristic without implying a probability or guarantee.
- README install version and production PBW version both equal the package version.
- Production `dev.json` is empty.
- JavaScript prediction and history tests pass.
- Python and host-C tests pass.
- Pebble emery production build succeeds.
- Emulator renders for map, selected pass, past history, list, and pin confirmation are inspected.
- Fresh verifier approves the final source, copy, and renders.
- GitHub commit and release point to the verified production PBW.
- RePebble public PBW bytes match the verified production PBW.

### Checklist
- [x] Correct user-visible labels and privacy copy in source, README, and local Store description.
- [x] Align directive and README with observed behavior.
- [x] Run tests, build, and render review.
- [x] Run independent source/render verification.
- [x] Commit corrected source and update GitHub release `v0.3.2`.
- [x] Verify RePebble serves version `0.3.2` and preserve its exact PBW in the GitHub release.
- [x] Save corrected privacy/history/confidence copy in the linked developer dashboard.
- [x] Confirm the public RePebble page serves the corrected description and 0.3.2 package.


## Historical catalogue-status label correction — 0.3.3

### Validation Contract
- [x] A past pass with `PASS_NO_MATCH` renders `NO MATCH` in the list, not `NO SCENE`.
- [x] The same state retains explanatory hero text that says no matching scene was found.
- [x] The production build succeeds with an empty `dev.json` fixture.
- [x] The refreshed Store list render visibly uses `NO MATCH`.
- [x] The GitHub release and RePebble listing serve version 0.3.3.
- [ ] The public RePebble changelog reflects the corrected historical 0.3.0 note.

### Checklist
- [x] Update the abbreviated watch list label and release notes.
- [x] Rebuild and inspect the list render.
- [x] Publish the verified 0.3.3 package to GitHub and RePebble.
