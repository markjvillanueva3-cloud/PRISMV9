// generate-slot-binding-features.test.mjs — coverage for the SLOT-BRIDGE-MS0
// PSN+/system-viz synergy generator (U-SBB06, 2026-05-26).

import { test } from "node:test";
import { strict as assert } from "node:assert";
import { classifySlot, safeId, generate, SCHEMA_VERSION, ROOST_ID, TIER_COLOR } from "./generate-slot-binding-features.mjs";

// ─── classifySlot: per-slot tier classification ───────────────────────────

test("classifySlot: golf with chatId → 'integrator', empty golf → 'empty' (healthPct contract)", () => {
  // Empty golf must NOT classify as integrator — otherwise healthPct's
  // (armed + integrator) / liveSlots numerator can exceed 100% when the
  // integrator slot is empty but counted as if it were route-correct.
  // Fixed 2026-05-26 post-smoke-run (returned 105% before the fix).
  assert.equal(classifySlot("golf", {}, null), "empty");
  assert.equal(classifySlot("golf", { golf: "slot/golf" }, { chatId: "x", branch: "slot/golf" }), "integrator");
  // Live golf is integrator regardless of branch value (the integrator role
  // is exempt by design — golf may write the main tree on cad-fusion-live-ms0).
  assert.equal(classifySlot("golf", {}, { chatId: "x", branch: "cad-fusion-live-ms0" }), "integrator");
});

test("classifySlot: healthPct contract — (armed + integrator) ≤ liveSlots always", () => {
  // Adversarial: every slot empty except a single non-armed non-golf chat.
  const r = generate({}, { slots: { alpha: { chatId: "x", branch: "cad-fusion-live-ms0" } } }, []);
  assert.ok(r.stats.healthPct <= 100, "healthPct must NEVER exceed 100%");
});

test("classifySlot: empty slot (no chatId) returns 'empty'", () => {
  assert.equal(classifySlot("alpha", { alpha: "slot/alpha" }, null), "empty");
  assert.equal(classifySlot("bravo", { bravo: "slot/bravo" }, { chatId: null }), "empty");
});

test("classifySlot: armed (live chat + branch matches slot/<name>) → 'armed'", () => {
  assert.equal(classifySlot("alpha", { alpha: "slot/alpha" }, { chatId: "claude-1", branch: "slot/alpha" }), "armed");
});

test("classifySlot: unarmed-bound (binding present, branch drifted) → 'unarmed-bound'", () => {
  assert.equal(classifySlot("charlie", { charlie: "slot/charlie" }, { chatId: "claude-1", branch: "cad-fusion-live-ms0" }), "unarmed-bound");
  assert.equal(classifySlot("delta", { delta: "slot/delta" }, { chatId: "claude-2", branch: null }), "unarmed-bound");
});

test("classifySlot: unarmed-unbound (no binding AND branch drifted) → 'unarmed-unbound' (regression class)", () => {
  assert.equal(classifySlot("echo", {}, { chatId: "claude-3", branch: "cad-fusion-live-ms0" }), "unarmed-unbound");
});

// ─── safeId: filesystem-safe slot id fragment ─────────────────────────────

test("safeId: lowercases + replaces non-alnum + truncates", () => {
  assert.equal(safeId("Alpha"), "alpha");
  assert.equal(safeId("foo bar"), "foo-bar");
  assert.equal(safeId("../etc/passwd"), "etc-passwd");
  assert.equal(safeId(""), "x");
  assert.equal(safeId(null), "x");
});

// ─── generate: end-to-end emit ────────────────────────────────────────────

test("generate: armed-fleet snapshot emits roost + per-slot nodes with correct tiers", () => {
  const bindings = {
    alpha: "slot/alpha", bravo: "slot/bravo", charlie: "slot/charlie",
    delta: "slot/delta",
  };
  const slots = {
    slots: {
      alpha: { chatId: "claude-1", branch: "slot/alpha", pid: 100 },
      bravo: { chatId: "claude-2", branch: "slot/bravo", pid: 200 },
      charlie: { chatId: "claude-3", branch: "cad-fusion-live-ms0", pid: 300 },
      delta: null,
      echo: { chatId: "claude-4", branch: "cad-fusion-live-ms0", pid: 400 },
      golf: { chatId: "claude-g", branch: "cad-fusion-live-ms0", pid: 700 },
    },
  };
  const result = generate(bindings, slots, []);
  assert.equal(result.stats.roostEmitted, 1);
  const roost = result.newNodes.find(n => n.id === ROOST_ID);
  assert.ok(roost, "roost emitted");
  assert.equal(roost.kind, "ghost-roost");
  assert.equal(roost.parent, "ghost.planned_features");

  // tier-specific assertions on individual slot nodes
  const node = (id) => result.newNodes.find(n => n.id === id);
  assert.equal(node("ghost.slot-binding.alpha").color, TIER_COLOR.armed);
  assert.equal(node("ghost.slot-binding.bravo").color, TIER_COLOR.armed);
  assert.equal(node("ghost.slot-binding.charlie").color, TIER_COLOR["unarmed-bound"]);
  assert.equal(node("ghost.slot-binding.delta").color, TIER_COLOR.empty);
  assert.equal(node("ghost.slot-binding.echo").color, TIER_COLOR["unarmed-unbound"], "no binding + drifted branch = red regression");
  assert.equal(node("ghost.slot-binding.golf").color, TIER_COLOR.integrator, "golf always integrator-blue");

  // stats sanity
  assert.equal(result.stats.tierCounts.armed, 2);
  assert.equal(result.stats.tierCounts["unarmed-bound"], 1);
  assert.equal(result.stats.tierCounts["unarmed-unbound"], 1);
  assert.equal(result.stats.tierCounts.integrator, 1);
});

test("generate: SCHEMA_VERSION is stable and ROOST_ID matches docs", () => {
  assert.equal(typeof SCHEMA_VERSION, "string");
  assert.match(SCHEMA_VERSION, /^\d+\.\d+\.\d+$/);
  assert.equal(ROOST_ID, "ghost.slot_binding_health");
});

test("generate: malformed inputs are fail-soft (no throw, empty emit if reasonable)", () => {
  // bindings is null
  let r = generate(null, { slots: { alpha: { chatId: "x", branch: "slot/alpha" } } }, []);
  assert.equal(r.stats.tierCounts.armed, 1);
  // slots is null
  r = generate({}, null, []);
  assert.equal(r.stats.tierCounts.empty + r.stats.tierCounts.integrator, 26);
  // slots.slots is an array (wrong shape)
  r = generate({}, { slots: [] }, []);
  assert.equal(r.stats.tierCounts.empty + r.stats.tierCounts.integrator, 26);
});

test("generate: existingNodeIds Set prevents duplicate roost emission", () => {
  const r = generate({ alpha: "slot/alpha" }, { slots: { alpha: { chatId: "x", branch: "slot/alpha" } } }, new Set([ROOST_ID]));
  assert.equal(r.stats.roostEmitted, 0);
  assert.equal(r.newNodes.find(n => n.id === ROOST_ID), undefined);
});

test("generate: golf-integrator info reflects exempt status (operator-facing transparency)", () => {
  const r = generate({}, { slots: { golf: { chatId: "claude-g", branch: "cad-fusion-live-ms0" } } }, []);
  const golfNode = r.newNodes.find(n => n.id === "ghost.slot-binding.golf");
  assert.ok(golfNode, "golf node emitted");
  assert.match(golfNode.info, /integrator/i);
  assert.equal(golfNode.color, TIER_COLOR.integrator);
});
