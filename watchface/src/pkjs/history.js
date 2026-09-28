// Past + future timeline for Overpass 0.3 (phone side, pure: node-tested in test/history.test.js).
//
// Past passes come from the same prediction model, matched to real scenes from Earth Search STAC —
// the catalogue used by the model's limited hindcast. Each past pass is SCENE (a scene exists;
// cloud is the scene's eo:cloud_cover, whole-scene), PENDING (no scene yet, still inside the product
// lag) or NO_MATCH (no matching scene in the queried Earth Search results after the lag). A missing
// catalogue result is not proof that no acquisition occurred. Scenes with no predicted pass are listed.
// See directives/build_watchapp.md, 0.3.x history contract H1-H13.

var passes = require('./passes');

var DAY_MS = 86400000;
var PAST_DAYS = 30;
var WEAK_FORECAST_DAYS = 5;  // cloud forecasts beyond this have little skill
var LAG_DAYS = { landsat: 16, sentinel: 2 };  // L2 product latency on Earth Search
var FLAG = { EDGE: 1, PARTIAL: 2, SCENE: 4, PENDING: 8, NO_MATCH: 16, WEAK: 32 };
var COLLECTIONS = ['landsat-c2-l2', 'sentinel-2-l2a'];

var BY_PLATFORM = {};
passes.SATELLITES.forEach(function (s) { BY_PLATFORM[s.platform] = s; });

function lagMs(platform) {
  return (platform.indexOf('landsat') === 0 ? LAG_DAYS.landsat : LAG_DAYS.sentinel) * DAY_MS;
}

var DATATAKE_GAP_MS = 10 * 60000;  // tiles of one overpass are seconds apart
var MATCH_WINDOW_MS = 30 * 60000;  // a scene belongs to a predicted pass within +-30 min

// STAC features -> datatakes [{platform, timeMs, cloud}], time-sorted. Tiles of one overpass
// (same platform, within 10 min) collapse to one entry with the lowest cloud (H2). Grouping by
// time, not UTC date, keeps passes near 00:00 UTC (e.g. Fiji) whole. Unknown platforms ignored.
function groupScenes(features) {
  var items = [];
  (features || []).forEach(function (f) {
    var p = f && f.properties;
    var platform = p && (p.platform || '').toLowerCase();
    if (!platform || !BY_PLATFORM[platform]) return;
    var t = Date.parse(p.datetime);
    if (isNaN(t)) return;
    var cloud = typeof p['eo:cloud_cover'] === 'number' ? p['eo:cloud_cover'] : null;
    items.push({ platform: platform, timeMs: t, cloud: cloud });
  });
  items.sort(function (a, b) { return a.timeMs - b.timeMs; });
  var out = [];
  items.forEach(function (it) {
    var last = null;
    for (var i = out.length - 1; i >= 0; i--) {
      if (out[i].platform === it.platform) { last = out[i]; break; }
    }
    if (last && it.timeMs - last.lastMs <= DATATAKE_GAP_MS) {
      last.lastMs = it.timeMs;
      if (it.cloud !== null && (last.cloud === null || it.cloud < last.cloud)) last.cloud = it.cloud;
    } else {
      out.push({ platform: it.platform, timeMs: it.timeMs, lastMs: it.timeMs, cloud: it.cloud });
    }
  });
  return out;
}

function entryFromPass(p) {
  return {
    platform: p.platform, code: p.code, timeMs: p.timeMs, distanceKm: p.distanceKm,
    confidence: p.confidence, partialPlan: p.partialPlan, state: 'future', cloud: null
  };
}

// The unused datatake of the same platform nearest in time to a pass, within +-30 min.
function matchScene(scenes, used, p) {
  var best = -1, bestDt = MATCH_WINDOW_MS + 1;
  scenes.forEach(function (s, i) {
    if (used[i] || s.platform !== p.platform) return;
    var dt = Math.abs(s.timeMs - p.timeMs);
    if (dt <= MATCH_WINDOW_MS && dt < bestDt) { best = i; bestDt = dt; }
  });
  return best;
}

// predicted: time-sorted passes from passes.predict over [now - PAST_DAYS, now + horizon].
// scenes: groupScenes() output, or null when the catalogue failed (then no past half, H13).
// Each datatake matches at most one pass.
function buildTimeline(predicted, scenes, nowMs) {
  var entries = [], used = {};
  predicted.forEach(function (p) {
    var e = entryFromPass(p);
    if (p.timeMs < nowMs - 2 * 60000) {
      if (!scenes) return;
      var i = matchScene(scenes, used, p);
      if (i >= 0) {
        e.state = 'scene';
        e.cloud = scenes[i].cloud;
        used[i] = true;
      } else {
        e.state = nowMs - p.timeMs < lagMs(p.platform) ? 'pending' : 'no_match';
      }
    }
    entries.push(e);
  });
  if (scenes) {
    scenes.forEach(function (s, i) {
      if (used[i]) return;
      var sat = BY_PLATFORM[s.platform];
      if (s.timeMs >= nowMs) return;
      entries.push({
        platform: s.platform, code: sat.code, timeMs: s.timeMs, distanceKm: null,
        confidence: 'certain', partialPlan: sat.partialPlan, state: 'scene', cloud: s.cloud
      });
    });
  }
  entries.sort(function (a, b) { return a.timeMs - b.timeMs; });
  return entries;
}

// Drop the oldest past entries first, then the farthest future ones (H8).
function capTimeline(entries, max, nowMs) {
  var out = entries.slice();
  while (out.length > max && out[0].timeMs < nowMs) out.shift();
  return out.slice(0, max);
}

function flagsFor(e, nowMs) {
  // A real scene settles the doubt that EDGE / PARTIAL express, so they're cleared for it.
  if (e.state === 'scene') return FLAG.SCENE;
  var f = (e.confidence === 'edge' ? FLAG.EDGE : 0) | (e.partialPlan ? FLAG.PARTIAL : 0);
  if (e.state === 'pending') f |= FLAG.PENDING;
  if (e.state === 'no_match') f |= FLAG.NO_MATCH;
  if (e.state === 'future' && e.timeMs - nowMs > WEAK_FORECAST_DAYS * DAY_MS) f |= FLAG.WEAK;
  return f;
}

// 10-byte records (see passes.h). Past entries carry scene cloud or none, never a forecast (H7).
function packTimeline(entries, forecast, nowMs) {
  var out = [];
  entries.forEach(function (e) {
    var t = Math.round(e.timeMs / 1000);
    var dist = e.distanceKm === null ? 65535 : Math.min(65534, Math.round(e.distanceKm * 10));
    var cloud = e.state === 'future' ? forecast && forecast[passes.hourKey(e.timeMs)] : e.cloud;
    var c = typeof cloud === 'number' ? Math.max(0, Math.min(100, Math.round(cloud))) : -1;
    out.push(t & 0xFF, (t >>> 8) & 0xFF, (t >>> 16) & 0xFF, (t >>> 24) & 0xFF,
             e.code, flagsFor(e, nowMs), dist & 0xFF, dist >> 8, c & 0xFF, 0);
  });
  return out;
}

// STAC search body for one collection over the past window (fields-limited: ~230 bytes/scene).
function searchBody(collection, lat, lon, nowMs) {
  return {
    collections: [collection],
    intersects: { type: 'Point', coordinates: [lon, lat] },
    datetime: new Date(nowMs - PAST_DAYS * DAY_MS).toISOString() + '/' + new Date(nowMs).toISOString(),
    limit: 200,
    fields: {
      include: ['properties.platform', 'properties.datetime', 'properties.eo:cloud_cover'],
      exclude: ['assets', 'links', 'geometry', 'bbox']
    }
  };
}

module.exports = {
  PAST_DAYS: PAST_DAYS, WEAK_FORECAST_DAYS: WEAK_FORECAST_DAYS, LAG_DAYS: LAG_DAYS, FLAG: FLAG,
  COLLECTIONS: COLLECTIONS, groupScenes: groupScenes, buildTimeline: buildTimeline,
  capTimeline: capTimeline, packTimeline: packTimeline, searchBody: searchBody, flagsFor: flagsFor
};
