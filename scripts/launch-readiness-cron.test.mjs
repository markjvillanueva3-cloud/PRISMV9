/**
 * Tests for the launch-readiness cron drift logic (LAUNCH-FE, 2026-06-23, slot:quebec).
 * detectDrift must alert on a NEW regression but never spam on a persistent failure.
 * Run: `node scripts/launch-readiness-cron.test.mjs`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectDrift, formatAlert } from './launch-readiness-cron.mjs';

const PASS = { ok: true, passed: 5, total: 5, failing: [], checks: [{ name: 'a', pass: true }, { name: 'b', pass: true }] };
const FAIL_B = { ok: false, passed: 4, total: 5, failing: ['b'], checks: [{ name: 'a', pass: true }, { name: 'b', pass: false }] };

test('detectDrift: no drift when prev and curr both pass', () => {
  const d = detectDrift(PASS, PASS);
  assert.equal(d.regressed, false);
  assert.deepEqual(d.newFailures, []);
});

test('detectDrift: regression when a previously-passing check newly fails', () => {
  const d = detectDrift(PASS, FAIL_B);
  assert.equal(d.regressed, true);
  assert.deepEqual(d.newFailures, ['b']);
});

test('detectDrift: no prev + curr fails => regressed (first run already broken)', () => {
  const d = detectDrift(null, FAIL_B);
  assert.equal(d.regressed, true);
  assert.deepEqual(d.newFailures, ['b']);
});

test('detectDrift: no prev + curr passes => not regressed', () => {
  assert.equal(detectDrift(null, PASS).regressed, false);
});

test('detectDrift: a persistently-failing check is NOT a new regression (no alert spam)', () => {
  const d = detectDrift(FAIL_B, FAIL_B);
  assert.equal(d.regressed, false);
  assert.deepEqual(d.newFailures, []);
});

test('formatAlert: includes REGRESSION + the failing check name + the re-run command', () => {
  const a = formatAlert('2026-06-23T00:00:00Z', { newFailures: ['design.primary-token'] }, FAIL_B);
  assert.match(a, /REGRESSION/);
  assert.match(a, /design\.primary-token/);
  assert.match(a, /verify-launch-readiness/);
});
