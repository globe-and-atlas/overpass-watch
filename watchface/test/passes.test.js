// Contract W2-W5: the phone JS predicts the same passes as the validated Python reference
// (../overpass) on the same frozen TLEs. Run: cd watchface && node --test test/
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const passes = require('../src/pkjs/passes');

const FIX = path.join(__dirname, '..', '..', 'tests', 'fixtures');
const tles = require(path.join(FIX, 'tles.json'));
const ref = require(path.join(FIX, 'reference_passes.json'));
const start = Date.parse(ref.start_utc);
const end = start + ref.days * 86400000;

for (const [name, loc] of Object.entries(ref.locations)) {
  const js = passes.predict(tles, loc.lat, loc.lon, start, end);
  const key = (platform, iso) => platform + ' ' + iso.slice(0, 10);

  test(`W2 ${name}: same platform + date set as Python`, () => {
    const a = js.map(p => key(p.platform, new Date(p.timeMs).toISOString())).sort();
    const b = loc.passes.map(p => key(p.platform, p.time_utc)).sort();
    assert.deepStrictEqual(a, b);
  });

  test(`W3-W5 ${name}: time ±5 s, distance ±2 km, same confidence`, () => {
    const byKey = new Map(js.map(p => [key(p.platform, new Date(p.timeMs).toISOString()), p]));
    for (const r of loc.passes) {
      const p = byKey.get(key(r.platform, r.time_utc));
      assert.ok(p, `missing ${r.platform} ${r.time_utc}`);
      const dt = Math.abs(p.timeMs - Date.parse(r.time_utc)) / 1000;
      assert.ok(dt <= 5, `${r.platform} ${r.time_utc}: dt ${dt} s`);
      assert.ok(Math.abs(p.distanceKm - r.distance_km) <= 2, `${r.platform} ${r.time_utc}: ${p.distanceKm.toFixed(1)} vs ${r.distance_km} km`);
      assert.strictEqual(p.confidence, r.confidence, `${r.platform} ${r.time_utc}`);
    }
  });
}

test('packPasses: 10 bytes per pass, little-endian time, flags', () => {
  const p = { timeMs: 1790000000000, code: 2, distanceKm: 101.7, confidence: 'edge', partialPlan: true };
  const b = passes.packPasses([p], { [passes.hourKey(p.timeMs)]: 64 }, 40);
  assert.strictEqual(b.length, 10);
  assert.strictEqual(b[0] | b[1] << 8 | b[2] << 16 | (b[3] << 24 >>> 0), 1790000000);
  assert.deepStrictEqual(b.slice(4), [2, 3, 1017 & 0xFF, 1017 >> 8, 64, 0]);
});

test('packPasses: unknown cloud is -1 (0xFF)', () => {
  const b = passes.packPasses([{ timeMs: 0, code: 0, distanceKm: 1, confidence: 'certain', partialPlan: false }], {}, 40);
  assert.strictEqual(b[8], 0xFF);
  assert.strictEqual(b[5], 0);
});
