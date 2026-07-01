// scripts/lib/phd-stall-classify.test.mjs
// Run: node scripts/lib/phd-stall-classify.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyDomain, DEFAULTS } from "./phd-stall-classify.mjs";

const plan = (over = {}) => ({
  slot: "cam",
  galaxy: "cam",
  galaxyDir: "mcp-server/src/engines/cam",
  status: "draft",
  acceptanceTargets: [{ metric: "tribal", comparator: ">=", value: 120, unit: "tips" }],
  ...over,
});

// ---- happy / each-branch ----

test("blocked:elevation when task is elevation-blocked", () => {
  const r = classifyDomain(plan(), { taskStatus: "elevation-blocked", taskName: "PRISM OCR Training Loop" });
  assert.equal(r.status, "blocked:elevation");
  assert.match(r.nextAction, /operator/i);
});

test("done when final and acceptance artifact present + fresh", () => {
  const r = classifyDomain(plan({ status: "final" }), { artifactPresent: true, artifactAgeHrs: 5, cadenceHrs: 24 });
  assert.equal(r.status, "done");
});

test("advancing via recent commits", () => {
  const r = classifyDomain(plan(), { commits72h: 3 });
  assert.equal(r.status, "advancing");
  assert.match(r.reason, /commit/);
});

test("advancing via fresh loop tick", () => {
  const r = classifyDomain(plan(), { commits72h: 0, loopTickHrs: 6 });
  assert.equal(r.status, "advancing");
});

test("advancing via healthy task + fresh artifact", () => {
  const r = classifyDomain(plan(), { taskStatus: "healthy", artifactPresent: true, artifactAgeHrs: 5, cadenceHrs: 24 });
  assert.equal(r.status, "advancing");
});

test("stalled:cron-dead when named task is stale + no advancing signal", () => {
  const r = classifyDomain(plan(), { taskStatus: "stale", taskName: "PRISM CAD Gen Loop", commits72h: 0 });
  assert.equal(r.status, "stalled:cron-dead");
  assert.match(r.reason, /PRISM CAD Gen Loop is stale/);
  assert.match(r.nextAction, /re-kick|register/i);
});

test("stalled:cron-dead when deepening task is spec-only", () => {
  const r = classifyDomain(plan(), { taskStatus: "spec-only", commits72h: 0 });
  assert.equal(r.status, "stalled:cron-dead");
  assert.match(r.reason, /spec-only/);
});

// ---- loop-deepened domains (e.g. quebec/frontend-app: no scheduled mine by design) ----

test("loop-deepened + spec-only task + no commits -> NOT cron-dead (no-progress, run the loop)", () => {
  // frontend-app deepens via per-slot /loop, not a galaxy mine. A missing mine task must NOT be
  // reported as a dead cron (the remedy "register a cron" is wrong for it). Pre-fix this returned
  // stalled:cron-dead -> this test fails without the loopDeepened guard.
  const r = classifyDomain(plan({ slot: "quebec", galaxy: "frontend-app", galaxyDir: "mcp-server/src/engines/frontend-app" }), {
    taskStatus: "spec-only",
    taskName: null,
    commits72h: 0,
    commitDir: "mcp-server/web",
    loopTickHrs: null,
    loopDeepened: true,
  });
  assert.notEqual(r.status, "stalled:cron-dead");
  assert.equal(r.status, "stalled:no-progress");
  // R12: even the no-progress reason must name the dir actually counted (web/), not the engine dir.
  assert.match(r.reason, /mcp-server\/web/);
  assert.doesNotMatch(r.reason, /engines\/frontend-app/);
});

test("loop-deepened + recent commits -> advancing (quebec building Kienzle pages)", () => {
  const r = classifyDomain(plan({ slot: "quebec", galaxy: "frontend-app", galaxyDir: "mcp-server/src/engines/frontend-app" }), {
    taskStatus: null,
    taskName: null,
    commits72h: 12,
    commitDir: "mcp-server/web",
    loopDeepened: true,
  });
  assert.equal(r.status, "advancing");
  assert.match(r.reason, /12 commit/);
  // R12: the reason must name the dir actually counted (web/), not the empty engine galaxyDir.
  assert.match(r.reason, /mcp-server\/web/);
  assert.doesNotMatch(r.reason, /engines\/frontend-app/);
});

test("REGRESSION GUARD: non-loop-deepened + spec-only + no commits -> STILL cron-dead", () => {
  // The loopDeepened guard must NOT weaken cron-dead detection for genuine mine-deepened domains.
  const r = classifyDomain(plan(), { taskStatus: "spec-only", taskName: "PRISM Galaxy Mine (cam)", commits72h: 0 });
  assert.equal(r.status, "stalled:cron-dead");
});

test("stalled:artifact-stale when output older than 2x cadence (no other signal)", () => {
  const r = classifyDomain(plan(), { taskStatus: null, artifactPresent: true, artifactAgeHrs: 60, cadenceHrs: 24, commits72h: 0 });
  assert.equal(r.status, "stalled:artifact-stale");
});

test("stalled:no-progress when draft + no commits + no loop tick", () => {
  const r = classifyDomain(plan(), { commits72h: 0, loopTickHrs: null });
  assert.equal(r.status, "stalled:no-progress");
  assert.match(r.reason, /draft/);
});

// ---- adversarial ----

test("ADVERSARIAL: STALE task but fresh commits -> advancing (rescue), NOT cron-dead", () => {
  const r = classifyDomain(plan(), { taskStatus: "stale", taskName: "PRISM CAD Gen Loop", commits72h: 2 });
  assert.equal(r.status, "advancing");
});

test("ADVERSARIAL: final status but MISSING artifact -> stalled:artifact-stale, NOT done", () => {
  const r = classifyDomain(plan({ status: "final" }), { artifactPresent: false, commits72h: 0 });
  assert.equal(r.status, "stalled:artifact-stale");
  assert.match(r.reason, /missing/);
});

test("ADVERSARIAL: final + present but STALE artifact -> stalled:artifact-stale, NOT done", () => {
  const r = classifyDomain(plan({ status: "final" }), { artifactPresent: true, artifactAgeHrs: 100, cadenceHrs: 24, commits72h: 0 });
  assert.equal(r.status, "stalled:artifact-stale");
});

// ---- acceptance computation + nextAction ----

test("acceptance: current value met -> met:true", () => {
  const r = classifyDomain(plan(), { commits72h: 1, acceptanceCurrent: { tribal: 130 } });
  assert.equal(r.acceptance[0].met, true);
  assert.equal(r.acceptance[0].current, 130);
});

test("acceptance: unmet -> nextAction names the deepen target", () => {
  const r = classifyDomain(plan(), { commits72h: 0, loopTickHrs: null, acceptanceCurrent: { tribal: 50 } });
  assert.match(r.nextAction, /deepen tribal to >= 120tips \(now 50\)/);
});

// ---- safety ----

test("null/empty input -> no throw, returns a status string", () => {
  const r = classifyDomain({}, {});
  assert.equal(typeof r.status, "string");
  assert.ok(Array.isArray(r.acceptance));
  assert.equal(DEFAULTS.noProgressHrs, 72);
});

test("threshold knobs honored via opts", () => {
  // a 30h-old artifact is fresh at cadence=24 mult=2 (<=48), stale at mult=1 (<=24)
  const base = { taskStatus: null, artifactPresent: true, artifactAgeHrs: 30, cadenceHrs: 24, commits72h: 0, loopTickHrs: null };
  assert.equal(classifyDomain(plan(), base, { artifactMult: 2 }).status, "stalled:no-progress"); // fresh -> falls through to no-progress (draft)
  assert.equal(classifyDomain(plan(), base, { artifactMult: 1 }).status, "stalled:artifact-stale"); // now stale
});
