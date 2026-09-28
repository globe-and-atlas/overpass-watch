"""Inspect this app's RePebble store metadata without printing authentication material.

Run with the Pebble tool's Python environment (contains pebble_tool and requests).
"""
import json
from pathlib import Path

from pebble_tool.account import get_account
from pebble_tool.commands.publish import DEFAULT_APPSTORE_API_BASE, PublishCommand


def main():
    root = Path(__file__).resolve().parents[1]
    package = json.loads((root / 'watchface/package.json').read_text())
    account = get_account(auth_provider='firebase')
    if not account.is_logged_in:
        raise SystemExit('Pebble login required')
    token = account.get_access_token()
    payload = PublishCommand._get_me_context(DEFAULT_APPSTORE_API_BASE, token)
    lookup = (payload.get('app_lookup') or {}).get('by_app_uuid') or {}
    app_id = PublishCommand._lookup_app_id_case_insensitive(lookup, package['pebble']['uuid'])
    print(json.dumps({'app_id': app_id, 'version': package['version'],
                      'categories': payload.get('app_category_options')}, indent=2))
    if app_id:
        response, details = PublishCommand._request_json('GET',
            DEFAULT_APPSTORE_API_BASE + '/api/dashboard/apps/' + app_id, token)
        print('App details HTTP', response.status_code)
        if response.ok:
            # Store app data contains release URLs and listing fields, never the auth context.
            out = root / '.tmp/store-details.json'
            out.write_text(json.dumps(details, indent=2))
            print('Saved app listing fields to', out)
            print('Top-level fields:', ', '.join(details.keys()))


if __name__ == '__main__':
    main()
