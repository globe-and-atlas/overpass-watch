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
