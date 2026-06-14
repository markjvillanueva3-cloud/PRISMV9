/**
 * Tests for galaxy-awareness-render.mjs (AI-SYNERGY-AUDIT-MS0/U-AISYN-AWARENESS-MD).
 * Reference-value pure-function tests. Run:
 *   node --test scripts/lib/galaxy-awareness-render.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { describeOwnsOrWires, renderAwarenessMd } from "./galaxy-awareness-render.mjs";

const FULL = {
  galaxy: "lathe",
  subScores: { discoverability: 1, ownsOrWiresAi: 1, vaultSynergy: 1, crossSubstrate: 1, awarenessSurface: 1 },
  signals: {
    aiEngineCount: 60,
    bridgeCount: 1,
    aiDispatcherActions: 111,
    servedByReasoningBridge: false,
    hasSynthesis: true,
    inLoraDataset: true,
    typeBreakdown: { lora: 40, gnn: 10, reasoning: 10 },
    aiEngineExamples: ["LatheLoRAEngine", "TurningDeepReasoningBridge"],
    aiDispatcherActionExamples: ["lathe_agi_reason", "turning_deep_neural"],
    edges: { ownedBySlot: true, documentedBy: true, consensusOf: false, embeds: true },
  },
};

const ISLAND = {
  galaxy: "pdf-corpus-mill",
  subScores: { discoverability: 0.7, ownsOrWiresAi: 1, vaultSynergy: 1, crossSubstrate: 1, awarenessSurface: 0.6 },
  signals: {
    aiEngineCount: 0,
    bridgeCount: 0,
    aiDispatcherActions: 0,
    servedByReasoningBridge: true,
    hasSynthesis: true,
    inLoraDataset: true,
    edges: { ownedBySlot: true, documentedBy: true },
  },
};

// --- describeOwnsOrWires ---
test("describeOwnsOrWires: owns engines + bridge + dispatcher + validated bridge", () => {
  const t = describeOwnsOrWires(FULL.signals);
  assert.ok(t.includes("60 name-attributed AI engine(s)"));
  assert.ok(t.includes("40 lora"));
  assert.ok(t.includes("1 reasoning/neural bridge engine(s)"));
  assert.ok(t.includes("111 per-galaxy AI dispatcher action(s)"));
  // FULL does NOT set servedByReasoningBridge -> that clause absent
  assert.ok(!t.includes("live-validated generic reasoning bridge"));
});

test("describeOwnsOrWires: validated bridge only (slotless galaxy)", () => {
  const t = describeOwnsOrWires(ISLAND.signals);
  assert.ok(t.includes("live-validated generic reasoning bridge (leg #10)"));
  assert.ok(!t.includes("name-attributed AI engine"));
});

test("describeOwnsOrWires: ADVERSARIAL empty/null -> fleet-substrate fallback (no throw)", () => {
  assert.equal(describeOwnsOrWires({}), "no name-attributed AI assets (reasons via the fleet AI substrate)");
  assert.equal(describeOwnsOrWires(null), "no name-attributed AI assets (reasons via the fleet AI substrate)");
});

// --- renderAwarenessMd ---
test("renderAwarenessMd: full galaxy renders all sections + invocation + edges", () => {
  const md = renderAwarenessMd(FULL, { auditDate: "2026-06-10", auditPath: "state/shared/specs/AI-SYNERGY-AUDIT.md" });
  assert.ok(md.startsWith("# lathe -- AI-synergy awareness"));
  assert.ok(md.includes("node scripts/lib/galaxy-reasoning-bridge.mjs lathe"));
  assert.ok(md.includes("AI engines attributed: **60**"));
  assert.ok(md.includes("LatheLoRAEngine"));
  assert.ok(md.includes("AI dispatcher actions: **111**"));
  assert.ok(md.includes("lathe_synthesis.md` -- present"));
  assert.ok(md.includes("LoRA training-dataset feed: yes"));
  assert.ok(md.includes("owned-by-slot, documented-by, embeds")); // consensus-of false -> excluded
  assert.ok(md.includes("audit 2026-06-10"));
  // composite score must NOT be printed (staleness guard) -- only the 4 stable dims
  assert.ok(!md.includes("awarenessSurface |"));
  assert.ok(md.includes("| ownsOrWiresAi | 1 |"));
  assert.ok(md.endsWith("\n"));
});

test("renderAwarenessMd: island galaxy surfaces ABSENT/NO gaps honestly", () => {
  const md = renderAwarenessMd({
    galaxy: "void",
    subScores: { discoverability: 0, ownsOrWiresAi: 0, vaultSynergy: 0, crossSubstrate: 0 },
    signals: { aiEngineCount: 0, hasSynthesis: false, inLoraDataset: false, edges: {} },
  }, {});
  assert.ok(md.includes("void_synthesis.md` -- ABSENT (gap)"));
  assert.ok(md.includes("LoRA training-dataset feed: NO (gap)"));
  assert.ok(md.includes("typed cross-substrate edges: none yet"));
  assert.ok(md.includes("reasons via the fleet AI substrate"));
  assert.ok(md.includes("via the fleet AI router")); // leg #10 fallback
});

test("renderAwarenessMd: FAILURE throws on missing galaxy", () => {
  assert.throws(() => renderAwarenessMd({}), /galaxy/);
  assert.throws(() => renderAwarenessMd({ galaxy: "  " }), /galaxy/);
  assert.throws(() => renderAwarenessMd(null), /galaxy/);
});

test("renderAwarenessMd: deterministic -- same input twice is byte-identical (PURE)", () => {
  const a = renderAwarenessMd(ISLAND, { auditDate: "2026-06-10" });
  const b = renderAwarenessMd(ISLAND, { auditDate: "2026-06-10" });
  assert.equal(a, b);
});
