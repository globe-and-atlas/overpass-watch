"""Inspect this app's RePebble store metadata without printing authentication material.

Run with the Pebble tool's Python environment (contains pebble_tool and requests).
"""
import argparse
import hashlib
import io
import json
import zipfile
from pathlib import Path

import requests
from pebble_tool.account import get_account
from pebble_tool.commands.publish import DEFAULT_APPSTORE_API_BASE, PublishCommand


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--public-pbw', help='Public PBW URL observed on the app listing')
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    package = json.loads((root / 'watchface/package.json').read_text())
    account = get_account(auth_provider='firebase')
    if not account.is_logged_in:
        raise SystemExit('Pebble login required')
    token = account.get_access_token()
    payload = PublishCommand._get_me_context(DEFAULT_APPSTORE_API_BASE, token)
    lookup = (payload.get('app_lookup') or {}).get('by_app_uuid') or {}
    app_id = PublishCommand._lookup_app_id_case_insensitive(lookup, package['pebble']['uuid'])
    result = {'app_id': app_id, 'version': package['version']}
    if app_id:
        response = requests.get('https://apps.repebble.com/' + app_id, timeout=30)
        response.raise_for_status()
        result['public_http_status'] = response.status_code
    if args.public_pbw:
        assert app_id and args.public_pbw.startswith(DEFAULT_APPSTORE_API_BASE + '/api/assets/pbw/' + app_id + '/')
        response = requests.get(args.public_pbw, timeout=30)
        response.raise_for_status()
        with zipfile.ZipFile(io.BytesIO(response.content)) as archive:
            metadata = json.loads(archive.read('appinfo.json'))
            assert metadata['versionLabel'] == package['version']
            assert metadata['uuid'] == package['pebble']['uuid']
        local = (root / 'watchface/build/watchface.pbw').read_bytes()
        assert response.content == local, 'Published PBW differs from local production build'
        result['published_pbw_sha256'] = hashlib.sha256(response.content).hexdigest()
        result['published_pbw_matches_local'] = True
    (root / '.tmp/store-verification.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
