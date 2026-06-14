/**
 * Tests for galaxy-ai-capabilities-render.mjs (AI-SYNERGY-AUDIT-MS0/U-AISYN-DISCOVER).
 * The load-bearing test: the rendered section MUST saturate the audit's OWN
 * discoverability counter (>= 3 distinct AI terms), else injecting it would not lift
 * the dimension (R9 -- the test fails if the section stops naming real AI terms). Run:
 *   node --test scripts/lib/galaxy-ai-capabilities-render.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  renderAiCapabilitiesSection,
  spliceAiCapabilities,
  AI_CAP_BEGIN,
  AI_CAP_END,
} from "./galaxy-ai-capabilities-render.mjs";
import { distinctAiTerms } from "./ai-synergy-audit-lib.mjs";

const REC = {
  galaxy: "mill",
  signals: {
    aiEngineCount: 19,
    bridgeCount: 0,
    aiDispatcherActions: 170,
    servedByReasoningBridge: false,
    inLoraDataset: true,
    hasSynthesis: true,
    edges: { ownedBySlot: true, documentedBy: true },
  },
};

const ISLAND = {
  galaxy: "pdf-corpus-mill",
  signals: { aiEngineCount: 0, bridgeCount: 0, aiDispatcherActions: 0, servedByReasoningBridge: true, inLoraDataset: false, edges: { ownedBySlot: true, documentedBy: true } },
};

// --- the load-bearing invariant ---
test("renderAiCapabilitiesSection: SATURATES discoverability (>=3 distinct AI terms by the audit's own counter)", () => {
  for (const rec of [REC, ISLAND]) {
    const section = renderAiCapabilitiesSection(rec);
    const terms = distinctAiTerms(section);
    assert.ok(terms.size >= 3, `${rec.galaxy}: only ${terms.size} distinct AI terms in section`);
  }
});

test("renderAiCapabilitiesSection: grounds claims in real signals (owns vs validated-bridge; lora fed vs not)", () => {
  const mill = renderAiCapabilitiesSection(REC);
  assert.ok(mill.includes("owns 19 name-attributed AI engine(s)"));
  assert.ok(mill.includes("170 AI dispatcher action(s)"));
  assert.ok(mill.includes("fed into the vault->LoRA training dataset"));
  assert.ok(mill.includes("galaxy-reasoning-bridge.mjs mill"));

  const island = renderAiCapabilitiesSection(ISLAND);
  assert.ok(island.includes("live-validated generic reasoning bridge"));
  assert.ok(island.includes("not yet fed into the LoRA dataset")); // R12 honest: NOT fed
  assert.ok(!island.includes("name-attributed AI engine"));
});

test("renderAiCapabilitiesSection: FAILURE throws on missing galaxy", () => {
  assert.throws(() => renderAiCapabilitiesSection({}), /galaxy/);
  assert.throws(() => renderAiCapabilitiesSection(null), /galaxy/);
});

// --- splice idempotency ---
test("spliceAiCapabilities: appends to a body lacking markers (single trailing newline)", () => {
  const body = "# mill galaxy\n\nSome existing content.\n";
  const out = spliceAiCapabilities(body, renderAiCapabilitiesSection(REC));
  assert.ok(out.startsWith("# mill galaxy"));
  assert.ok(out.includes(AI_CAP_BEGIN));
  assert.ok(out.includes(AI_CAP_END));
  assert.ok(out.endsWith("\n"));
  assert.ok(!out.endsWith("\n\n"));
  assert.ok(out.includes("Some existing content."));
});

test("spliceAiCapabilities: REPLACES an existing block (idempotent -- second splice == first)", () => {
  const body = "# mill\n\nintro\n";
  const once = spliceAiCapabilities(body, renderAiCapabilitiesSection(REC));
  const twice = spliceAiCapabilities(once, renderAiCapabilitiesSection(REC));
  assert.equal(once, twice); // idempotent
  // only ONE marker pair after a re-splice
  assert.equal((twice.match(/AI-CAPABILITIES:BEGIN/g) || []).length, 1);
});

test("spliceAiCapabilities: ADVERSARIAL null/empty body -> just the block", () => {
  const out = spliceAiCapabilities(null, renderAiCapabilitiesSection(REC));
  assert.ok(out.startsWith(AI_CAP_BEGIN));
  assert.ok(out.endsWith("\n"));
});
