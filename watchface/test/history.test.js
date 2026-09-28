// Contract H1-H8, H10 (JS side), H13: past + future timeline. Run: node --test test/*.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const h = require('../src/pkjs/history');

const DAY = 86400000;
const NOW = Date.parse('2026-09-28T12:00:00Z');
const pass = (platform, code, timeMs, extra) => Object.assign(
  { platform, code, timeMs, distanceKm: 43.1, confidence: 'certain', partialPlan: platform === 'sentinel-2a' }, extra);
const scene = (platform, iso, cloud) => ({ properties: { platform, datetime: iso, 'eo:cloud_cover': cloud } });
const iso = ms => new Date(ms).toISOString();

test('H1 past pass with a same-platform same-date scene is SCENE with scene cloud', () => {
  const t = NOW - 4 * DAY;
  const tl = h.buildTimeline([pass('sentinel-2c', 4, t)], h.groupScenes([scene('sentinel-2c', iso(t + 7000), 3.2)]), NOW);
  assert.strictEqual(tl.length, 1);
  assert.strictEqual(tl[0].state, 'scene');
  assert.strictEqual(tl[0].cloud, 3.2);
});

test('H1 a scene on another platform the same day does not match', () => {
  const t = NOW - 4 * DAY;
  const tl = h.buildTimeline([pass('sentinel-2c', 4, t)], h.groupScenes([scene('sentinel-2b', iso(t), 3)]), NOW);
  assert.strictEqual(tl.find(e => e.platform === 'sentinel-2c').state, 'missed');
});

test('H2 several tiles on one platform-date collapse to the lowest cloud', () => {
  const t = NOW - 4 * DAY;
  const g = h.groupScenes([scene('sentinel-2c', iso(t), 26.4), scene('sentinel-2c', iso(t + 14000), 25.7),
                           scene('sentinel-2c', iso(t + 20000), 88)]);
  assert.strictEqual(g.length, 1);
  assert.strictEqual(g[0].cloud, 25.7);
});

test('verifier #3: a pass just before 00:00 UTC matches its scene just after', () => {
  const t = Date.parse('2026-09-20T23:59:50Z');
  const tl = h.buildTimeline([pass('sentinel-2b', 3, t)], h.groupScenes([scene('sentinel-2b', '2026-09-21T00:00:12Z', 9)]), NOW);
  assert.strictEqual(tl.length, 1);
  assert.strictEqual(tl[0].state, 'scene');
});

test('verifier #3: one datatake matches one pass, not two passes the same day', () => {
  const t1 = NOW - 20 * DAY, t2 = t1 + 100 * 60000;  // past Landsat's 16-day lag; 100 min apart
  const tl = h.buildTimeline([pass('landsat-8', 0, t1), pass('landsat-8', 0, t2)],
                             h.groupScenes([scene('landsat-8', iso(t1 + 5000), 20)]), NOW);
  assert.deepStrictEqual(tl.map(e => e.state), ['scene', 'missed']);
});

test('verifier #3: a scene more than 30 min from any pass is its own entry', () => {
  const t = NOW - 20 * DAY;
  const tl = h.buildTimeline([pass('landsat-8', 0, t)], h.groupScenes([scene('landsat-8', iso(t + 45 * 60000), 20)]), NOW);
  assert.deepStrictEqual(tl.map(e => e.state), ['missed', 'scene']);
});

test('verifier #6: a real scene clears the edge / partial-plan doubt flags', () => {
  const t = NOW - 6 * DAY;
  const tl = h.buildTimeline([pass('sentinel-2a', 2, t, { confidence: 'edge' })], h.groupScenes([scene('sentinel-2a', iso(t), 5)]), NOW);
  assert.strictEqual(h.flagsFor(tl[0], NOW), h.FLAG.SCENE);
});

test('H3 no scene inside the lag is PENDING (Landsat 16 d, Sentinel-2 2 d)', () => {
  const tl = h.buildTimeline([pass('landsat-9', 1, NOW - 10 * DAY), pass('sentinel-2b', 3, NOW - 1 * DAY)], [], NOW);
  assert.deepStrictEqual(tl.map(e => e.state), ['pending', 'pending']);
});

test('H4 no scene after the lag is MISSED', () => {
  const tl = h.buildTimeline([pass('landsat-9', 1, NOW - 20 * DAY), pass('sentinel-2a', 2, NOW - 5 * DAY)], [], NOW);
  assert.deepStrictEqual(tl.map(e => e.state), ['missed', 'missed']);
});

test('H5 a scene with no predicted pass still appears as SCENE', () => {
  const tl = h.buildTimeline([], h.groupScenes([scene('landsat-8', iso(NOW - 6 * DAY), 12)]), NOW);
  assert.strictEqual(tl.length, 1);
  assert.strictEqual(tl[0].state, 'scene');
  assert.strictEqual(tl[0].code, 0);
  assert.strictEqual(tl[0].distanceKm, null);
});

test('H6 WEAK only on future passes more than 5 days out', () => {
  const tl = h.buildTimeline([pass('landsat-9', 1, NOW + 2 * DAY), pass('landsat-8', 0, NOW + 6 * DAY)], [], NOW);
  assert.strictEqual(h.flagsFor(tl[0], NOW) & h.FLAG.WEAK, 0);
  assert.strictEqual(h.flagsFor(tl[1], NOW) & h.FLAG.WEAK, h.FLAG.WEAK);
});

test('H7 past entries never carry a forecast cloud', () => {
  const t = NOW - 20 * DAY;
  const tl = h.buildTimeline([pass('landsat-9', 1, t)], [], NOW);
  const forecast = {}; forecast[require('../src/pkjs/passes').hourKey(t)] = 55;
  const b = h.packTimeline(tl, forecast, NOW);
  assert.strictEqual(b[8], 0xFF, 'missed pass must show no cloud, not the forecast');
  assert.strictEqual(b[5] & h.FLAG.MISSED, h.FLAG.MISSED);
});

test('H8 over the cap, oldest past entries go first, never future ones', () => {
  const list = [];
  for (let i = 0; i < 50; i++) list.push({ timeMs: NOW - (50 - i) * 3600000, state: 'scene' });
  for (let i = 0; i < 30; i++) list.push({ timeMs: NOW + (i + 1) * 3600000, state: 'future' });
  const capped = h.capTimeline(list, 64, NOW);
  assert.strictEqual(capped.length, 64);
  assert.strictEqual(capped.filter(e => e.state === 'future').length, 30);
  assert.strictEqual(capped[0].timeMs, list[16].timeMs);
});

test('H10 flag bits pack into byte 5 alongside edge/partial', () => {
  const tl = h.buildTimeline([pass('sentinel-2a', 2, NOW - 5 * DAY, { confidence: 'edge' })], [], NOW);
  const b = h.packTimeline(tl, {}, NOW);
  assert.strictEqual(b[5], h.FLAG.EDGE | h.FLAG.PARTIAL | h.FLAG.MISSED);
});

test('H10 unknown distance packs as 0xFFFF', () => {
  const tl = h.buildTimeline([], h.groupScenes([scene('landsat-8', iso(NOW - 6 * DAY), 12)]), NOW);
  const b = h.packTimeline(tl, {}, NOW);
  assert.deepStrictEqual([b[6], b[7], b[8]], [0xFF, 0xFF, 12]);
});

test('H13 catalogue failure (scenes = null) keeps future passes, drops the past half', () => {
  const tl = h.buildTimeline([pass('landsat-9', 1, NOW - 3 * DAY), pass('landsat-8', 0, NOW + DAY)], null, NOW);
  assert.deepStrictEqual(tl.map(e => e.state), ['future']);
});

test('future passes near now keep state future (2-minute NOW window)', () => {
  const tl = h.buildTimeline([pass('landsat-9', 1, NOW - 60000)], [], NOW);
  assert.strictEqual(tl[0].state, 'future');
});

test('searchBody spans the past window and limits fields', () => {
  const b = h.searchBody('sentinel-2-l2a', 29.76, -95.37, NOW);
  assert.deepStrictEqual(b.intersects.coordinates, [-95.37, 29.76]);
  assert.ok(b.datetime.startsWith(iso(NOW - 30 * DAY).slice(0, 10)));
  assert.ok(b.fields.exclude.includes('assets'));
});
