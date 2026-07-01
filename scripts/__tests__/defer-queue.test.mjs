// TOKEN-SAVINGS-PIVOT/U-PSN-DEFER-QUEUE (iter15, 2026-05-23, slot:alpha)
// Tests for the deferred-action queue lib.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isDeferrable,
  pushToQueue,
  itemsForSession,
  drainSession,
  formatDrainBlock,
  DEFERRABLE_CLASSIFIERS,
  QUEUE_MAX_ITEMS,
  SCHEMA_VERSION,
} from "../lib/defer-queue.mjs";

// --- isDeferrable: classifier eligibility ---

test("isDeferrable: backendAuditChain → true", () => {
  assert.equal(isDeferrable("backendAuditChain"), true);
});

test("isDeferrable: doctrineSurface → true", () => {
  assert.equal(isDeferrable("doctrineSurface"), true);
});

test("isDeferrable: isBroadGrep → false (actionable mid-task)", () => {
  // Broad-Grep nudges ARE actionable mid-task (operator can switch to
  // master_index_query immediately); they should NOT be deferred.
  assert.equal(isDeferrable("isBroadGrep"), false);
});

test("isDeferrable: null/undefined/non-string → false", () => {
  assert.equal(isDeferrable(null), false);
  assert.equal(isDeferrable(undefined), false);
  assert.equal(isDeferrable(42), false);
  assert.equal(isDeferrable({}), false);
});

// --- pushToQueue ---

test("pushToQueue: adds item to empty queue", () => {
  const out = pushToQueue(null, {
    sessionId: "95e7030e",
    classifier: "backendAuditChain",
    filePath: "engines/Foo.ts",
    hint: "run audit chain",
  });
  assert.equal(out.items.length, 1);
  assert.equal(out.items[0].classifier, "backendAuditChain");
  assert.equal(out.items[0].filePath, "engines/Foo.ts");
  assert.equal(out.schemaVersion, SCHEMA_VERSION);
});

test("pushToQueue: prepends (newest first)", () => {
  let q = pushToQueue(null, { sessionId: "a", classifier: "doctrineSurface", hint: "first" });
  q = pushToQueue(q, { sessionId: "a", classifier: "backendAuditChain", hint: "second" });
  assert.equal(q.items[0].classifier, "backendAuditChain", "newest first");
  assert.equal(q.items[1].classifier, "doctrineSurface");
});

test("pushToQueue: caps at QUEUE_MAX_ITEMS", () => {
  let q = { schemaVersion: SCHEMA_VERSION, items: [] };
  for (let i = 0; i < QUEUE_MAX_ITEMS + 50; i++) {
    q = pushToQueue(q, { sessionId: "test", classifier: "backendAuditChain", hint: `item-${i}` });
  }
  assert.equal(q.items.length, QUEUE_MAX_ITEMS, `cap at ${QUEUE_MAX_ITEMS}`);
  // Newest at front, oldest evicted
  assert.ok(q.items[0].hint.includes(`item-${QUEUE_MAX_ITEMS + 49}`));
});

test("pushToQueue: non-object item passed through without crash", () => {
  const out = pushToQueue(null, null);
  assert.equal(out.items.length, 0);
});

test("pushToQueue: defaults missing fields", () => {
  const out = pushToQueue(null, { classifier: "doctrineSurface" });
  assert.ok(out.items[0].ts);
  assert.equal(out.items[0].sessionId, "");
});

// --- itemsForSession ---

test("itemsForSession: filters by session prefix match", () => {
  let q = pushToQueue(null, { sessionId: "95e7030e", classifier: "backendAuditChain" });
  q = pushToQueue(q, { sessionId: "047e0a72", classifier: "doctrineSurface" });
  const mine = itemsForSession(q, "95e7030e-full-uuid");
  assert.equal(mine.length, 1);
  assert.equal(mine[0].classifier, "backendAuditChain");
});

test("itemsForSession: exact session match", () => {
  const q = pushToQueue(null, { sessionId: "abcd1234", classifier: "backendAuditChain" });
  const mine = itemsForSession(q, "abcd1234");
  assert.equal(mine.length, 1);
});

test("itemsForSession: empty queue → []", () => {
  assert.deepEqual(itemsForSession(null, "x"), []);
  assert.deepEqual(itemsForSession({ items: [] }, "x"), []);
});

test("itemsForSession: no sessionId → []", () => {
  const q = pushToQueue(null, { sessionId: "x", classifier: "doctrineSurface" });
  assert.deepEqual(itemsForSession(q, ""), []);
  assert.deepEqual(itemsForSession(q, null), []);
});

// --- drainSession ---

test("drainSession: removes session items + returns drained", () => {
  let q = pushToQueue(null, { sessionId: "a", classifier: "backendAuditChain" });
  q = pushToQueue(q, { sessionId: "b", classifier: "doctrineSurface" });
  q = pushToQueue(q, { sessionId: "a", classifier: "doctrineSurface" });

  const { remaining, drained } = drainSession(q, "a");
  assert.equal(drained.length, 2);
  assert.equal(remaining.items.length, 1);
  assert.equal(remaining.items[0].sessionId, "b");
});

test("drainSession: no matches → original queue + empty drained", () => {
  const q = pushToQueue(null, { sessionId: "x", classifier: "backendAuditChain" });
  const { remaining, drained } = drainSession(q, "nomatch");
  assert.equal(remaining.items.length, 1);
  assert.equal(drained.length, 0);
});

test("drainSession: null queue → safe defaults", () => {
  const { remaining, drained } = drainSession(null, "x");
  assert.deepEqual(drained, []);
  assert.deepEqual(remaining.items, []);
});

// --- formatDrainBlock ---

test("formatDrainBlock: empty drained → null", () => {
  assert.equal(formatDrainBlock([]), null);
  assert.equal(formatDrainBlock(null), null);
});

test("formatDrainBlock: groups by classifier", () => {
  const drained = [
    { classifier: "backendAuditChain", filePath: "a.ts" },
    { classifier: "backendAuditChain", filePath: "b.ts" },
    { classifier: "doctrineSurface", filePath: "c.ts" },
  ];
  const block = formatDrainBlock(drained);
  assert.ok(block.includes("backendAuditChain (2)"));
  assert.ok(block.includes("doctrineSurface (1)"));
  assert.ok(block.includes("3 deferred advisories"));
  assert.ok(block.includes("a.ts"));
  assert.ok(block.includes("c.ts"));
});

test("formatDrainBlock: caps per-group output (overflow shown)", () => {
  const drained = [];
  for (let i = 0; i < 10; i++) drained.push({ classifier: "backendAuditChain", filePath: `file-${i}.ts` });
  const block = formatDrainBlock(drained, { perGroupCap: 3 });
  assert.ok(block.includes("file-0.ts"));
  assert.ok(block.includes("file-2.ts"));
  assert.ok(!block.includes("file-5.ts"), "items past cap should not appear");
  assert.ok(block.includes("…and 7 more"));
});

test("formatDrainBlock: surfaces concrete MCP routes in footer", () => {
  const drained = [{ classifier: "doctrineSurface", filePath: "x" }];
  const block = formatDrainBlock(drained);
  // Per the U-PSN-OLLAMA-VERB-TRIGGER-R12-FIX doctrine, every drain block
  // names concrete MCP actions that operator can run, not vague advice.
  assert.ok(block.includes("prism_dev:code_search"));
  assert.ok(block.includes("prism_session:dispatcher_map_compact"));
  assert.ok(block.includes("prism_dev:ollama_hook_query"));
});

test("formatDrainBlock: includes kill-switch reference", () => {
  const drained = [{ classifier: "backendAuditChain", filePath: "x" }];
  const block = formatDrainBlock(drained);
  assert.ok(block.includes("PRISM_DEFER_QUEUE_DISABLE=1"));
});

// --- shape contracts ---

test("DEFERRABLE_CLASSIFIERS: contains exactly backendAuditChain + doctrineSurface", () => {
  assert.equal(DEFERRABLE_CLASSIFIERS.size, 2);
  assert.ok(DEFERRABLE_CLASSIFIERS.has("backendAuditChain"));
  assert.ok(DEFERRABLE_CLASSIFIERS.has("doctrineSurface"));
});

test("QUEUE_MAX_ITEMS: reasonable bound (not unbounded)", () => {
  assert.ok(QUEUE_MAX_ITEMS > 50);
  assert.ok(QUEUE_MAX_ITEMS <= 1000);
});
