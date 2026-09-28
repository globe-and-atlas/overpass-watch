// North-up local equirectangular overview: 800 x 500 km, 192 x 120 pixels.
// Land: Natural Earth 1:110m, public domain. Orbit geometry uses prediction TLEs.
var satellite = require('./satellite');
var passes = require('./passes');
var land = require('./land.json');
var DEG = Math.PI / 180, R = 6371.0088, SCALE = 192 / 800;

function wrap(deg) { return ((deg + 180) % 360 + 360) % 360 - 180; }
function project(lon, lat, originLat, originLon) {
  return [R * DEG * wrap(lon - originLon) * Math.cos(originLat * DEG), R * DEG * (lat - originLat)];
}

// Sutherland-Hodgman clipping keeps filled polygons valid at the screen boundary.
function clipRing(points) {
  [ [0, 0, 1], [0, 191, -1], [1, 0, 1], [1, 119, -1] ].forEach(function (edge) {
    var input = points; points = [];
    if (!input.length) return;
    var prev = input[input.length - 1], pin = (prev[edge[0]] - edge[1]) * edge[2] >= 0;
    input.forEach(function (cur) {
      var cin = (cur[edge[0]] - edge[1]) * edge[2] >= 0;
      if (cin !== pin) {
        var t = (edge[1] - prev[edge[0]]) / (cur[edge[0]] - prev[edge[0]]);
        points.push([prev[0] + t * (cur[0] - prev[0]), prev[1] + t * (cur[1] - prev[1])]);
      }
      if (cin) points.push(cur);
      prev = cur; pin = cin;
    });
  });
  return points;
}

function landPolygons(lat, lon) {
  var polygons = [], k = R * DEG * Math.cos(lat * DEG) * SCALE;
  land.forEach(function (ring) {
    var previous = ring[0][0], unwrapped = ring.map(function (p) {
      var x = previous + wrap(p[0] - previous); previous = x;
      return [x, p[1]];
    });
    [-360, 0, 360].forEach(function (shift) {
      var points = clipRing(unwrapped.map(function (p) {
        return [96 + (p[0] + shift - lon) * k, 60 - (p[1] - lat) * R * DEG * SCALE];
      }));
      if (points.length >= 3) polygons.push(points);
    });
  });
  return polygons;
}

function packLand(lat, lon) {
  // Polar geography needs another projection. Keep orbit view explicitly unavailable there.
  if (Math.abs(lat) > 80) return [];
  var polygons = landPolygons(lat, lon), out = [];
  for (var tolerance = 0.6; tolerance <= 10; tolerance += 0.6) {
    out = [];
    polygons.forEach(function (ring) {
      var simple = [];
      ring.forEach(function (p) {
        var q = [Math.round(p[0]), Math.round(p[1])], last = simple[simple.length - 1];
        if (!last || Math.abs(q[0] - last[0]) + Math.abs(q[1] - last[1]) >= tolerance) simple.push(q);
      });
      if (simple.length < 3) return;
      simple.forEach(function (p) { out.push(p[0], p[1]); });
      out.push(255, 255);
    });
    if (out.length <= 900) return out;
  }
  return []; // Never send a truncated polygon stream.
}

function orbitPoint(satrec, timeMs, lat, lon) {
  var date = new Date(timeMs), pv = satellite.propagate(satrec, date);
  if (!pv || !pv.position) return null;
  var gd = satellite.eciToGeodetic(pv.position, satellite.gstime(date));
  return project(gd.longitude / DEG, gd.latitude / DEG, lat, lon);
}

function track(tles, pass, lat, lon) {
  var entry = passes.SATELLITES[pass.code], tle = entry && tles[entry.norad];
  if (!tle || Math.abs(lat) > 80) return null;
  var rec = satellite.twoline2satrec(tle[0], tle[1]);
  var a = orbitPoint(rec, pass.timeMs - 1000, lat, lon);
  var b = orbitPoint(rec, pass.timeMs + 1000, lat, lon);
  var center = orbitPoint(rec, pass.timeMs, lat, lon);
  if (!a || !b || !center) return null;
  var dx = b[0] - a[0], dy = b[1] - a[1], length = Math.sqrt(dx * dx + dy * dy);
  if (!isFinite(length) || length < 1) return null;
  // Regional tangent, anchored at closest approach. A long chord between remote orbit
  // samples shifts the footprint near the observer and can misrepresent edge passes.
  var ux = dx / length, uy = dy / length;
  return [center[0] - ux * 700, center[1] - uy * 700,
    center[0] + ux * 700, center[1] + uy * 700,
    -uy * entry.halfSwathKm, ux * entry.halfSwathKm];
}

function packTracks(tles, list, lat, lon, max) {
  var bytes = [];
  list.slice(0, max).forEach(function (p) {
    var values = track(tles, p, lat, lon) || [0, 0, 0, 0, 0, 0];
    values.forEach(function (n) {
      n = Math.round(n); bytes.push(n & 255, (n >> 8) & 255);
    });
  });
  return bytes;
}

module.exports = { project: project, clipRing: clipRing, packLand: packLand,
  track: track, packTracks: packTracks, landPolygons: landPolygons };
