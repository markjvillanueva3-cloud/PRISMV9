/**
 * leverage-wiring-queue.test.mjs — node:test for the pure leverage-queue core.
 * Run: node --test scripts/lib/leverage-wiring-queue.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { extractWiringQueue, queueTotals } from "./leverage-wiring-queue.mjs";

const ARCH = "H:/prism/state/shared/system-viz/architecture-graph.json";

// --- happy path: synthetic graph with known ordering ---
test("ranks by leverageScore desc, then unwired desc, then domain asc", () => {
  const g = { nodes: [
    { id: "eng.alpha", domain: "alpha", unwired: 5, coverage_pct: 90, suggestedDispatchers: ["disp.a"], unlocks: { leverageScore: 10, dispatchersGain: 1, downstreamHops: 2 } },
    { id: "eng.bravo", domain: "bravo", unwired: 20, coverage_pct: 50, suggestedDispatchers: [], unlocks: { leverageScore: 66, dispatchersGain: 3, downstreamHops: 2 } },
    { id: "eng.charlie", domain: "charlie", unwired: 3, coverage_pct: 99, suggestedDispatchers: ["disp.c"], unlocks: { leverageScore: 10, dispatchersGain: 1, downstreamHops: 1 } },
  ] };
  const q = extractWiringQueue(g);
  assert.equal(q.length, 3);
  assert.equal(q[0].domain, "bravo"); // highest leverageScore
  // tie at 10 between alpha(unwired5) and charlie(unwired3) -> alpha first (unwired desc)
  assert.equal(q[1].domain, "alpha");
  assert.equal(q[2].domain, "charlie");
  // monotonic non-increasing leverageScore
  for (let i = 1; i < q.length; i++) assert.ok(q[i - 1].leverageScore >= q[i].leverageScore);
});

test("flags rows with no suggested dispatcher (needs inference)", () => {
  const g = { nodes: [{ id: "eng.bravo", domain: "bravo", unwired: 20, suggestedDispatchers: [], unlocks: { leverageScore: 66 } }] };
  const q = extractWiringQueue(g);
  assert.equal(q[0].needsDispatcherInference, true);
});

test("uses graph leverageScore when present (scoreSource=graph)", () => {
  const q = extractWiringQueue({ nodes: [{ id: "eng.x", unwired: 2, unlocks: { leverageScore: 42 } }] });
  assert.equal(q[0].leverageScore, 42);
  assert.equal(q[0].scoreSource, "graph");
});

// --- failure modes ---
test("derives a fallback score when unlocks.leverageScore is missing", () => {
  const q = extractWiringQueue({ nodes: [{ id: "eng.x", unwired: 4, unlocks: { dispatchersGain: 2, downstreamHops: 3 } }] });
  assert.equal(q[0].scoreSource, "derived");
  assert.equal(q[0].leverageScore, 4 * 2 * 3); // unwired × dg × dh
});

test("graph leverageScore=0 (dispatchersGain=0) is treated as un-attributed, not lowest-priority", () => {
  // The dominant real-data case: a 69-engine catchall the graph couldn't attribute a dispatcher
  // to emits leverageScore:0 / dispatchersGain:0. It must NOT sort last — it's the biggest bucket.
  const q = extractWiringQueue({ nodes: [
    { id: "eng.misc", domain: "MiscDomains", unwired: 69, suggestedDispatchers: [], unlocks: { leverageScore: 0, dispatchersGain: 0, downstreamHops: 2 } },
    { id: "eng.small", domain: "Small", unwired: 2, suggestedDispatchers: ["disp.s"], unlocks: { leverageScore: 6, dispatchersGain: 3, downstreamHops: 1 } },
  ] });
  assert.equal(q[0].domain, "MiscDomains");        // 69-engine bucket ranks FIRST, not last
  assert.equal(q[0].scoreSource, "derived");       // graph-0 routed to derived
  assert.equal(q[0].leverageScore, 69 * 1 * 2);    // dispatchersGain:0 clamps to 1
  assert.equal(q[0].needsDispatcherInference, true); // and still flagged as blocked-on-inference
});

test("empty / null / malformed graph -> empty queue, never throws", () => {
  assert.deepEqual(extractWiringQueue(null), []);
  assert.deepEqual(extractWiringQueue({}), []);
  assert.deepEqual(extractWiringQueue({ nodes: null }), []);
  assert.deepEqual(extractWiringQueue({ nodes: [null, 42, "x", {}] }), []);
});

test("excludes nodes with no/zero/negative/NaN unwired and non-engine ids", () => {
  const g = { nodes: [
    { id: "eng.zero", unwired: 0, unlocks: { leverageScore: 9 } },
    { id: "eng.neg", unwired: -3, unlocks: { leverageScore: 9 } },
    { id: "eng.nan", unwired: "oops", unlocks: { leverageScore: 9 } },
    { id: "disp.notengine", unwired: 5, unlocks: { leverageScore: 9 } },
    { id: "eng.real", unwired: 1, unlocks: { leverageScore: 9 } },
  ] };
  const q = extractWiringQueue(g);
  assert.equal(q.length, 1);
  assert.equal(q[0].id, "eng.real");
});

// --- adversarial ---
test("non-finite leverageScore in graph falls back, never NaN-sorts unpredictably", () => {
  const q = extractWiringQueue({ nodes: [
    { id: "eng.inf", unwired: 2, unlocks: { leverageScore: Infinity, dispatchersGain: 1, downstreamHops: 1 } },
    { id: "eng.ok", unwired: 2, unlocks: { leverageScore: 5 } },
  ] });
  // Infinity is not finite -> derived (2*1*1=2); eng.ok=5 ranks first
  assert.equal(q[0].id, "eng.ok");
  assert.ok(Number.isFinite(q[0].leverageScore) && Number.isFinite(q[1].leverageScore));
});

test("queueTotals sums unwired + counts inference-needed", () => {
  const rows = extractWiringQueue({ nodes: [
    { id: "eng.a", unwired: 10, suggestedDispatchers: [], unlocks: { leverageScore: 5 } },
    { id: "eng.b", unwired: 4, suggestedDispatchers: ["disp.b"], unlocks: { leverageScore: 9 } },
  ] });
  const t = queueTotals(rows);
  assert.equal(t.domains, 2);
  assert.equal(t.unwiredEngines, 14);
  assert.equal(t.needInference, 1);
  assert.deepEqual(queueTotals(null), { domains: 0, unwiredEngines: 0, needInference: 0 });
});

// --- real-data E2E (the "hermetic fakes don't prove production" guard) ---
test("real architecture-graph.json yields a valid ranked queue", () => {
  if (!fs.existsSync(ARCH)) { console.log("  (skip: arch-graph absent)"); return; }
  const g = JSON.parse(fs.readFileSync(ARCH, "utf8"));
  const q = extractWiringQueue(g);
  assert.ok(q.length >= 1, "expected >=1 unwired domain in the live graph");
  assert.ok(q[0].leverageScore > 0, "top row must have real leverage (catches a whole-queue-zeroed regression)");
  for (let i = 1; i < q.length; i++) assert.ok(q[i - 1].leverageScore >= q[i].leverageScore, "must be leverage-ranked");
  for (const r of q) {
    assert.ok(r.unwired > 0, "queue rows must have real wiring debt");
    assert.ok(Number.isFinite(r.leverageScore), "every row has a finite leverage score");
    assert.ok(typeof r.domain === "string" && r.domain.length > 0);
  }
});
