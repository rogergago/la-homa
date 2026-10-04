'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const C = require('../core.js');
const Sync = require('../src/entity-sync.js');
global.HomaSync = Sync;
const Transport = require('../src/cloud-transport.js');

test('household projection round-trips a validated family', () => {
  const state = C.validateState(C.seed('2026-10-04'));
  const back = C.validateState(Transport.assemble(Transport.project(state)));
  assert.equal(JSON.stringify(Transport.canon(back)), JSON.stringify(Transport.canon(state)));
});

test('projection keeps an empty list that was cleared', () => {
  const state = C.validateState(C.seed('2026-10-04'));
  state.shopping = [];
  const back = Transport.assemble(Transport.project(state));
  assert.deepEqual(back.shopping, []);
  assert.ok(Array.isArray(back.finance.ledger));
});

test('public config never contains a secret key', () => {
  const config = fs.readFileSync(require.resolve('../config.js'), 'utf8');
  assert.equal(/sb_secret_/.test(config), false);
  assert.match(config, /sb_publishable_/);
  assert.match(config, /ninlwvvpnemewlcdanzh\.supabase\.co/);
});
