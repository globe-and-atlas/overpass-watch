const test = require('node:test');
const assert = require('node:assert/strict');
const map = require('../src/pkjs/map');
const passes = require('../src/pkjs/passes');
const tles = require('../../tests/fixtures/tles.json');
const ref = require('../../tests/fixtures/reference_passes.json');

test('observer is centered; dateline uses the short longitude distance', () => {
  assert.deepEqual(map.project(-95.37, 29.76, 29.76, -95.37), [0, 0]);
  const p = map.project(-179.9, 0, 0, 179.9);
  assert.ok(p[0] > 22 && p[0] < 23);
});

test('regional polygon clipping contains no out-of-bounds vertices', () => {
  const p = map.clipRing([[-10,-10],[200,-10],[200,130],[-10,130]]);
  assert.equal(p.length, 4);
  assert.ok(p.every(([x,y]) => x >= 0 && x <= 191 && y >= 0 && y <= 119));
});

function insideRing(x, y, ring) {
  let inside = false;
  for (let i=0,j=ring.length-1;i<ring.length;j=i++) {
    const a=ring[i],b=ring[j];
    if ((a[1]>y)!==(b[1]>y) && x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]) inside=!inside;
  }
  return inside;
}

test('geographic map places downtown Houston on land and Gulf of Mexico on water', () => {
  const rings = map.landPolygons(29.76, -95.37);
  assert.ok(rings.some(r => insideRing(96,60,r)));
  // 28 N, 94 W is offshore southeast of Houston.
  const [east,north] = map.project(-94,28,29.76,-95.37);
  assert.ok(!rings.some(r => insideRing(96+east*192/800,60-north*192/800,r)));
});

test('map payload stays within budget for coastal, inland, dateline and high-latitude sites', () => {
  for (const [lat,lon] of [[29.76,-95.37],[40,-105],[40.4,-3.7],[0,179.9],[60,10],[79,15]]) {
    const bytes = map.packLand(lat,lon);
    assert.ok(bytes.length <= 900);
    assert.equal(bytes.length % 2, 0);
    for(let i=0;i<bytes.length;i+=2) {
      assert.ok((bytes[i]===255 && bytes[i+1]===255) || (bytes[i]<=191 && bytes[i+1]<=119));
    }
  }
});

for (const [name,loc] of Object.entries(ref.locations)) {
  test(`orbit track crosses at the predicted off-track distance: ${name}`, () => {
    const start = Date.parse(ref.start_utc);
    const list = passes.predict(tles,loc.lat,loc.lon,start,start+ref.days*86400000);
    for (const p of list) {
      const [ax,ay,bx,by,nx,ny] = map.track(tles,p,loc.lat,loc.lon);
      const distance = Math.abs(ax*by-ay*bx)/Math.hypot(bx-ax,by-ay);
      assert.ok(Math.abs(distance-p.distanceKm)<3, `${p.platform}: map ${distance} vs pass ${p.distanceKm}`);
      assert.ok(Math.abs(Math.hypot(nx,ny)-passes.SATELLITES[p.code].halfSwathKm)<0.01);
    }
    assert.equal(map.packTracks(tles,list,loc.lat,loc.lon,40).length, Math.min(40,list.length)*12);
  });
}

test('missing TLE and polar projection produce unavailable geometry, not an invented track', () => {
  assert.equal(map.track({}, {code:0,timeMs:0}, 30,0),null);
  assert.equal(map.track(tles, {code:0,timeMs:0},85,0),null);
});
