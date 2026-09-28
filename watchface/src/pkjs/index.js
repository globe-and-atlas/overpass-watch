// Phone side of Overpass: locate, fetch TLEs and cloud forecast, predict passes (passes.js), send them
// to the watch; record ground-truth pins as GeoJSON in localStorage and export them from the app's
// settings page. Pins and home never leave the phone.

var passes = require('./passes');
var history = require('./history');
var map = require('./map');
var dev = require('./dev.json');  // emulator fixture: {"lat": .., "lon": ..}; ships as {}

var CELESTRAK = 'https://celestrak.org/NORAD/elements/gp.php?FORMAT=TLE&CATNR=';
var OPEN_METEO = 'https://api.open-meteo.com/v1/forecast?hourly=cloud_cover&forecast_days=16&timezone=UTC';
var EARTH_SEARCH = 'https://earth-search.aws.element84.com/v1/search';
var TLE_MAX_AGE_MS = 6 * 3600 * 1000;
var HORIZON_MS = 16 * 86400 * 1000;
var MAX_PASSES = 64;  // matches PASS_MAX in src/c/passes.h
var CMD = { REFRESH: 1, PIN: 2 };

// ---- storage ----------------------------------------------------------------------------------

function load(key, fallback) {
  try {
    var v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch (e) {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.log('save ' + key + ': ' + e);
    return false;
  }
}

function pins() { return load('pins', []); }

// ---- network ----------------------------------------------------------------------------------

function get(url, cb) {
  var req = new XMLHttpRequest();
  req.open('GET', url, true);
  req.timeout = 20000;
  req.onload = function () {
    if (req.status >= 200 && req.status < 300) cb(null, req.responseText);
    else cb('HTTP ' + req.status);
  };
  req.onerror = function () { cb('network error'); };
  req.ontimeout = function () { cb('timeout'); };
  req.send();
}

// TLEs for every satellite; cached 6 h; on failure fall back to any cached copy.
function getTles(cb) {
  var cache = load('tles', null);
  if (cache && Date.now() - cache.fetched < TLE_MAX_AGE_MS) return cb(null, cache.tles);
  var tles = {}, list = passes.SATELLITES.slice(), failed = false;
  (function next() {
    if (!list.length) {
      if (failed) return cache ? cb(null, cache.tles) : cb('NO TLE');
      save('tles', { fetched: Date.now(), tles: tles });
      return cb(null, tles);
    }
    var s = list.shift();
    get(CELESTRAK + s.norad, function (err, text) {
      var lines = err ? [] : text.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
      if (lines.length >= 3 && lines[1].charAt(0) === '1') tles[s.norad] = [lines[1], lines[2]];
      else failed = true;
      next();
    });
  })();
}

function post(url, body, cb) {
  var req = new XMLHttpRequest();
  req.open('POST', url, true);
  req.setRequestHeader('Content-Type', 'application/json');
  req.timeout = 20000;
  req.onload = function () {
    if (req.status >= 200 && req.status < 300) cb(null, req.responseText);
    else cb('HTTP ' + req.status);
  };
  req.onerror = function () { cb('network error'); };
  req.ontimeout = function () { cb('timeout'); };
  req.send(JSON.stringify(body));
}

// Real scenes over the location in the last 30 days (Landsat L2 + Sentinel-2 L2A), grouped per
// platform-date. cb(null) when any catalogue request fails: the past half is then left out.
function getScenes(lat, lon, now, cb) {
  var features = [], left = history.COLLECTIONS.length, failed = false;
  history.COLLECTIONS.forEach(function (collection) {
    post(EARTH_SEARCH, history.searchBody(collection, lat, lon, now), function (err, text) {
      if (err) failed = true;
      else {
        try { features = features.concat(JSON.parse(text).features || []); } catch (e) { failed = true; }
      }
      if (--left === 0) cb(failed ? null : history.groupScenes(features));
    });
  });
}

function getClouds(lat, lon, cb) {
  get(OPEN_METEO + '&latitude=' + lat + '&longitude=' + lon, function (err, text) {
    if (err) return cb({});
    try {
      var h = JSON.parse(text).hourly || {}, out = {};
      (h.time || []).forEach(function (t, i) { out[t] = h.cloud_cover[i]; });
      cb(out);
    } catch (e) { cb({}); }
  });
}

function locate(highAccuracy, cb) {
  if (typeof dev.lat === 'number' && typeof dev.lon === 'number') {
    return cb(null, { latitude: dev.lat, longitude: dev.lon, accuracy: 0 });
  }
  navigator.geolocation.getCurrentPosition(function (pos) { cb(null, pos.coords); },
    function (err) { cb(err.message || 'no location'); },
    { enableHighAccuracy: highAccuracy, timeout: 30000, maximumAge: highAccuracy ? 0 : 10 * 60000 });
}

// ---- watch messaging --------------------------------------------------------------------------

function send(msg) {
  Pebble.sendAppMessage(msg, null, function (e) { console.log('send failed: ' + JSON.stringify(e && e.error)); });
}

function status(text) { send({ STATUS: text }); }

function refresh() {
  status('LOCATING...');
  locate(false, function (err, c) {
    if (err) return status('NO FIX');
    status('ORBITS...');
    getTles(function (err2, tles) {
      if (err2) return status('NO TLE: OFFLINE?');
      var now = Date.now();
      var predicted = passes.predict(tles, c.latitude, c.longitude,
                                     now - history.PAST_DAYS * 86400000, now + HORIZON_MS);
      status('SCENES...');
      getScenes(c.latitude, c.longitude, now, function (scenes) {
        var list = history.capTimeline(history.buildTimeline(predicted, scenes, now), MAX_PASSES, now);
        save('lastPasses', list.map(function (p) { return { platform: p.platform, timeMs: p.timeMs, state: p.state }; }));
        var future = list.filter(function (e) { return e.state === 'future'; }).length;
        getClouds(c.latitude, c.longitude, function (clouds) {
          send({
            PASSES: history.packTimeline(list, clouds, now),
            GENERATED: Math.round(now / 1000),
            PINS: pins().length,
            MAP_LAND: map.packLand(c.latitude, c.longitude),
            MAP_TRACKS: map.packTracks(tles, list, c.latitude, c.longitude, MAX_PASSES),
            MAP_LOCATION: Math.abs(c.latitude).toFixed(2) + (c.latitude < 0 ? 'S ' : 'N ') +
              Math.abs(c.longitude).toFixed(2) + (c.longitude < 0 ? 'W' : 'E'),
            STATUS: !scenes ? 'NO CATALOGUE: FUTURE ONLY' : future ? '' : 'NO PASS 16 D'
          });
        });
      });
    });
  });
}

// A ground-truth pin: precise location now, tagged with the timeline entry nearest in time (past or
// future). nearest_pass_state says what that entry is: scene (a real acquisition), pending, missed
// (predicted but not acquired) or future (a prediction).
function pin() {
  status('PINNING...');
  locate(true, function (err, c) {
    if (err) return status('PIN FAILED: NO GPS');
    var now = Date.now(), nearest = null;
    load('lastPasses', []).forEach(function (p) {
      if (!nearest || Math.abs(p.timeMs - now) < Math.abs(nearest.timeMs - now)) nearest = p;
    });
    var all = pins();
    all.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [c.longitude, c.latitude] },
      properties: {
        time_utc: new Date(now).toISOString(),
        accuracy_m: Math.round(c.accuracy || 0),
        nearest_pass: nearest ? nearest.platform : null,
        nearest_pass_utc: nearest ? new Date(nearest.timeMs).toISOString() : null,
        nearest_pass_state: nearest ? (nearest.state || 'future') : null,
        minutes_from_pass: nearest ? Math.round((now - nearest.timeMs) / 60000) : null
      }
    });
    if (!save('pins', all)) return status('PIN FAILED: STORAGE');
    send({ PINS: all.length, STATUS: 'PIN ' + all.length + ' SAVED +-' + Math.round(c.accuracy || 0) + ' M' });
  });
}

// Emulator-only offline fixture proves the watch restores its cached map without phone updates.
Pebble.addEventListener('ready', function () { if (!dev.offline) refresh(); });

Pebble.addEventListener('appmessage', function (e) {
  var cmd = e.payload.CMD;
  if (cmd === CMD.REFRESH) refresh();
  if (cmd === CMD.PIN) pin();
});

// Settings page = pin export: the GeoJSON in a text box to copy, plus a clear button.
Pebble.addEventListener('showConfiguration', function () {
  var geojson = JSON.stringify({ type: 'FeatureCollection', features: pins() }, null, 1);
  var html = '<!doctype html><meta name="viewport" content="width=device-width">' +
    '<body style="font-family:sans-serif;background:#000;color:#fa0;padding:12px">' +
    '<h3>Overpass ground-truth pins (' + pins().length + ')</h3>' +
    '<textarea style="width:100%;height:60vh;background:#111;color:#eee">' +
    geojson.replace(/</g, '&lt;') + '</textarea>' +
    '<p><a style="color:#0ff" href="pebblejs://close#">Done</a> &nbsp; ' +
    '<a style="color:#f55" href="pebblejs://close#clear">Clear all pins</a></p></body>';
  Pebble.openURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
});

Pebble.addEventListener('webviewclosed', function (e) {
  if (e && e.response === 'clear') {
    if (!save('pins', [])) return status('CLEAR FAILED: STORAGE');
    send({ PINS: 0, STATUS: 'PINS CLEARED' });
  }
});
