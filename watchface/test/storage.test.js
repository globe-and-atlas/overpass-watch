const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function phone(fail) {
  const events = {}, messages = [], storage = {};
  const context = {
    require: name => name === './dev.json' ? {lat:29.76,lon:-95.37} : {},
    localStorage: {
      getItem: key => storage[key] || null,
      setItem: (key,value) => { if(fail) throw new Error('QuotaExceededError'); storage[key] = value; }
    },
    console: {log: () => {}},
    Pebble: {addEventListener: (name,fn) => {events[name]=fn;}, sendAppMessage: msg => messages.push(msg)}
  };
  vm.runInNewContext(fs.readFileSync(new URL('../src/pkjs/index.js', 'file://' + __filename),'utf8'),context);
  return {events,messages,storage};
}

test('failed storage does not acknowledge or count a pin', () => {
  const p=phone(true); p.events.appmessage({payload:{CMD:2}});
  assert.equal(p.messages.at(-1).STATUS,'PIN FAILED: STORAGE');
  assert.equal(p.messages.at(-1).PINS,undefined);
  assert.equal(p.storage.pins,undefined);
});
test('successful pin acknowledgement matches the stored GeoJSON feature', () => {
  const p=phone(false); p.events.appmessage({payload:{CMD:2}});
  const pins=JSON.parse(p.storage.pins);
  assert.equal(pins.length,1);
  assert.deepEqual(pins[0].geometry.coordinates,[-95.37,29.76]);
  assert.equal(p.messages.at(-1).PINS,1);
  assert.match(p.messages.at(-1).STATUS,/SAVED/);
});
test('failed clear does not report an empty collection', () => {
  const p=phone(true); p.events.webviewclosed({response:'clear'});
  assert.equal(p.messages.at(-1).STATUS,'CLEAR FAILED: STORAGE');
  assert.equal(p.messages.at(-1).PINS,undefined);
});
