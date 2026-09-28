"""Contract W6, W7, W10, W11: watch-side parsing and countdown (host C), shipping hygiene."""
from __future__ import annotations

import json
import re
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "watchface" / "src"
HARNESS = ROOT / ".tmp" / "passes_harness"


@pytest.fixture(scope="module")
def harness():
    if shutil.which("cc") is None:
        pytest.skip("needs a C compiler")
    HARNESS.parent.mkdir(exist_ok=True)
    subprocess.run(["cc", "-std=c99", "-Wall", "-Wextra", "-Werror", f"-I{SRC / 'c'}", "-o", str(HARNESS),
                    str(ROOT / "tests/host/passes_harness.c"), str(SRC / "c/passes.c")], check=True)
    return HARNESS


def run(h, *args):
    return subprocess.run([str(h), *args], capture_output=True, text=True, check=True).stdout.split("\n")[:-1]


@pytest.mark.skipif(shutil.which("node") is None, reason="needs node")
def test_w6_js_pack_parses_in_c(harness):
    script = ("const p=require('./src/pkjs/passes');"
              "const list=[{timeMs:1790000000000,code:1,distanceKm:43.1,confidence:'certain',partialPlan:false},"
              "{timeMs:1790500000000,code:2,distanceKm:101.7,confidence:'edge',partialPlan:true}];"
              "const clouds={}; clouds[p.hourKey(1790000000000)]=69;"
              "console.log(Buffer.from(p.packPasses(list,clouds,40)).toString('hex'))")
    hexdata = subprocess.run(["node", "-e", script], cwd=ROOT / "watchface", capture_output=True, text=True,
                             check=True).stdout.strip()
    assert run(harness, "parse", hexdata) == ["1790000000 1 0 431 69 L9", "1790500000 2 3 1017 -1 S2A"]


@pytest.mark.skipif(shutil.which("node") is None, reason="needs node")
def test_h10_timeline_flags_parse_in_c(harness):
    """Timeline flags distinguish scenes, catalogue no-matches, weak forecasts, and unknown distance."""
    now = 1790000000000
    script = (
        "const h=require('./src/pkjs/history');const now=" + str(now) + ", D=86400000;"
        "const tl=[{code:4,timeMs:now-4*D,distanceKm:101.9,confidence:'certain',partialPlan:false,state:'scene',cloud:3.2},"
        "{code:2,timeMs:now-5*D,distanceKm:102.2,confidence:'edge',partialPlan:true,state:'no_match',cloud:null},"
        "{code:0,timeMs:now-6*D,distanceKm:null,confidence:'certain',partialPlan:false,state:'scene',cloud:12},"
        "{code:1,timeMs:now+6*D,distanceKm:43.1,confidence:'certain',partialPlan:false,state:'future',cloud:null}];"
        "console.log(Buffer.from(h.packTimeline(tl,{},now)).toString('hex'))")
    hexdata = subprocess.run(["node", "-e", script], cwd=ROOT / "watchface", capture_output=True, text=True,
                             check=True).stdout.strip()
    s = now // 1000
    assert run(harness, "parse", hexdata) == [
        f"{s - 4 * 86400} 4 4 1019 3 S2C",          # SCENE, scene cloud 3 %
        f"{s - 5 * 86400} 2 19 1022 -1 S2A",        # EDGE|PARTIAL|NO_MATCH, no cloud
        f"{s - 6 * 86400} 0 4 65535 12 L8",         # SCENE with no predicted pass
        f"{s + 6 * 86400} 1 32 431 -1 L9",          # WEAK future, no forecast in fixture
    ]


@pytest.mark.parametrize("seconds,expected", [
    (0, "NOW"), (120, "NOW"), (-120, "NOW"), (121, "00:03"), (3600, "01:00"),
    (86399, "24:00"), (86400, "1d 00h"), (2 * 86400 + 4 * 3600 + 59, "2d 04h"),
    # H9: past times
    (-121, "2M AGO"), (-3599, "59M AGO"), (-3600, "1H AGO"), (-86399, "23H AGO"), (-4 * 86400 - 5, "4d AGO"),
])
def test_w7_h9_countdown(harness, seconds, expected):
    assert run(harness, "countdown", str(seconds)) == [expected]


def test_w10_dev_json_ships_empty():
    assert json.loads((SRC / "pkjs" / "dev.json").read_text()) == {}


def test_w10_no_home_coordinates():
    """Patterns (one regex per line) live in a gitignored local file so the test never publishes
    the very coordinates it protects. Skips where that file doesn't exist (e.g. a fresh clone)."""
    private = ROOT / "tests" / "private_patterns.txt"
    if not private.exists():
        pytest.skip("no tests/private_patterns.txt (local only)")
    patterns = [ln.strip() for ln in private.read_text().splitlines() if ln.strip()]
    files = list(ROOT.glob("watchface/src/**/*")) + list(ROOT.glob("execution/*.py")) + list(ROOT.glob("tests/**/*.json"))
    for path in files:
        if path.is_file():
            text = path.read_text(errors="ignore")
            for pat in patterns:
                assert not re.search(pat, text), path


def test_w11_cloudpebble_layout():
    assert all(p.suffix in (".c", ".h") for p in (SRC / "c").iterdir())
    assert all(p.suffix in (".js", ".json") for p in (SRC / "pkjs").iterdir())
