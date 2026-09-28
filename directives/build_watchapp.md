---
generated_by: "Claude Code CLI (claude-opus-5-5)"
timestamp: "2026-09-27T22:20:00-05:00"
---

# Directive: build_watchapp

## Goal

"Overpass", a Pebble Time 2 (emery) watch app for field remote sensing: when do Landsat 8/9 and
Sentinel-2A/B/C next image where I'm standing, how cloudy will it be, and one button to drop a
timestamped ground-truth pin tagged with the nearest pass. The prediction method is the one
validated in `../overpass` (hindcast vs real STAC scenes at 4 locations, 2026-09-27).

## Architecture

| Where | What |
|---|---|
| Phone `src/pkjs/passes.js` | SGP4 (vendored satellite.js 4.1.4, MIT), closest approach within half swath in daylight, TLE-age margin → certain/edge, S2A partial-plan flag. Pure; node-tested. |
| Phone `src/pkjs/index.js` | location, CelesTrak TLEs (cached 6 h), Open-Meteo cloud, pack → watch; pins → localStorage GeoJSON; export page |
| Watch `src/c/` | pass list, countdown, UP/DOWN select, SELECT pin, long SELECT refresh |

Pass record (10 bytes, little-endian): u32 time (unix UTC), u8 platform (0 L8, 1 L9, 2 S2A, 3 S2B,
4 S2C), u8 flags (bit0 edge, bit1 partial plan), u16 off-track km×10, i8 cloud % (-1 unknown), u8 0.

## Validation Contract

| # | Assertion | Check |
|---|---|---|
| W1 | `pebble build` for emery exits 0 | build |
| W2 | JS passes equal the Python reference on the same TLEs: same platform + date set at 3 locations | node test vs fixture |
| W3 | JS pass times within 5 s of the Python reference | node test |
| W4 | JS off-track distance within 2 km of the Python reference | node test |
| W5 | JS confidence (certain/edge) equals the Python reference | node test |
| W6 | A packed pass record parses back to the same fields in C | host C test |
| W7 | Countdown text: "NOW" within ±2 min, "HH:MM" under 24 h, "Nd HHh" beyond, "PASSED" after | host C test |
| W8 | Emulator: the list shows passes for a fixture location | emulator screenshot |
| W9 | Emulator: SELECT stores a pin and the footer shows the pin count | emulator screenshot |
| W10 | `dev.json` ships as `{}`; no home coordinates committed | test |
| W11 | CloudPebble layout: only .c/.h in src/c, .js/.json in src/pkjs | test |

Edge cases: no location (show "NO FIX"), network down (keep last passes, show data age), no passes
in 16 days (show "NO PASS 16 D"), GPS unavailable for a pin ("PIN FAILED: NO GPS").

## Learnings

## 2026-09-27 Map extension
Default view: north-up regional map, observer centered, selected orbit ground track, nominal swath. Preserve short UP/DOWN selection, SELECT pin, hold SELECT refresh. Hold DOWN toggles map/list. Geometry is generated on the phone from the same TLEs and location used for prediction; bounded payload includes geographic land outlines. Offline map must correspond to cached predictions. See task.md Map feature contract for binary assertions.
Execution: execution/build_map_data.py, execution/render_review.py; node map tests and pytest. Renders in .tmp/emulator/. No secrets read or committed; no publication requested.

## 2026-09-28 Publication
User explicitly requested commit, GitHub push and RePebble app store publication. This supersedes the earlier pending demand-test release gate. Publish truthful regional-map/nominal-swath description and note hardware validation remains open. Acceptance conditions are in task.md Publish 0.2.0. Fix known false pin-save acknowledgement before publication.

Publication scripts: execution/publish_release.py (PBW guard and SDK publish), execution/release_store.py (read-only metadata), execution/create_store_assets.swift (native vector icon), execution/render_map.py (screenshots).

## 2026-09-28 0.3.0 — past + future timeline (Claude Code CLI)

One timeline centred on now: UP scrolls into the last 30 days of acquisitions, DOWN into the next
16 days of predictions; default selection stays the next future pass. Past = passes predicted with
the same model, each matched to real scenes from Earth Search STAC (`landsat-c2-l2`,
`sentinel-2-l2a`, same catalogue the model was validated against). Scenes with no predicted pass
are listed too. Distant cloud forecasts are marked low-skill.

Record flags (byte 5): bit0 edge, bit1 partial plan, **bit2 SCENE** (real scene exists; cloud =
scene `eo:cloud_cover`, whole scene), **bit3 PENDING** (no scene yet, still inside the product lag:
Landsat L2 16 d, Sentinel-2 L2A 2 d), **bit4 MISSED** (no scene, lag elapsed), **bit5 WEAK** (future
pass > 5 days out: forecast has little skill). PASS_MAX 40 → 64.

| # | Assertion | Check |
|---|---|---|
| H1 | A past predicted pass with a same-platform same-UTC-date scene is SCENE with that scene's cloud | node |
| H2 | Several scenes (tiles) on one platform-date collapse to one entry with the lowest cloud | node |
| H3 | A past pass with no scene inside the platform lag is PENDING, never MISSED | node |
| H4 | A past pass with no scene after the lag is MISSED | node |
| H5 | A scene with no predicted pass still appears as a SCENE entry | node |
| H6 | Future passes more than 5 days out carry WEAK; nearer ones don't | node |
| H7 | Past entries never carry a forecast cloud value | node |
| H8 | With more than 64 entries, the oldest past entries are dropped, never future ones | node |
| H9 | Countdown for past times reads "NM AGO" / "NH AGO" / "Nd AGO" | host C |
| H10 | Flags bits 2–5 round-trip JS pack → C parse | host C + node |
| H11 | Default selection is the next future pass, not a past one | code review + emulator |
| H12 | Emulator: list shows past entries above a NOW divider and future below | emulator screenshot |
| H13 | Catalogue failure keeps the future half working (past half empty, status says so) | node |

## 2026-09-28 accuracy/privacy correction — 0.3.2

The historical status `NO_MATCH` means no matching item appeared in the queried Element 84 Earth Search result after the expected product-lag interval. It does not establish that the satellite did not acquire imagery. The UI and Store copy must retain this distinction.

Location use: refresh sends current coordinates to Open-Meteo for cloud forecasts and Element 84 Earth Search for scene history. GeoJSON pin records remain phone-side and are excluded from those requests; the user explicitly opens the settings export page to view/copy them.

The in-swath/edge status is a TLE-age/swath-margin heuristic, not a probability. The 60-day, four-location hindcast is a limited sample and must not be presented as global or future-performance validation.


## 2026-09-28 catalogue label correction — 0.3.3

The list abbreviation for `PASS_NO_MATCH` must be `NO MATCH`; do not use `NO SCENE`, which can be read as proof that no acquisition occurred. Keep the fuller hero message `NO SCENE MATCH FOUND` and public copy explaining that a catalogue no-match is not proof of no acquisition. Verify the rendered list in the emulator before publication.
