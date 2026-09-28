---
generated_by: "OpenAI Codex (GPT-6)"
timestamp: "2026-09-28T06:20:48.329736-05:00"
---

# Regional map implementation

## Behavior
Default north-up regional map centered on prediction location. Bundled Natural Earth 1:110m land polygons. White orbital tangent through selected closest approach. Stippled nominal swath (185 km Landsat / 290 km Sentinel-2). Amber observer marker. UP/DOWN selects pass; hold DOWN toggles list; SELECT retains pin action; hold SELECT refreshes. Explicit unavailable geometry above 80 degrees latitude. Map is an overview, not a guaranteed acquisition footprint or live GPS navigation.

## Validation
- `node --test test/*.test.js` from watchface: 16 passed.
- `python3 -m pytest tests -q`: 14 passed with production dev.json.
- `pebble build` from watchface: passed; app footprint about 11.3 KB RAM.
- `python3 execution/render_map.py`: passed, captures map, selected passes, list toggle, return and pin confirmation.
- Offline restart using emulator-only dev.offline fixture: map crop pixel-identical to original capture.
- Production dev.json restored to {}; production PBW rebuilt. Emulator is left with the offline test fixture; production PBW does not contain that fixture.
- Fresh independent verifier approved final source and renders.
- No physical-device validation; no push or publication.

## Artifacts
.tmp/emulator/map_1_sentinel2b.png
.tmp/emulator/map_2_sentinel2a.png
.tmp/emulator/map_3_landsat.png
.tmp/emulator/map_4_list.png
.tmp/emulator/map_5_return.png
.tmp/emulator/map_6_pin.png
.tmp/emulator/map_7_cached.png
watchface/build/watchface.pbw

## Lessons
The 180-second orbit chord displaced closest approach by 5-9 km; the map test caught this. The regional tangent through the actual closest point agrees within 3 km for the reference Houston, Denver, Madrid passes. Map metadata commits after chunks and is tied to the same prediction generation/count. Exact offline pixel comparison validates cache restoration independently of phone responses.

## Closing audit
The requested map is implemented and visible in actual emulator output. Pin-storage acknowledgement defect from the earlier review remains unfixed; physical GPS/export validation remains pending.
