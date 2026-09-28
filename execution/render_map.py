"""Build, capture and exercise the actual map UI with a public Houston location fixture."""
import json
import time

import emulator_check as em


def checked(args, timeout=90):
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
    time.sleep(1)


def main():
    original = em.DEV.read_text()
    em.OUT.mkdir(parents=True, exist_ok=True)
    try:
        em.DEV.write_text(json.dumps(em.FIXTURE) + '\n')
        checked(['pebble', 'build'])
        em.boot()
        for attempt in range(4):
            checked(['pebble', 'install', '--emulator', 'emery', 'build/watchface.pbw'])
            print(f'Installed attempt {attempt + 1}', flush=True)
            time.sleep(20)
            img = screenshot('map_boot')
            if em.count(img, (0, 85, 0), (4, 68, 196, 188)) > 100:
                break
        else:
            raise RuntimeError('Geographic map never appeared')
        screenshot('map_1_sentinel2b')
        button('down')
        screenshot('map_2_sentinel2a')
        button('down')
        screenshot('map_3_landsat')
        button('down', 900)
        screenshot('map_4_list')
        button('down', 900)
        screenshot('map_5_return')
        button('select')
        time.sleep(2)
        screenshot('map_6_pin')
        print('Captured map, selections, list toggle, return, pin result.', flush=True)
        # Restart with phone startup disabled: the watch must reconstruct the same map from storage.
        em.DEV.write_text(json.dumps({'offline': True}) + '\n')
        checked(['pebble', 'build'])
        checked(['pebble', 'install', '--emulator', 'emery', 'build/watchface.pbw'])
        time.sleep(3)
        cached = screenshot('map_7_cached')
        from PIL import Image, ImageChops
        first = Image.open(em.OUT / 'map_1_sentinel2b.png').convert('RGB')
        box = (4, 68, 196, 188)
        if ImageChops.difference(first.crop(box), cached.crop(box)).getbbox():
            raise RuntimeError('Restored map differs from original map with phone updates disabled')
        print('Offline restart: cached map pixels match original.', flush=True)
    finally:
        em.DEV.write_text(original)
        checked(['pebble', 'build'])
        print('Production fixture restored; build passed.', flush=True)


if __name__ == '__main__':
    main()
