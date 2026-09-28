// Pass prediction for Overpass (phone side). A port of ../overpass/execution/passes_core.py, which was
// hindcast-compared with Landsat/Sentinel-2 scene listings at four sampled sites; those sample scores are not a general accuracy guarantee.
// Pure: no Pebble APIs, so node tests compare it with the Python reference on the same TLEs.
//
// A pass is a daylight closest approach of the sub-satellite point to the target within half the
// swath. Passes are "edge" near the swath boundary after a simple TLE-age drift buffer; this is a geometric heuristic, not a probability.

var sat = require('./satellite');

var EARTH_R_KM = 6371.0088;
var DEG = Math.PI / 180;
var DRIFT_KM_PER_DAY = 0.5;
var COARSE_STEP_S = 60;
var FINE_WINDOW_S = 60;
var COARSE_SLACK_KM = 300;  // a 60 s step moves the sub-point ~420 km; refine anything this close

// Platform codes match the watch (src/c/passes.h).
var SATELLITES = [
  { norad: 39084, platform: 'landsat-8', code: 0, halfSwathKm: 92.5, partialPlan: false },
  { norad: 49260, platform: 'landsat-9', code: 1, halfSwathKm: 92.5, partialPlan: false },
  // Sentinel-2A flies an extended campaign with a partial acquisition plan (validated 2026-09-27:
  // full in Nairobi/Madrid, about half in Houston/Denver). Predicted, but not guaranteed.
  { norad: 40697, platform: 'sentinel-2a', code: 2, halfSwathKm: 145.0, partialPlan: true },
  { norad: 42063, platform: 'sentinel-2b', code: 3, halfSwathKm: 145.0, partialPlan: false },
  { norad: 60989, platform: 'sentinel-2c', code: 4, halfSwathKm: 145.0, partialPlan: false }
];

function haversineKm(lat1, lon1, lat2, lon2) {
  var p1 = lat1 * DEG, p2 = lat2 * DEG, dp = p2 - p1, dl = (lon2 - lon1) * DEG;
  var h = Math.pow(Math.sin(dp / 2), 2) + Math.cos(p1) * Math.cos(p2) * Math.pow(Math.sin(dl / 2), 2);
  return 2 * EARTH_R_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

// NOAA approximation (~0.5 degree), same as the Python reference.
function sunElevationDeg(ms, lat, lon) {
  var d = new Date(ms);
  var start = Date.UTC(d.getUTCFullYear(), 0, 1);
  var day = Math.floor((ms - start) / 86400000) + 1;
  var hour = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
  var g = 2 * Math.PI / 365 * (day - 1 + (hour - 12) / 24);
  var eqtime = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) -
                         0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  var decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) +
             0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  var ha = ((hour * 60 + eqtime + 4 * lon) / 4 - 180) * DEG;
  var la = lat * DEG;
  var cosZen = Math.sin(la) * Math.sin(decl) + Math.cos(la) * Math.cos(decl) * Math.cos(ha);
  return 90 - Math.acos(Math.max(-1, Math.min(1, cosZen))) / DEG;
}

function satrecFromTle(line1, line2) {
  return sat.twoline2satrec(line1, line2);
}

// TLE epoch in ms (satrec.jdsatepoch is a Julian date).
function epochMs(satrec) {
  var jd = satrec.jdsatepoch + (satrec.jdsatepochF || 0);
  return (jd - 2440587.5) * 86400000;
}

function subpointDistanceKm(satrec, ms, lat, lon) {
  var date = new Date(ms);
  var pv = sat.propagate(satrec, date);
  if (!pv || !pv.position) return Infinity;
  var gd = sat.eciToGeodetic(pv.position, sat.gstime(date));
  return haversineKm(lat, lon, gd.latitude / DEG, gd.longitude / DEG);
}

// Passes for one satellite between startMs and endMs.
function findPasses(entry, satrec, lat, lon, startMs, endMs) {
  var epoch = epochMs(satrec);
  var n = Math.floor((endMs - startMs) / 1000 / COARSE_STEP_S) + 1;
  var prev2 = Infinity, prev1 = Infinity, out = [];
  for (var i = 0; i < n; i++) {
    var t = startMs + i * COARSE_STEP_S * 1000;
    var d = subpointDistanceKm(satrec, t, lat, lon);
    // prev1 is a local minimum of the coarse series.
    if (i >= 2 && prev1 < prev2 && prev1 <= d && prev1 < entry.halfSwathKm + COARSE_SLACK_KM) {
      var base = t - COARSE_STEP_S * 1000, bestT = base, bestD = Infinity;
      for (var s = -FINE_WINDOW_S; s <= FINE_WINDOW_S; s++) {
        var tf = base + s * 1000;
        var df = subpointDistanceKm(satrec, tf, lat, lon);
        if (df < bestD) { bestD = df; bestT = tf; }
      }
      var ageDays = Math.abs(bestT - epoch) / 86400000;
      var margin = DRIFT_KM_PER_DAY * ageDays;
      if (bestD <= entry.halfSwathKm + margin) {
        var elev = sunElevationDeg(bestT, lat, lon);
        if (elev > 0) {
          out.push({
            platform: entry.platform,
            code: entry.code,
            timeMs: bestT,
            distanceKm: bestD,
            sunElevationDeg: elev,
            tleAgeDays: ageDays,
            confidence: bestD <= entry.halfSwathKm - margin ? 'certain' : 'edge',
            partialPlan: entry.partialPlan
          });
        }
      }
    }
    prev2 = prev1;
    prev1 = d;
  }
  return out;
}

// tles: { norad: [line1, line2] }. Returns passes for every satellite with a TLE, time-sorted.
function predict(tles, lat, lon, startMs, endMs) {
  var all = [];
  SATELLITES.forEach(function (entry) {
    var tle = tles[entry.norad];
    if (!tle) return;
    all = all.concat(findPasses(entry, satrecFromTle(tle[0], tle[1]), lat, lon, startMs, endMs));
  });
  all.sort(function (a, b) { return a.timeMs - b.timeMs; });
  return all;
}

// ---- Packing for the watch (10 bytes per pass, little-endian; see directives/build_watchapp.md) ----

function packPasses(passes, clouds, maxPasses) {
  var out = [];
  passes.slice(0, maxPasses).forEach(function (p) {
    var t = Math.round(p.timeMs / 1000);
    var dist = Math.min(65535, Math.round(p.distanceKm * 10));
    var cloud = clouds && clouds[hourKey(p.timeMs)];
    var c = (typeof cloud === 'number') ? Math.max(0, Math.min(100, Math.round(cloud))) : -1;
    var flags = (p.confidence === 'edge' ? 1 : 0) | (p.partialPlan ? 2 : 0);
    out.push(t & 0xFF, (t >>> 8) & 0xFF, (t >>> 16) & 0xFF, (t >>> 24) & 0xFF,
             p.code, flags, dist & 0xFF, dist >> 8, c & 0xFF, 0);
  });
  return out;
}

// Open-Meteo hourly key ('YYYY-MM-DDTHH:00', UTC) for a pass time.
function hourKey(ms) {
  return new Date(ms).toISOString().slice(0, 13) + ':00';
}

module.exports = {
  SATELLITES: SATELLITES, DRIFT_KM_PER_DAY: DRIFT_KM_PER_DAY,
  haversineKm: haversineKm, sunElevationDeg: sunElevationDeg, epochMs: epochMs,
  predict: predict, packPasses: packPasses, hourKey: hourKey
};
