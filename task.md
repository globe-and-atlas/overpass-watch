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
- [ ] GitHub main contains committed source changes.
- [ ] RePebble store contains the release.
- [ ] Public app listing is verified.
