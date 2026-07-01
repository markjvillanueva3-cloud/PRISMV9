/**
 * Tests for the launch-readiness verifier (LAUNCH-FE, 2026-06-23, slot:quebec).
 * Each pure check is exercised with a PASSING and a BROKEN input so the harness
 * provably CATCHES the regression it guards (R9 -- a check that cannot fail is
 * worthless). Run: `node scripts/verify-launch-readiness.test.mjs`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkPrimaryToken,
  checkRouteGates,
  checkShellDeps,
  checkPricing,
  checkKeyFiles,
  checkWebhookSignature,
  checkEntitlementEnforced,
  checkPostAlarmGate,
  checkPostExportFence,
  buildReport,
  EXPECTED_GATES,
  KEY_FILES,
} from './verify-launch-readiness.mjs';

test('checkPrimaryToken: passes when primary color + DEFAULT defined', () => {
  const good = 'colors: { prism: brandBlue, primary: { DEFAULT: brandBlue[600], ...brandBlue }, }';
  const r = checkPrimaryToken(good);
  assert.equal(r.pass, true);
});

test('checkPrimaryToken: FAILS when primary key is missing (the real defect)', () => {
  const broken = 'colors: { prism: { 600: "#4c6ef5" }, accent: "x" }';
  const r = checkPrimaryToken(broken);
  assert.equal(r.pass, false);
  assert.match(r.detail, /MISSING/);
});

test('checkPrimaryToken: FAILS when primary present but no DEFAULT', () => {
  const r = checkPrimaryToken('colors: { primary: { 600: "#4c6ef5" } }');
  assert.equal(r.pass, false);
});

test('checkRouteGates: passes when every expected paid route is gated', () => {
  const app = EXPECTED_GATES.map(
    ([p, k]) => `<Route path="${p}" element={<FeatureGate feature="${k}"><X/></FeatureGate>} />`,
  ).join('\n');
  const r = checkRouteGates(app);
  assert.equal(r.pass, true);
  assert.deepEqual(r.missing, []);
});

test('checkRouteGates: FAILS and names the route when a paid gate is dropped', () => {
  // gate vibration with the WRONG (free) key -> the sfc.sld gate is absent
  const app = '<Route path="vibration" element={<VibrationPage/>} />';
  const r = checkRouteGates(app, [['vibration', 'sfc.sld']]);
  assert.equal(r.pass, false);
  assert.deepEqual(r.missing, ['vibration -> sfc.sld']);
});

test('checkShellDeps: passes when electron + capacitor deps present', () => {
  const pkg = {
    dependencies: { '@capacitor/core': '^6', '@capacitor/cli': '^6' },
    devDependencies: { electron: '^31', 'electron-builder': '^25' },
  };
  assert.equal(checkShellDeps(pkg).pass, true);
});

test('checkShellDeps: FAILS and names the missing dep', () => {
  const pkg = { dependencies: { '@capacitor/core': '^6', '@capacitor/cli': '^6', 'electron-builder': '^25' } };
  const r = checkShellDeps(pkg);
  assert.equal(r.pass, false);
  assert.ok(r.missing.includes('electron'));
});

test('checkPricing: passes with field-anchored one-time SFC/post + paid tiers + matrix', () => {
  const txt = [
    'export const ENTITLEMENT_MATRIX = {};',
    'const PLAN_TIERS = { starter: { monthlyUsd: 29 }, pro: { monthlyUsd: 79 }, shop: { monthlyUsd: 199 }, enterprise: { monthlyUsd: 499 } };',
    "const ONE = { sfc_perpetual: { id: 'sfc_perpetual', priceUsd: 299 }, post_perpetual: { id: 'post_perpetual', priceUsd: 199 } };",
  ].join('\n');
  assert.equal(checkPricing(txt).pass, true);
});

test('checkPricing: FAILS when the SFC one-time price drifts even though 299 appears elsewhere', () => {
  // stray 299 in a comment must NOT mask a drifted sfc_perpetual.priceUsd (the
  // field-anchored regex only accepts 299 INSIDE the sfc_perpetual entry).
  const txt = [
    'export const ENTITLEMENT_MATRIX = {};',
    'const PLAN_TIERS = { starter: { monthlyUsd: 29 }, pro: { monthlyUsd: 79 }, shop: { monthlyUsd: 199 }, enterprise: { monthlyUsd: 499 } };',
    'const note = "see line 299 for details";',
    "const ONE = { sfc_perpetual: { id: 'sfc_perpetual', priceUsd: 399 }, post_perpetual: { id: 'post_perpetual', priceUsd: 199 } };",
  ].join('\n');
  const r = checkPricing(txt);
  assert.equal(r.pass, false);
  assert.ok(r.missing.includes('one-time SFC perpetual $299'));
});

test('checkKeyFiles: passes when all files exist, FAILS and names a missing one', () => {
  assert.equal(checkKeyFiles(() => true).pass, true);
  const missingOne = (f) => f !== KEY_FILES[0];
  const r = checkKeyFiles(missingOne);
  assert.equal(r.pass, false);
  assert.deepEqual(r.missing, [KEY_FILES[0]]);
});

// ---- cross-slot + safety launch gates ------------------------------------

test('checkWebhookSignature: passes when the webhook verifies the Stripe signature', () => {
  const good = 'const ok = verifyStripeSignature(rawBody, sig, secret); if (!ok) res.status(400);';
  assert.equal(checkWebhookSignature(good).pass, true);
});

test('checkWebhookSignature: FAILS when the webhook never verifies (the security P0)', () => {
  const broken = 'const event = JSON.parse(req.body); applyWebhook(event); // no signature check';
  const r = checkWebhookSignature(broken);
  assert.equal(r.pass, false);
  assert.match(r.detail, /security P0/);
});

test('checkEntitlementEnforced: passes when the paid SFC route uses requireTier', () => {
  const good = 'router.post("/calculate", requireFields("material"), requireTier("speed_feed"), handler);';
  assert.equal(checkEntitlementEnforced(good).pass, true);
});

test('checkEntitlementEnforced: FAILS when the paid route is ungated', () => {
  const broken = 'router.post("/calculate", requireFields("material"), handler);';
  assert.equal(checkEntitlementEnforced(broken).pass, false);
});

test('checkPostAlarmGate: passes when P5 cross-references the AlarmRegistry', () => {
  const good = 'await _localRunStageAsync("5.1b_alarm_check", 5, async () => { const alarmReg = new AlarmRegistry(); alarmReg.search(); });';
  assert.equal(checkPostAlarmGate(good).pass, true);
});

test('checkPostAlarmGate: FAILS when the alarm DB is not checked in the pipeline', () => {
  const broken = 'await runStage("5.10_omega_safety_gate", 5, async () => { scoreSafety(); });';
  const r = checkPostAlarmGate(broken);
  assert.equal(r.pass, false);
  assert.match(r.detail, /alarm/);
});

test('checkPostExportFence: passes when unvalidated output is fenced PREVIEW-ONLY', () => {
  const good = 'export const H = "( PREVIEW ONLY -- NOT MACHINE READY )"; const s = validated ? "_PRISM_optimized.nc" : "_PREVIEW_unvalidated.nc";';
  assert.equal(checkPostExportFence(good).pass, true);
});

test('checkPostExportFence: FAILS when every export gets the validated filename', () => {
  const broken = 'function suffix() { return "_PRISM_optimized.nc"; }';
  assert.equal(checkPostExportFence(broken).pass, false);
});

test('buildReport: ok=true only when every check passes', () => {
  const allPass = buildReport([{ name: 'a', pass: true }, { name: 'b', pass: true }]);
  assert.equal(allPass.ok, true);
  assert.equal(allPass.passed, 2);
  const oneFail = buildReport([{ name: 'a', pass: true }, { name: 'b', pass: false }]);
  assert.equal(oneFail.ok, false);
  assert.deepEqual(oneFail.failing, ['b']);
});
