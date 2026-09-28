#!/usr/bin/env python3
"""Emulator check for the Overpass watch app (emery). Contract W8 (passes listed) and W9 (SELECT pin).

Boots a clean emulator, installs with watchface/src/pkjs/dev.json pointing at a public fixture
location (restored to {} afterwards), waits for the phone JS to fetch TLEs/clouds and predict, then
screenshots, scrolls, pins, and screenshots again. Needs network (CelesTrak, Open-Meteo).
Screenshots in .tmp/emulator/.

  python3 execution/emulator_check.py [--dry-run]
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
WATCH = ROOT / "watchface"
DEV = WATCH / "src" / "pkjs" / "dev.json"
OUT = ROOT / ".tmp" / "emulator"
FIXTURE = {"lat": 29.76, "lon": -95.37}  # downtown Houston: public, not anyone's home
CYAN = (0, 255, 255)


def run(args: list[str], timeout: int = 240) -> subprocess.CompletedProcess:
    return subprocess.run(args, cwd=WATCH, capture_output=True, text=True, timeout=timeout)


def shot(name: str) -> Image.Image:
    path = OUT / f"{name}.png"
    run(["pebble", "screenshot", "--emulator", "emery", "--no-open", "--no-correction", str(path)])
    return Image.open(path).convert("RGB")


def count(img: Image.Image, color, box) -> int:
    px = img.load()
    return sum(1 for y in range(box[1], box[3]) for x in range(box[0], box[2]) if px[x, y] == color)


def boot() -> None:
    """Clean start: stale QEMU state shows the wrong app (see workspace _PEBBLE skill)."""
    run(["pebble", "kill"])
    for proc in ("pypkjs", "qemu-pebble"):
        subprocess.run(["pkill", "-f", proc], capture_output=True)
    time.sleep(3)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    if a.dry_run:
        print(f"would build with dev.json={FIXTURE}, boot emery, install twice, screenshot, pin; out {OUT}")
        return 0
    OUT.mkdir(parents=True, exist_ok=True)
    results = {}
    try:
        DEV.write_text(json.dumps(FIXTURE) + "\n")
        if run(["pebble", "build"]).returncode != 0:
            print("build failed", file=sys.stderr)
            return 1
        boot()
        # The first installs after a boot often leave another app on screen: retry until the amber
        # OVERPASS header is actually drawn.
        for attempt in range(4):
            run(["pebble", "install", "--emulator", "emery", "build/watchface.pbw"])
            time.sleep(20)
            if count(shot(f"0_launch_{attempt}"), (255, 170, 0), (0, 0, 80, 16)) > 20:
                break
        else:
            print("Overpass never came to the foreground", file=sys.stderr)
            return 1
        time.sleep(20)  # TLEs + prediction + cloud forecast
        img = shot("1_list")
        results["W8 passes listed (cyan countdown/flags present)"] = count(img, CYAN, (0, 40, 200, 132)) > 20
        results["W8 list rows drawn"] = count(img, (255, 255, 255), (0, 136, 200, 206)) > 50

        run(["pebble", "emu-button", "--emulator", "emery", "click", "down"])
        time.sleep(1)
        shot("2_scrolled")

        run(["pebble", "emu-button", "--emulator", "emery", "click", "select"])
        time.sleep(4)  # the amber status clears after STATUS_MS (8 s) on the watch
        img = shot("3_pinned")
        results["W9 footer shows pin status (amber footer)"] = count(img, (255, 170, 0), (0, 208, 200, 226)) > 20
    finally:
        DEV.write_text("{}\n")
        run(["pebble", "build"])  # leave a production build behind
    for k, v in results.items():
        print(f"{'PASS' if v else 'FAIL'}  {k}")
    print(f"screenshots: {OUT}")
    return 0 if all(results.values()) else 1


if __name__ == "__main__":
    sys.exit(main())
