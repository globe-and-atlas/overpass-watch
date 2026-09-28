// Regression check: a failed storage write must not acknowledge a saved pin.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const events = {};
const messages = [];
const context = {
  require: (name) => name === './dev.json' ? {lat:29.76,lon:-95.37} : {},
  localStorage: {getItem: () => null, setItem: () => {throw new Error('QuotaExceededError');}},
  console: {log: () => {}},
  Pebble: {addEventListener: (name, fn) => {events[name] = fn;}, sendAppMessage: (msg) => messages.push(msg)}
};
vm.runInNewContext(fs.readFileSync(new URL('../watchface/src/pkjs/index.js', 'file://' + __filename), 'utf8'), context);
events.appmessage({payload:{CMD:2}});
assert.equal(messages.at(-1).STATUS, 'PIN FAILED: STORAGE');
assert.equal(messages.at(-1).PINS, undefined);
console.log('PASS: failed localStorage write reports failure without incrementing the count.');
