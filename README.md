# Overpass

A Pebble Time 2 (emery) watch app for field remote sensing, by Globe & Atlas. When do **Landsat 8/9**
and **Sentinel-2A/B/C** next image where you're standing, how cloudy will it be, and one button to
drop a timestamped **ground-truth pin** tagged with the nearest pass.

| Button | Action |
|---|---|
| UP / DOWN | select a pass |
| SELECT | drop a ground-truth pin (location and time saved on the phone, tagged with the nearest pass) |
| hold SELECT | refresh predictions |

Each pass shows its countdown (`NOW`, `HH:MM`, `2d 04h`), local time, distance off the ground track,
the cloud forecast for that hour, and a confidence flag:

- **CERTAIN**: inside the swath with margin to spare.
- **EDGE**: near the swath edge (the margin grows 0.5 km per day of orbital-element age); may miss you.
- **MAY NOT ACQUIRE**: Sentinel-2A runs a partial acquisition plan, so a pass isn't a guaranteed scene.

**Pins** are exported from the app's settings page in the Pebble phone app, as a GeoJSON
FeatureCollection to copy (with a clear-all button). Pins never leave the phone otherwise.

## How it works

The phone predicts; the watch shows and pins.

- `src/pkjs/passes.js` ports the pass model from [`../overpass`](../overpass), which was validated
  against real Landsat/Sentinel-2 scenes (Earth Search STAC, 60 days, Houston/Denver/Nairobi/Madrid:
  recall 100 %, certain-precision 100 %, timing 8-52 s). Orbits use vendored
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
