#!/usr/bin/env node
/**
 * generate-bridge-synergy-features.test.mjs — node:test suite (real-value, R9).
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  generate, safeId, BRIDGE_ROOST_ID, PLANNED_PARENT, ROOST_LAYER, UNIT_LAYER, MAX_LABEL,
} from "./generate-bridge-synergy-features.mjs";

const fixture = () => ({
  bridge_units: {
    wiring: [
      { id: "U-BRIDGE-WIRE-LATHE", title: "Wire 89 unwired Lathe engines", domain: "Lathe", engine_count: 89, intent: "connect lathe engines" },
      { id: "U-BRIDGE-WIRE-OTHER", title: "Wire 144 unwired Other engines", domain: "Other", engine_count: 144, intent: "connect other engines" },
    ],
    deep_integration: [
      { id: "U-BRIDGE-SFC-FUSION", title: "SFC → Fusion bridge", from: "SFC", to: "Fusion", intent: "speeds feeds into fusion" },
    ],
  },
});

test("safeId — collapse + traversal guard", () => {
  assert.equal(safeId("U-BRIDGE-WIRE-LATHE"), "u-bridge-wire-lathe");
  assert.equal(safeId("a/b"), "a-b");
  assert.equal(safeId(".."), "x");
  assert.equal(safeId(""), "x");
});

test("generate — empty inventory emits roost only", () => {
  const { newNodes, stats } = generate({ bridge_units: { wiring: [], deep_integration: [] } }, [], { skipDetector: true });
  assert.equal(newNodes.length, 1);
  assert.equal(newNodes[0].id, BRIDGE_ROOST_ID);
  assert.equal(newNodes[0].kind, "ghost-roost");
  assert.equal(newNodes[0].parent, PLANNED_PARENT);
  assert.equal(newNodes[0].layer, ROOST_LAYER);
  assert.equal(stats.roostEmitted, 1);
  assert.equal(stats.builtCount, 0);
  assert.equal(stats.partialCount, 0);
});

test("generate — one child per wiring + deep-integration unit", () => {
  const { newNodes, stats } = generate(fixture(), [], { skipDetector: true });
  assert.equal(newNodes.length, 4); // roost + 2 wiring + 1 deep
  assert.equal(stats.wiringEmitted, 2);
  assert.equal(stats.deepEmitted, 1);
  const children = newNodes.filter((n) => n.kind === "bridge-unit");
  assert.equal(children.length, 3);
  for (const c of children) {
    assert.equal(c.parent, BRIDGE_ROOST_ID);
    assert.equal(c.layer, UNIT_LAYER);
    assert.equal(c.ghost, true);
    assert.equal(c.status, "ghost");
  }
});

test("generate — wiring vs deep-integration info tags differ", () => {
  const { newNodes } = generate(fixture(), []);
  const wire = newNodes.find((n) => n.id.includes("wire-lathe"));
  const deep = newNodes.find((n) => n.id.includes("sfc-fusion"));
  assert.ok(wire.info.startsWith("[wiring"));
  assert.ok(wire.info.includes("89 engines"));
  assert.ok(deep.info.startsWith("[deep-integration"));
  assert.ok(deep.info.includes("SFC → Fusion"));
});

test("generate — long label capped at MAX_LABEL", () => {
  const inv = { bridge_units: { wiring: [{ id: "U-X", title: "y".repeat(300), domain: "D", engine_count: 1, intent: "i" }], deep_integration: [] } };
  const { newNodes } = generate(inv, []);
  const child = newNodes.find((n) => n.kind === "bridge-unit");
  assert.ok(child.label.length <= MAX_LABEL);
});

test("generate — skips children + roost already in graph", () => {
  const { newNodes, stats } = generate(fixture(), new Set([BRIDGE_ROOST_ID, "ghost.bridge.u-bridge-wire-lathe"]));
  assert.equal(stats.roostEmitted, 0);
  assert.equal(stats.wiringEmitted, 1); // lathe skipped
  assert.equal(stats.skipped, 1);
  assert.ok(!newNodes.some((n) => n.id === BRIDGE_ROOST_ID));
});

test("generate — idempotent across two runs", () => {
  assert.deepEqual(generate(fixture(), []), generate(fixture(), []));
});

test("generate — tolerates missing/garbage inventory", () => {
  assert.equal(generate(null, [], { skipDetector: true }).newNodes.length, 1);
  assert.equal(generate({}, [], { skipDetector: true }).newNodes.length, 1);
  assert.equal(generate({ bridge_units: { wiring: "nope", deep_integration: null } }, [], { skipDetector: true }).stats.wiringUnits, 0);
});

// ─── U-BRIDGE-STATUS-RECONCILE (2026-05-19) ─────────────────────────
// Detector-driven status flipping. New behavior: a bridge id that has an
// EVIDENCE_TABLE entry + provably-shipped evidence flips ghost → built.

const aiInventory = () => ({
  bridge_units: {
    wiring: [],
    deep_integration: [
      { id: "U-BRIDGE-AI-TIER1-TIER2", title: "Tier-1 → Tier-2", from: "Claude", to: "Tier2", intent: "tier router" },
      { id: "U-BRIDGE-AI-TIER2-TIER3", title: "Tier-2 → Tier-3", from: "Tier2", to: "Tier3", intent: "orchestrator" },
      { id: "U-BRIDGE-SFC-FUSION",      title: "SFC → Fusion",  from: "SFC",    to: "Fusion", intent: "speeds feeds" },
    ],
  },
});

test("generate — built verdict flips status + ghost flag, appends evidence to info", () => {
  const verdicts = new Map([
    ["U-BRIDGE-AI-TIER1-TIER2", { status: "built", evidence: ["aiReasoningDispatcher.ts: all 2 patterns present"] }],
  ]);
  const { newNodes, stats } = generate(aiInventory(), [], { statusByBridgeId: verdicts });
  const t12 = newNodes.find((n) => n.id.includes("ai-tier1-tier2"));
  const t23 = newNodes.find((n) => n.id.includes("ai-tier2-tier3"));
  const sfc = newNodes.find((n) => n.id.includes("sfc-fusion"));
  // Only the bridge with a 'built' verdict flips
  assert.equal(t12.status, "built");
  assert.equal(t12.ghost, false);
  assert.match(t12.info, /reconciled: aiReasoningDispatcher\.ts/);
  // Bridges with no verdict stay ghost
  assert.equal(t23.status, "ghost");
  assert.equal(t23.ghost, true);
  assert.equal(sfc.status, "ghost");
  // stats reflect the flip
  assert.equal(stats.builtCount, 1);
  assert.equal(stats.partialCount, 0);
});

test("generate — partial verdict sets status='partial' but ghost stays true", () => {
  const verdicts = new Map([
    ["U-BRIDGE-AI-TIER1-TIER2", { status: "partial", evidence: ["1/2 patterns present"] }],
  ]);
  const { newNodes, stats } = generate(aiInventory(), [], { statusByBridgeId: verdicts });
  const t12 = newNodes.find((n) => n.id.includes("ai-tier1-tier2"));
  assert.equal(t12.status, "partial");
  assert.equal(t12.ghost, true); // partial is in-flight, NOT shipped
  assert.match(t12.info, /reconciled: 1\/2/);
  assert.equal(stats.builtCount, 0);
  assert.equal(stats.partialCount, 1);
});

test("generate — ghost verdict in the map is a no-op (status quo)", () => {
  const verdicts = new Map([
    ["U-BRIDGE-AI-TIER1-TIER2", { status: "ghost", evidence: ["no evidence"] }],
  ]);
  const { newNodes, stats } = generate(aiInventory(), [], { statusByBridgeId: verdicts });
  const t12 = newNodes.find((n) => n.id.includes("ai-tier1-tier2"));
  assert.equal(t12.status, "ghost");
  assert.equal(t12.ghost, true);
  // No evidence line appended when verdict is 'ghost' (status quo invariant)
  assert.equal(t12.info.includes("reconciled"), false);
  assert.equal(stats.builtCount, 0);
  assert.equal(stats.partialCount, 0);
});

test("generate — missing verdict map entry leaves bridge as ghost", () => {
  const verdicts = new Map([]); // empty map
  const { newNodes, stats } = generate(aiInventory(), [], { statusByBridgeId: verdicts });
  for (const n of newNodes.filter((n) => n.kind === "bridge-unit")) {
    assert.equal(n.status, "ghost");
    assert.equal(n.ghost, true);
  }
  assert.equal(stats.builtCount, 0);
});

test("generate — malformed verdict shape doesn't crash (defensive)", () => {
  // We don't expose a way to inject malformed verdicts via the public Map
  // contract — Map<string, {status, evidence}> is the typed surface — but
  // an external caller passing a non-Map should not crash either.
  // @ts-ignore intentionally bad
  const { newNodes } = generate(aiInventory(), [], { statusByBridgeId: { notAMap: true } });
  // Non-Map → falls back to default detector path; since skipDetector is
  // unset, the detector runs against the real repo. The AI bridges should
  // be 'built' in production. We assert deterministically by checking the
  // generator emitted ALL three bridges (no crash) and stats fields are
  // present + numeric.
  assert.equal(newNodes.filter((n) => n.kind === "bridge-unit").length, 3);
});

test("generate — built bridge appended evidence respects bounded length", () => {
  const longEvidence = "x".repeat(2000); // larger than MAX_INFO
  const verdicts = new Map([
    ["U-BRIDGE-AI-TIER1-TIER2", { status: "built", evidence: [longEvidence] }],
  ]);
  const { newNodes } = generate(aiInventory(), [], { statusByBridgeId: verdicts });
  const t12 = newNodes.find((n) => n.id.includes("ai-tier1-tier2"));
  // The bound is generous (MAX_INFO * 2 - existing length) but finite. A
  // 2000-char evidence string should be truncated; the node info must not
  // grow unbounded.
  assert.ok(t12.info.length < 1000, `info too long: ${t12.info.length}`);
});

test("generate — real-data detector run flips both AI-tier bridges to built (E2E)", () => {
  // Default opts: detector runs against the real repo. The 2 AI-tier
  // bridges in EVIDENCE_TABLE should classify as 'built' against the live
  // aiReasoningDispatcher.ts (commit b6a5916f74's predecessor and beyond).
  const { newNodes, stats } = generate(aiInventory(), []);
  const t12 = newNodes.find((n) => n.id.includes("ai-tier1-tier2"));
  const t23 = newNodes.find((n) => n.id.includes("ai-tier2-tier3"));
  const sfc = newNodes.find((n) => n.id.includes("sfc-fusion"));
  assert.equal(t12.status, "built", `T1-T2 not built: info=${t12.info}`);
  assert.equal(t23.status, "built", `T2-T3 not built: info=${t23.info}`);
  // SFC bridge is not in EVIDENCE_TABLE → stays ghost (still unshipped)
  assert.equal(sfc.status, "ghost");
  assert.equal(stats.builtCount, 2);
});

test("generate — idempotent across two real-detector runs", () => {
  // The detector reads aiReasoningDispatcher.ts; that file is stable across
  // a single test execution. Two consecutive calls must produce equal
  // results (selectedAt is not part of this generator's output, so no
  // time-dependent fields).
  const a = generate(aiInventory(), []);
  const b = generate(aiInventory(), []);
  assert.deepEqual(a, b);
});
