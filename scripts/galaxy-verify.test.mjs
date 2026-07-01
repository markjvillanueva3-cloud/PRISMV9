// Tests for galaxy-verify (GALAXY-KIT-MS0). node --test. Map-driven asserts (file-content-independent).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifyGalaxy } from './galaxy-verify.mjs';

test('maps slot->galaxy + returns a structured non-empty checks array', () => {
  const r = verifyGalaxy('bravo');
  assert.equal(r.slot, 'bravo');
  assert.equal(r.galaxy, 'hermes-zebra');
  assert.ok(Array.isArray(r.checks) && r.checks.length >= 10, 'at least the kit checks run');
  for (const c of r.checks) { assert.equal(typeof c.pass, 'boolean'); assert.ok(c.label.length > 0); }
  assert.equal(typeof r.pass, 'boolean');
});

test('foxtrot resolves to mill', () => {
  assert.equal(verifyGalaxy('foxtrot').galaxy, 'mill');
});

test('intentionally-unmapped slots return galaxy=null + pass=false (never throw)', () => {
  for (const s of ['november', 'yankee']) {
    const r = verifyGalaxy(s);
    assert.equal(r.galaxy, null, `${s} unmapped`);
    assert.equal(r.pass, false);
  }
});

test('pass is exactly the conjunction of all checks', () => {
  const r = verifyGalaxy('bravo');
  assert.equal(r.pass, r.checks.every((c) => c.pass));
});
