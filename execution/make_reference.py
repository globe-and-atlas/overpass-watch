#!/usr/bin/env python3
"""Freeze TLEs and the validated Python predictions as test fixtures for the phone JS (contract W2-W5).

Uses ../overpass (passes_core.py, validated against real scenes) and its cached TLEs. Run with the
overpass venv, which has Skyfield:

  ../overpass/.venv/bin/python3 execution/make_reference.py [--dry-run]

Writes tests/fixtures/tles.json and tests/fixtures/reference_passes.json.
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OVERPASS = ROOT.parent / "overpass"
sys.path.insert(0, str(OVERPASS / "execution"))

START = datetime(2026, 9, 27, 0, 0, tzinfo=timezone.utc)
DAYS = 16
# Public reference points only; never the owner's home.
LOCATIONS = {"houston": (29.76, -95.37), "denver": (39.74, -104.99), "madrid": (40.42, -3.70)}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    from passes_core import SATELLITES, find_passes  # noqa: E402
    from skyfield.api import EarthSatellite, load  # noqa: E402

    tles = {}
    for norad in SATELLITES:
        lines = [ln.strip() for ln in (OVERPASS / ".tmp" / "tle" / f"{norad}.tle").read_text().splitlines() if ln.strip()]
        tles[str(norad)] = lines[1:3]
    ts = load.timescale()
    ref = {"start_utc": START.strftime("%Y-%m-%dT%H:%M:%SZ"), "days": DAYS, "locations": {}}
    for name, (lat, lon) in LOCATIONS.items():
        passes = []
        for norad, (platform, half) in SATELLITES.items():
            s = EarthSatellite(*tles[str(norad)], str(norad), ts)
            passes += [p.as_dict() for p in find_passes(s, ts, platform, half, lat, lon, START, START + timedelta(days=DAYS))]
        ref["locations"][name] = {"lat": lat, "lon": lon, "passes": sorted(passes, key=lambda p: p["time_utc"])}
        print(f"{name}: {len(passes)} passes")
    if a.dry_run:
        return 0
    (ROOT / "tests/fixtures/tles.json").write_text(json.dumps(tles, indent=2) + "\n")
    (ROOT / "tests/fixtures/reference_passes.json").write_text(json.dumps(ref, indent=2) + "\n")
    print("wrote tests/fixtures/tles.json, tests/fixtures/reference_passes.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
