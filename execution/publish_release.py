"""Publish the verified production package using the authenticated Pebble SDK CLI."""
import argparse
import json
import re
import subprocess
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    package = json.loads((ROOT / 'watchface/package.json').read_text())
    assert json.loads((ROOT / 'watchface/src/pkjs/dev.json').read_text()) == {}, 'Fixture must be empty'
    with zipfile.ZipFile(ROOT / 'watchface/build/watchface.pbw') as archive:
        metadata = json.loads(archive.read('appinfo.json'))
        assert metadata['versionLabel'] == package['version']
        sourcemap = json.loads(archive.read('pebble-js-app.js.map'))
        fixtures = [content for source, content in zip(sourcemap['sources'], sourcemap['sourcesContent'], strict=True)
                    if source.endswith('/dev.json')]
        assert len(fixtures) == 1 and re.fullmatch(r'module.exports\s*=\s*\{\s*\};?\s*(?://[^\n]*\n?)*\s*', fixtures[0]), 'Bundled fixture is not empty'
    store = ROOT / 'store'
    command = ['pebble', 'publish', '--non-interactive', '--is-published', '--no-gif-all-platforms',
               '--name', 'Overpass', '--version', package['version'],
               '--description', (store / 'description.txt').read_text(),
               '--release-notes', (store / 'release-notes.txt').read_text(),
               '--source', 'https://github.com/globe-and-atlas/overpass-watch',
               '--category', 'tools-utilities', '--icon-small', str(store / 'icon-small.png'),
               '--icon-large', str(store / 'icon-large.png'), '--screenshots',
               str(store / 'emery_map.png'), str(store / 'emery_landsat.png'), str(store / 'emery_list.png')]
    print(f'Production {package["version"]} package verified; fixture empty.', flush=True)
    if args.dry_run:
        print('Dry run: would publish app with 3 screenshots and supplied icons.')
        return
    subprocess.run(command, cwd=ROOT / 'watchface', check=True)


if __name__ == '__main__':
    main()
