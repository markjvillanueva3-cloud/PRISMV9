#!/usr/bin/env node
/**
 * auto-storage-contract.test.mjs -- AUTO-STORAGE-CONTRACT-MS0 (slot:india)
 * Run: node scripts/lib/auto-storage-contract.test.mjs
 *
 * R9: the load-bearing assertion is the NO-DANGLING invariant -- a storage route
 * with no consumer means generated data lands nowhere downstream (the exact
 * open-loop the all-in-one-NN program closes). validateRoutes must catch that.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  STORAGE_ROUTES,
  findRoute,
  consumersFor,
  allConsumers,
  validateRoutes,
} from "./auto-storage-contract.mjs";

test("the live registry passes the no-dangling invariant", () => {
  const v = validateRoutes();
  assert.equal(v.ok, true, `live routes invalid: ${v.errors.join("; ")}`);
  assert.ok(STORAGE_ROUTES.length >= 5, "expect the 5 documented storage pipelines");
});

test("every live route has >=1 consumer (no generated data lands nowhere)", () => {
  for (const r of STORAGE_ROUTES) {
    assert.ok(r.consumers.length >= 1, `${r.dataType} has no consumer`);
  }
});

test("STORAGE_ROUTES + each route are frozen (immutable contract)", () => {
  assert.ok(Object.isFrozen(STORAGE_ROUTES));
  assert.ok(STORAGE_ROUTES.every((r) => Object.isFrozen(r)));
});

test("findRoute resolves a known type and returns null for unknown/garbage", () => {
  assert.equal(findRoute("outcome_event").dataType, "outcome_event");
  assert.equal(findRoute("does-not-exist"), null);
  assert.equal(findRoute(""), null);
  assert.equal(findRoute(42), null);
});

test("consumersFor returns a copy (caller can't mutate the frozen contract)", () => {
  const cs = consumersFor("graph_node");
  assert.ok(cs.length >= 1);
  cs.push("INJECTED");
  assert.ok(!consumersFor("graph_node").includes("INJECTED"), "must return a defensive copy");
  assert.deepEqual(consumersFor("nope"), []);
});

test("allConsumers is deduped + sorted across routes", () => {
  const all = allConsumers();
  assert.ok(all.length > 0);
  assert.deepEqual(all, [...all].sort(), "sorted");
  assert.equal(all.length, new Set(all).size, "deduped");
});

test("outcome_event route reflects the CLOSE-THE-LOOPS emitters + the GNN/LoRA feed", () => {
  const r = findRoute("outcome_event");
  assert.ok(r.note.includes("setup_sheet") && r.note.includes("fusion_bridge"));
  assert.ok(r.consumers.some((c) => c.includes("LoRA")));
  assert.ok(r.consumers.some((c) => c.includes("GNN")));
});

// ---- adversarial: validateRoutes must FAIL on a broken contract ----

test("validateRoutes flags a DANGLING route (zero consumers)", () => {
  const v = validateRoutes([{ dataType: "x", schema: "s", entryPoint: "e", trigger: "sync", consumers: [] }]);
  assert.equal(v.ok, false);
  assert.ok(v.errors.some((e) => /dangling|>= 1 consumer/.test(e)));
});

test("validateRoutes flags a duplicate dataType", () => {
  const r = { dataType: "dup", schema: "s", entryPoint: "e", trigger: "sync", consumers: ["c"] };
  const v = validateRoutes([r, { ...r }]);
  assert.equal(v.ok, false);
  assert.ok(v.errors.some((e) => /duplicate/.test(e)));
});

test("validateRoutes flags an invalid trigger + empty entryPoint", () => {
  const v = validateRoutes([{ dataType: "y", schema: "s", entryPoint: "", trigger: "whenever", consumers: ["c"] }]);
  assert.equal(v.ok, false);
  assert.ok(v.errors.some((e) => /invalid trigger/.test(e)));
  assert.ok(v.errors.some((e) => /empty entryPoint/.test(e)));
});

test("validateRoutes handles non-array input without throwing", () => {
  const v = validateRoutes(null);
  assert.equal(v.ok, false);
  assert.ok(v.errors[0].includes("not an array"));
});
