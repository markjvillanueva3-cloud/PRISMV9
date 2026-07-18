/**
 * fleet-task-health-owner-map.test.mjs -- U-GOLF-TASK-OWNER-MAP.
 *
 * Verifies the deterministic task -> owner-slot routing that the watchdog
 * attaches to its WARN/autoheal chat-bus advisories, so a peer slot can filter
 * the bus on its own name instead of a model re-deriving ownership each audit
 * (Theme D, R5). Encodes WHY (R9): the routing must be a pure deterministic
 * transform, the map must stay in lock-step with KNOWN_PRISM_TASKS (drift guard),
 * and the advisory record must surface the owners without ever throwing.
 *
 * node:test (NOT vitest) -- the scripts/ convention.
 *   Run: node --test H:/prism/scripts/__tests__/fleet-task-health-owner-map.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  TASK_OWNER_DOMAIN,
  DEFAULT_OWNER,
  ownerForTask,
  routeDegradedToOwners,
  buildTaskHealthAdvisoryRecord,
  KNOWN_PRISM_TASKS,
  FORWARD_PROVISIONED_OWNER_TASKS,
} from "../fleet-task-health-watch.mjs";

test("ownerForTask: a mapped task returns its owner slot (Blueprint OCR Batch -> xray)", () => {
  assert.equal(ownerForTask("PRISM Blueprint OCR Batch"), "xray");
  assert.equal(ownerForTask("PRISM Fleet Reaper"), "golf");
  assert.equal(ownerForTask("PRISM NN-Graph Retrain"), "india");
  assert.equal(ownerForTask("PRISM SFC Variability Guard"), "oscar");
});

test("ownerForTask: an unmapped or non-string task falls back to golf (the watchdog triager)", () => {
  assert.equal(DEFAULT_OWNER, "golf");
  assert.equal(ownerForTask("PRISM Some Brand New Task"), "golf");
  assert.equal(ownerForTask(null), "golf");
  assert.equal(ownerForTask(undefined), "golf");
  assert.equal(ownerForTask(42), "golf");
});

test("routeDegradedToOwners: routes a crash-critical AND a non-crash-critical task, deduped + sorted (the done-criterion)", () => {
  // Fleet Reaper + Fleet Memory Monitor are crash-critical -> golf; Blueprint OCR
  // Batch is NOT crash-critical -> xray. golf appears twice but is deduped to one.
  const r = routeDegradedToOwners([
    "PRISM Fleet Reaper", "PRISM Blueprint OCR Batch", "PRISM Fleet Memory Monitor",
  ]);
  assert.deepEqual(r.to, ["golf", "xray"]);
  assert.equal(r.byTask["PRISM Fleet Reaper"], "golf");
  assert.equal(r.byTask["PRISM Blueprint OCR Batch"], "xray");
  assert.equal(r.byTask["PRISM Fleet Memory Monitor"], "golf");
});

test("routeDegradedToOwners: empty / non-array / blank entries -> {to:[], byTask:{}} (never throws)", () => {
  assert.deepEqual(routeDegradedToOwners([]), { to: [], byTask: {} });
  assert.deepEqual(routeDegradedToOwners(null), { to: [], byTask: {} });
  assert.deepEqual(routeDegradedToOwners(undefined), { to: [], byTask: {} });
  assert.deepEqual(routeDegradedToOwners(["", "  "]), { to: [], byTask: {} });
});

test("TASK_OWNER_DOMAIN completeness: every KNOWN_PRISM_TASKS name has an explicit owner (drift guard, R9)", () => {
  // A task added to KNOWN without an owner must fail LOUD here -- the same
  // green-but-blind drift class detectInstallerDrift guards, applied to ownership.
  const unmapped = KNOWN_PRISM_TASKS.filter((t) => !(t in TASK_OWNER_DOMAIN));
  assert.deepEqual(unmapped, [], `KNOWN tasks missing an owner entry: ${unmapped.join(", ")}`);
  for (const [task, owner] of Object.entries(TASK_OWNER_DOMAIN)) {
    assert.ok(typeof owner === "string" && /^[a-z]+$/.test(owner), `bad owner for ${task}: ${owner}`);
  }
});

test("TASK_OWNER_DOMAIN reverse guard: every map key is in KNOWN or the forward-provisioned allowlist (catches typo/dead keys, R9)", () => {
  // Symmetric complement of the KNOWN-subset-of-MAP guard above. A map key that is
  // NEITHER a live KNOWN task NOR a documented forward-provisioned cron is a typo or
  // a dead entry pointing at a renamed/removed task -> fail loud (closes the P3 all
  // 3 scrutiny reviewers flagged on the one-directional original guard).
  const allowed = new Set([...KNOWN_PRISM_TASKS, ...FORWARD_PROVISIONED_OWNER_TASKS]);
  const stray = Object.keys(TASK_OWNER_DOMAIN).filter((k) => !allowed.has(k));
  assert.deepEqual(stray, [], `owner-map keys not in KNOWN or forward-provisioned: ${stray.join(", ")}`);
  // The forward-provisioned allowlist must not itself rot: each name must actually
  // be a map key, else the allowlist documents a task the map no longer owns.
  const orphanForward = FORWARD_PROVISIONED_OWNER_TASKS.filter((t) => !(t in TASK_OWNER_DOMAIN));
  assert.deepEqual(orphanForward, [], `forward-provisioned tasks missing from the map: ${orphanForward.join(", ")}`);
});

test("buildTaskHealthAdvisoryRecord: carries deterministic `to` + ownersByTask and appends [owners:] to the message", () => {
  const rec = buildTaskHealthAdvisoryRecord({
    ts: "2026-06-10T01:00:00.000Z", level: "warn", taskCount: 40, healthyCount: 38,
    degraded: [{ name: "PRISM Blueprint OCR Batch", status: "stale", reason: "old" }],
    missing: ["PRISM NN-Graph Retrain"],
    head: "PRISM scheduled-task safety net degraded (WARN)",
    detail: "two tasks degraded", fix: "re-register from an ELEVATED shell",
  });
  assert.equal(rec.kind, "task-health");
  assert.equal(rec.from, "fleet-task-health-watch");
  assert.deepEqual(rec.to, ["india", "xray"]);   // OCR->xray, NN-Graph->india, sorted
  assert.equal(rec.ownersByTask["PRISM Blueprint OCR Batch"], "xray");
  assert.equal(rec.ownersByTask["PRISM NN-Graph Retrain"], "india");
  assert.match(rec.message, /\[owners: india, xray\]/);
  // no degraded + no missing -> no owners clause (silent, no trailing tag).
  const clean = buildTaskHealthAdvisoryRecord({
    ts: "t", level: "warn", taskCount: 1, healthyCount: 1,
    degraded: [], missing: [], head: "H", detail: "D", fix: "F",
  });
  assert.deepEqual(clean.to, []);
  assert.doesNotMatch(clean.message, /\[owners:/);
});
