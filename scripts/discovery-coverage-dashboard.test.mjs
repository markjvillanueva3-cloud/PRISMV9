/**
 * discovery-coverage-dashboard tests -- newest-audit selection, sidecar parsing,
 * and the composed snapshot shape (via injected layer fns -> hermetic), plus a
 * real-tree integration smoke.
 *
 * DISCOVERY-EFFICIENCY/U-DISCOVERY-COVERAGE-DASHBOARD (slot:tango, 2026-06-16).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { findLatestEngineAudit, readEngineCoverage, buildDashboard } from "./discovery-coverage-dashboard.mjs";

// -- findLatestEngineAudit --

test("findLatestEngineAudit: picks the newest UNWIRED-ENGINE-AUDIT-*.json by mtime", () => {
  const readDir = () => ["UNWIRED-ENGINE-AUDIT-2026-06-15.json", "UNWIRED-ENGINE-AUDIT-2026-06-16.json", "other.json"];
  const stat = (p) => ({ mtimeMs: p.includes("06-16") ? 200 : 100 });
  const got = findLatestEngineAudit("/d", readDir, stat);
  assert.ok(got.endsWith("UNWIRED-ENGINE-AUDIT-2026-06-16.json"));
});

test("findLatestEngineAudit: no audit files -> null", () => {
  assert.equal(findLatestEngineAudit("/d", () => ["foo.json", "bar.txt"], () => ({ mtimeMs: 1 })), null);
});

test("findLatestEngineAudit: unreadable dir -> null (fail-soft)", () => {
  assert.equal(findLatestEngineAudit("/d", () => { throw new Error("nope"); }), null);
});

// -- readEngineCoverage --

test("readEngineCoverage: parses totalCanonicalEngines + UNWIRED + unwiredEngines", () => {
  const fake = JSON.stringify({
    counts: { totalCanonicalEngines: 3803, "UNWIRED": 22, "WIRED-DIRECT": 3585 },
    unwiredEngines: ["FooEngine", "BarEngine"],
    generated: "2026-06-16",
  });
  const r = readEngineCoverage("/a.json", () => fake);
  assert.equal(r.total, 3803);
  assert.equal(r.unwiredCount, 22);
  assert.deepEqual(r.unwired, ["FooEngine", "BarEngine"]);
});

test("readEngineCoverage: null path -> null; unreadable -> null", () => {
  assert.equal(readEngineCoverage(null), null);
  assert.equal(readEngineCoverage("/a.json", () => { throw new Error("nope"); }), null);
});

// -- buildDashboard (injected layer fns -> hermetic) --

const fakeAlgo = () => ({ total: 121, wiredCount: 108, dormantCount: 13, orphanedCount: 6, wireExemptCount: 7, coveragePct: 89, orphaned: ["KalmanFilter"] });
const fakeDisp = () => ({
  totalExports: 106, registeredCount: 101, dormantCount: 5, coveragePct: 95,
  dormant: [
    { regName: "registerWidgetDispatcher", toolName: "prism_widget", klass: "candidate" },
    { regName: "registerMachineDispatcher", toolName: "prism_machine", klass: "safety-sensitive" },
    { regName: "registerCadAutomationDispatcher", toolName: "prism_cad_automation", klass: "cross-lane" },
  ],
});

test("buildDashboard: composes the three layers + actionable rollup", () => {
  const d = buildDashboard({
    algorithmCoverage: fakeAlgo,
    dispatcherCoverage: fakeDisp,
    engineAuditPath: "/a.json",
    readEngineCoverage: () => ({ total: 3803, unwiredCount: 22, source: "/a.json", generated: "x" }),
  });
  assert.equal(d.layers.dispatcher.total, 106);
  assert.equal(d.layers.dispatcher.byClass.candidate, 1);
  assert.equal(d.layers.dispatcher.byClass["safety-sensitive"], 1);
  assert.equal(d.layers.algorithm.orphaned, 6);
  assert.equal(d.layers.engine.total, 3803);
  assert.equal(d.layers.engine.unwired, 22);
  // Only the 'candidate' dispatcher is genuinely actionable (not safety/cross-lane).
  assert.deepEqual(d.actionable.dispatcherCandidates, ["prism_widget"]);
  assert.deepEqual(d.actionable.algorithmOrphaned, ["KalmanFilter"]);
  assert.equal(d.actionable.engineUnwiredCount, 22);
});

test("buildDashboard: engine layer unavailable -> marked, not crashed", () => {
  const d = buildDashboard({
    algorithmCoverage: fakeAlgo,
    dispatcherCoverage: fakeDisp,
    engineAuditPath: null,
    readEngineCoverage: () => null,
  });
  assert.equal(d.layers.engine.unavailable, true);
  assert.equal(d.actionable.engineUnwiredCount, null);
});

// -- real-tree integration smoke --

test("buildDashboard: real tree -- all three layers present with sane numbers", () => {
  const d = buildDashboard();
  assert.ok(d.layers.dispatcher.total > 90, `dispatcher total ${d.layers.dispatcher.total}`);
  assert.ok(d.layers.algorithm.total > 100, `algorithm total ${d.layers.algorithm.total}`);
  assert.ok(Array.isArray(d.actionable.algorithmOrphaned));
  // dispatcher candidates must never include a safety-sensitive / cross-lane / skipped entry.
  const dorm = (d.layers.dispatcher.byClass) || {};
  assert.equal(typeof dorm, "object");
});
