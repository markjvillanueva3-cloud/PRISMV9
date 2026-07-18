// scripts/lib/path-replay-advise-core.test.mjs — WORKING-PATH-CAPTURE-MS0 / U-WPC-REPLAY-WIRE (alpha, 2026-05-31).
// Hermetic: injected slotsRaw / findFn / throttle read+write — no fs, no chat-slots dependency.
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveSlot, adviseReplay, formatAdvisory, throttled, DEFAULT_THROTTLE_MS } from "./path-replay-advise-core.mjs";

test("resolveSlot matches a slot whose chatId contains the session_id prefix", () => {
  const slotsRaw = { slots: { delta: { chatId: "claude-da9aacf5-xyz" }, kilo: { chatId: "claude-11112222" } } };
  assert.equal(resolveSlot("da9aacf5-7d0a-4de6", slotsRaw), "delta");
  assert.equal(resolveSlot("11112222-aaaa", slotsRaw), "kilo");
  assert.equal(resolveSlot("ffffffff-no-match", slotsRaw), null);
  assert.equal(resolveSlot("", slotsRaw), null);
  assert.equal(resolveSlot("da9aacf5", { slots: {} }), null);
});

test("adviseReplay returns an advisory for a domain slot WITH proven paths", () => {
  const findFn = (domain) => domain === "cad"
    ? [{ goalType: "U-CAD-TRILOBE", score: 1, provenance: "explicit", stepsCount: 3 },
       { goalType: "U-CAD-BORE", score: 0.5, provenance: "derived", stepsCount: 2 }]
    : [];
  const a = adviseReplay({ slot: "delta", topK: 3, findFn });
  assert.equal(a.domain, "cad");
  assert.equal(a.count, 2);
  assert.equal(a.top[0].goalType, "U-CAD-TRILOBE");
  assert.equal(a.top[1].provenance, "derived");
});

test("adviseReplay returns null: no paths, non-domain slot, or findFn throws", () => {
  assert.equal(adviseReplay({ slot: "delta", findFn: () => [] }), null, "no paths");
  assert.equal(adviseReplay({ slot: "zzz-not-a-slot", findFn: () => [{ goalType: "x" }] }), null, "unknown slot");
  assert.equal(adviseReplay({ slot: "delta", findFn: () => { throw new Error("boom"); } }), null, "fail-soft on throw");
  assert.equal(adviseReplay({ slot: "delta", findFn: () => null }), null, "null result");
});

test("formatAdvisory renders domain, count, goalTypes + provenance + the replay CLI", () => {
  const s = formatAdvisory({ domain: "cam", count: 2, top: [
    { goalType: "U-CAM-1", score: 0.9, provenance: "explicit", steps: 4 },
    { goalType: "U-CAM-2", score: 0.5, provenance: "derived", steps: 2 },
  ] });
  assert.ok(s.includes("cam"));
  assert.ok(s.includes("U-CAM-1"));
  assert.ok(s.includes("derived"), "surfaces provenance so hypotheses aren't trusted blindly");
  assert.ok(s.includes("path-ledger.mjs find cam"), "points at the replay CLI");
  assert.equal(formatAdvisory(null), "");
});

test("throttled: first call passes (records), repeat within window is throttled", () => {
  let store = {};
  const read = () => store; const write = (l) => { store = l; };
  const t0 = 1_000_000;
  assert.equal(throttled("delta", { now: t0, windowMs: 600000, read, write }), false, "first → not throttled");
  assert.equal(throttled("delta", { now: t0 + 1000, windowMs: 600000, read, write }), true, "1s later → throttled");
  assert.equal(throttled("delta", { now: t0 + 600001, windowMs: 600000, read, write }), false, "after window → passes again");
  // different slot independent
  assert.equal(throttled("kilo", { now: t0 + 1000, windowMs: 600000, read, write }), false, "other slot independent");
});

test("DEFAULT_THROTTLE_MS is 10 minutes", () => {
  assert.equal(DEFAULT_THROTTLE_MS, 600000);
});
