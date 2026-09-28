"""Bundle public-domain Natural Earth land rings for the phone-side regional map."""
import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson'

def main():
    with urllib.request.urlopen(URL, timeout=30) as response:
        data = json.load(response)
    rings = []
    for feature in data['features']:
        geometry = feature['geometry']
        polygons = geometry['coordinates'] if geometry['type'] == 'MultiPolygon' else [geometry['coordinates']]
        for polygon in polygons:
            rings.append([[round(x, 4), round(y, 4)] for x, y in polygon[0]])
    output = ROOT / 'watchface/src/pkjs/land.json'
    output.write_text(json.dumps(rings, separators=(',', ':')) + '\n')
    print(f'{len(rings)} land rings, {output.stat().st_size} bytes; Natural Earth public domain')

if __name__ == '__main__':
    main()
