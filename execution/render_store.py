"""Capture 0.3 appstore screenshots from the real app in the emery emulator and check H11/H12.

Uses the public downtown-Houston fixture (never the owner's home), live TLEs, catalogue and cloud.
  store/emery_map.png   default view: map for the next future pass (H11)
  store/emery_past.png  map for a past pass (seen scene / processing / not acquired)
  store/emery_list.png  list view: past rows above the amber NOW rule, future below (H12)
Restores dev.json to {} and leaves a production build.

  python3 execution/render_store.py [--dry-run]
"""
import argparse
import json
import shutil
import sys
import time

import emulator_check as em

AMBER = (255, 170, 0)
CYAN = (0, 255, 255)
LAND = (0, 85, 0)


def checked(args, timeout=120):
    result = em.run(args, timeout)
    if result.returncode:
        raise RuntimeError(f'{args[0:3]} failed: {result.stdout} {result.stderr}')
    return result


def screenshot(name):
    path = em.OUT / f'{name}.png'
    checked(['pebble', 'screenshot', '--emulator', 'emery', '--no-open', '--no-correction', str(path)])
    from PIL import Image
    return Image.open(path).convert('RGB')


def button(name, duration=100):
    checked(['pebble', 'emu-button', '--emulator', 'emery', '--duration', str(duration), 'click', name])
    time.sleep(1.5)


def amber_rule(img, top=136, bottom=206):
    """H12: a horizontal amber line at least 150 px long inside the list area."""
    px = img.load()
    return any(sum(1 for x in range(200) if px[x, y] == AMBER) >= 150 for y in range(top, bottom))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()
    if args.dry_run:
        print(f'would capture store/emery_map.png, emery_past.png, emery_list.png with {em.FIXTURE}')
        return 0
    em.OUT.mkdir(parents=True, exist_ok=True)
    store = em.ROOT / 'store'
    results = {}
    try:
        em.DEV.write_text(json.dumps(em.FIXTURE) + '\n')
        checked(['pebble', 'build'])
        em.boot()
        for attempt in range(4):
            checked(['pebble', 'install', '--emulator', 'emery', 'build/watchface.pbw'], 240)
            time.sleep(35)  # TLEs + 46-day prediction + two catalogue queries + cloud forecast
            img = screenshot('store_boot')
            if em.count(img, LAND, (4, 68, 196, 188)) > 100:
                break
        else:
            raise RuntimeError('Overpass map never appeared')
        future = screenshot('store_1_map')
        # H11: the default selection is a future pass, so its countdown is cyan (past ones are grey).
        results['H11 default selection is a future pass (cyan countdown)'] = em.count(future, CYAN, (4, 40, 99, 67)) > 20
        # One step back: the most recent past entry (on 2026-09-28 a clear Sentinel-2C scene).
        # Live data decides what it is; review the screenshot before publishing.
        button('up')
        past = screenshot('store_2_past')
        results['past pass selectable with UP (countdown no longer cyan)'] = em.count(past, CYAN, (4, 40, 99, 67)) == 0
        button('down', 900)  # hold DOWN: list view
        listed = screenshot('store_3_list')
        results['H12 list shows the amber NOW rule between past and future'] = amber_rule(listed)
        shutil.copyfile(em.OUT / 'store_1_map.png', store / 'emery_map.png')
        shutil.copyfile(em.OUT / 'store_2_past.png', store / 'emery_past.png')
        shutil.copyfile(em.OUT / 'store_3_list.png', store / 'emery_list.png')
    finally:
        em.DEV.write_text('{}\n')
        checked(['pebble', 'build'])
    for name, ok in results.items():
        print(f'{"PASS" if ok else "FAIL"}  {name}')
    return 0 if all(results.values()) else 1


if __name__ == '__main__':
    sys.exit(main())
