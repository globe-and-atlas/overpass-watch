# Overpass

A Pebble Time 2 (emery) watch app for field remote sensing, by Globe & Atlas. When do **Landsat 8/9**
and **Sentinel-2A/B/C** next image where you're standing, how cloudy will it be, and one button to
drop a timestamped **ground-truth pin** tagged with the nearest pass.

| Button | Action |
|---|---|
| UP / DOWN | select a pass |
| hold DOWN | switch between the map and the pass list |
| SELECT | drop a ground-truth pin (location and time saved on the phone, tagged with the nearest pass) |
| hold SELECT | refresh predictions |

Each pass shows its countdown (`NOW`, `HH:MM`, `2d 04h`), local time, distance off the ground track,
the cloud forecast for that hour, and a coverage indicator:

- **IN SWATH**: modelled cross-track distance falls within the nominal swath and its TLE-age buffer; this is a heuristic, not a probability or a guarantee of acquisition.
- **EDGE**: near the swath edge (the margin grows 0.5 km per day of orbital-element age); may miss you.
- **MAY NOT ACQUIRE**: Sentinel-2A runs a partial acquisition plan, so a pass isn't a guaranteed scene.

**Pins** are stored in the phone app's local storage and exported from its settings page as a GeoJSON
FeatureCollection to copy, with a clear-all button. Refresh uses the current location in requests to
Open-Meteo and Element 84 Earth Search for local forecasts and scene history. Pin records are not
included in those requests; they appear as GeoJSON only when you open the export page.

## Install

- [Install from the RePebble App Store](https://apps.repebble.com/6e920a2fa6304e45b4644116)
- [Download the 0.3.3 PBW](https://github.com/globe-and-atlas/overpass-watch/releases/tag/v0.3.3)
- [Open in CloudPebble](https://cloudpebble.repebble.com/ide/import/github/globe-and-atlas/overpass-watch/main) (the branch is in the link because CloudPebble's import defaults to `master`)
- Or build locally: `cd watchface && pebble build && pebble install --cloudpebble build/watchface.pbw`

## Past and future (0.3.3)

UP scrolls back through the last 30 days, DOWN forward through the next 16; the default selection is
the next pass. Past passes come from the same prediction model, matched (same satellite, within
±30 minutes) to real scenes in Element 84 Earth Search (Landsat Collection 2 L2, Sentinel-2 L2A):

- **SEEN**: a scene exists. Cloud is the scene's `eo:cloud_cover` for the whole scene, not the
  cloud over you; "low cloud" means ≤ 10 %.
- **PROCESSING**: no scene yet, still inside the product lag (Landsat 16 days, Sentinel-2 2 days).
- **NO SCENE MATCH FOUND**: no matching result appeared in Earth Search after the expected product lag. This is a catalogue no-match, not proof that no acquisition occurred.
- Scenes that match no predicted pass are listed too. Future cloud forecasts beyond 5 days show `~`.
- Offline, a pass whose time has gone by reads **PASSED - NOT CHECKED** until the next refresh.

## How it works

The phone predicts; the watch shows and pins.

- `src/pkjs/passes.js` ports the pass model from [`../overpass`](../overpass). A 60-day hindcast at
  Houston, Denver, Nairobi, and Madrid found 100% recall and 100% precision among the model's
  core-swath subset, with matched-scene timing 8–52 seconds from prediction. These are results from
  one 60-day, four-site sample, not a general accuracy guarantee. The internal `certain` tag means
  only that a modeled ground-track distance is inside the nominal swath by the age buffer; it is not
  a probability, and the imagery catalogue may omit acquisitions. Orbits use vendored
  [satellite.js](https://github.com/shashwatak/satellite-js) 4.1.4 (MIT) with CelesTrak TLEs, cached 6 h.
- The JS output is tested against the Python reference on frozen TLEs (same passes, ±5 s, ±2 km, same
  confidence). A 16-day prediction takes ~160 ms in node.
- Cloud cover: Open-Meteo hourly forecast (16 days). The watch keeps the last predictions in
  persistent storage, so the list shows without the phone.

## Build and test

```sh
cd watchface && pebble build                       # → build/watchface.pbw
(cd watchface && node --test test/*.test.js)       # JS vs Python reference, packing
python3 -m pytest tests -q                         # C parsing/countdown, shipping hygiene
python3 execution/emulator_check.py                # emulator: list + pin (needs network)
../overpass/.venv/bin/python3 execution/make_reference.py   # refresh the Python reference fixture
```

`watchface/src/pkjs/dev.json` is an emulator-only location fixture and must ship as `{}`.

## Not yet verified

- On a physical watch and phone (GPS pins, and the settings-page export through a `data:` URL).
- Demand: the one-week test in `task.md` decides whether this goes further.

Data: CelesTrak (TLEs), Open-Meteo (cloud cover, CC BY 4.0). Prediction validated with Element 84
Earth Search.

## Regional map

The default screen is a north-up 800 × 500 km overview centered on the location used for the
predictions. The amber **YOU** dot marks that prediction location, the white line is the selected
satellite's local ground-track tangent at closest approach, and the stippled corridor shows its
nominal imaging swath. Cyan edges mean in-swath; amber edges flag an edge or partial acquisition
plan. Land is green and water is blue. The map has a 100 km scale bar.

The regional equirectangular projection is an overview, not an exact scene footprint. Above 80°
north/south, the map reports unavailable; the pass list remains usable. Land outlines come from
[Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/) (1:110m, public domain), bundled
on the phone with no map-service request. Refresh updates the map center; this is not live navigation.
The watch caches the map with its corresponding predictions for use without the phone.

Rebuild bundled land data: `python3 execution/build_map_data.py`.
Map tests: `cd watchface && node --test test/map.test.js`.
Emulator capture: `python3 execution/render_map.py` (public Houston fixture; restores production build).

---

# overpass-watch

Scaffolded from `project-template` using the `workflow-python` profile.

## Project Profile

- `profile`: `workflow-python`
- `deploy`: `local-only`
- `runtime`: `python`
- `loop_mode`: `data`
- `knowledge_level`: `heavy`

## Workshop Standard

This project follows the 3-layer architecture:

```text
directives/     Layer 1 — What to do
agent           Layer 2 — Decide → Delegate → Verify
execution/      Layer 3 — Deterministic execution (when this profile uses it)
```

## Next Steps

1. Fill in the actual project description here.
2. Update `task.md` with the first real milestone.
3. Populate `knowledge/context.md`.
4. Draft the first workflow directive in `directives/`.
